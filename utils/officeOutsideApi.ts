import { roundInr } from './subvendorApi';
import {
  normalizeCollectFields,
  normalizePaymentModeInput,
  pickCollectInput
} from './paymentMode';
import { serializePaymentPhaseRow, type PaymentPhaseRecord } from './quotationPaymentPhases';
import { toDateOnly } from './dateOnly';

export const OFFICE_OUTSIDE_FILE_TYPES = ['loan', 'cash', 'mix'] as const;
export type OfficeOutsideFileTypeValue = (typeof OFFICE_OUTSIDE_FILE_TYPES)[number];

export const OFFICE_OUTSIDE_ERROR_CODES = {
  AUTH_004: 'AUTH_004',
  VAL_CUSTOMER: 'VAL_CUSTOMER',
  VAL_VENDOR: 'VAL_VENDOR',
  VAL_FILE_TYPE: 'VAL_FILE_TYPE',
  OO_404: 'OO_404',
  RECORD_404: 'OO_404',
  OO_VENDOR_REQUIRED: 'OO_VENDOR_REQUIRED',
  SUBVENDOR_404: 'SUBVENDOR_404',
  OO_DUPLICATE_CUSTOMER: 'OO_DUPLICATE_CUSTOMER'
} as const;

/** Office Inside GST: (proposal − PI) × 8.9% when PI > 0, else 0. */
export const OFFICE_OUTSIDE_GST_RATE = 0.089;

export const officeOutsideGstCharges = (proposal: unknown, pi: unknown): number => {
  const piAmt = roundInr(pi);
  if (piAmt <= 0) return 0;
  return roundInr((roundInr(proposal) - piAmt) * OFFICE_OUTSIDE_GST_RATE);
};

export const officeOutsideCostOfSite = (
  pi: unknown,
  fileCharges: unknown,
  gstCharges: unknown,
  others: unknown
): number => roundInr(pi) + roundInr(fileCharges) + roundInr(gstCharges) + roundInr(others);

export const officeOutsideVendorProfit = (subtotal: unknown, costOfSite: unknown): number => {
  const n = roundInr(subtotal) - roundInr(costOfSite);
  return n > 0 ? n : 0;
};

/** Vendor Outside complete profit = subtotal − (PI + file + GST + others). */
export const officeOutsideCompleteProfit = officeOutsideVendorProfit;

/** Last 10 digits. Empty / non-digits → ''. Unique index only applies when length is 10. */
export const normalizeOfficeOutsideMobile = (raw: unknown): string =>
  String(raw ?? '').replace(/\D/g, '').slice(-10);

export const isTenDigitMobile = (mobile: unknown): boolean =>
  normalizeOfficeOutsideMobile(mobile).length === 10;

/** Stable public id for leaser customer_ids: OO- + first 8 hex of the UUID. */
export const officeOutsidePublicId = (id: unknown): string => {
  const hex = String(id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
  return hex ? `OO-${hex}` : '';
};

export const parseOfficeOutsidePublicIdPrefix = (raw: unknown): string | null => {
  const m = String(raw || '').trim().match(/^OO-([0-9A-Fa-f]{8})$/);
  return m ? m[1].toLowerCase() : null;
};

const str = (value: unknown): string => (value == null ? '' : String(value).trim());

const pick = (body: Record<string, unknown>, ...keys: string[]): unknown => {
  for (const key of keys) {
    if (body[key] !== undefined) return body[key];
  }
  return undefined;
};

export const normalizeOfficeOutsideFileType = (raw: unknown): OfficeOutsideFileTypeValue | null => {
  const key = str(raw).toLowerCase().replace(/[\s-]+/g, '_');
  if (key === 'loan') return 'loan';
  if (key === 'cash') return 'cash';
  if (key === 'mix' || key === 'mixed' || key === 'loan_cash' || key === 'cash_loan') return 'mix';
  return null;
};

export const normalizeFileType = normalizeOfficeOutsideFileType;
export const normalizeMobile = normalizeOfficeOutsideMobile;

export const parseSystemKw = (raw: unknown): number | undefined => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 1000) / 1000;
};

export const parseSlipItems = (raw: unknown): unknown[] | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null) return [];
  if (Array.isArray(raw)) return raw;
  return undefined;
};

