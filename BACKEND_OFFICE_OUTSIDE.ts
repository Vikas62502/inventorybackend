// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Office Outside records (REQUIRED §BX / HANDOFF §73–§75, Oct 2026)
 * =============================================================================
 *
 * Status: IMPLEMENTED. Admin JWT only. Persist ONLY in office_outside_records
 * (+ office_outside_ledger). Do not write quotations. Do not treat SPA localStorage
 * as storage. One customer = one row (last-10 mobile).
 *
 * Live GET: SPA re-fetches after every mutation. Empty list is 200 { records: [] },
 * never 204. Mount /ledger before /:id.
 *
 * -----------------------------------------------------------------------------
 * 1) Endpoints
 * -----------------------------------------------------------------------------
 *
 *   GET    /api/admin/office-outside                  Admin All Outside
 *   GET    /api/admin/office-outside?mobile=8920094209  exact one-customer lookup
 *   GET    /api/admin/office-outside?status=sent        Accounts (sent_to_accounts_at IS NOT NULL)
 *   GET    /api/admin/office-outside?status=outside     Vendor Outside (sent_to_outside_at IS NOT NULL)
 *   GET    /api/admin/office-outside?status=pending     both timestamps null
 *          also ?vendorId= &search= &status=draft|sent|sent_to_accounts|outside
 *          → 200 { success, data: { records, items, officeOutside } }  (never 204)
 *
 *   POST   /api/admin/office-outside
 *          fileType optional. If last-10 mobile already exists, UPDATE that same id
 *          (Aman Rajak / 8920094209 stays OO-1402E036). Do not mint a second OO-*.
 *          If you cannot upsert → 409 OO_DUPLICATE_CUSTOMER with existingId.
 *
 *   GET    /api/admin/office-outside/:id     UUID PK or OO-XXXXXXXX (do not 404 UUID-only ids)
 *   PATCH  /api/admin/office-outside/:id     outsideVendorId / vendorId + fileType stay writable after Send
 *          (never 400 OO_ALREADY_SENT). Moving a 10-digit mobile onto another row → 409.
 *          Also persists subtotal / amount / loanAmount / cashAmount (partial; omitted keys stay).
 *   DELETE /api/admin/office-outside/:id
 *
 *   POST   /api/admin/office-outside/:id/send-to-accounts
 *          All Outside → Accounts. Set sent_to_accounts_at only. Do not set sent_to_outside_at.
 *          :id = UUID PK or OO-*. 404 OO_404 if missing. 400 OO_VENDOR_REQUIRED if vendor is null.
 *
 *   POST   /api/admin/office-outside/:id/send-to-outside
 *          Accounts → Vendor Outside. Set sent_to_outside_at. Do not clear sent_to_accounts_at.
 *          Auth: admin or accounts JWT (Accounts Send to Outside button).
 *
 *   POST   /api/admin/office-outside/:id/retrieve-from-accounts
 *          Clear both timestamps and echo them as null. Row goes back to All Outside Pending.
 *          Auth: admin or accounts JWT. Do not delete the row.
 *          Fallback: PATCH { sentToAccountsAt: null } (clears both).
 *          PATCH { sentToOutsideAt: null } clears only the outside timestamp (keep accounts).
 *
 *   PATCH  /api/admin/office-outside/:id/slip   { items, notes } — no Chairbord branding
 *
 *   PATCH  /api/admin/office-outside/:id/payment-details
 *          Same installment body as quotations. Stored on installments_json — NOT quotations.
 *
 *   GET    /api/admin/office-outside/ledger
 *   GET/PATCH /api/admin/office-outside/ledger/:id
 *          Partial upsert. Missing keys must NOT reset to 0.
 *          All Outside Save sends { proposal, loanAmount, cashAmount } only — keep PI/file/GST.
 *          Copy loan_amount / cash_amount onto office_outside_records so GET list echoes them.
 *          GET ledger: if loan_amount is 0, fill from the record (loan file → subtotal).
 *          GST = (proposal − PI) × 8.9% when PI > 0, else 0.
 *          costOfSite = PI + fileCharges + GST + others.
 *          officeOutsideCompleteProfit = subtotal − costOfSite (ignore profit_ratio).
 *          Never writes subvendor_ledger.quotation_id.
 *
 * -----------------------------------------------------------------------------
 * 2) One customer = one row (mobile unique)
 * -----------------------------------------------------------------------------
 *
 * Normalize mobile to the last 10 digits on every write.
 *
 * -- After dedupe (keep newest updated_at):
 * -- CREATE UNIQUE INDEX IF NOT EXISTS office_outside_mobile_unique
 * --   ON office_outside_records (customer_mobile) WHERE length(customer_mobile) = 10;
 *
 * Column is customer_mobile (API: mobile / customerMobile).
 */
