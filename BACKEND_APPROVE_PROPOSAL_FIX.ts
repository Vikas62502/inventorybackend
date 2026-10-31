// @ts-nocheck
/**
 * =============================================================================
 * BACKEND — FIX: Approve 400 “proposal required for loan/mix approval (INR > 0)”
 * =============================================================================
 *
 * Live bug (Oct 30 2026): Admin Approve (Loan) with Proposal amount ₹1,60,000 still
 * returns VAL_PROPOSAL. Root cause: Zod/Joi pick() on PATCH /admin/quotations/:id/status
 * did not include proposal / proposalAmount / proposal_amount, so validate() stripped
 * them before the handler. Do not reject with typeof !== "number".
 *
 * No new routes. Apply on the live API.
 *
 * Code: validations/adminValidations.ts · utils/approveProposal.ts
 *       controllers/adminController.ts · BACKEND_APPROVE_PROPOSAL.ts
 *
 * Handoff: FE §71 / §BY · REQUIRED §CF · HANDOFF §87
 */

export function pickApproveProposalRaw(body) {
  if (!body || typeof body !== 'object') return undefined
  const nested =
    body.approval && typeof body.approval === 'object' && !Array.isArray(body.approval)
      ? body.approval
      : null
  return (
    body.proposal ??
    body.proposalAmount ??
    body.proposal_amount ??
    nested?.proposal ??
    nested?.proposalAmount ??
    nested?.proposal_amount
  )
}

/** Number or numeric string. Strip ₹ / commas / whitespace. Do not typeof !== "number". */
export function parseApproveProposalAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return null
  if (typeof raw === 'boolean') return null
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[₹,\s]/g, ''))
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n)
}

/**
 * Zod / Joi / pick() MUST keep these keys (and .passthrough()):
 *   proposal, proposalAmount, proposal_amount
 * Do not Number() in the schema — "1,60,000" must survive to parseApproveProposalAmount.
 *
 * Loan / mix 400 VAL_PROPOSAL only when none of them is INR > 0.
 * Cash still stores quotations.proposal = subtotal (body may omit proposal).
 * Persist and echo quotations.proposal. Upsert ledger proposal only (non-fatal).
 */
export function resolveApproveProposalAmount({ paymentType, proposalRaw, quotationSubtotal }) {
  if (paymentType === 'cash') {
    return { ok: true, proposal: Math.max(0, Math.round(Number(quotationSubtotal) || 0)) }
  }
  const proposal = parseApproveProposalAmount(proposalRaw ?? pickApproveProposalRaw(arguments[0]))
  if (proposal == null) {
    return {
      ok: false,
      code: 'VAL_PROPOSAL',
      message: 'proposal required for loan/mix approval (INR > 0)'
    }
  }
  return { ok: true, proposal }
}

/**
 * CHANGELOG Oct 30 2026 — Approve 400 even when Proposal amount is filled  ← APPLY THIS
 *   PATCH /admin/quotations/:id/status must read any of:
 *     proposal | proposalAmount | proposal_amount
 *   Parse as a number or numeric string. Do not reject with typeof !== "number".
 *   Add those keys to Joi / pick() so they are not stripped.
 */
