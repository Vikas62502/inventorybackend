/**
 * Final settlement remarks (§BB) — optional notes from Account Management.
 * Accept aliases from POST /final-settlement and payment-details fallbacks.
 */

const REMARK_KEYS = [
  'finalSettlementRemarks',
  'final_settlement_remarks',
  'settlementRemarks',
  'remarks'
] as const;

/**
 * @returns trimmed string when a non-empty remark was sent;
 *          `null` when a remark key was sent empty/null (explicit clear);
 *          `undefined` when no remark field was present in the body.
 */
export const parseOptionalFinalSettlementRemarks = (
  body: Record<string, unknown> | null | undefined
): string | null | undefined => {
  if (!body) return undefined;
  let sent = false;
  for (const key of REMARK_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(body, key)) continue;
    sent = true;
    const raw = body[key];
    if (raw == null) continue;
    const trimmed = String(raw).trim();
    if (trimmed) return trimmed;
  }
  return sent ? null : undefined;
};

export const readFinalSettlementRemarksFromRow = (
  q: Record<string, unknown> | null | undefined
): string | null => {
  if (!q) return null;
  const raw = q.finalSettlementRemarks ?? q.final_settlement_remarks ?? null;
  if (raw == null) return null;
  const trimmed = String(raw).trim();
  return trimmed || null;
};
