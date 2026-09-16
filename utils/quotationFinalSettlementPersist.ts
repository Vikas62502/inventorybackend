/**
 * Shared Final Settlement persist (§BB).
 * Used by POST /final-settlement and SPA fallbacks:
 * PATCH /pricing, /discount, /payment-details, /quotations.
 *
 * Math (authoritative — do not trust SPA absolute totals on retry):
 *   unpaidGap (d)     = max(0, amCap − existingDiscount − paid)   // Remaining only
 *   discountAmount    = SET max(existing, amCap − paid)           // so payable = paid
 *   finalSettlementAmount = unpaidGap (never existing + d again)
 * Never ADD discount on every /pricing or /discount retry.
 */

import type { Request } from 'express';
import {
  parseOptionalFinalSettlementRemarks
} from './quotationSettlementRemarks';

export type FinalSettlementPersistInput = {
  amountAfterSubsidy: number;
  paid: number;
  existingDiscount: number;
  /** Prior audit write-off (kept on idempotent retry when gap already 0). */
  existingFinalSettlementAmount?: number | null;
  body: Record<string, unknown>;
  actorId: string | null;
};

export type FinalSettlementPersistPatch = {
  discountAmount: number;
  discount: number;
  totalAmount: number;
  finalAmount: number;
  remainingAmount: 0;
  paymentStatus: 'completed';
  finalSettlementAmount: number;
  finalSettlementApplied: true;
  finalSettlementAt: Date;
  finalSettlementBy: string | null;
  finalSettlementRemarks?: string | null;
};

/** True when the request body is a Final Settlement write (any fallback endpoint). */
export const isFinalSettlementRequestBody = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body) return false;
  const applied =
    body.finalSettlementApplied === true ||
    body.final_settlement_applied === true ||
    String(body.finalSettlementApplied ?? body.final_settlement_applied ?? '')
      .trim()
      .toLowerCase() === 'true';
  if (applied) return true;
  const status = String(body.paymentStatus ?? body.payment_status ?? '')
    .trim()
    .toLowerCase();
  const remaining = Number(body.remaining ?? body.remainingAmount ?? body.remaining_amount);
  if (status === 'completed' && Number.isFinite(remaining) && remaining === 0) {
    // PATCH /pricing settlement shape: absolute discount + finalAmount without subtotal
    if (
      body.discountAmount !== undefined &&
      body.finalAmount !== undefined &&
      body.subtotal === undefined
    ) {
      return true;
    }
    // PATCH /payment-details settlement shape: completed + remaining 0 + write-off amount
    if (
      body.finalSettlementAmount !== undefined ||
      body.final_settlement_amount !== undefined ||
      body.amount !== undefined ||
      body.settlementAmount !== undefined ||
      body.discountAmount !== undefined ||
      body.discount_amount !== undefined
    ) {
      return true;
    }
  }
  return false;
};

const parseNonNegNumber = (raw: unknown): number => {
  if (raw === undefined || raw === null || String(raw).trim() === '') return NaN;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/**
 * Compute columns to persist for Final Settlement.
 * discountAmount is SET so payable = paid; finalSettlementAmount is unpaid gap only.
 * Body absolute discountAmount is ignored for growth (SPA may send existing+d again on retry).
 */
export const buildFinalSettlementPersistPatch = (
  input: FinalSettlementPersistInput
): FinalSettlementPersistPatch => {
  const {
    amountAfterSubsidy,
    paid,
    existingDiscount,
    existingFinalSettlementAmount,
    body,
    actorId
  } = input;

  const amCap = Math.max(0, Number(amountAfterSubsidy) || 0);
  const paidSafe = Math.min(Math.max(0, Number(paid) || 0), amCap);
  const existing = Math.max(0, Number(existingDiscount) || 0);

  // Absolute discount so payable (amCap − discount) = paid. SET — never ADD on retry.
  const discountToClear = Math.max(0, amCap - paidSafe);
  // Unpaid gap only = current Remaining (write-off d). Not doubled.
  const unpaidGap = Math.max(0, amCap - existing - paidSafe);

  let newDiscountAmount = Math.max(existing, discountToClear);
  if (newDiscountAmount > amCap) {
    newDiscountAmount = amCap;
  }

  const settlementFromBody = parseNonNegNumber(
    body.amount ?? body.settlementAmount ?? body.finalSettlementAmount ?? body.final_settlement_amount
  );
  const priorAudit = parseNonNegNumber(existingFinalSettlementAmount);

  let finalSettlementAmount: number;
  if (unpaidGap > 0.01) {
    // Authoritative server gap. Cap body if SPA accidentally sends absolute / doubled value.
    if (Number.isFinite(settlementFromBody) && settlementFromBody > 0) {
      finalSettlementAmount = Math.min(settlementFromBody, unpaidGap);
    } else {
      finalSettlementAmount = unpaidGap;
    }
  } else if (Number.isFinite(priorAudit) && priorAudit > 0) {
    // Idempotent retry after discount already cleared — keep prior write-off audit.
    finalSettlementAmount = priorAudit;
  } else if (Number.isFinite(settlementFromBody) && settlementFromBody > 0) {
    // AAS already clear (subtotal vs AAS mismatch) — accept AM write-off for audit only.
    // Cap to a sane upper bound so we never store existing+d doubled as the gap.
    const cap =
      discountToClear > 0.01 ? discountToClear : settlementFromBody;
    finalSettlementAmount = Math.min(settlementFromBody, cap);
  } else {
    finalSettlementAmount = 0;
  }

  const newTotalAmount = Math.max(0, amCap - newDiscountAmount);
  const remarksParsed = parseOptionalFinalSettlementRemarks(body);

  const patch: FinalSettlementPersistPatch = {
    discountAmount: newDiscountAmount,
    discount: newDiscountAmount,
    totalAmount: newTotalAmount,
    finalAmount: newTotalAmount,
    remainingAmount: 0,
    paymentStatus: 'completed',
    finalSettlementAmount,
    finalSettlementApplied: true,
    finalSettlementAt: new Date(),
    finalSettlementBy: actorId
  };

  if (remarksParsed !== undefined) {
    patch.finalSettlementRemarks = remarksParsed;
  } else if (
    Object.prototype.hasOwnProperty.call(body, 'remarks') ||
    Object.prototype.hasOwnProperty.call(body, 'finalSettlementRemarks') ||
    Object.prototype.hasOwnProperty.call(body, 'final_settlement_remarks')
  ) {
    patch.finalSettlementRemarks = null;
  }

  return patch;
};

export const settlementFieldsFromRequest = (req: Request): Record<string, unknown> =>
  (req.body && typeof req.body === 'object' ? req.body : {}) as Record<string, unknown>;
