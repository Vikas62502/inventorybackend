// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Accounts Proposal on admin approve (Oct 26 2026)
 * =============================================================================
 *
 * Status: IMPLEMENTED. No new HTTP path.
 * SPA: Admin approve PATCH /admin/quotations/:quotationId/status
 * Auth: admin JWT.
 *
 * Code: utils/approveProposal.ts · controllers/adminController.ts · models/Quotation.ts
 *       utils/quotationApiJson.ts · config/sequelizeBootstrap.ts
 *
 * -----------------------------------------------------------------------------
 * Schema
 * -----------------------------------------------------------------------------
 *   ALTER TABLE quotations ADD COLUMN IF NOT EXISTS proposal NUMERIC(14,2);
 *   MySQL: ALTER TABLE quotations ADD COLUMN proposal DECIMAL(14,2) NULL;
 *   subvendor_ledger.proposal already exists.
 *
 * -----------------------------------------------------------------------------
 * PATCH /admin/quotations/:quotationId/status
 * -----------------------------------------------------------------------------
 */
const PAYMENT_TYPES = ['loan', 'cash', 'mix'];

export function parseApproveProposalAmount(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

/**
 * Loan / Cash + loan: body.proposal (or proposalAmount) required, INR > 0.
 *   Else 400 VAL_PROPOSAL.
 * Cash: quotations.proposal = quotation subtotal. Body may omit proposal.
 *
 * Then upsert subvendor_ledger for that quotation: set only proposal
 * (and loan/cash if those were saved). Do not wipe PI / GST / others.
 * If the ledger upsert fails, still return 200 for the approve.
 *
 * On reject: quotations.proposal = null. Do not delete the ledger row.
 *
 * Echo proposal on PATCH, GET list (status=approved), and GET detail.
 */
export function resolveApproveProposalAmount({ paymentType, proposalRaw, quotationSubtotal }) {
  if (paymentType === 'cash') {
    return { ok: true, proposal: Math.max(0, Math.round(Number(quotationSubtotal) || 0)) };
  }
  const proposal = parseApproveProposalAmount(proposalRaw);
  if (proposal == null) {
    return {
      ok: false,
      code: 'VAL_PROPOSAL',
      message: 'proposal required for loan/mix approval (INR > 0)'
    };
  }
  return { ok: true, proposal };
}

export { PAYMENT_TYPES };

/**
 * CHANGELOG Oct 26 2026 — Proposal amount on approve  ← APPLY THIS
 *   Dedicated copy-paste: BACKEND_APPROVE_PROPOSAL.ts
 *   Loan / Cash + loan: body.proposal (or proposalAmount) required, INR > 0.
 */
