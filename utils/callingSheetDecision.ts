/**
 * Connected / Move → Google Sheet Final Decision (§BV).
 * SPA sends finalDecision / secondCallResponse (camel + snake); also derived from tagged status_text.
 */

export type SheetFinalDecision = 'Interested' | 'Not Interested' | 'Pending';

export type CallingSheetDecisionFields = {
  finalDecision: SheetFinalDecision;
  finalDecisionReason: string | null;
  secondCallResponse: string | null;
};

const textOrNull = (value: unknown): string | null => {
  const s = String(value ?? '').trim();
  return s ? s : null;
};

const statusKey = (value: unknown): string =>
  String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

/** Normalize SPA / sheet Final Decision labels → Interested | Not Interested | Pending. */
export const normalizeSheetFinalDecision = (raw: unknown): SheetFinalDecision | null => {
  const key = statusKey(raw)
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (!key) return null;
  if (key === 'interested' || key === 'yes') return 'Interested';
  if (
    key === 'not interested' ||
    key === 'not interested currently' ||
    key === 'notinterested'
  ) {
    return 'Not Interested';
  }
  if (
    key === 'pending' ||
    key === 'decision pending' ||
    key === 'follow up pending' ||
    key === 'follow-up pending' ||
    key === 'followup pending'
  ) {
    return 'Pending';
  }
  return null;
};

/**
 * Map tagged Connected status_text → sheet Final Decision.
 * Not-connected connectivity labels return null (omit).
 */
export const mapStatusTextToSheetFinalDecision = (statusText: unknown): SheetFinalDecision | null => {
  const key = statusKey(statusText);
  if (!key) return null;

  if (
    key === 'interested' ||
    key === 'highly interested' ||
    key === 'site visit scheduled' ||
    key === 'quotation shared' ||
    key === 'valid lead' ||
    key === 'qualified lead' ||
    key === 'ready to buy' ||
    key === 'converted (deal closed)' ||
    key === 'payment received' ||
    key === 'installation pending' ||
    key === 'installation completed'
  ) {
    return 'Interested';
  }

  if (
    key === 'not interested' ||
    key === 'not interested currently' ||
    key === 'already installed solar' ||
    key === 'chose competitor' ||
    key === 'budget issue' ||
    key === 'not feasible' ||
    key === 'price too high' ||
    key === 'lost lead' ||
    key === 'no requirement'
  ) {
    return 'Not Interested';
  }

  if (
    key === 'follow-up pending' ||
    key === 'follow up pending' ||
    key === 'decision pending' ||
    key === 'callback later' ||
    key === 'call back later' ||
    key === 'callback scheduled' ||
    key === 'thinking' ||
    key === 'will call back' ||
    key === 'rescheduled' ||
    key === 'follow-up required' ||
    key === 'follow up required' ||
    key === 'busy — call later' ||
    key === 'busy - call later' ||
    key === 'not picking on follow-up'
  ) {
    return 'Pending';
  }

  return null;
};

const mapActionToSheetFinalDecision = (action: unknown): SheetFinalDecision | null => {
  const a = String(action || '')
    .trim()
    .toLowerCase();
  if (a === 'called') return 'Interested';
  if (a === 'not_interested') return 'Not Interested';
  if (a === 'rescheduled' || a === 'follow_up') return 'Pending';
  return null;
};

/** Free remark / transfer message for Reason of Final Decision. */
export const extractFinalDecisionReason = (
  statusReason: unknown,
  callRemark: unknown,
  bodyRemark: unknown
): string | null => {
  const direct = textOrNull(statusReason) || textOrNull(bodyRemark);
  if (direct) return direct;
  const raw = textOrNull(callRemark);
  if (!raw) return null;
  // Tagged: [category] Status | free remark
  const pipe = raw.match(/\|(.*)$/);
  if (pipe) {
    const free = pipe[1].trim();
    if (free) return free;
  }
  // Legacy / Move shapes
  const transfer = raw.match(
    /(?:Transferred from Not Connected|Transfer Reason)\s*:\s*(.+)$/i
  );
  if (transfer) return transfer[1].trim() || raw;
  return null;
};

/**
 * Connected outcome / Move → fields to persist on calling_leads.
 * Not Connected (call_connectivity) → null (omit Final Decision).
 */
export const resolveCallingSheetDecisionFields = (input: {
  action: unknown;
  statusCategory?: unknown;
  statusLabel?: unknown;
  statusReason?: unknown;
  callRemark?: unknown;
  body?: Record<string, unknown> | null;
}): CallingSheetDecisionFields | null => {
  const category = String(input.statusCategory || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  // Pure Not Connected reasons — do not set Final Decision on the sheet.
  if (category === 'call_connectivity') return null;

  const action = String(input.action || '')
    .trim()
    .toLowerCase();
  if (!['called', 'not_interested', 'rescheduled', 'follow_up'].includes(action)) return null;

  const body = input.body || {};
  const fromBody = normalizeSheetFinalDecision(body.finalDecision ?? body.final_decision);
  const fromStatus = mapStatusTextToSheetFinalDecision(input.statusLabel);
  const fromAction = mapActionToSheetFinalDecision(action);
  const finalDecision = fromBody || fromStatus || fromAction;
  if (!finalDecision) return null;

  const secondCallResponse =
    textOrNull(body.secondCallResponse ?? body.second_call_response) ||
    textOrNull(input.callRemark);

  const finalDecisionReason =
    textOrNull(body.finalDecisionReason ?? body.final_decision_reason) ||
    extractFinalDecisionReason(input.statusReason, input.callRemark, body.remark);

  return {
    finalDecision,
    finalDecisionReason,
    secondCallResponse
  };
};
