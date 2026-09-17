/**
 * Shared Final Settlement persist (§BB).
 * Used by POST /final-settlement and SPA fallbacks:
 * PATCH /pricing, /discount, /payment-details, /quotations.
 *
 * Math (must match SPA — server authoritative, never trust inflated body):
 *   d = originalSubtotal − paid          // gap ONLY
 *   discountAmount = ABSOLUTE SET to d   // never ADD on retries
 *   finalSettlementAmount = d
 *   remaining = 0, paymentStatus = completed, finalSettlementApplied = true
 *
 * Cases:
 *   JYOTI  subtotal 2,75,000  paid 2,70,000  → d = 5,000
 *   ARTI   subtotal 2,90,000  paid 2,89,000  → d = 1,000 (not 2,000)
 */

import type { Request } from 'express';
import {
  parseOptionalFinalSettlementRemarks
} from './quotationSettlementRemarks';

export type FinalSettlementPersistInput = {
  /** Pricing AAS — caps totalAmount / finalAmount when AAS < AM subtotal. */
  amountAfterSubsidy: number;
  /** AM original subtotal (payment basis). */
  originalSubtotal: number;
  paid: number;
  existingDiscount: number;
  /** When true, idempotent — keep correct d; heal if previously doubled. */
  alreadyApplied?: boolean;
  existingSettlementAmount?: number | null;
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
    if (
      body.discountAmount !== undefined &&
      body.finalAmount !== undefined &&
      body.subtotal === undefined
    ) {
      return true;
    }
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

/**
 * d = originalSubtotal − paid (gap only).
 * discountAmount = SET d (never ADD). Body amounts are ignored for d.
 */
export const buildFinalSettlementPersistPatch = (
  input: FinalSettlementPersistInput
): FinalSettlementPersistPatch => {
  const {
    amountAfterSubsidy,
    originalSubtotal,
    paid,
    existingDiscount,
    alreadyApplied = false,
    existingSettlementAmount = null,
    body,
    actorId
  } = input;

  const basis = Math.max(0, Number(originalSubtotal) || Number(amountAfterSubsidy) || 0);
  const aas = Math.max(0, Number(amountAfterSubsidy) || basis);
  const paidNum = Math.max(0, Number(paid) || 0);
  const paidVsBasis = Math.min(paidNum, basis);
  const existing = Math.max(0, Number(existingDiscount) || 0);

  // Authoritative gap — ignore body amount/settlementAmount/discountAmount for d
  // (SPA retries may send existing+d twice → 2,000 when d is 1,000).
  const d = Math.max(0, basis - paidVsBasis);

  // AAS-capped discount for pricing columns when AM subtotal > server AAS.
  const aasClear = Math.max(0, aas - Math.min(paidNum, aas));
  const discountToStore = d > aas + 0.01 ? aasClear : Math.min(aas, d);

  let newDiscountAmount: number;
  let finalSettlementAmount: number;

  if (alreadyApplied) {
    const prior = Number(existingSettlementAmount);
    const priorOk = Number.isFinite(prior) && prior >= 0;
    // Heal doubled rows (e.g. ARTI stored 2,000 instead of 1,000).
    const looksDoubled =
      (priorOk && prior > d + 0.01) ||
      existing > discountToStore + 0.01;
    if (looksDoubled) {
      newDiscountAmount = discountToStore;
      finalSettlementAmount = d;
    } else {
      newDiscountAmount = existing;
      finalSettlementAmount = priorOk ? prior : d;
    }
  } else {
    newDiscountAmount = discountToStore;
    finalSettlementAmount = d;
  }

  const newTotalAmount = Math.max(0, aas - Math.min(newDiscountAmount, aas));
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
