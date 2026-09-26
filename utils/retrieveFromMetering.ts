import { Quotation } from '../models/index-quotation';
import { normalizeInstallStatus } from './installationRevert';
import {
  normalizeMeteringWorkflowStatus,
  resolvePersistedMeteringStatus,
  METER_INSTALLATION_PENDING_STATUS
} from './meteringWorkflowApi';

const EARLY_METERING = new Set(['pending_metering', 'metering_in_progress']);

/** Discom / WCC / MCO / later — retrieve not allowed (409). */
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

/**
 * Honour force / adminOverride / allowRevert / retrieveFromMetering so Meter Pending
 * rows with empty meteringStage do not 409.
 */
export const isRetrieveFromMeteringForce = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body) return false;
  return (
    truthy(body.force) ||
    truthy(body.adminOverride) ||
    truthy(body.allowRevert) ||
    truthy(body.retrieveFromMetering)
  );
};

/**
 * Apply retrieve-from-metering: Meter Pending → installer_approved.
 * Clears metering_status (null) — never copies installer_approved onto metering.
 * Keep Payment Management release flags. Do not change quotations.status.
 *
 * Allowed from:
 * - pending_metering / metering_in_progress (metering column or leaked on install)
 * - empty metering + installer_approved
 * - force / retrieveFromMetering / adminOverride / allowRevert when meteringStage missing
 *
 * 409 only for Discom / WCC / MCO (and later).
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
  // Missing meteringStage + force/retrieveFromMetering — allow (SPA Meter Pending overlay cases).
  const forceMissingStage = force && !metering;

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

  // metering-handoff / overlay: target installer_approved + allowRevert (not a metering stage write)
  const targetRaw = String(
    body.target ?? body.installationStatus ?? body.installation_status ?? ''
  ).trim();
  const target = normalizeMeteringWorkflowStatus(targetRaw) || normalizeInstallStatus(targetRaw);
  const meteringWrite = normalizeMeteringWorkflowStatus(
    String(body.meteringStatus ?? body.metering_status ?? '')
  );
  if (
    meteringWrite &&
    (EARLY_METERING.has(meteringWrite) ||
      meteringWrite === 'metering_approved' ||
      PAST_METERING.has(meteringWrite))
  ) {
    return false;
  }
  if (
    target === 'installer_approved' &&
    truthy(body.allowRevert) &&
    String(body.handoff || '').toLowerCase() !== 'metering'
  ) {
    return true;
  }
  return false;
};
