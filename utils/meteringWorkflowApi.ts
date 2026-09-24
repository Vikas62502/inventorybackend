/**
 * Metering sub-workflow vs installation pipeline.
 * Persist metering stages on quotations.meteringStatus only — never on installationStatus.
 * See BACKEND_METER_INSTALLATION_PENDING.md for meter_installation_pending.
 */

export const METER_INSTALLATION_PENDING_STATUS = 'meter_installation_pending' as const;

export const METERING_CANONICAL_STATUSES = new Set([
  'pending_metering',
  'metering_in_progress',
  'metering_approved',
  METER_INSTALLATION_PENDING_STATUS,
  'meter_install_pending', // read alias
  'mco'
]);

export const INSTALLATION_ONLY_STATUSES = new Set([
  'pending_installer',
  'installer_in_progress',
  'installer_partial_approved',
  'partial_approved',
  'installer_approved',
  'installer_rejected',
  'pending_baldev',
  'baldev_approved',
  'baldev_rejected',
  'completed'
]);

/** Normalize frontend alias `meter_install_pending` → canonical status. */
export const normalizeMeteringWorkflowStatus = (
  raw: string | null | undefined
): string | null => {
  const s = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/-/g, '_');
  if (!s) return null;
  if (s === 'meter_install_pending') return METER_INSTALLATION_PENDING_STATUS;
  return s;
};

export const isMeteringWorkflowStatus = (raw: string | null | undefined): boolean => {
  const n = normalizeMeteringWorkflowStatus(raw);
  return Boolean(n && METERING_CANONICAL_STATUSES.has(n));
};

/**
 * Resolve persisted metering stage: prefer meteringStatus column, fallback to legacy
 * installationStatus when it still holds a metering value (pre-migration rows).
 */
export const resolvePersistedMeteringStatus = (q: {
  meteringStatus?: string | null;
  metering_status?: string | null;
  installationStatus?: string | null;
  installation_status?: string | null;
}): string | null => {
  const fromCol = normalizeMeteringWorkflowStatus(
    q.meteringStatus ?? q.metering_status ?? null
  );
  if (fromCol && METERING_CANONICAL_STATUSES.has(fromCol)) {
    return fromCol === 'meter_install_pending' ? METER_INSTALLATION_PENDING_STATUS : fromCol;
  }
  const fromInstall = normalizeMeteringWorkflowStatus(
    q.installationStatus ?? q.installation_status ?? null
  );
  if (fromInstall && METERING_CANONICAL_STATUSES.has(fromInstall)) {
    return fromInstall === 'meter_install_pending'
      ? METER_INSTALLATION_PENDING_STATUS
      : fromInstall;
  }
  return null;
};

/** @deprecated Prefer resolvePersistedMeteringStatus — kept for call-site compatibility. */
export const deriveMeteringStatus = (
  installationOrMeteringStatus: string | null | undefined
): string | null => {
  const inst = normalizeMeteringWorkflowStatus(installationOrMeteringStatus);
  if (!inst) return null;
  if (inst === 'meter_install_pending') return METER_INSTALLATION_PENDING_STATUS;
  if (METERING_CANONICAL_STATUSES.has(inst)) {
    return inst === 'meter_install_pending' ? METER_INSTALLATION_PENDING_STATUS : inst;
  }
  return null;
};

export const isMeteringApprovedInstallationStatus = (
  installationStatus: string | null | undefined
): boolean => String(installationStatus || '').trim() === 'metering_approved';

export const meteringWorkflowApiFields = (q: {
  installationStatus?: string | null;
  meteringStatus?: string | null;
  meteringApprovedAt?: Date | string | null;
  mcoAt?: Date | string | null;
  completionAt?: Date | string | null;
  meterInstallationPendingAt?: Date | string | null;
  meteringWccAfterDiscom?: boolean | null;
  meteringWccAfterDiscomAt?: Date | string | null;
}) => {
  const rawInstall = q.installationStatus ?? null;
  // Never echo a metering stage as installationStatus once columns are split.
  const installNorm = normalizeMeteringWorkflowStatus(rawInstall) || rawInstall;
  const installationStatus =
    installNorm && METERING_CANONICAL_STATUSES.has(installNorm)
      ? 'installer_approved'
      : installNorm;

  const meteringStatus = resolvePersistedMeteringStatus({
    meteringStatus: q.meteringStatus,
    installationStatus: rawInstall
  });
  const mcoStatus = meteringStatus === 'mco' ? 'mco' : null;
  const wccAfterDiscom = Boolean(q.meteringWccAfterDiscom);

  return {
    installationStatus: installationStatus || null,
    installation_status: installationStatus || null,
    meteringStatus,
    metering_status: meteringStatus,
    meteringStage: meteringStatus,
    metering_stage: meteringStatus,
    mcoStatus,
    mco_status: mcoStatus,
    meteringApprovedAt: q.meteringApprovedAt ?? null,
    metering_approved_at: q.meteringApprovedAt ?? null,
    meterInstallationPendingAt: q.meterInstallationPendingAt ?? null,
    meter_installation_pending_at: q.meterInstallationPendingAt ?? null,
    meteringWccAfterDiscom: wccAfterDiscom,
    metering_wcc_after_discom: wccAfterDiscom,
    meteringWccAfterDiscomAt: q.meteringWccAfterDiscomAt ?? null,
    metering_wcc_after_discom_at: q.meteringWccAfterDiscomAt ?? null,
    mcoAt: q.mcoAt ?? null,
    mco_at: q.mcoAt ?? null,
    completionAt: q.completionAt ?? null,
    completion_at: q.completionAt ?? null
  };
};

