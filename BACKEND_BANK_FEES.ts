// @ts-nocheck
/**
 * =============================================================================
 * BACKEND — Bank fees (loan / cash+loan; DB not localStorage)
 * =============================================================================
 *
 * No new routes. Persist on PATCH /quotations/:id/payment-details and the
 * Office Outside twin PATCH /admin/office-outside/:id/payment-details.
 *
 *   ALTER TABLE quotations ADD COLUMN IF NOT EXISTS bank_fees NUMERIC(14,2) DEFAULT 0;
 *   ALTER TABLE office_outside_records ADD COLUMN IF NOT EXISTS bank_fees NUMERIC(14,2) NOT NULL DEFAULT 0;
 *
 *   paid      = SUM(installment.paidAmount)     // never add fees
 *   remaining = subtotal − discount − bankFees − paid
 *               (quotations remaining uses amountAfterSubsidy as the subtotal base)
 *   completed when remaining ≤ 0
 *
 * Cash paymentType / fileType forces bankFees = 0.
 * Do not 400 VAL_012 / VAL_013 when paid + fees == subtotal.
 * Do not treat fees as Final Settlement d.
 * Do not use localStorage.
 *
 * Echo bankFees / bank_fees on GET list/detail and payment-details PATCH.
 *
 * Handoff: FE §70 / §BX · REQUIRED §CE · HANDOFF §86
 */

export function pickBankFeesRaw(body) {
  if (!body || typeof body !== 'object') return undefined
  return body.bankFees ?? body.bank_fees
}

export function parseBankFeesAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[₹,\s]/g, ''))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n)
}

export function resolvePersistedBankFees({ paymentType, requested, existing }) {
  const t = String(paymentType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_+-]+/g, '')
  if (t === 'cash') return 0
  if (requested != null) return requested
  return Math.max(0, Math.round(Number(existing) || 0))
}

/**
 * CHANGELOG Oct 30 2026 — Bank fees on payment-details  ← APPLY THIS
 *   PATCH /quotations/:id/payment-details (and office-outside twin)
 *   persist bankFees / bank_fees. Echo on GET. Cash = 0.
 */
