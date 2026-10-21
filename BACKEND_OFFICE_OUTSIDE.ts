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
 *   GET    /api/admin/office-outside?status=sent        Accounts + Vendor Outside
 *          also ?vendorId= &search= &status=draft|sent|sent_to_accounts
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
 *   DELETE /api/admin/office-outside/:id
 *
 *   POST   /api/admin/office-outside/:id/send-to-accounts
 *          :id = UUID PK or OO-*. Look up by PK first (Rajkumar Saini / 2e5620c8-…).
 *          404 OO_404 if missing. 400 OO_VENDOR_REQUIRED if outside_vendor_id is null.
 *          Sets sentToAccountsAt + status=sent_to_accounts. Does NOT insert into quotations.
 *          No new route — SPA Send button is always clickable on pending rows.
 *
 *   PATCH  /api/admin/office-outside/:id/slip   { items, notes } — no Chairbord branding
 *
 *   PATCH  /api/admin/office-outside/:id/payment-details
 *          Same installment body as quotations. Stored on installments_json — NOT quotations.
 *
 *   GET    /api/admin/office-outside/ledger
 *   GET/PATCH /api/admin/office-outside/ledger/:id
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
async function listOfficeOutside(req, res) {
  const mobile = normalizeMobile(req.query.mobile ?? req.query.customerMobile);
  const records = []; // findAll; if mobile, where customerMobile = mobile
  res.status(200).json({ success: true, data: { records, items: records, officeOutside: records } });
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
  return res.status(200).json({ success: true, data: { record: row } });
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
  paymentStatus: 'pending',
  paymentMode: 'cash',
  installments: [],
  status: 'sent_to_accounts',
  sent: true,
  sentToAccountsAt: '2026-10-21T09:00:00.000Z'
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
 */
export {};
