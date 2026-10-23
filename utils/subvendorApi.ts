import {
  SUBVENDOR_LEDGER_AMOUNT_FIELDS,
  SubvendorLedgerAmountField
} from '../models/SubvendorLedger';
import { toDateOnly, toDateOnlyOrNull } from './dateOnly';

export const SUBVENDOR_KINDS = ['office_inside', 'office_outside'] as const;
export type SubvendorKindValue = (typeof SUBVENDOR_KINDS)[number];

export const SUBVENDOR_ERROR_CODES = {
  AUTH_004: 'AUTH_004',
  VAL_KIND: 'VAL_KIND',
  VAL_DEALER: 'VAL_DEALER',
  VAL_NAME: 'VAL_NAME',
  SUBVENDOR_DUP: 'SUBVENDOR_DUP',
  SUBVENDOR_404: 'SUBVENDOR_404',
  QUOTATION_404: 'QUOTATION_404',
  VAL_LEASER: 'VAL_LEASER',
  VAL_BILL: 'VAL_BILL'
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

/**
 * Leaser date = Accounts installment Due Date, stored DATEONLY exactly as sent (YYYY-MM-DD).
 * Also accepts DD/MM/YYYY and timestamps (India calendar day). Empty → null; unparseable → undefined.
 */
const parseLeaserDate = (raw: unknown): string | null | undefined => {
  const s = str(raw);
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s) && !/^\d{4}-\d{2}-\d{2}T/.test(s)) return toDateOnly(s.slice(0, 10));
  return toDateOnly(s);
};

/** Quotation ids and/or OO-* office-outside public ids. Invalid / missing → []. */
const parseCustomerIds = (raw: unknown): string[] => {
  if (Array.isArray(raw)) return raw.map(str).filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(str).filter(Boolean);
    } catch {
      /* comma list */
    }
    return raw.split(',').map(str).filter(Boolean);
  }
  return [];
};

export type LeaserPaymentInput = {
  /** Client id kept verbatim (e.g. `lp-self-{quotationId}-{phaseNumber}`); absent → server UUID. */
  id?: string;
  date: string | null;
  amount: number;
  type: string;
  remark: string;
  customerIds: string[];
  sortOrder: number;
};

/** PUT body → payments list. Accepts `{ payments }`, `{ items }`, `{ rows }` or a bare array. */
export const parseLeaserPayments = (
  body: unknown
): { ok: true; payments: LeaserPaymentInput[] } | { ok: false; message: string } => {
  const b = body as Record<string, unknown> | unknown[] | null;
  const list = Array.isArray(b)
    ? b
    : b && typeof b === 'object'
      ? (b.payments ?? b.items ?? b.rows ?? b.leaserPayments ?? b.leaser_payments)
      : undefined;
  if (!Array.isArray(list)) return { ok: false, message: 'payments must be an array' };

  const payments: LeaserPaymentInput[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const row = (list[i] || {}) as Record<string, unknown>;
    const date = parseLeaserDate(row.date ?? row.paymentDate ?? row.payment_date);
    if (date === undefined) return { ok: false, message: `payments[${i}].date is not a valid date` };
    const sortRaw = Number(row.sortOrder ?? row.sort_order ?? row.paymentNumber ?? row.payment_number);
    const id = str(row.id ?? row.key).slice(0, 255);
    payments.push({
      ...(id ? { id } : {}),
      date,
      amount: roundInr(row.amount),
      type: str(row.type ?? row.paymentType ?? row.payment_type).slice(0, 64),
      remark: str(row.remark ?? row.remarks ?? row.note),
      customerIds: parseCustomerIds(row.customerIds ?? row.customer_ids),
      sortOrder: Number.isInteger(sortRaw) && sortRaw > 0 ? sortRaw : i + 1
    });
  }
  // Same id twice in one save → keep the last occurrence.
  const lastIndexById = new Map<string, number>();
  payments.forEach((p, i) => {
    if (p.id) lastIndexById.set(p.id, i);
  });
  const deduped = payments.filter((p, i) => !p.id || lastIndexById.get(p.id) === i);
  return { ok: true, payments: deduped };
};

export const publicLeaserPayment = (row: RowLike) => {
  const vendorId = row.vendorId || row.vendor_id;
  const customerIds = Array.isArray(row.customerIds ?? row.customer_ids)
    ? (row.customerIds ?? row.customer_ids)
    : [];
  const sortOrder = Number(row.sortOrder ?? row.sort_order) || 0;
  const amount = roundInr(row.amount);
  const date = toDateOnlyOrNull(row.date);
  return {
    id: row.id,
    vendorId,
    vendor_id: vendorId,
    date,
    paymentDate: date,
    payment_date: date,
    amount,
    type: row.type || '',
    remark: row.remark || '',
    customerIds,
    customer_ids: customerIds,
    sortOrder,
    sort_order: sortOrder,
    paymentNumber: sortOrder,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at
  };
};

export const BILL_FILE_MAX_BYTES = Math.floor(2.5 * 1024 * 1024);
export const BILLS_JSON_MAX_BYTES = 5 * 1024 * 1024;

const dataUrlBytes = (raw: string): number => {
  const marker = 'base64,';
  const i = raw.indexOf(marker);
  const b64 = i >= 0 ? raw.slice(i + marker.length) : raw;
  return Math.floor(b64.replace(/\s/g, '').length * 0.75);
};

