/**
 * Bank fees on loan / cash+loan. Cash = 0. Never add fees to paid.
 * remaining = base − discount − bankFees − paid.
 * See BACKEND_BANK_FEES.ts
 */

import { normalizePaymentType } from './cashLoanAmounts';

export const pickBankFeesRaw = (
  body: Record<string, unknown> | null | undefined
): unknown => {
  if (!body || typeof body !== 'object') return undefined;
  return body.bankFees ?? body.bank_fees;
};

/** INR ≥ 0, whole rupees. Missing / invalid → null (keep existing). */
export function parseBankFeesAmount(raw: unknown): number | null {
  if (raw === undefined || raw === null || raw === '') return null;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[₹,\s]/g, ''));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n);
}

export function resolvePersistedBankFees(args: {
  paymentType?: string | null;
  requested: number | null;
  existing?: unknown;
}): number {
  if (normalizePaymentType(args.paymentType) === 'cash') return 0;
  if (args.requested != null) return args.requested;
  const existing = Math.round(Number(args.existing) || 0);
  return Number.isFinite(existing) && existing > 0 ? existing : 0;
}

export function readBankFeesFromRow(
  q: Record<string, unknown> | null | undefined,
  paymentTypeHint?: string | null
): number {
  if (!q) return 0;
  const paymentType =
    paymentTypeHint ??
    q.paymentType ??
    q.payment_type ??
    q.filePaymentType ??
    q.file_payment_type ??
    q.fileType ??
    q.file_type ??
    q.paymentMode ??
    q.payment_mode;
  if (normalizePaymentType(paymentType as string) === 'cash') return 0;
  const n = Math.round(Number(q.bankFees ?? q.bank_fees ?? 0) || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function serializeBankFeesFields(q: Record<string, unknown> | null | undefined) {
  const n = readBankFeesFromRow(q);
  return { bankFees: n, bank_fees: n };
}

export function remainingAfterBankFees(args: {
  base: number | null | undefined;
  discount?: number | null;
  bankFees?: number | null;
  paid?: number | null;
}): number {
  const base = Number(args.base) || 0;
  const discount = Math.max(0, Number(args.discount) || 0);
  const fees = Math.max(0, Number(args.bankFees) || 0);
  const paid = Number(args.paid);
  const safePaid = Number.isFinite(paid) ? paid : 0;
  return Math.max(0, base - discount - fees - safePaid);
}
