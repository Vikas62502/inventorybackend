/**
 * Admin Installation Revert — any install (or leaked metering) value → pending_installer.
 * Never write pending_installer onto quotations.status.
 * Never touch metering_status. Never delete S3 photos.
 */

export const INSTALLATION_ONLY_STATUSES = new Set([
  'pending_installer',
  'installer_in_progress',
  'in_progress',
  'installer_partial_approved',
  'partial_approved',
  'installer_approved',
  'installer_rejected',
  'pending_baldev',
  'baldev_approved',
  'baldev_rejected',
  'completed'
]);

/** Historical / leaked values that may still sit on installation_status. */
export const INSTALLATION_REVERT_ALLOWED_FROM = new Set([
  ...INSTALLATION_ONLY_STATUSES,
  'pending_metering',
  'metering_in_progress',
  'metering_approved',
  'meter_installation_pending',
  'meter_install_pending',
  'mco',
  ''
]);

export const normalizeInstallStatus = (raw: unknown): string =>
  String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

export const isPendingInstallerStatus = (raw: unknown): boolean =>
  normalizeInstallStatus(raw) === 'pending_installer';

export const isAdminInstallationRevertRequest = (
  body: Record<string, unknown> | null | undefined,
  nextStatus: string
): boolean => {
  if (!isPendingInstallerStatus(nextStatus)) return false;
  if (!body) return true;
  const source = String(body.source || '').toLowerCase();
  if (source.includes('revert') || source === 'admin-install-revert') return true;
  const truthy = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
  if (
    truthy(body.allowRevert) ||
    truthy(body.force) ||
    truthy(body.adminOverride) ||
    truthy(body.allowFromMetering) ||
    truthy(body.independentInstallation) ||
    truthy(body.skipMeteringGuard)
  ) {
    return true;
  }
  // Admin PATCH to pending_installer is always a revert (handler is admin-only).
  return true;
};

/** Install-only patch — does not clear or change meteringStatus. */
export const installationRevertPatch = (): Record<string, unknown> => ({
  installationStatus: 'pending_installer',
  installerApprovedAt: null,
  installationPartialApproved: false,
  installationPartialApprovedAt: null
});

export const installationRevertApiFields = (quotationStatus: string | null | undefined) => ({
  status: quotationStatus || null,
  installationStatus: 'pending_installer' as const,
  installation_status: 'pending_installer' as const,
  installerApprovedAt: null,
  installer_approved_at: null,
  installationPartialApproved: false,
  installation_partial_approved: false,
  installationPartialApprovedAt: null,
  installation_partial_approved_at: null
});
