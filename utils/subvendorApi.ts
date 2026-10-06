import {
  SUBVENDOR_LEDGER_AMOUNT_FIELDS,
  SubvendorLedgerAmountField
} from '../models/SubvendorLedger';

export const SUBVENDOR_KINDS = ['office_inside', 'office_outside'] as const;
export type SubvendorKindValue = (typeof SUBVENDOR_KINDS)[number];

export const SUBVENDOR_ERROR_CODES = {
  AUTH_004: 'AUTH_004',
  VAL_KIND: 'VAL_KIND',
  VAL_DEALER: 'VAL_DEALER',
  VAL_NAME: 'VAL_NAME',
  SUBVENDOR_DUP: 'SUBVENDOR_DUP',
  SUBVENDOR_404: 'SUBVENDOR_404',
  QUOTATION_404: 'QUOTATION_404'
} as const;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value.trim());

/** INR amounts are stored as whole rupees; negatives / NaN clamp to 0. */
export const roundInr = (value: unknown): number => {
  const n = Math.round(Number(value) || 0);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

const str = (value: unknown): string => (value == null ? '' : String(value).trim());

/** Profit ratio is a percent 0–100 with two decimals. Missing / invalid → 0. */
export const roundProfitRatio = (value: unknown): number => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(Math.min(100, Math.max(0, n)) * 100) / 100;
};

export const DEFAULT_FILE_COST_PER_KW = 1000;

/** File cost per kW in whole INR; missing / 0 / invalid → 1000. */
export const roundFileCostPerKw = (value: unknown): number => roundInr(value) || DEFAULT_FILE_COST_PER_KW;

type SubvendorRateFields = {
  profitRatio: number;
  fileCostPerKw: number;
  leaserPaid: number;
  leaserRemaining: number;
};

/** Only keys present in the body (camel or snake), so PATCH keeps stored values for the rest. */
export const parseSubvendorRateFields = (body: Record<string, unknown>): Partial<SubvendorRateFields> => {
  const out: Partial<SubvendorRateFields> = {};
  const pick = (camel: string, snake: string): unknown =>
    body[camel] !== undefined ? body[camel] : body[snake];
  const profitRatio = pick('profitRatio', 'profit_ratio');
  if (profitRatio !== undefined) out.profitRatio = roundProfitRatio(profitRatio);
  const fileCostPerKw = pick('fileCostPerKw', 'file_cost_per_kw');
  if (fileCostPerKw !== undefined) out.fileCostPerKw = roundFileCostPerKw(fileCostPerKw);
  const leaserPaid = pick('leaserPaid', 'leaser_paid');
  if (leaserPaid !== undefined) out.leaserPaid = roundInr(leaserPaid);
  const leaserRemaining = pick('leaserRemaining', 'leaser_remaining');
  if (leaserRemaining !== undefined) out.leaserRemaining = roundInr(leaserRemaining);
  return out;
};

export const normalizeSubvendorKind = (raw: unknown): SubvendorKindValue | null => {
  const key = str(raw).toLowerCase().replace(/[\s-]+/g, '_');
  if (key === 'office_inside' || key === 'inside') return 'office_inside';
  if (key === 'office_outside' || key === 'outside') return 'office_outside';
  return null;
};

type RowLike = Record<string, any>;

export const publicSubvendor = (row: RowLike) => {
  const dealerId = row.dealerId || row.dealer_id || '';
  const contactName = row.contactName || row.contact_name || '';
  const profitRatio = roundProfitRatio(row.profitRatio ?? row.profit_ratio);
  const fileCostPerKw = roundFileCostPerKw(row.fileCostPerKw ?? row.file_cost_per_kw);
  const leaserPaid = roundInr(row.leaserPaid ?? row.leaser_paid);
  const leaserRemaining = roundInr(row.leaserRemaining ?? row.leaser_remaining);
  return {
    id: row.id,
    kind: row.kind,
    dealerId,
    dealer_id: dealerId,
    name: row.name,
    contactName,
    contact_name: contactName,
    mobile: row.mobile || '',
    email: row.email || '',
    city: row.city || '',
    category: row.category || 'Other',
    notes: row.notes || '',
    profitRatio,
    profit_ratio: profitRatio,
    fileCostPerKw,
    file_cost_per_kw: fileCostPerKw,
    leaserPaid,
    leaser_paid: leaserPaid,
    leaserRemaining,
    leaser_remaining: leaserRemaining,
    createdAt: row.createdAt || row.created_at,
    created_at: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
    updated_at: row.updatedAt || row.updated_at
  };
};