const DEDUPE_AND_UNIQUE_SQL = `
UPDATE office_outside_records
SET customer_mobile = RIGHT(regexp_replace(COALESCE(customer_mobile, ''), '[^0-9]', '', 'g'), 10);

DELETE FROM office_outside_records
WHERE id IN (
  SELECT id FROM (
    SELECT id,
      ROW_NUMBER() OVER (
        PARTITION BY customer_mobile
        ORDER BY updated_at DESC, created_at DESC, id DESC
      ) AS rn
    FROM office_outside_records
    WHERE length(customer_mobile) = 10
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS office_outside_mobile_unique
  ON office_outside_records (customer_mobile)
  WHERE length(customer_mobile) = 10;
`;

const sequelizeUniqueIndex = {
  name: 'office_outside_mobile_unique',
  unique: true,
  fields: ['customer_mobile'],
  where: 'length(customer_mobile) = 10'
};

function normalizeMobile(raw) {
  return String(raw ?? '').replace(/\D/g, '').slice(-10);
}

const conflict409 = {
  success: false,
  error: {
    code: 'OO_DUPLICATE_CUSTOMER',
    message: 'A record already exists for this mobile',
    existingId: 'uuid',
    publicId: 'OO-1402E036'
  },
  data: { existingId: 'uuid', record: { id: 'uuid', publicId: 'OO-1402E036' } }
};

/**
 * Copy-paste handlers (Express-style). Persist ONLY in office_outside_records.
 * Do not write quotations. Do not 204 empty lists.
 *
 *   GET list: if query.mobile, exact match on last-10 customer_mobile.
 *   POST: find by last-10 mobile → update same id; else create. Unique race → upsert or 409.
 *   PATCH: if new mobile belongs to another row → 409 with existingId so SPA can PATCH it.
 */
async function listOfficeOutside(req, res, { OfficeOutsideRecord, Op }) {
  const mobile = normalizeMobile(req.query.mobile ?? req.query.customerMobile);
  const status = String(req.query.status ?? '').trim().toLowerCase();
  const where = {};
  if (mobile) where.customerMobile = mobile;
  if (status === 'pending' || status === 'draft') {
    where.sentToAccountsAt = null;
    where.sentToOutsideAt = null;
  }
  if (status === 'sent' || status === 'sent_to_accounts' || status === 'accounts') {
    where.sentToAccountsAt = { [Op.ne]: null }; // do not require both timestamps
  }
  if (status === 'outside' || status === 'sent_to_outside') {
    where.sentToOutsideAt = { [Op.ne]: null }; // include rows already on Accounts
  }
  const records = await OfficeOutsideRecord.findAll({ where });
  const all = await OfficeOutsideRecord.count();
  const pending = await OfficeOutsideRecord.count({
    where: { sentToAccountsAt: null, sentToOutsideAt: null }
  });
  res.status(200).json({
    success: true,
    data: { records, items: records, officeOutside: records, counts: { all, pending } }
  });
}

async function createOfficeOutside(req, res, { OfficeOutsideRecord }) {
  const mobile = normalizeMobile(req.body.mobile ?? req.body.customerMobile);
  if (mobile.length === 10) {
    const existing = await OfficeOutsideRecord.findOne({ where: { customerMobile: mobile } });
    if (existing) {
      await existing.update(/* patch */); // same id / publicId
      return res.status(200).json({ success: true, data: { record: existing } });
    }
  }
  const row = await OfficeOutsideRecord.create(/* patch */);
  return res.status(201).json({ success: true, data: { record: row } });
}

async function updateOfficeOutside(req, res, { OfficeOutsideRecord, Subvendor, OfficeOutsideLedger }) {
  const row = await OfficeOutsideRecord.findByPk(req.params.id);
  const mobile = normalizeMobile(req.body.mobile ?? req.body.customerMobile);
  if (mobile.length === 10) {
    const other = await OfficeOutsideRecord.findOne({ where: { customerMobile: mobile } });
    if (other && other.id !== row.id) {
      return res.status(409).json(conflict409);
    }
  }
  await row.update(/* patch */);
  if (req.body?.sentToAccountsAt === null) {
    await row.update({
      sentToAccountsAt: null,
      sentToOutsideAt: null,
      status: 'draft'
    });
  } else if (req.body?.sentToOutsideAt === null) {
    await row.update({ sentToOutsideAt: null });
  }
  return res.status(200).json({ success: true, data: { record: row } });
}

