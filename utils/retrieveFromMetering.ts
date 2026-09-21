import { Quotation } from '../models/index-quotation';
import { normalizeInstallStatus } from './installationRevert';
import {
  normalizeMeteringWorkflowStatus,
  resolvePersistedMeteringStatus
} from './meteringWorkflowApi';

const EARLY_METERING = new Set(['pending_metering', 'metering_in_progress', '']);

const LATE_METERING = new Set([
  'metering_approved',
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

/** Meter Pending → clear metering_status; keep installation_status as installer_approved. */
export const buildRetrieveFromMeteringPatch = (quotation: {
  installationStatus?: string | null;
  installation_status?: string | null;
  meteringStatus?: string | null;
  metering_status?: string | null;
  installerApprovedAt?: Date | string | null;
}): Record<string, unknown> => {
  const metering =
    resolvePersistedMeteringStatus(quotation) ||
    normalizeInstallStatus(quotation.installationStatus ?? quotation.installation_status);

  const inEarly =
    EARLY_METERING.has(metering) ||
    metering === 'pending_metering' ||
    metering === 'metering_in_progress';

  if (!inEarly) {
    throw new RetrieveFromMeteringError(
      `Cannot retrieve from metering while stage is '${metering || 'unset'}'. Use late-stage revert flows.`
    );
  }

  if (LATE_METERING.has(metering)) {
    throw new RetrieveFromMeteringError(
      'Quotation is past Meter Pending — retrieve not allowed.',
      409,
      'WF_RETRIEVE_METERING_002'
    );
  }

  const install = normalizeInstallStatus(
    quotation.installationStatus ?? quotation.installation_status
  );
  const patch: Record<string, unknown> = {
    meteringStatus: null,
    meteringApprovedAt: null,
    mcoAt: null,
    meterInstallationPendingAt: null,
    meteringWccAfterDiscom: false,
    meteringWccAfterDiscomAt: null,
    meteringActionAt: null
  };

  // Heal leaked metering off installation_status; keep installer_approved when set.
  if (
    install === 'pending_metering' ||
    install === 'metering_in_progress' ||
    install === 'metering_approved' ||
    install === 'meter_installation_pending' ||
    install === 'mco'
  ) {
    patch.installationStatus = quotation.installerApprovedAt
      ? 'installer_approved'
      : 'installer_approved';
  }

  return patch;
};

export const applyRetrieveFromMetering = async (quotation: Quotation): Promise<Quotation> => {
  const patch = buildRetrieveFromMeteringPatch(quotation as any);
  await quotation.update(patch as any);
  await quotation.reload();
  return quotation;
};

export const isRetrieveFromMeteringRequest = (
  body: Record<string, unknown> | null | undefined
): boolean => {
  if (!body) return false;
  const truthy = (v: unknown) => v === true || v === 'true' || v === 1 || v === '1';
  if (truthy(body.retrieveFromMetering)) return true;
  const target = normalizeMeteringWorkflowStatus(String(body.target || ''));
  if (target === 'installer_approved' && truthy(body.allowRevert)) return true;
  return false;
};
