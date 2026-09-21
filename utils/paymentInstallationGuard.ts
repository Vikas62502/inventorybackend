/**
 * Accounts payment saves must never mutate Installation workflow fields.
 * paymentStatus=completed / quotation status=approved ≠ installer Complete.
 */

export const INSTALLATION_FIELDS_FORBIDDEN_ON_PAYMENT_SAVE = [
  'installationStatus',
  'installation_status',
  'installerApprovedAt',
  'installer_approved_at',
  'installationPartialApproved',
  'installation_partial_approved',
  'installationPartialApprovedAt',
  'installation_partial_approved_at',
  'installationReadyForInstaller',
  'installation_ready_for_installer',
  'installationReleasedAt',
  'installation_released_at',
  'installerInProgressAt',
  'installer_in_progress_at',
  'installerId',
  'installer_id',
  'installerActionAt',
  'installer_action_at',
  'installerRemarks',
  'installer_remarks'
] as const;

const FORBIDDEN_SET = new Set<string>(INSTALLATION_FIELDS_FORBIDDEN_ON_PAYMENT_SAVE);

/** Strip installation keys from a payment/installment update patch (defensive). */
export const omitInstallationFieldsFromPaymentPatch = <T extends Record<string, unknown>>(
  patch: T
): T => {
  const out: Record<string, unknown> = { ...patch };
  for (const key of Object.keys(out)) {
    if (FORBIDDEN_SET.has(key)) delete out[key];
  }
  return out as T;
};

/** True when a payment body tries to set installation workflow (ignore / never apply). */
export const paymentBodyTouchesInstallation = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body || typeof body !== 'object') return false;
  return Object.keys(body).some((k) => FORBIDDEN_SET.has(k));
};