/** Parse post-Discom WCC flag from request body (camel / snake). */
export const parseMeteringWccAfterDiscomFlag = (
  body: Record<string, unknown> | null | undefined
): boolean | undefined => {
  if (!body) return undefined;
  const raw = body.meteringWccAfterDiscom ?? body.metering_wcc_after_discom;
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return undefined;
};

/** Stages past Meter in Discom — cannot set WCC-after-discom (409). */
export const LATE_METERING_FOR_WCC = new Set([
  METER_INSTALLATION_PENDING_STATUS,
  'meter_install_pending',
  'meter_install',
  'mco',
  'pending_baldev',
  'baldev_approved',
  'baldev_rejected',
  'completed'
]);

export type MeteringWccAfterDiscomPatchResult =
  | { ok: true; patch: Record<string, unknown> }
  | { ok: false; status: 400 | 409; message: string };

/**
 * Meter in Discom → WCC Pending (Sep 2026):
 * - pending_metering / metering_in_progress / empty → promote meteringStatus to
 *   metering_approved, then set flag
 * - already metering_approved → set flag only
 * - meter_installation_pending / mco / later → 409
 * Never 400 with "can only be set when stage is metering_approved".
 */
export const buildMeteringWccAfterDiscomPatch = (
  quotation: {
    installationStatus?: string | null;
    installation_status?: string | null;
    meteringStatus?: string | null;
    metering_status?: string | null;
    installerApprovedAt?: Date | string | null;
    installationPartialApproved?: boolean | null;
    meteringApprovedAt?: Date | string | null;
    meteringWccAfterDiscomAt?: Date | string | null;
  },
  flag: boolean,
  opts: {
    now?: Date;
    isPartialApproved?: (status: string | null | undefined) => boolean;
  } = {}
): MeteringWccAfterDiscomPatchResult => {
  const now = opts.now || new Date();
  if (!flag) {
    return {
      ok: true,
      patch: {
        meteringWccAfterDiscom: false,
        meteringWccAfterDiscomAt: null
      }
    };
  }

  const stage = resolvePersistedMeteringStatus(quotation) || '';
  const installRaw =
    quotation.installationStatus ?? quotation.installation_status ?? null;

  if (LATE_METERING_FOR_WCC.has(stage)) {
    return {
      ok: false,
      status: 409,
      message: `Cannot move to WCC Pending when metering stage is '${stage}'`
    };
  }

  const isPartial =
    opts.isPartialApproved?.(installRaw) ||
    Boolean(quotation.installationPartialApproved);
  if (isPartial || !quotation.installerApprovedAt) {
    return {
      ok: false,
      status: 400,
      message:
        'Customer installation must be completed and approved before moving to WCC Pending (installer_partial_approved is not allowed)'
    };
  }

  const patch: Record<string, unknown> = {};

  if (stage !== 'metering_approved') {
    const earlyOrEmpty =
      !stage || stage === 'pending_metering' || stage === 'metering_in_progress';
    if (!earlyOrEmpty) {
      return {
        ok: false,
        status: 409,
        message: `Cannot move to WCC Pending when metering stage is '${stage || 'unset'}'`
      };
    }
    // Auto-promote early / empty → metering_approved (To Discom equivalent), then flag.
    patch.meteringStatus = 'metering_approved';
    patch.meteringApprovedAt = quotation.meteringApprovedAt || now;
    if (isMeteringWorkflowStatus(installRaw)) {
      patch.installationStatus = 'installer_approved';
    }
  }

  patch.meteringWccAfterDiscom = true;
  patch.meteringWccAfterDiscomAt = quotation.meteringWccAfterDiscomAt || now;
  return { ok: true, patch };
};