const parseBillFile = (
  row: Record<string, unknown>
): { ok: true; billFileName: string; billFileData: string | null; billFileUrl: string | null } | { ok: false; message: string } => {
  const billFileName = str(
    row.billFileName ?? row.bill_file_name ?? row.fileName ?? row.file_name
  ).slice(0, 255);
  const dataRaw = row.billFileData ?? row.bill_file_data ?? row.dataUrl ?? row.data_url ?? row.file;
  const urlRaw = row.billFileUrl ?? row.bill_file_url ?? row.fileUrl ?? row.file_url;
  let billFileData: string | null = null;
  let billFileUrl: string | null = str(urlRaw) || null;

  if (dataRaw !== undefined && dataRaw !== null && dataRaw !== '') {
    const data = str(dataRaw);
    if (data.startsWith('data:') || /^[A-Za-z0-9+/=\s]+$/.test(data.slice(0, 80))) {
      if (dataUrlBytes(data) > BILL_FILE_MAX_BYTES) {
        return { ok: false, message: 'bill file must be 2.5 MB or smaller' };
      }
      billFileData = data;
    } else if (/^https?:\/\//i.test(data)) {
      billFileUrl = data;
    }
  }

  return { ok: true, billFileName, billFileData, billFileUrl };
};

export type SubvendorBillInput = {
  id?: string;
  date: string | null;
  basicAmount: number;
  paymentMode: string;
  remark: string;
  customerIds: string[];
  billFileName: string;
  billFileData: string | null;
  billFileUrl: string | null;
  sortOrder: number;
};

/** PUT body → bills list. Accepts `{ bills }`, `{ items }`, `{ rows }` or a bare array. */
export const parseSubvendorBills = (
  body: unknown
): { ok: true; bills: SubvendorBillInput[] } | { ok: false; message: string } => {
  const b = body as Record<string, unknown> | unknown[] | null;
  const list = Array.isArray(b)
    ? b
    : b && typeof b === 'object'
      ? (b.bills ?? b.items ?? b.rows)
      : undefined;
  if (!Array.isArray(list)) return { ok: false, message: 'bills must be an array' };

  const bills: SubvendorBillInput[] = [];
  for (let i = 0; i < list.length; i += 1) {
    const row = (list[i] || {}) as Record<string, unknown>;
    const date = parseLeaserDate(row.date ?? row.paymentDate ?? row.payment_date);
    if (date === undefined) return { ok: false, message: `bills[${i}].date is not a valid date` };
    const file = parseBillFile(row);
    if (!file.ok) return { ok: false, message: `bills[${i}]: ${file.message}` };
    const sortRaw = Number(row.sortOrder ?? row.sort_order ?? row.billNumber ?? row.bill_number);
    const id = str(row.id ?? row.key).slice(0, 255);
    bills.push({
      ...(id ? { id } : {}),
      date,
      basicAmount: roundInr(row.basic ?? row.basicAmount ?? row.basic_amount ?? row.amount),
      paymentMode: str(row.paymentMode ?? row.payment_mode ?? row.type).slice(0, 64),
      remark: str(row.remark ?? row.remarks ?? row.note),
      customerIds: parseCustomerIds(row.customerIds ?? row.customer_ids),
      billFileName: file.billFileName,
      billFileData: file.billFileData,
      billFileUrl: file.billFileUrl,
      sortOrder: Number.isInteger(sortRaw) && sortRaw > 0 ? sortRaw : i + 1
    });
  }
  const lastIndexById = new Map<string, number>();
  bills.forEach((p, i) => {
    if (p.id) lastIndexById.set(p.id, i);
  });
  const deduped = bills.filter((p, i) => !p.id || lastIndexById.get(p.id) === i);
  return { ok: true, bills: deduped };
};

export const publicSubvendorBill = (row: RowLike) => {
  const vendorId = row.vendorId || row.vendor_id;
  const customerIds = Array.isArray(row.customerIds ?? row.customer_ids)
    ? (row.customerIds ?? row.customer_ids)
    : [];
  const sortOrder = Number(row.sortOrder ?? row.sort_order) || 0;
  const basicAmount = roundInr(row.basicAmount ?? row.basic_amount ?? row.basic ?? row.amount);
  const date = toDateOnlyOrNull(row.date);
  const paymentMode = String(row.paymentMode ?? row.payment_mode ?? row.type ?? '');
  const billFileName = String(row.billFileName ?? row.bill_file_name ?? '');
  const billFileData = (row.billFileData ?? row.bill_file_data ?? null) as string | null;
  const billFileUrl = (row.billFileUrl ?? row.bill_file_url ?? null) as string | null;
  return {
    id: row.id,
    vendorId,
    vendor_id: vendorId,
    date,
    paymentDate: date,
    payment_date: date,
    basic: basicAmount,
    basicAmount,
    basic_amount: basicAmount,
    amount: basicAmount,
    paymentMode,
    payment_mode: paymentMode,
    type: paymentMode,
    remark: row.remark || '',
    customerIds,
    customer_ids: customerIds,
    billFileName,
    bill_file_name: billFileName,
    billFileData,
    bill_file_data: billFileData,
    dataUrl: billFileData,
    data_url: billFileData,
    billFileUrl,
    bill_file_url: billFileUrl,
    sortOrder,
    sort_order: sortOrder,
    billNumber: sortOrder,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at
  };
};
