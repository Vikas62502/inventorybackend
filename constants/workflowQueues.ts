import { Op, WhereOptions } from 'sequelize';

/** Rows visible in installer / admin installation queues after Payment Management release. */
export const buildReleasedToInstallerWhere = (): WhereOptions => ({
  [Op.or]: [
    { installationReadyForInstaller: true },
    { installationReleasedAt: { [Op.ne]: null } }
  ]
});

export const INSTALLER_RELEASE_STATUSES = [
  'pending_installer',
  'installer_in_progress',
  'installer_partial_approved',
  'installer_approved',
  'pending_baldev',
  'baldev_approved',
  'completed'
] as const;

/**
 * Approved Installation queue — installer_approved only.
 * Metering lives on meteringStatus; pending_metering must not appear here.
 */
export const INSTALLER_APPROVED_QUEUE_STATUSES = ['installer_approved'] as const;

export const METERING_QUEUE_STATUSES = [
  'pending_metering',
  'metering_in_progress',
  'metering_approved',
  'meter_installation_pending',
  'mco'
] as const;

/** True when the client wants only Payment Management → installer released rows. */
export const isReleasedToInstallerListQuery = (query: Record<string, unknown>): boolean => {
  const operationalView = String(query.operationalView || '').toLowerCase();
  if (operationalView === 'installer') return true;
  if (String(query.scope || '').toLowerCase() === 'installer_queue') return true;
  for (const key of [
    'releasedToInstaller',
    'released_to_installer',
    'installationReleased',
    'installation_released',
    'installationReadyForInstaller',
    'installation_ready_for_installer',
    'sentToInstaller',
    'sent_to_installer'
  ]) {
    const raw = query[key];
    if (raw === true || raw === 1) return true;
    const v = String(raw ?? '').trim().toLowerCase();
    if (v === 'true' || v === '1' || v === 'yes') return true;
  }
  return false;
};

export const resolveInstallerQueueStatuses = (statusQuery: string | undefined): string => {
  const raw = String(statusQuery || '').trim().toLowerCase();
  if (!raw) return INSTALLER_RELEASE_STATUSES.join(',');
  if (raw === 'pending_installer') return 'pending_installer';
  // Approved Installation = installer_approved only (not metering / payment completed).
  if (raw === 'approved') return INSTALLER_APPROVED_QUEUE_STATUSES.join(',');
  return raw;
};