async function sendOfficeOutsideToAccounts(req, res, { OfficeOutsideRecord }) {
  const row = await OfficeOutsideRecord.findByPk(req.params.id); // UUID PK; also accept OO-*
  if (!row) return res.status(404).json({ success: false, error: { code: 'OO_404' } });
  const loanCash = officeOutsideLoanCashAmounts(row);
  // All Outside → Accounts. Do not set sentToOutsideAt (Vendor Outside is a later step).
  if (!row.sentToAccountsAt) row.sentToAccountsAt = new Date();
  row.updatedBy = req.user?.id || row.updatedBy;
  await row.save();
  return res.status(200).json({ success: true, data: { record: row, loanCash } });
}

async function sendOfficeOutsideToOutside(req, res, { OfficeOutsideRecord }) {
  const row = await OfficeOutsideRecord.findByPk(req.params.id);
  if (!row) return res.status(404).json({ success: false, error: { code: 'OO_404' } });
  const loanCash = officeOutsideLoanCashAmounts(row);
  // Accounts → Vendor Outside. Keep sentToAccountsAt so the file stays on Accounts.
  if (!row.sentToOutsideAt) row.sentToOutsideAt = new Date();
  row.updatedBy = req.user?.id || row.updatedBy;
  await row.save();
  return res.status(200).json({ success: true, data: { record: row, loanCash } });
}

async function retrieveOfficeOutsideFromAccounts(req, res, { OfficeOutsideRecord }) {
  const row = await OfficeOutsideRecord.findByPk(req.params.id); // UUID PK; also accept OO-*
  if (!row) return res.status(404).json({ success: false, error: { code: 'OO_404' } });
  row.sentToAccountsAt = null;
  row.sentToOutsideAt = null;
  row.sentToAccountsBy = null;
  row.status = 'draft';
  row.updatedBy = req.user?.id || row.updatedBy;
  // Echo both timestamps as null (do not omit) so SPA returns the row to Pending.
  await row.save();
  return res.status(200).json({
    success: true,
    data: {
      record: {
        ...row.get({ plain: true }),
        sentToAccountsAt: null,
        sentToOutsideAt: null,
        sent: false,
        outside: false
      }
    }
  });
}

/**
 * -----------------------------------------------------------------------------
 * 3) Record / ledger echo
 * -----------------------------------------------------------------------------
 */
/**
 * CHANGELOG Oct 21 2026 (later) — Send to Accounts
 *   No new route. SPA button is now always clickable on pending rows.
 *   Send still calls POST /admin/office-outside/:id/send-to-accounts.
 *   1. PATCH { outsideVendorId } (subvendors.kind must be office_outside) — echoed on GET
 *   2. POST send-to-accounts → sets sentToAccountsAt (id = OO-* or UUID PK)
 *   3. Accounts list = GET ?status=sent → sentToAccountsAt IS NOT NULL
 *   Also: leaser accepts office_outside vendor ids + OO-* customer_ids.
 */
const sendFlow = {
  patch: { outsideVendorId: 'office-outside-subvendor-uuid' },
  send: 'POST /admin/office-outside/2e5620c8-5519-4aaa-8bbb-cccccccccccc/send-to-accounts',
  accounts: 'GET /admin/office-outside?status=sent'
};

const record = {
  id: 'uuid',
  publicId: 'OO-1402E036',
  mobile: '8920094209',
  customerMobile: '8920094209',
  outsideVendorId: 'office-outside-subvendor-uuid',
  vendorId: 'office-outside-subvendor-uuid',
  fileType: 'loan', // or null when omitted
  subtotal: 200000,
  amount: 200000,
  loanAmount: 200000,
  cashAmount: 0,
  paymentStatus: 'pending',
  paymentMode: 'cash',
  installments: [],
  status: 'sent_to_accounts',
  sent: true,
  outside: false,
  sentToAccountsAt: '2026-10-21T09:00:00.000Z',
  sentToOutsideAt: null
};

const ledger = {
  loanAmount: 0,
  cashAmount: 0,
  remaining: 0,
  proposal: 200000,
  pi: 153775,
  fileCharges: 3000,
  gstCharges: 4114,
  others: 0,
  costOfSite: 160889,
  profit: 39111 // officeOutsideCompleteProfit
};

