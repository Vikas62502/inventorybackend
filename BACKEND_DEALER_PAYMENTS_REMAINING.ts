// @ts-nocheck
/**
 * =============================================================================
 * BACKEND — Dealer Payments remaining must match Accounts  (Nov 24 2026)
 * =============================================================================
 * Frontend (shipped): /dashboard/payments Remaining =
 *   subtotal − discount − bankFees − SUM(installment paid)
 * Ignores API remaining:0 / paymentStatus:completed when installments still leave
 * a gap (e.g. ₹1,86,000 − ₹1,30,200 → ₹55,800 Partial).
 *
 * Backend must echo the same math (not amountAfterSubsidy / stale completed).
 *
 * HANDOFF §90 · REQUIRED §CI  (FE notes §76 / their §CD)
 * Related: BACKEND_DEALER_PAYMENTS_ALL.ts · §88 / §CG
 * =============================================================================
 */

/**
 * GET /api/quotations?status=approved (dealer JWT) + GET detail + admin list
 *
 * Remaining math (same as Account Management):
 *   paidAmount     = SUM(installment.paidAmount)   // never infer from remaining
 *   bankFees       = quotations.bank_fees (loan/mix only; else 0)
 *   discountAmount = quotations.discountAmount / discount
 *   cap            = max(0, subtotal − discountAmount − bankFees)
 *   remaining      = max(0, cap − paidAmount)
 *
 * Only force remaining = 0 when final settlement is applied:
 *   finalSettlementApplied === true  OR  finalSettlementAmount > 0
 *
 * Do NOT set remaining=0 solely because:
 *   - paymentStatus === "completed" while cap − paid > 0
 *   - amount-after-subsidy remaining is 0 while installment gap > 0
 *
 * Echo on every list row (includeMedia=false OK):
 *   subtotal, discountAmount, bankFees / bank_fees
 *   paidAmount, remaining / remainingAmount
 *   paymentStatus  — pending | partial | completed derived from installment math above
 *   installments / paymentPhases with paidAmount + paymentMode
 *   finalSettlementApplied / finalSettlementAmount
 *
 * Example (loan):
 *   subtotal 186000, paid 130200, bankFees 0, no settlement
 *   → remaining 55800, paymentStatus "partial"
 *
 * Checklist
 * [x] Dealer list remaining = subtotal − discount − bankFees − SUM(phase.paidAmount)
 * [x] paymentStatus matches that remaining (not stale completed)
 * [x] Settlement flags only clear remaining when actually settled
 * [x] Phases always present for Payments UI
 */

export {}