/** Parse bank-process-done flag from request body (camel / snake / moveToPendingPayment). */
export const parseBankProcessDoneFlag = (
  body: Record<string, unknown> | null | undefined
): boolean | undefined => {
  if (!body) return undefined;
  const raw =
    body.bankProcessDone ??
    body.bank_process_done ??
    body.moveToPendingPayment ??
    body.move_to_pending_payment;
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (raw === true || raw === 'true' || raw === 1 || raw === '1') return true;
  if (raw === false || raw === 'false' || raw === 0 || raw === '0') return false;
  return undefined;
};

const parseOptionalBankString = (raw: unknown): string | null | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed === '' ? null : trimmed;
};

/** Normalize Admin Banking document names (array, JSON string, or comma list). */
export const parseBankDocumentNames = (raw: unknown): string[] | undefined => {
  if (raw === undefined) return undefined;
  if (raw === null) return [];
  const fromArray = (arr: unknown[]): string[] =>
    arr.map((v) => String(v ?? '').trim()).filter(Boolean);
  if (Array.isArray(raw)) return fromArray(raw);
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return fromArray(parsed);
    } catch {
      /* treat as single name or comma list */
    }
    if (trimmed.includes(',')) return fromArray(trimmed.split(','));
    return [trimmed];
  }
  return undefined;
};

/** True when the body is an Admin Banking / bank-process submit (not bankName-only). */
export const isBankProcessRequestBody = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body || typeof body !== 'object') return false;
  return (
    parseBankProcessDoneFlag(body) !== undefined ||
    body.bankAssignedPersonName !== undefined ||
    body.bank_assigned_person_name !== undefined ||
    body.bankRemarks !== undefined ||
    body.bank_remarks !== undefined ||
    body.bankLocation !== undefined ||
    body.bank_location !== undefined ||
    body.bankDocumentNames !== undefined ||
    body.bank_document_names !== undefined
  );
};

/** Bank-process routing: done/detail fields or bank name/IFSC. */
export const hasBankProcessRouteFields = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body || typeof body !== 'object') return false;
  return (
    isBankProcessRequestBody(body) ||
    body.bankName !== undefined ||
    body.bank_name !== undefined ||
    body.bankIfsc !== undefined ||
    body.bank_ifsc !== undefined
  );
};

/** Persistable bank-process columns. Does not touch metering/installation stage. */
export const buildBankProcessPatch = (
  body: Record<string, unknown> | null | undefined,
  quotation?: { bankProcessDoneAt?: Date | null } | null
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  if (!body) return patch;

  const bankName = parseOptionalBankString(body.bankName ?? body.bank_name);
  if (bankName) patch.bankName = bankName;
  const bankIfsc = parseOptionalBankString(body.bankIfsc ?? body.bank_ifsc);
  if (bankIfsc) patch.bankIfsc = bankIfsc;

  const paymentTypeRaw = body.paymentType ?? body.payment_type ?? body.paymentMode ?? body.payment_mode;
  if (typeof paymentTypeRaw === 'string' && paymentTypeRaw.trim()) {
    const norm = paymentTypeRaw
      .trim()
      .toLowerCase()
      .replace(/-/g, '_')
      .replace(/\+/g, '_');
    const paymentType =
      norm === 'cash_loan' || norm === 'cashloan'
        ? 'mix'
        : norm === 'loan' || norm === 'cash' || norm === 'mix'
          ? norm
          : null;
    if (paymentType) {
      patch.paymentType = paymentType;
      patch.paymentMode = paymentType;
    }
  }

  const assigned = parseOptionalBankString(
    body.bankAssignedPersonName ?? body.bank_assigned_person_name
  );
  if (assigned !== undefined) patch.bankAssignedPersonName = assigned;
  const remarks = parseOptionalBankString(body.bankRemarks ?? body.bank_remarks);
  if (remarks !== undefined) patch.bankRemarks = remarks;
  const location = parseOptionalBankString(body.bankLocation ?? body.bank_location);
  if (location !== undefined) patch.bankLocation = location;
  const docs = parseBankDocumentNames(body.bankDocumentNames ?? body.bank_document_names);
  if (docs !== undefined) patch.bankDocumentNames = docs;

  const doneFlag = parseBankProcessDoneFlag(body);
  if (doneFlag === true) {
    patch.bankProcessDone = true;
    patch.bankProcessDoneAt = quotation?.bankProcessDoneAt || new Date();
  } else if (doneFlag === false) {
    patch.bankProcessDone = false;
    patch.bankProcessDoneAt = null;
  }

  return patch;
};
