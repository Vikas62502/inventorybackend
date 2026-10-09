// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Office Inside Collect self / To Chairbord (§BM, Oct 2026)
 * =============================================================================
 *
 * Status: IMPLEMENTED in this repo. No new routes — two persist changes.
 *
 * -----------------------------------------------------------------------------
 * 1) Installment "Collected by" — collectDestination / collectKind / split amounts
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
  collectDestination: 'self', // 'self' | 'chairbord' (default); snake collect_destination ok
  collectKind: 'partial', // 'complete' (default) | 'partial' — only when self; snake collect_kind ok
  collectSelfAmount: 20000, // snake collect_self_amount ok
  collectChairbordAmount: 30000, // snake collect_chairbord_amount ok
  transactionId: null
};
/**
 *   Columns on quotation_payment_phases (boot ensure + migrations 20261008120000 / 20261009120000):
 *     "collectDestination" VARCHAR(16), "collectKind" VARCHAR(16),
 *     "collectSelfAmount" NUMERIC(14,2), "collectChairbordAmount" NUMERIC(14,2) — all NULL-able.
 *
 *   Normalisation (utils/paymentMode.ts → normalizeCollectFields), amounts whole INR, always sum to paidAmount:
 *     | mode            | destination sent      | stored                                                           |
 *     | loan/bank/none  | anything              | all four null                                                    |
 *     | cash/upi        | missing / chairbord   | chairbord, kind null, self 0, chairbord = paid                   |
 *     | cash/upi        | self (+ complete/none)| self, complete, self = paid, chairbord 0                         |
 *     | cash/upi        | self + partial        | self, partial, self = sent (≤ paid; else paid − chairbord sent), |
 *     |                 |                       | chairbord = paid − self                                          |
 *   - Unknown / extra phase keys are stripped, never 400.
 *   - GET (quotation list / by-id, admin list / by-id) echoes all four in camel + snake on every phase.
 *     Legacy Cash/UPI rows with null destination read back as chairbord.
 *   - The installment handler does NOT create leaser rows — the SPA does the leaser PUT below:
 *       chairbord → no leaser row · self + complete → amount = paidAmount · self + partial → amount = collectSelfAmount
 *
 * -----------------------------------------------------------------------------
 * 2) Leaser payment ids stay `lp-self-…`
 * -----------------------------------------------------------------------------
 *   After saving installments the SPA calls PUT /api/admin/subvendors/:id/leaser (§BK) with
 *   payments whose id is `lp-self-{quotationId}-{phaseNumber}`.
 *   - subvendor_leaser_payments.id is now TEXT (was UUID); client ids are stored verbatim.
 *     Rows without an id still get a server UUID.
 *   - Re-saving the same ids replaces rows (no duplicates).
 *   - Same id twice in one body → last one wins.
 *   - An id currently owned by another vendor moves to this vendor; that vendor's leaser_paid
 *     is recomputed.
 */
const leaserPut = {
  payments: [
    { id: 'lp-self-Q-123-1', date: '2026-10-08', amount: 50000, type: 'self', customerIds: ['Q-123'], sortOrder: 1 }
  ]
};
/**
 * QA:
 *   1. Office Inside: phase 1 Cash + Collect self, phase 2 UPI + To Chairbord → save → refresh →
 *      GET phases show self / chairbord; loan phase null.
 *   2. Save twice → leaser list has one `lp-self-{quotationId}-{phase}` row per phase (no duplicates).
 *   3. Balance = SUM(amount) = leaser_paid = totalPayment (§BK).
 *   4. Self + Partial 20000 of 50000 → GET phase self/partial/20000/30000; leaser row amount 20000.
 *   5. Cash phase saved without collectDestination → GET chairbord, self 0, chairbord = paid.
 *
 *   Statement CSV (FE-only): Total payment = sum of leaser payments; Total remaining = Total profit − Total payment.
 *
 * Code: utils/paymentMode.ts, utils/quotationPaymentPhases.ts, models/QuotationPaymentPhase.ts,
 *       validations/quotationValidations.ts, controllers/quotationController.ts (normalizePaymentPhases),
 *       controllers/adminController.ts (phase echo), models/SubvendorLeaserPayment.ts,
 *       utils/subvendorApi.ts (parseLeaserPayments), controllers/subvendorController.ts (replaceVendorLeaser),
 *       config/sequelizeBootstrap.ts.
 */