export type OfficeOutsideRecordPatch = {
  vendorId?: string | null;
  customerName?: string;
  customerMobile?: string;
  address?: string;
  city?: string;
  systemKw?: number;
  subtotal?: number;
  loanAmount?: number;
  cashAmount?: number;
  fileType?: OfficeOutsideFileTypeValue;
  notes?: string;
  slipItems?: unknown[];
  slipNotes?: string;
  /** PATCH fallback for retrieve: `{ sentToAccountsAt: null }` (clears both hops). */
  sentToAccountsAt?: null;
  /** Accounts revert of Send to Outside: `{ sentToOutsideAt: null }` (keep accounts timestamp). */
  sentToOutsideAt?: null;
  status?: 'draft';
  sentToAccountsBy?: null;
};

/** Only keys present in the body (camel or snake). Extra keys ignored. */
export const parseOfficeOutsideRecordPatch = (
  body: Record<string, unknown> | null | undefined
): OfficeOutsideRecordPatch => {
  const out: OfficeOutsideRecordPatch = {};
  if (!body) return out;

  const vendorRaw = pick(
    body,
    'outsideVendorId',
    'outside_vendor_id',
    'vendorId',
    'vendor_id',
    'subvendorId',
    'subvendor_id'
  );
  if (vendorRaw !== undefined) {
    const id = str(vendorRaw);
    out.vendorId = id || null;
  }

  const customerName = pick(body, 'customerName', 'customer_name', 'name');
  if (customerName !== undefined) out.customerName = str(customerName);

  const customerMobile = pick(body, 'customerMobile', 'customer_mobile', 'mobile');
  if (customerMobile !== undefined) out.customerMobile = normalizeOfficeOutsideMobile(customerMobile);

  const address = pick(body, 'address', 'customerAddress', 'customer_address');
  if (address !== undefined) out.address = str(address);

  const city = pick(body, 'city');
  if (city !== undefined) out.city = str(city);

  const systemKw = pick(body, 'systemKw', 'system_kw', 'kw', 'systemSize');
  if (systemKw !== undefined) out.systemKw = parseSystemKw(systemKw) ?? 0;

  const subtotal = pick(body, 'subtotal', 'amount', 'displayAmount', 'display_amount', 'totalAmount', 'total_amount');
  if (subtotal !== undefined) out.subtotal = roundInr(subtotal);

  const loanAmount = pick(body, 'loanAmount', 'loan_amount');
  if (loanAmount !== undefined && loanAmount !== null && loanAmount !== '') {
    const n = roundInr(loanAmount);
    if (n > 0) out.loanAmount = n;
  }

  const cashAmount = pick(body, 'cashAmount', 'cash_amount');
  if (cashAmount !== undefined && cashAmount !== null && cashAmount !== '') {
    const n = roundInr(cashAmount);
    if (n > 0) out.cashAmount = n;
  }

  const fileType = pick(body, 'fileType', 'file_type', 'paymentType', 'payment_type');
  if (fileType !== undefined) {
    const normalized = normalizeOfficeOutsideFileType(fileType);
    if (normalized) out.fileType = normalized;
  }

  const notes = pick(body, 'notes');
  if (notes !== undefined) out.notes = str(notes);

  const slipItems = pick(body, 'slipItems', 'slip_items', 'items');
  const parsedItems = parseSlipItems(slipItems);
  if (parsedItems !== undefined) out.slipItems = parsedItems;

  const slipNotes = pick(body, 'slipNotes', 'slip_notes');
  if (slipNotes !== undefined) out.slipNotes = str(slipNotes);

  const sentAt = pick(body, 'sentToAccountsAt', 'sent_to_accounts_at');
  if (sentAt !== undefined && (sentAt === null || sentAt === '' || sentAt === false)) {
    out.sentToAccountsAt = null;
    out.sentToOutsideAt = null;
    out.status = 'draft';
    out.sentToAccountsBy = null;
  }

  const sentOutsideAt = pick(body, 'sentToOutsideAt', 'sent_to_outside_at');
  if (
    sentOutsideAt !== undefined &&
    (sentOutsideAt === null || sentOutsideAt === '' || sentOutsideAt === false) &&
    out.sentToAccountsAt !== null
  ) {
    out.sentToOutsideAt = null;
  }

  return out;
};

