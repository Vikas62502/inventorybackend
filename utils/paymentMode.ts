/** Canonical payment mode values stored and returned by the API (lowercase). */
export const ALLOWED_PAYMENT_MODES = [
  'cash',
  'upi',
  'loan',
  'netbanking',
  'bank_transfer',
  'cheque',
  'card',
  'mix'
] as const;

export type CanonicalPaymentMode = (typeof ALLOWED_PAYMENT_MODES)[number];

const allowedSet = new Set<string>(ALLOWED_PAYMENT_MODES);

/**
 * Normalize client input (any casing, spaces, hyphens) to a canonical mode or undefined.
 */
export function normalizePaymentModeInput(input: unknown): CanonicalPaymentMode | undefined {
  if (input === undefined || input === null || input === '') return undefined;
  let s = String(input).trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'banktransfer') s = 'bank_transfer';
  if (allowedSet.has(s)) return s as CanonicalPaymentMode;
  return undefined;
}

export function normalizePaymentModeForStorage(input: unknown): string | null {
  const n = normalizePaymentModeInput(input);
  return n ?? null;
}

/**
 * Final Settlement is only for Cash and Cash + loan (mix).
 * Loan-only quotations must not settle via API (FE also hides the button).
 * Prefer paymentType (loan|cash|mix); fall back to paymentMode when type is missing.
 */
export function isLoanOnlyPaymentType(quotation: {
  paymentType?: string | null;
  paymentMode?: string | null;
  payment_type?: string | null;
  payment_mode?: string | null;
} | null | undefined): boolean {
  if (!quotation) return false;
  const type = String(
    quotation.paymentType ?? quotation.payment_type ?? ''
  )
    .trim()
    .toLowerCase();
  const mode = String(
    quotation.paymentMode ?? quotation.payment_mode ?? ''
  )
    .trim()
    .toLowerCase();
  const key = type || mode;
  return key === 'loan';
}

export const FINAL_SETTLEMENT_LOAN_ONLY_MESSAGE =
  'Final settlement is only for Cash and Cash + loan';

export type CollectDestination = 'self' | 'chairbord' | 'other';
export type CollectKind = 'complete' | 'partial';

export type CollectFields = {
  collectDestination: CollectDestination | null;
  collectVendorId: string | null;
  collectKind: CollectKind | null;
  collectSelfAmount: number | null;
  collectChairbordAmount: number | null;
};

const NO_COLLECT: CollectFields = {
  collectDestination: null,
  collectVendorId: null,
  collectKind: null,
  collectSelfAmount: null,
  collectChairbordAmount: null
};

const OTHER_DESTINATIONS = new Set(['other', 'office', 'subvendor', 'office_subvendor', 'other_office']);

const collectKey = (value: unknown) =>
  String(value ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_');

const wholeInr = (value: unknown): number => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/**
 * Cash/UPI "Collected by": Chairbord (default) | Other (office-inside subvendor) | Self.
 * Other / Self → Complete | Partial; `collectSelfAmount` is the share for that leaser (Other) or self.
 * `collectVendorId` is kept as sent for Other only. Other modes (loan / bank / missing) → all null.
 * Amounts are whole INR and always sum to `paidAmount`:
 *   chairbord               → chairbord = paid, self = 0
 *   other|self + complete   → self = paid, chairbord = 0
 *   other|self + partial    → self as sent (capped at paid; else paid − chairbord sent), chairbord = paid − self
 */
export function normalizeCollectFields(
  input: {
    destination?: unknown;
    vendorId?: unknown;
    kind?: unknown;
    selfAmount?: unknown;
    chairbordAmount?: unknown;
  },
  paymentMode: unknown,
  paidAmount: unknown
): CollectFields {
  const mode = normalizePaymentModeInput(paymentMode);
  if (mode !== 'cash' && mode !== 'upi') return NO_COLLECT;
  const paid = wholeInr(paidAmount);
  const key = collectKey(input.destination);
  const dest: CollectDestination = OTHER_DESTINATIONS.has(key) ? 'other' : key === 'self' ? 'self' : 'chairbord';
  if (dest === 'chairbord') {
    return {
      collectDestination: 'chairbord',
      collectVendorId: null,
      collectKind: null,
      collectSelfAmount: 0,
      collectChairbordAmount: paid
    };
  }
  const collectVendorId = dest === 'other' ? String(input.vendorId ?? '').trim() || null : null;
  if (collectKey(input.kind) !== 'partial') {
    return {
      collectDestination: dest,
      collectVendorId,
      collectKind: 'complete',
      collectSelfAmount: paid,
      collectChairbordAmount: 0
    };
  }
  const hasSelf = input.selfAmount !== undefined && input.selfAmount !== null && input.selfAmount !== '';
  const self = hasSelf
    ? Math.min(wholeInr(input.selfAmount), paid)
    : Math.max(0, paid - Math.min(wholeInr(input.chairbordAmount), paid));
  return {
    collectDestination: dest,
    collectVendorId,
    collectKind: 'partial',
    collectSelfAmount: self,
    collectChairbordAmount: paid - self
  };
}

/** Read collect inputs from a phase body (camel or snake). */
export const pickCollectInput = (phase: Record<string, unknown>) => ({
  destination: phase.collectDestination ?? phase.collect_destination,
  vendorId:
    phase.collectVendorId ??
    phase.collect_vendor_id ??
    phase.collectSubvendorId ??
    phase.collect_subvendor_id,
  kind: phase.collectKind ?? phase.collect_kind,
  selfAmount: phase.collectSelfAmount ?? phase.collect_self_amount,
  chairbordAmount: phase.collectChairbordAmount ?? phase.collect_chairbord_amount
});
