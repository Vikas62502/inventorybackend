// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Dealer leaser payments per subvendor (§BK, Oct 2026)
 * =============================================================================
 *
 * Status: IMPLEMENTED in this repo. Replaces SPA localStorage ("Leaser saved on this device").
 * SPA: on load GET /admin/subvendors/leaser; on Save PUT /admin/subvendors/:id/leaser.
 * Auth: admin JWT (routes after router.use(authorizeAdmin)) → non-admin 403 AUTH_004.
 *
 * Code: models/SubvendorLeaserPayment.ts · utils/subvendorApi.ts (parseLeaserPayments,
 *       publicLeaserPayment) · controllers/subvendorController.ts · routes/adminRoutes.ts
 *
 * -----------------------------------------------------------------------------
 * 1) Schema
 * -----------------------------------------------------------------------------
 *   subvendors (§BJ): file_cost_per_kw (default 1000), leaser_paid (default 0), leaser_remaining (default 0)
 *
 *   CREATE TABLE IF NOT EXISTS subvendor_leaser_payments (
 *     id           TEXT PRIMARY KEY,   -- §BM: client ids (lp-self-…) stored as sent
 *     vendor_id    UUID NOT NULL REFERENCES subvendors(id) ON DELETE CASCADE,
 *     date         DATE NULL,
 *     amount       NUMERIC(14,2) NOT NULL DEFAULT 0,
 *     type         VARCHAR(64) NOT NULL DEFAULT '',
 *     remark       TEXT NOT NULL DEFAULT '',
 *     customer_ids JSONB NOT NULL DEFAULT '[]',
 *     sort_order   INTEGER NOT NULL DEFAULT 0,
 *     updated_by   VARCHAR(50) NULL,
 *     created_at / updated_at TIMESTAMPTZ
 *   );
 *   Migration 20261007120000-create-subvendor-leaser-payments.js (+ boot ensure).
 *   Deleting a subvendor deletes its leaser payments (ledger rows are still kept, §BD).
 *
 * -----------------------------------------------------------------------------
 * 2) Vendor id
 * -----------------------------------------------------------------------------
 *   `:id` and `?vendorId=` accept the subvendor UUID, or a dealer id → that dealer's
 *   office_inside subvendor. Unknown → 404 SUBVENDOR_404 (GET list → empty arrays).
 *
 * -----------------------------------------------------------------------------
 * 3) Balance rule
 * -----------------------------------------------------------------------------
 *   currentBalance = leaserPaid = SUM(payment.amount). Starts at 0 (no payments).
 *   Never derived from file cost × kW. PUT writes subvendors.leaser_paid = SUM.
 *
 * -----------------------------------------------------------------------------
 * 4) Endpoints (/api/admin)
 * -----------------------------------------------------------------------------
 *   GET /subvendors/leaser?vendorId=        → all payments (optional vendor filter)
 */
const listResponse = {
  success: true,
  data: {
    payments: [/* LeaserPayment, ordered by vendor, sortOrder */],
    balances: [
      {
        vendorId: 'uuid', vendor_id: 'uuid', dealerId: 'dealer-id', dealer_id: 'dealer-id',
        currentBalance: 50000, current_balance: 50000,
        leaserPaid: 50000, leaser_paid: 50000,
        totalPayment: 50000, total_payment: 50000, // statement "Total payment"; Total remaining = Profit vendor − this (FE, §BN)
        leaserRemaining: 30000, leaser_remaining: 30000,
        fileCostPerKw: 1000, file_cost_per_kw: 1000
      }
    ]
  }
};
/**
 *   GET /subvendors/:id/leaser              → one vendor: same summary + payments[]
 *   PUT /subvendors/:id/leaser              → replace ALL payments for that vendor (transaction)
 */
const putBody = {
  leaserRemaining: 30000, // optional (snake leaser_remaining ok); omitted keeps stored value.
  //   Stored as sent (FE: Profit vendor − Total payment). Server never derives it (not from profit_ratio).
  payments: [
    // also accepted: { items }, { rows }, or a bare array
    {
      id: 'lp-self-Q-123-1', // optional; TEXT, kept verbatim (§BM). Absent → server UUID
      date: '2026-10-01', // = installment Due Date (§BQ). YYYY-MM-DD stored DATEONLY as sent (paymentDate / payment_date ok);
      //   DD/MM/YYYY or ISO → India calendar day; empty → null; invalid → 400 VAL_LEASER. Never NOW() / created_at.
      //   GET echoes date + paymentDate + payment_date as "YYYY-MM-DD".
      amount: 20000, // whole INR (rounded), >= 0
      type: 'cash', // free text, max 64
      remark: 'first',
      customerIds: ['quotation-id-1'], // or customer_ids; JSON string / comma list ok
      sortOrder: 1 // or sort_order / paymentNumber; missing / <= 0 → position (1-based)
    }
  ]
};
/** Response of GET one / PUT: */
const vendorResponse = {
  success: true,
  data: {
    vendorId: 'uuid', dealerId: 'dealer-id',
    currentBalance: 20000, leaserPaid: 20000, leaserRemaining: 30000, fileCostPerKw: 1000,
    // + snake_case twins
    payments: [
      {
        id: 'uuid', vendorId: 'uuid', vendor_id: 'uuid',
        date: '2026-10-01', amount: 20000, type: 'cash', remark: 'first',
        customerIds: ['quotation-id-1'], customer_ids: ['quotation-id-1'],
        sortOrder: 1, sort_order: 1, paymentNumber: 1,
        createdAt: '…', updatedAt: '…'
      }
    ]
  }
};
/**
 * Errors: VAL_LEASER (400, payments missing / bad date) · SUBVENDOR_404 · AUTH_004 · SYS_001.
 *
 * QA:
 *   1. New vendor → GET balance 0, no payments.
 *   2. PUT two payments (20,000 + 30,000) → balance 50,000; refresh / other login → same order.
 *   3. PUT [] → balance 0.
 *   4. PUT bad date → 400 VAL_LEASER, previous payments untouched.
 */

/**
 * -----------------------------------------------------------------------------
 * §BN (Oct 2026) — Office Inside table cost vs vendor cost — two separate amounts
 * -----------------------------------------------------------------------------
 *   | Where                         | Persisted on                               | Formula                         |
 *   | Office Inside table / Excel   | quotations.site_cost (siteCost / site_cost)| PI + others                     |
 *   | Subvendor dealer leaser       | subvendor_ledger.cost_of_site (costOfSite) | PI + file + GST + others        |
 *   Profit (table) = subtotal − siteCost · Profit vendor = subtotal − costOfSite · Total remaining = Profit vendor − Total payment.
 *   All maths FE-only. Backend stores each as sent:
 *     - PATCH /quotations/:id/payment-details { siteCost } → quotations.site_cost only (echoed on quotation + admin list / by-id)
 *     - PATCH /admin/subvendors/ledger/:quotationId { pi, others, fileCharges, gstCharges, proposal, costOfSite }
 *       → ledger only (echoed camel + snake on GET ledger)
 *     - Neither handler writes the other's column; leaser_remaining only changes when sent on the leaser PUT
 *       (never derived from profit_ratio).
 *   Example: PI 153775, file 3000, GST 5004 → table siteCost 153775, vendor costOfSite 161779.
 */