/**
 * QA:
 *   1. POST Aman Rajak / 8920094209 twice → same publicId, one row.
 *   2. GET ?mobile=8920094209 → that one record. GET empty → 200 { records: [] }.
 *   3. PATCH another row to 8920094209 → 409 OO_DUPLICATE_CUSTOMER existingId.
 *   4. POST without fileType → 201, fileType null; PATCH fileType after Send → 200.
 *   5. GET ?status=sent for Accounts. GET quotations unchanged.
 *   6. PATCH outsideVendorId → GET echoes it; Send without vendor → 400 OO_VENDOR_REQUIRED.
 *   7. POST send-to-accounts with UUID PK (not OO-*) → 200 + sentToAccountsAt; row in ?status=sent.
 *   8. POST retrieve-from-accounts → sentToAccountsAt null (key present); GET ?status=sent omits it;
 *      GET all / ?status=pending includes it. Second retrieve is 200. Row is not deleted.
 *   9. PATCH { sentToAccountsAt: null } is the same revert. Ignore profit_ratio for office_outside.
 *  10. PATCH record/ledger { loanAmount, cashAmount, amount } → GET list + ledger echo those values.
 *      Save { proposal, loanAmount, cashAmount } only must keep PI / file / GST.
 *      Loan file with loan 0 uses the amount; a saved loan > 0 stays.
 *  11. POST send-to-accounts → GET ?status=sent includes it; GET ?status=outside does not.
 *      POST send-to-outside → GET ?status=outside includes it; GET ?status=sent still includes it.
 *      POST retrieve-from-accounts → both timestamps null; GET ?status=pending includes it.
 *      PATCH { sentToOutsideAt: null } → outside null, accounts timestamp kept.
 */
/**
 * CHANGELOG Oct 23 2026 — Amount / loan persist
 *   ALTER TABLE office_outside_records
 *     ADD COLUMN IF NOT EXISTS loan_amount INTEGER NOT NULL DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS cash_amount INTEGER NOT NULL DEFAULT 0;
 *   ALTER TABLE office_outside_ledger
 *     ADD COLUMN IF NOT EXISTS loan_amount INTEGER NOT NULL DEFAULT 0,
 *     ADD COLUMN IF NOT EXISTS cash_amount INTEGER NOT NULL DEFAULT 0;
 *
 *   PATCH /admin/office-outside/:id — save subtotal / amount / loanAmount / cashAmount
 *   PATCH /admin/office-outside/ledger/:id — same loan/cash onto the ledger (partial)
 *   GET record and ledger — echo loanAmount / cashAmount
 *   Loan file with loan 0 → use the amount. A saved loan > 0 stays as-is.
 *   Mount /ledger before /:id. After deploy, Save on All Outside keeps the loan on Vendor Outside.
 */
/**
 * CHANGELOG Oct 23 2026 — Accounts → Vendor Outside hop
 *   ALTER TABLE office_outside_records
 *     ADD COLUMN IF NOT EXISTS sent_to_outside_at TIMESTAMPTZ NULL;
 *
 *   POST send-to-accounts — set sent_to_accounts_at only. Do not set sent_to_outside_at.
 *   POST send-to-outside — set sent_to_outside_at. Do not clear sent_to_accounts_at. Accounts JWT allowed.
 *   POST retrieve-from-accounts — clear both timestamps; echo them as null.
 *   PATCH { sentToOutsideAt: null } — clear only the outside timestamp.
 *   GET ?status=sent | outside | pending as timestamp filters (sent does not require both).
 */
/**
 * CHANGELOG Oct 23 2026 — Vendor leaser bills  ← APPLY WITH BACKEND_SUBVENDOR_BILLS.ts
 *   Vendor Outside → Manage → Bills now persists on the API:
 *     GET  /admin/subvendors/bills
 *     GET  /admin/subvendors/:id/bills
 *     PUT  /admin/subvendors/:id/bills — full replace on Save payments
 *   Same PUT `/admin/subvendors/:id/leaser`. customer_ids may be OO-* record ids.
 *   Bills for that vendor: PUT `/admin/subvendors/:id/bills` (see BACKEND_SUBVENDOR_BILLS.ts).
 *   Profit on that vendor card is COMPLETE file profit (frontend GST 9.8%).
 *   Treat loan_amount / cash_amount 0 as unset; a saved amount > 0 must stick.
 *   Persist Vendor Outside bills on GET/PUT /admin/subvendors/:id/bills
 *     (date, basic, paymentMode, customerIds OO-* or UUID, uploaded file).
 *
 *   Do not:
 *   - Ignore PATCH loanAmount on the record (Vendor Outside then stays ₹0)
 *   - Put bill rows on PUT /admin/subvendors/:id/leaser (bills are a separate table)
 *   - Leave sent_to_accounts_at or sent_to_outside_at set after a 200 retrieve
 */
export {};
