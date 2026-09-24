import { Quotation } from '../models/index-quotation';
import { normalizeInstallStatus } from './installationRevert';
import {
  normalizeMeteringWorkflowStatus,
  resolvePersistedMeteringStatus,
  METER_INSTALLATION_PENDING_STATUS
} from './meteringWorkflowApi';

const EARLY_METERING = new Set(['pending_metering', 'metering_in_progress']);

/** Past Meter Pending — retrieve not allowed (409). */
const PAST_METERING = new Set([
  'metering_approved',
  METER_INSTALLATION_PENDING_STATUS,
  'meter_installation_pending',
  'meter_install',
  'meter_install_pending',
  'mco',
  'pending_baldev',
  'baldev_approved',
  'baldev_rejected',
  'completed'
]);

export class RetrieveFromMeteringError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 409, code = 'WF_RETRIEVE_METERING_001') {
    super(message);
    this.name = 'RetrieveFromMeteringError';
    this.status = status;
    this.code = code;
  }
}

const truthy = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';

export const isRetrieveFromMeteringForce = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body) return false;
  // Do not treat retrieveFromMetering alone as force — it is only the request marker.
  return truthy(body.force) || truthy(body.adminOverride) || truthy(body.allowRevert);
};

/**
 * Apply retrieve-from-metering: Meter Pending → installer_approved.
 * Keep Payment Management release flags (installation_ready_for_installer).
 * Do not change quotations.status.
 *
 * Allowed from:
 * - pending_metering / metering_in_progress (metering column or leaked on install)
 * - empty metering + installer_approved
 * - force / adminOverride / allowRevert / retrieveFromMetering when meteringStage missing
 */
export const buildRetrieveFromMeteringPatch = (
  quotation: {
    installationStatus?: string | null;
    installation_status?: string | null;
    meteringStatus?: string | null;
    metering_status?: string | null;
    installerApprovedAt?: Date | string | null;
  },
  body: Record<string, unknown> | null | undefined = {}
): Record<string, unknown> => {
  const install = normalizeInstallStatus(
    quotation.installationStatus ?? quotation.installation_status
  );
  const metering = resolvePersistedMeteringStatus(quotation) || '';
  const force = isRetrieveFromMeteringForce(body);

  if (PAST_METERING.has(metering) || PAST_METERING.has(install)) {
    throw new RetrieveFromMeteringError(
      'Quotation is past Meter Pending — retrieve not allowed.',
      409,
      'WF_RETRIEVE_METERING_002'
    );
  }

  const earlyMetering = EARLY_METERING.has(metering) || EARLY_METERING.has(install);
  const emptyMeteringInstallerApproved =
    !metering &&
    (install === 'installer_approved' || Boolean(quotation.installerApprovedAt));
  const forceMissingStage =
    force &&
    !metering &&
    (install === 'installer_approved' ||
      install === 'pending_installer' ||
      install === 'installer_in_progress' ||
      install === '' ||
      Boolean(quotation.installerApprovedAt));

  if (!earlyMetering && !emptyMeteringInstallerApproved && !forceMissingStage) {
    throw new RetrieveFromMeteringError(
      `This quotation is not in early Meter Pending (stage '${metering || install || 'unset'}').`,
      409,
      'WF_RETRIEVE_METERING_001'
    );
  }

  return {
    installationStatus: 'installer_approved',
    meteringStatus: null,
    meteringApprovedAt: null,
    mcoAt: null,
    meterInstallationPendingAt: null,
    meteringWccAfterDiscom: false,
    meteringWccAfterDiscomAt: null,
    meteringActionAt: null
    // Do NOT clear installationReadyForInstaller / installationReleasedAt
    // Do NOT change quotations.status
  };
};

export const applyRetrieveFromMetering = async (
  quotation: Quotation,
  body: Record<string, unknown> | null | undefined = {}
): Promise<Quotation> => {
  const patch = buildRetrieveFromMeteringPatch(quotation as any, body);
  await quotation.update(patch as any);
  await quotation.reload();
  return quotation;
};

export const isRetrieveFromMeteringRequest = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body) return false;
  if (truthy(body.retrieveFromMetering)) return true;
  const target = normalizeMeteringWorkflowStatus(String(body.target || ''));
  if (target === 'installer_approved' && truthy(body.allowRevert)) return true;
  return false;
};