export const publicLedger = (row: RowLike) => {
  const quotationId = row.quotationId || row.quotation_id;
  const vendorId = row.vendorId || row.vendor_id || null;
  const loanAmount = roundInr(row.loanAmount ?? row.loan_amount);
  const receivedAmount = roundInr(row.receivedAmount ?? row.received_amount);
  const costOfSite = roundInr(row.costOfSite ?? row.cost_of_site);
  const fileCharges = roundInr(row.fileCharges ?? row.file_charges);
  const gstCharges = roundInr(row.gstCharges ?? row.gst_charges);
  const updatedAt = row.updatedAt || row.updated_at;
  return {
    quotationId,
    quotation_id: quotationId,
    vendorId,
    vendor_id: vendorId,
    loanAmount,
    loan_amount: loanAmount,
    receivedAmount,
    received_amount: receivedAmount,
    remaining: roundInr(row.remaining),
    proposal: roundInr(row.proposal),
    costOfSite,
    cost_of_site: costOfSite,
    fileCharges,
    file_charges: fileCharges,
    pi: roundInr(row.pi),
    gstCharges,
    gst_charges: gstCharges,
    others: roundInr(row.others),
    updatedAt,
    updated_at: updatedAt
  };
};

const LEDGER_SNAKE_ALIASES: Partial<Record<SubvendorLedgerAmountField, string>> = {
  loanAmount: 'loan_amount',
  receivedAmount: 'received_amount',
  costOfSite: 'cost_of_site',
  fileCharges: 'file_charges',
  gstCharges: 'gst_charges'
};

/** Only keys present in the body — missing keys must not reset existing columns. */
export const parseLedgerAmountPatch = (
  body: Record<string, unknown> | null | undefined
): Partial<Record<SubvendorLedgerAmountField, number>> => {
  const patch: Partial<Record<SubvendorLedgerAmountField, number>> = {};
  if (!body) return patch;
  for (const field of SUBVENDOR_LEDGER_AMOUNT_FIELDS) {
    const snake = LEDGER_SNAKE_ALIASES[field];
    const raw = body[field] !== undefined ? body[field] : snake ? body[snake] : undefined;
    if (raw === undefined || raw === null) continue;
    patch[field] = roundInr(raw);
  }
  return patch;
};

/** Profile fields shared by create + update (camel / snake). Only keys present are returned. */
export const parseSubvendorProfileFields = (
  body: Record<string, unknown>
): Partial<Record<'name' | 'contactName' | 'mobile' | 'email' | 'city' | 'category' | 'notes', string>> => {
  const out: Partial<Record<'name' | 'contactName' | 'mobile' | 'email' | 'city' | 'category' | 'notes', string>> = {};
  const pick = (camel: string, snake?: string): unknown =>
    body[camel] !== undefined ? body[camel] : snake ? body[snake] : undefined;
  const assign = (key: keyof typeof out, raw: unknown) => {
    if (raw !== undefined) out[key] = str(raw);
  };
  assign('name', pick('name'));
  assign('contactName', pick('contactName', 'contact_name'));
  assign('mobile', pick('mobile'));
  assign('email', pick('email'));
  assign('city', pick('city'));
  assign('category', pick('category'));
  assign('notes', pick('notes'));
  if (out.category === '') out.category = 'Other';
  return out;
};

export const parseSubvendorDealerId = (body: Record<string, unknown>): string | undefined => {
  const raw = body.dealerId !== undefined ? body.dealerId : body.dealer_id;
  if (raw === undefined) return undefined;
  return str(raw);
};
