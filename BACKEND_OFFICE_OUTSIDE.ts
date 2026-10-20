// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Office Outside records (REQUIRED §BX / HANDOFF §73–§74, Oct 2026)
 * =============================================================================
 *
 * Status: IMPLEMENTED. Admin JWT only. Not quotations — GET /admin/quotations never
 * includes these rows. Accounts sent files: GET /admin/office-outside?status=sent
 *
 * Vendors stay on GET /admin/subvendors?kind=office_outside.
 * Leaser: GET/PUT /admin/subvendors/:id/leaser works for office_outside (no 404).
 *
 * -----------------------------------------------------------------------------
 * 1) Endpoints
 * -----------------------------------------------------------------------------
 *
 *   GET    /api/admin/office-outside
 *          ?vendorId= &search= &status=draft|sent|sent_to_accounts
 *          → { success, data: { records, items, officeOutside } }
 *
 *   POST   /api/admin/office-outside
 *          fileType optional (frontend may set it later). Do not 400 if omitted.
 *          → 201 { success, data: { record, item } }
 *
 *   GET    /api/admin/office-outside/:id     (UUID or OO-XXXXXXXX)
 *   PATCH  /api/admin/office-outside/:id     vendor + fileType stay writable after Send
 *          (never 400 OO_ALREADY_SENT)
 *   DELETE /api/admin/office-outside/:id
 *
 *   POST   /api/admin/office-outside/:id/send-to-accounts
 *          status=sent_to_accounts. Does NOT insert into quotations.
 *
 *   PATCH  /api/admin/office-outside/:id/slip   { items, notes } — no Chairbord branding
 *
 *   PATCH  /api/admin/office-outside/:id/payment-details
 *          Same installment body as quotations (phases / installments / paymentPhases).
 *          Stored on office_outside_records.installments_json — NOT quotation_payment_phases.
 *
 *   GET    /api/admin/office-outside/ledger
 *   GET/PATCH /api/admin/office-outside/ledger/:id
 *          GST = (proposal − PI) × 8.9% when PI > 0, else 0.
 *          costOfSite = PI + fileCharges + GST + others.
 *          Also persist loanAmount, cashAmount, remaining.
 *          Never writes subvendor_ledger.quotation_id.
 *
 * -----------------------------------------------------------------------------
 * 2) Schema extras
 * -----------------------------------------------------------------------------
 *
 *   ALTER TABLE office_outside_records
 *     ADD COLUMN IF NOT EXISTS installments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
 *     ADD COLUMN IF NOT EXISTS payment_status VARCHAR(16) NOT NULL DEFAULT 'pending',
 *     ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) NULL;
 *   file_type is nullable (omitted on create stays null).
 *   office_outside_ledger.cash_amount NUMERIC(14,2) NOT NULL DEFAULT 0.
 *
 * -----------------------------------------------------------------------------
 * 3) Record echo extras
 * -----------------------------------------------------------------------------
 */
const record = {
  id: "uuid",
  publicId: "OO-AA7E4404", // leaser customerIds
  fileType: "loan", // or null when omitted
  paymentStatus: "pending",
  paymentMode: "cash",
  installments: [],
  status: "sent_to_accounts",
  sent: true
};

const ledger = {
  loanAmount: 0,
  cashAmount: 0,
  remaining: 0,
  proposal: 200000,
  pi: 153775,
  fileCharges: 3000,
  gstCharges: 4114, // round((200000-153775)*0.089) because PI > 0
  others: 0,
  costOfSite: 160889, // PI + file + GST + others
  profit: 49111 // subtotal − costOfSite; ignore profit_ratio
};

/**
 * Leaser customerIds may be quotation ids or OO-* ids.
 * Collect Other on an OO file: SPA PUTs leaser onto that office_outside vendor
 * (collectVendorId), not Office Inside.
 *
 * QA:
 *   1. POST without fileType → 201, fileType null; later PATCH { fileType: "loan" } after Send → 200.
 *   2. PATCH payment-details { phases } → GET record.installments; GET quotations unchanged.
 *   3. Ledger PATCH { proposal: 200000, pi: 153775, fileCharges: 3000 } → gst + costOfSite computed.
 *   4. GET /office-outside?status=sent returns sent rows only.
 *   5. GET /subvendors/:outsideId/leaser → 200, not 404. PUT customerIds: ["OO-AA7E4404"].
 */
export {};