/** Loan file with loan 0 → use the amount. A saved loan > 0 stays as-is. */
export const resolveOfficeOutsideLoanAmount = ({
  fileType,
  loanAmount,
  amount
}: {
  fileType?: unknown;
  loanAmount?: unknown;
  amount?: unknown;
}): number => {
  const saved = roundInr(loanAmount);
  if (saved > 0) return saved;
  if (normalizeOfficeOutsideFileType(fileType) === 'loan') return roundInr(amount);
  return saved;
};

/** Ledger loan 0 fills from the record; loan file still 0 → subtotal. */
export const echoOfficeOutsideLoanCash = ({
  fileType,
  amount,
  loanAmount,
  cashAmount,
  recordLoanAmount,
  recordCashAmount
}: {
  fileType?: unknown;
  amount?: unknown;
  loanAmount?: unknown;
  cashAmount?: unknown;
  recordLoanAmount?: unknown;
  recordCashAmount?: unknown;
}): { loanAmount: number; cashAmount: number } => {
  const ledgerLoan = roundInr(loanAmount);
  const recordLoan = roundInr(recordLoanAmount);
  const loan = resolveOfficeOutsideLoanAmount({
    fileType,
    loanAmount: ledgerLoan > 0 ? ledgerLoan : recordLoan,
    amount
  });
  const ledgerCash = roundInr(cashAmount);
  const recordCash = roundInr(recordCashAmount);
  return {
    loanAmount: loan,
    cashAmount: ledgerCash > 0 ? ledgerCash : recordCash
  };
};

export const officeOutsideLoanCashAmounts = (row: {
  fileType?: unknown;
  file_type?: unknown;
  subtotal?: unknown;
  amount?: unknown;
  loanAmount?: unknown;
  loan_amount?: unknown;
  cashAmount?: unknown;
  cash_amount?: unknown;
}) =>
  echoOfficeOutsideLoanCash({
    fileType: row.fileType ?? row.file_type,
    amount: row.subtotal ?? row.amount,
    loanAmount: row.loanAmount ?? row.loan_amount,
    cashAmount: row.cashAmount ?? row.cash_amount
  });

type RowLike = Record<string, any>;

