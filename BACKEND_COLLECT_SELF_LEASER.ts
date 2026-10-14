// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Payment management Office: Chairbord / Other / Self (§BM + §BU, Oct 2026)
 * =============================================================================
 * FE labels this §BK / HANDOFF §57; those numbers are taken in this repo.
 *
 * Status: IMPLEMENTED in this repo. No new routes — two persist changes.
 *
 * -----------------------------------------------------------------------------
 * 1) Installment "Collected by" — collectDestination / collectVendorId / collectKind / split amounts
 * -----------------------------------------------------------------------------
 *   Routes: PUT /api/quotations/:id/installments · PATCH /api/quotations/:id/payment-details
 *   Each Cash/UPI phase sends who collected the money:
 */
const phase = {
  phaseNumber: 1,
  phaseName: 'Advance',
  amount: 50000,
  paidAmount: 50000,
  paymentMode: 'cash', // or 'upi'
  collectDestination: 'other', // 'chairbord' (default) | 'other' | 'self'; snake collect_destination ok
  collectVendorId: 'vend-123', // office-inside subvendor id, only kept when 'other'; snake collect_vendor_id ok
  collectKind: 'partial', // 'complete' (default) | 'partial' — when other / self; snake collect_kind ok
  collectSelfAmount: 20000, // amount for that leaser (other) or self; snake collect_self_amount ok
  collectChairbordAmount: 30000, // remainder = paidAmount − collectSelfAmount; snake collect_chairbord_amount ok
  transactionId: null
};
/**
 *   Columns on quotation_payment_phases (boot ensure + migrations 20261008120000 / 20261009120000 / 20261014120000):
 *     "collectDestination" VARCHAR(16), "collectVendorId" VARCHAR(64), "collectKind" VARCHAR(16),
 *     "collectSelfAmount" NUMERIC(14,2), "collectChairbordAmount" NUMERIC(14,2) — all NULL-able.
 *
 *   Normalisation (utils/paymentMode.ts → normalizeCollectFields), amounts whole INR, always sum to paidAmount:
 *     | mode            | destination sent            | stored                                                         |
 *     | loan/bank/none  | anything                    | all five null                                                  |
 *     | cash/upi        | missing / chairbord         | chairbord, vendor null, kind null, self 0, chairbord = paid    |
 *     | cash/upi        | other|self (+ complete/none)| dest, complete, self = paid, chairbord 0                       |
 *     | cash/upi        | other|self + partial        | dest, partial, self = sent (≤ paid; else paid − chairbord      |
 *     |                 |                             | sent), chairbord = paid − self                                 |
 *     collectVendorId: stored as sent for 'other' (aliases collect_vendor_id / collectSubvendorId); null otherwise.
 *     'office' / 'subvendor' / 'office_subvendor' are read as 'other'.
 *   - Unknown / extra phase keys (e.g. collectVendorName) are stripped, never 400.
 *   - GET (quotation list / by-id, admin list / by-id) echoes all five in camel + snake on every phase,
 *     so the dialog reopens as Other + the chosen office + amount. Legacy Cash/UPI null destination → chairbord.
 *   - The installment handler does NOT create leaser rows — the SPA does the leaser PUT below:
 *       chairbord → no leaser row · other/self + complete → amount = paidAmount · partial → amount = collectSelfAmount
 *
 * -----------------------------------------------------------------------------
 * 2) Leaser payment ids stay as sent (`lp-collect-…`, old `lp-self-…`)
 * -----------------------------------------------------------------------------
 *   After saving installments the SPA calls PUT /api/admin/subvendors/:id/leaser on the chosen office with
 *   payments whose id is `lp-collect-{quotationId}-{phaseNumber}` (older saves: `lp-self-…`).
 *   - subvendor_leaser_payments.id is TEXT; client ids are stored verbatim, never replaced by a UUID.
 *     Rows without an id still get a server UUID.
 *   - Re-saving the same ids replaces rows (no duplicates).
 *   - Same id twice in one body → last one wins.
 *   - An id currently owned by another vendor moves to this vendor (e.g. Other office changed); that vendor's
 *     leaser_paid is recomputed.
 */
const leaserPut = {
  payments: [
    { id: 'lp-collect-Q-123-1', date: '2026-10-08', amount: 20000, type: 'other', customerIds: ['Q-123'], sortOrder: 1 }
  ]
};
/**
 * QA:
 *   1. Phase 1 Cash + Other (office A, partial 20000 of 50000), phase 2 UPI + Chairbord, phase 3 Loan → save →
 *      refresh → GET phase 1 other / vend id / partial / 20000 / 30000; phase 2 chairbord; phase 3 all null.
 *   2. Save twice → office A leaser list has one `lp-collect-{quotationId}-{phase}` row per phase (no duplicates).
 *   3. Balance = SUM(amount) = leaser_paid = totalPayment.
 *   4. Self + Complete still works (collectVendorId null).
 *   5. Cash phase saved without collectDestination → GET chairbord, self 0, chairbord = paid.
 *   6. Due Date 18/09/2026 → GET leaser date "2026-09-18"; GET installments dueDate / due_date "2026-09-18" (§BQ).
 *
 *   Statement CSV (FE-only): Total payment = sum of leaser payments; Total remaining = Total profit − Total payment.
 *
 * Code: utils/paymentMode.ts, utils/quotationPaymentPhases.ts, models/QuotationPaymentPhase.ts,
 *       validations/quotationValidations.ts, controllers/quotationController.ts (normalizePaymentPhases),
 *       controllers/adminController.ts (phase echo), models/SubvendorLeaserPayment.ts,
 *       utils/subvendorApi.ts (parseLeaserPayments), controllers/subvendorController.ts (replaceVendorLeaser),
 *       config/sequelizeBootstrap.ts.
 */
