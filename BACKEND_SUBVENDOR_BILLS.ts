// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Vendor Outside bills (§BX, Oct 23 2026)
 * =============================================================================
 *
 * Status: IMPLEMENTED. Vendor Outside → Manage → Bills persists on the API,
 * not on the device. Bills are a separate table from leaser payments.
 *
 * SPA: on load GET /admin/subvendors/:id/bills (or GET /admin/subvendors/bills).
 * On Save payments PUT /admin/subvendors/:id/bills (full replace).
 * Auth: admin JWT (same as other /admin/subvendors routes) → non-admin 403 AUTH_004.
 *
 * GST and profit vendor stay frontend: (subtotal − bill) × 9.8% and
 * loan − bill − charges − GST. Do not put bill rows on PUT /admin/subvendors/:id/leaser.
 *
 * Code: models/SubvendorBill.ts · utils/subvendorApi.ts (parseSubvendorBills,
 *       publicSubvendorBill) · controllers/subvendorController.ts · routes/adminRoutes.ts
 *
 * -----------------------------------------------------------------------------
 * 1) Schema
 * -----------------------------------------------------------------------------
 *
 *   CREATE TABLE IF NOT EXISTS subvendor_bills (
 *     id              TEXT PRIMARY KEY,
 *     vendor_id       UUID NOT NULL REFERENCES subvendors(id) ON DELETE CASCADE,
 *     date            DATE NULL,
 *     basic_amount    NUMERIC(14,2) NOT NULL DEFAULT 0,
 *     payment_mode    VARCHAR(64) NOT NULL DEFAULT '',
 *     remark          TEXT NOT NULL DEFAULT '',
 *     customer_ids    JSONB NOT NULL DEFAULT '[]',
 *     bill_file_name  VARCHAR(255) NOT NULL DEFAULT '',
 *     bill_file_data  TEXT NULL,          -- data URL (file max 2.5 MB)
 *     bill_file_url   TEXT NULL,          -- after object storage, if sent
 *     sort_order      INTEGER NOT NULL DEFAULT 0,
 *     updated_by      VARCHAR(50) NULL,
 *     created_at / updated_at TIMESTAMPTZ
 *   );
 *
 * -----------------------------------------------------------------------------
 * 2) Endpoints (/api/admin)
 * -----------------------------------------------------------------------------
 *
 *   GET  /subvendors/bills?vendorId=     all bills (optional vendor filter)
 *   GET  /subvendors/:id/bills           one vendor (UUID or dealer → office_inside)
 *   PUT  /subvendors/:id/bills           replace ALL bills for that vendor (transaction)
 *
 * Mount /bills before /:id. JSON body limit 5mb on PUT (file max 2.5 MB).
 * `:id` / `?vendorId=` = subvendor UUID (office_inside or office_outside) or dealer id.
 */
const putBody = {
  bills: [
    // also accepted: { items }, { rows }, or a bare array
    {
      id: 'bill-1', // optional TEXT, kept verbatim. Absent → server UUID
      date: '2026-10-01', // YYYY-MM-DD; paymentDate / payment_date ok
      basic: 10000, // whole INR; aliases basicAmount / amount
      paymentMode: 'cash', // aliases payment_mode / type
      remark: 'PI bill',
      customerIds: ['OO-1402E036', 'quotation-uuid'], // OO-* or UUID; invalid / missing → []
      billFileName: 'scan.pdf',
      billFileData: 'data:application/pdf;base64,...', // or dataUrl
      billFileUrl: null // optional after object storage
    }
  ]
};

const vendorResponse = {
  success: true,
  data: {
    vendorId: 'uuid',
    bills: [
      {
        id: 'bill-1',
        vendorId: 'uuid',
        date: '2026-10-01',
        basic: 10000,
        basicAmount: 10000,
        amount: 10000,
        paymentMode: 'cash',
        type: 'cash',
        remark: 'PI bill',
        customerIds: ['OO-1402E036'],
        billFileName: 'scan.pdf',
        billFileData: 'data:application/pdf;base64,...',
        billFileUrl: null
      }
    ]
  }
};

/**
 * Errors: VAL_BILL (400, bills missing / bad date / file > 2.5 MB) · SUBVENDOR_404 · AUTH_004 · SYS_001.
 *
 * QA:
 *   1. New vendor → GET bills [].
 *   2. PUT one bill with date, basic, paymentMode, OO-* customerIds, data-URL file
 *      → GET same row after refresh / other login.
 *   3. PUT [] → bills empty. Leaser PUT must not create/delete bills.
 *   4. Omit file on re-save of the same id → previous file kept.
 *   5. File > 2.5 MB → 400 VAL_BILL, previous bills untouched.
 */
export {};