export const publicOfficeOutsideRecord = (row: RowLike) => {
  const id = String(row.id || '');
  const vendorId = row.vendorId || row.vendor_id || null;
  const vendorName = row.vendor?.name ?? row.vendorName ?? row.vendor_name ?? null;
  const customerName = row.customerName || row.customer_name || '';
  const customerMobile = row.customerMobile || row.customer_mobile || '';
  const systemKw = Number(row.systemKw ?? row.system_kw ?? 0) || 0;
  const subtotal = roundInr(row.subtotal);
  const fileType = normalizeOfficeOutsideFileType(row.fileType ?? row.file_type);
  const { loanAmount, cashAmount } = echoOfficeOutsideLoanCash({
    fileType,
    amount: subtotal,
    loanAmount: row.loanAmount ?? row.loan_amount,
    cashAmount: row.cashAmount ?? row.cash_amount
  });
  const status = String(row.status || 'draft');
  const paymentStatus = String(row.paymentStatus || row.payment_status || 'pending');
  const paymentMode =
    normalizePaymentModeInput(row.paymentMode ?? row.payment_mode) ?? null;
  const installmentsRaw = row.installmentsJson ?? row.installments_json ?? row.installments ?? [];
  const installments = Array.isArray(installmentsRaw)
    ? installmentsRaw.map((phase) => {
        const serialized = serializePaymentPhaseRow(phase as any);
        const paymentDate = toDateOnly((phase as any)?.paymentDate ?? (phase as any)?.payment_date) ?? null;
        return { ...serialized, paymentDate, payment_date: paymentDate };
      })
    : [];
  const publicId = officeOutsidePublicId(id);
  const slipItems = Array.isArray(row.slipItems)
    ? row.slipItems
    : Array.isArray(row.slip_items)
      ? row.slip_items
      : [];
  const slipNotes = row.slipNotes || row.slip_notes || '';
  const sentAtRaw = row.sentToAccountsAt ?? row.sent_to_accounts_at ?? null;
  const sentToAccountsAt = sentAtRaw || null;
  const sentOutsideRaw = row.sentToOutsideAt ?? row.sent_to_outside_at ?? null;
  const sentToOutsideAt = sentOutsideRaw || null;
  const sent = sentToAccountsAt != null;
  const outside = sentToOutsideAt != null;
  const createdAt = row.createdAt || row.created_at;
  const updatedAt = row.updatedAt || row.updated_at;
  return {
    id,
    recordId: id,
    record_id: id,
    publicId,
    public_id: publicId,
    // Compatibility aliases — this is NOT a quotations row.
    quotationId: id,
    quotation_id: id,
    ooId: publicId,
    oo_id: publicId,
    vendorId,
    vendor_id: vendorId,
    outsideVendorId: vendorId,
    outside_vendor_id: vendorId,
    vendorName,
    vendor_name: vendorName,
    customerName,
    customer_name: customerName,
    customerMobile,
    customer_mobile: customerMobile,
    mobile: customerMobile,
    address: row.address || '',
    city: row.city || '',
    systemKw,
    system_kw: systemKw,
    kw: systemKw,
    subtotal,
    amount: subtotal,
    displayAmount: subtotal,
    display_amount: subtotal,
    totalAmount: subtotal,
    total_amount: subtotal,
    loanAmount,
    loan_amount: loanAmount,
    cashAmount,
    cash_amount: cashAmount,
    fileType,
    file_type: fileType,
    paymentType: fileType,
    payment_type: fileType,
    paymentStatus,
    payment_status: paymentStatus,
    paymentMode,
    payment_mode: paymentMode,
    installments,
    installmentsJson: installments,
    installments_json: installments,
    paymentPhases: installments,
    phases: installments,
    status,
    sent,
    outside,
    sentToOutside: outside,
    sent_to_outside: outside,
    sentToAccountsAt,
    sent_to_accounts_at: sentToAccountsAt,
    sentToOutsideAt,
    sent_to_outside_at: sentToOutsideAt,
    slipItems,
    slip_items: slipItems,
    items: slipItems,
    slipNotes,
    slip_notes: slipNotes,
    notes: row.notes || '',
    createdAt,
    created_at: createdAt,
    updatedAt,
    updated_at: updatedAt
  };
};

export const publicOfficeOutsideLedger = (row: RowLike) => {
  const recordId = row.recordId || row.record_id;
  const vendorId = row.vendorId || row.vendor_id || null;
  const record = row.record || {};
  const subtotal = roundInr(row.subtotal ?? record.subtotal);
  const fileType = normalizeOfficeOutsideFileType(
    row.fileType ?? row.file_type ?? record.fileType ?? record.file_type
  );
  const { loanAmount, cashAmount } = echoOfficeOutsideLoanCash({
    fileType,
    amount: subtotal,
    loanAmount: row.loanAmount ?? row.loan_amount,
    cashAmount: row.cashAmount ?? row.cash_amount,
    recordLoanAmount: row.recordLoanAmount ?? record.loanAmount ?? record.loan_amount,
    recordCashAmount: row.recordCashAmount ?? record.cashAmount ?? record.cash_amount
  });
  const receivedAmount = roundInr(row.receivedAmount ?? row.received_amount);
  const pi = roundInr(row.pi);
  const proposal = roundInr(row.proposal);
  const fileCharges = roundInr(row.fileCharges ?? row.file_charges);
  const others = roundInr(row.others);
  const gstCharges = officeOutsideGstCharges(proposal, pi);
  const costOfSite = officeOutsideCostOfSite(pi, fileCharges, gstCharges, others);
  const remaining = roundInr(row.remaining);
  const profit = officeOutsideVendorProfit(subtotal, costOfSite);
  const updatedAt = row.updatedAt || row.updated_at;
  return {
    recordId,
    record_id: recordId,
    quotationId: recordId,
    quotation_id: recordId,
    vendorId,
    vendor_id: vendorId,
    loanAmount,
    loan_amount: loanAmount,
    cashAmount,
    cash_amount: cashAmount,
    receivedAmount,
    received_amount: receivedAmount,
    remaining,
    proposal,
    costOfSite,
    cost_of_site: costOfSite,
    fileCharges,
    file_charges: fileCharges,
    pi,
    gstCharges,
    gst_charges: gstCharges,
    others,
    profit,
    vendorProfit: profit,
    vendor_profit: profit,
    officeOutsideCompleteProfit: profit,
    office_outside_complete_profit: profit,
    updatedAt,
    updated_at: updatedAt
  };
};

