/**
 * Accounts Proposal on admin approve. No new HTTP path.
 * PATCH /admin/quotations/:quotationId/status
 */

export const PAYMENT_TYPES = ['loan', 'cash', 'mix'] as const;
export type ApprovePaymentType = (typeof PAYMENT_TYPES)[number];

/**
 * Keep proposal aliases on the PATCH body. Zod/Joi pick() must include these
 * or validate() strips them and loan/mix 400s VAL_PROPOSAL even when the dialog is filled.
 */
export function pickApproveProposalRaw(
  body: Record<string, unknown> | null | undefined
): unknown {
  if (!body || typeof body !== 'object') return undefined;
  const nested =
    body.approval && typeof body.approval === 'object' && !Array.isArray(body.approval)
      ? (body.approval as Record<string, unknown>)
      : null;
  return (
    body.proposal ??
    body.proposalAmount ??
    body.proposal_amount ??
    nested?.proposal ??
    nested?.proposalAmount ??
    nested?.proposal_amount
  );
}

/** Body.proposal / proposalAmount / proposal_amount — number or numeric string (₹ / commas OK). */
export function parseApproveProposalAmount(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  if (typeof raw === 'boolean') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

export type ApproveProposalResult =
  | { ok: true; proposal: number }
  | { ok: false; code: 'VAL_PROPOSAL'; message: string };

/**
 * Loan / Cash + loan: body.proposal (or proposalAmount) required, INR > 0.
 * Cash: quotations.proposal = quotation subtotal (body may omit proposal).
 */
export function resolveApproveProposalAmount(args: {
  paymentType: ApprovePaymentType;
  proposalRaw?: unknown;
  quotationSubtotal: number;
}): ApproveProposalResult {
  if (args.paymentType === 'cash') {
    const S = Math.max(0, Math.round(Number(args.quotationSubtotal) || 0));
    return { ok: true, proposal: S };
  }
  const proposal = parseApproveProposalAmount(args.proposalRaw);
  if (proposal == null) {
    return {
      ok: false,
      code: 'VAL_PROPOSAL',
      message: 'proposal required for loan/mix approval (INR > 0)'
    };
  }
  return { ok: true, proposal };
}

export function serializeProposalApiFields(q: Record<string, unknown> | null | undefined) {
  if (!q) return { proposal: null, proposalAmount: null, proposal_amount: null };
  const raw = q.proposal ?? q.proposalAmount ?? q.proposal_amount;
  if (raw === undefined || raw === null || raw === '') {
    return { proposal: null, proposalAmount: null, proposal_amount: null };
  }
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return { proposal: null, proposalAmount: null, proposal_amount: null };
  return { proposal: n, proposalAmount: n, proposal_amount: n };
}
