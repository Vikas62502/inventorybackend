const UNASSIGNED_SENTINELS = new Set([
  'unassigned',
  'pool',
  'open',
  'null',
  'none',
  '-',
  'na',
  'n/a',
  ''
]);

const CREATED_ALIASES = new Set(['created', 'open', 'pending']);

export const hasCallingAssignee = (dealerId: unknown): boolean => {
  const id = String(dealerId ?? '').trim();
  return Boolean(id) && !UNASSIGNED_SENTINELS.has(id.toLowerCase());
};

/**
 * Calling-queue status is queued | assigned | in_progress | rescheduled | completed.
 * Meta lead_status=CREATED never becomes this field.
 */
export const echoCallingQueueStatus = (status: unknown, dealerId: unknown): string => {
  const raw = String(status ?? '').trim();
  const s = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (s === 'in_progress' || s === 'rescheduled' || s === 'completed' || s === 'queued' || s === 'assigned') {
    return s;
  }
  if (s === 'active') return 'assigned';
  if (CREATED_ALIASES.has(s) || raw.toUpperCase() === 'CREATED' || !s) {
    return hasCallingAssignee(dealerId) ? 'assigned' : 'queued';
  }
  return hasCallingAssignee(dealerId) ? 'assigned' : 'queued';
};

export const isCreatedOrBlankFinalSheetLead = (lead: {
  sheetLeadStatus?: string | null;
  finalDecision?: string | null;
}): boolean => {
  const sheet = String(lead.sheetLeadStatus || '').trim().toLowerCase();
  const finalDecision = String(lead.finalDecision || '').trim();
  return sheet === 'created' || sheet === 'new' || sheet === '' || !finalDecision;
};