const phaseStatus = (paidAmount: number, amount: number, input?: string): PaymentPhaseRecord['status'] => {
  if (amount > 0 && paidAmount >= amount) return 'completed';
  if (paidAmount <= 0) return 'pending';
  if (input && ['pending', 'partial', 'completed'].includes(input)) {
    return input as PaymentPhaseRecord['status'];
  }
  return 'partial';
};

export const normalizeOfficeOutsidePhases = (
  phases: unknown[],
  updatedBy: string | null
): PaymentPhaseRecord[] =>
  phases
    .map((raw) => {
      const phase = (raw || {}) as Record<string, unknown>;
      const amount = Number(phase.amount ?? 0);
      const paidAmount = Number(
        phase.paidAmount ?? phase.paid_amount ?? phase.paidAmt ?? phase.paid ?? 0
      );
      const paymentMode = normalizePaymentModeInput(phase.paymentMode ?? phase.payment_mode) ?? null;
      const paid = Number.isFinite(paidAmount) ? paidAmount : 0;
      const amt = Number.isFinite(amount) ? amount : 0;
      return {
        phaseNumber: Number(phase.phaseNumber ?? phase.phase_number) || 0,
        phaseName: String(phase.phaseName ?? phase.phase_name ?? '').trim(),
        amount: amt,
        paidAmount: paid,
        status: phaseStatus(paid, amt, phase.status ? String(phase.status) : undefined),
        dueDate: toDateOnly(phase.dueDate ?? phase.due_date) ?? null,
        paymentDate: toDateOnly(phase.paymentDate ?? phase.payment_date) ?? null,
        paymentMode,
        transactionId: (() => {
          const tid = phase.transactionId ?? phase.transaction_id;
          return tid === undefined || tid === null || tid === '' ? null : String(tid);
        })(),
        note:
          phase.note === undefined || phase.note === null || String(phase.note).trim() === ''
            ? null
            : String(phase.note).trim(),
        ...normalizeCollectFields(pickCollectInput(phase), paymentMode, paid),
        updatedBy,
        updatedAt: new Date().toISOString()
      } as PaymentPhaseRecord;
    })
    .filter((p) => p.phaseNumber > 0)
    .sort((a, b) => a.phaseNumber - b.phaseNumber);

export const paymentStatusFromPhases = (
  phases: PaymentPhaseRecord[]
): 'pending' | 'partial' | 'completed' => {
  if (!phases.length) return 'pending';
  if (phases.every((p) => p.status === 'completed' || (p.amount > 0 && p.paidAmount >= p.amount))) {
    return 'completed';
  }
  if (phases.every((p) => p.status === 'pending' || p.paidAmount <= 0)) return 'pending';
  return 'partial';
};

export const applyOfficeOutsideLedgerAmounts = (
  existing: Record<string, unknown>,
  patch: Record<string, unknown>
) => {
  const merged = {
    loanAmount: roundInr(existing.loanAmount ?? existing.loan_amount),
    cashAmount: roundInr(existing.cashAmount ?? existing.cash_amount),
    receivedAmount: roundInr(existing.receivedAmount ?? existing.received_amount),
    remaining: roundInr(existing.remaining),
    proposal: roundInr(existing.proposal),
    fileCharges: roundInr(existing.fileCharges ?? existing.file_charges),
    pi: roundInr(existing.pi),
    others: roundInr(existing.others),
    ...patch
  };
  const gstCharges = officeOutsideGstCharges(merged.proposal, merged.pi);
  const costOfSite = officeOutsideCostOfSite(
    merged.pi,
    merged.fileCharges,
    gstCharges,
    merged.others
  );
  return { ...merged, gstCharges, costOfSite };
};
