import { Op, Sequelize } from 'sequelize';
import CallingLead from '../models/CallingLead';
import CallingLeadSheetSource from '../models/CallingLeadSheetSource';
import DealerLeadAssignment from '../models/DealerLeadAssignment';
import { Dealer } from '../models/index-quotation';
import { getSheetsClient } from './hrSheetGoogleAuth';
import { logError } from './loggerHelper';

const normalizeHeader = (h: unknown): string =>
  String(h || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

const sheetsColumnLetter = (index0: number): string => {
  let n = index0 + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const isPoolDealerId = (dealerId: unknown): boolean => {
  const v = String(dealerId || '')
    .trim()
    .toLowerCase();
  return !v || ['unassigned', 'pool', 'open', 'null', 'none', '-', 'na', 'n/a'].includes(v);
};

/**
 * Columns the app WRITES back to Google Sheets (create header if missing).
 * Meta import columns (id, phone_number, full_name, …) stay read-only from Meta.
 * Aliases include truncated UI headers (e.g. "Assignment Stat", "1st Call Respon").
 */
export const SHEET_WRITEBACK_HEADERS = {
  assignedDealer: ['Assigned Dealer', 'assigned_dealer', 'Assigned Deale', 'NAME'],
  assignmentStatus: [
    'Assignment Status',
    'Assignment Stat',
    'assignment_status',
    'Call Status'
  ],
  leadStatus: ['lead_status', 'Lead Status'],
  remarks: ['Remarks', 'remarks', 'Remark'],
  remarks2: ['Remarks 2', 'remarks2', 'Remark 2'],
  firstCallResponse: [
    '1st Call Response',
    '1st Call Respon',
    '1st call response',
    'First Call Response',
    'first_call_response'
  ],
  secondCallResponse: [
    '2nd Call Response',
    '2nd Call Respon',
    '2nd call response',
    'Second Call Response',
    'second_call_response'
  ],
  finalDecision: ['Final Decision', 'Final Decison', 'Final Decis', 'final decision'],
  finalDecisionReason: [
    'Reason of Final Decision',
    'Reason of Final Decis',
    'reason of final decision',
    'Final Decision Reason'
  ],
  address: ['Address', 'address', 'Customer Address', 'customer_address', 'Lead Address']
} as const;

export type SheetWriteBackLeadInput = {
  id?: string;
  sheetSourceId?: string | null;
  sheet_source_id?: string | null;
  externalId?: string | null;
  external_id?: string | null;
  sheetRowIndex?: number | null;
  sheet_row_index?: number | null;
  assignedDealerId?: string | null;
  assigned_dealer_id?: string | null;
  assignedDealerName?: string | null;
  assigned_dealer_name?: string | null;
  assignedPersonName?: string | null;
  assigned_person_name?: string | null;
  status?: string | null;
  assignmentStatus?: string | null;
  leadStatus?: string | null;
  lead_status?: string | null;
  sheetLeadStatus?: string | null;
  remarks?: string | null;
  remarks2?: string | null;
  remarks_2?: string | null;
  firstCallResponse?: string | null;
  first_call_response?: string | null;
  secondCallResponse?: string | null;
  second_call_response?: string | null;
  finalDecision?: string | null;
  final_decision?: string | null;
  finalDecisionReason?: string | null;
  final_decision_reason?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  sheetSource?: CallingLeadSheetSource | null;
};

/** Exact match, then prefix match for truncated sheet headers (min length 6). */
export const findHeaderIndex = (headers: unknown[], aliases: readonly string[]): number => {
  const normalized = headers.map((h) => normalizeHeader(h));
  const aliasNorms = aliases.map((a) => normalizeHeader(a)).filter(Boolean);

  for (const a of aliasNorms) {
    const idx = normalized.indexOf(a);
    if (idx >= 0) return idx;
  }

  for (let i = 0; i < normalized.length; i += 1) {
    const h = normalized[i];
    if (!h || h.length < 6) continue;
    for (const a of aliasNorms) {
      if (a.length < 6) continue;
      if (a.startsWith(h) || h.startsWith(a)) return i;
    }
  }
  return -1;
};

const mapCrmStatusToSheetLeadStatus = (
  assignmentStatus: string,
  action?: string | null,
  existingLeadStatus?: string | null
): string => {
  const status = String(assignmentStatus || '').trim().toLowerCase();
  const act = String(action || '').trim().toLowerCase();
  if (status === 'completed' || act === 'called' || act === 'not_interested') return 'COMPLETED';
  if (
    status === 'in_progress' ||
    status === 'assigned' ||
    status === 'active' ||
    status === 'rescheduled' ||
    status === 'queued'
  ) {
    if (status === 'queued' && !existingLeadStatus) return 'CREATED';
    if (status === 'queued') return existingLeadStatus || 'CREATED';
    return 'IN_PROGRESS';
  }
  const existing = String(existingLeadStatus || '').trim();
  return existing || 'CREATED';
};

export const formatLeadAddressForSheet = (lead: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
}): string => {
  const address = String(lead.address || '').trim();
  const city = String(lead.city || '').trim();
  const state = String(lead.state || '').trim();
  if (!address && !city && !state) return '';
  if (!address) return [city, state].filter(Boolean).join(', ');
  const lower = address.toLowerCase();
  const parts = [address];
  if (city && !lower.includes(city.toLowerCase())) parts.push(city);
  if (state && !lower.includes(state.toLowerCase())) parts.push(state);
  return parts.join(', ');
};

/**
 * DB → Google Sheet write-back (P0).
 * Match row by external_id (column `id`) or sheet_row_index.
 * Never overwrite Meta columns (ad_*, campaign_*, phone_number, full_name, created_time).
 */
export const writeBackHrLeadToSheet = async (
  lead: SheetWriteBackLeadInput,
  { dealerNameById }: { dealerNameById?: Record<string, string> } = {}
): Promise<{ ok: boolean; skipped?: string; error?: string; rowIndex?: number; tab?: string }> => {
  const sheetSourceId = lead.sheetSourceId || lead.sheet_source_id;
  if (!sheetSourceId) return { ok: false, skipped: 'not_sheet_lead' };

  const source =
    lead.sheetSource || (await CallingLeadSheetSource.findByPk(String(sheetSourceId)));
  if (!source) return { ok: false, skipped: 'no_source' };

  const sheets = getSheetsClient();
  const spreadsheetId = source.spreadsheetId;
  const tab = source.sheetTabName;
  const escapedTab = tab.replace(/'/g, "''");

  const meta = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `'${escapedTab}'!1:1`
  });
  let headers = (meta.data.values && meta.data.values[0]) || [];
  if (!headers.length) return { ok: false, error: 'no_headers' };

  const ensureHeader = (aliases: readonly string[], preferred: string): number => {
    const idx = findHeaderIndex(headers, aliases);
    if (idx >= 0) return idx;
    headers = [...headers, preferred];
    return headers.length - 1;
  };

  const colAssigned = ensureHeader(SHEET_WRITEBACK_HEADERS.assignedDealer, 'Assigned Dealer');
  const colAssignStatus = ensureHeader(
    SHEET_WRITEBACK_HEADERS.assignmentStatus,
    'Assignment Status'
  );
  const colLeadStatus = ensureHeader(SHEET_WRITEBACK_HEADERS.leadStatus, 'lead_status');
  const colRemarks = ensureHeader(SHEET_WRITEBACK_HEADERS.remarks, 'Remarks');
  const colRemarks2 = ensureHeader(SHEET_WRITEBACK_HEADERS.remarks2, 'Remarks 2');
  const colFirst = ensureHeader(SHEET_WRITEBACK_HEADERS.firstCallResponse, '1st Call Response');
  const colSecond = ensureHeader(SHEET_WRITEBACK_HEADERS.secondCallResponse, '2nd Call Response');
  const colFinal = ensureHeader(SHEET_WRITEBACK_HEADERS.finalDecision, 'Final Decision');
  const colReason = ensureHeader(
    SHEET_WRITEBACK_HEADERS.finalDecisionReason,
    'Reason of Final Decision'
  );
  const colAddress = ensureHeader(SHEET_WRITEBACK_HEADERS.address, 'Address');

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `'${escapedTab}'!1:1`,
    valueInputOption: 'RAW',
    requestBody: { values: [headers] }
  });

  let rowIndex = Number(lead.sheetRowIndex || lead.sheet_row_index || 0);
  const externalId = lead.externalId || lead.external_id;
  if (!rowIndex || rowIndex < 2) {
    if (!externalId) return { ok: false, skipped: 'no_row_match' };
    const idCol = findHeaderIndex(headers, ['id']);
    if (idCol < 0) return { ok: false, skipped: 'no_id_column' };
    const colLetter = sheetsColumnLetter(idCol);
    const idVals = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${escapedTab}'!${colLetter}:${colLetter}`
    });
    const cells = idVals.data.values || [];
    for (let i = 1; i < cells.length; i += 1) {
      if (String(cells[i]?.[0] || '').trim() === String(externalId).trim()) {
        rowIndex = i + 1;
        break;
      }
    }
  }
  if (!rowIndex || rowIndex < 2) return { ok: false, skipped: 'row_not_found' };

  const dealerIdRaw = lead.assignedDealerId || lead.assigned_dealer_id;
  const dealerId = isPoolDealerId(dealerIdRaw) ? null : String(dealerIdRaw);
  const dealerName =
    (dealerId &&
      (dealerNameById?.[dealerId] ||
        lead.assignedDealerName ||
        lead.assigned_dealer_name)) ||
    lead.assignedPersonName ||
    lead.assigned_person_name ||
    '';

  const status = String(lead.status || lead.assignmentStatus || '').trim();
  const leadStatus = String(
    lead.sheetLeadStatus || lead.leadStatus || lead.lead_status || ''
  ).trim();
  const sheetLeadStatus = mapCrmStatusToSheetLeadStatus(status, null, leadStatus);
  const addressValue =
    String(lead.address || '').trim() ||
    formatLeadAddressForSheet({
      address: lead.address,
      city: lead.city,
      state: lead.state
    });

  const updates = [
    { col: colAssigned, value: dealerName },
    { col: colAssignStatus, value: status || (dealerId ? 'assigned' : 'unassigned') },
    { col: colLeadStatus, value: sheetLeadStatus },
    { col: colRemarks, value: lead.remarks || '' },
    { col: colRemarks2, value: lead.remarks2 || lead.remarks_2 || '' },
    { col: colFirst, value: lead.firstCallResponse || lead.first_call_response || '' },
    { col: colSecond, value: lead.secondCallResponse || lead.second_call_response || '' },
    { col: colFinal, value: lead.finalDecision || lead.final_decision || '' },
    {
      col: colReason,
      value: lead.finalDecisionReason || lead.final_decision_reason || ''
    },
    { col: colAddress, value: addressValue }
  ];

  const data = updates.map(({ col, value }) => ({
    range: `'${escapedTab}'!${sheetsColumnLetter(col)}${rowIndex}`,
    values: [[value == null ? '' : String(value)]]
  }));

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data }
  });

  if (lead.id && rowIndex) {
    await CallingLead.update(
      { sheetRowIndex: rowIndex },
      { where: { id: lead.id } }
    ).catch(() => undefined);
  }

  return { ok: true, rowIndex, tab };
};

const findLatestAssignment = async (
  leadId: string
): Promise<DealerLeadAssignment | null> => {
  return DealerLeadAssignment.findOne({
    where: {
      leadId,
      [Op.and]: [
        Sequelize.literal(`
          NOT EXISTS (
            SELECT 1 FROM "dealer_lead_assignments" AS newer
            WHERE newer."leadId" = "DealerLeadAssignment"."leadId"
              AND (
                newer."assignedAt" > "DealerLeadAssignment"."assignedAt"
                OR (
                  newer."assignedAt" = "DealerLeadAssignment"."assignedAt"
                  AND newer."createdAt" > "DealerLeadAssignment"."createdAt"
                )
              )
          )
        `)
      ]
    }
  });
};

const dealerDisplayName = (dealer: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
} | null): string => {
  if (!dealer) return '';
  const combined = `${dealer.firstName || ''} ${dealer.lastName || ''}`.trim();
  return combined || String((dealer as any).name || '').trim();
};

/**
 * Load lead + latest assignment, mirror CRM fields onto CallingLead, then write sheet row.
 */
export const writeBackHrLeadToSheetById = async (
  leadId: string
): Promise<{ ok: boolean; skipped?: string; error?: string }> => {
  const lead = await CallingLead.findByPk(leadId);
  if (!lead?.sheetSourceId) return { ok: false, skipped: 'not_sheet_lead' };

  const assignment = await findLatestAssignment(leadId);
  const dealerId =
    assignment && !isPoolDealerId(assignment.dealerId) ? String(assignment.dealerId) : null;
  const dealer = dealerId
    ? await Dealer.findByPk(dealerId, { attributes: ['id', 'firstName', 'lastName'] })
    : null;
  const assignedDealerName = dealerDisplayName(dealer);

  const assignmentStatus = String(assignment?.status || 'queued');
  const action = assignment?.action || null;
  const sheetLeadStatus = mapCrmStatusToSheetLeadStatus(
    assignmentStatus,
    action,
    lead.sheetLeadStatus
  );

  const callRemark = String(assignment?.callRemark || '').trim();
  const patch: Record<string, unknown> = {
    sheetLeadStatus,
    assignedPersonName: assignedDealerName || lead.assignedPersonName
  };

  if (callRemark) {
    if (!lead.firstCallResponse) {
      patch.firstCallResponse = callRemark;
    } else if (callRemark !== lead.firstCallResponse) {
      patch.secondCallResponse = callRemark;
    }
    patch.remarks = callRemark;
  }

  if (String(action || '').toLowerCase() === 'not_interested') {
    patch.finalDecision = lead.finalDecision || 'Not Interested';
    if (callRemark) patch.finalDecisionReason = lead.finalDecisionReason || callRemark;
  }

  await lead.update(patch as any);
  await lead.reload();

  const addressValue = formatLeadAddressForSheet(lead);

  return writeBackHrLeadToSheet(
    {
      id: lead.id,
      sheetSourceId: lead.sheetSourceId,
      externalId: lead.externalId,
      sheetRowIndex: lead.sheetRowIndex,
      assignedDealerId: dealerId,
      assignedDealerName,
      assignedPersonName: lead.assignedPersonName,
      status: assignmentStatus,
      sheetLeadStatus: lead.sheetLeadStatus,
      remarks: lead.remarks,
      remarks2: lead.remarks2,
      firstCallResponse: lead.firstCallResponse,
      secondCallResponse: lead.secondCallResponse,
      finalDecision: lead.finalDecision,
      finalDecisionReason: lead.finalDecisionReason,
      address: addressValue,
      city: lead.city,
      state: lead.state
    },
    dealerId && assignedDealerName ? { dealerNameById: { [dealerId]: assignedDealerName } } : undefined
  );
};

/** Fire-and-forget after CRM mutations (never block HTTP). */
export const scheduleHrLeadSheetWriteBack = (leadId: string | null | undefined): void => {
  const id = String(leadId || '').trim();
  if (!id) return;
  setImmediate(() => {
    void writeBackHrLeadToSheetById(id).catch((error) => {
      logError('Google Sheet write-back failed (non-fatal)', error, { leadId: id });
    });
  });
};

export const scheduleHrLeadSheetWriteBackForBatch = async (
  batchId: string | null | undefined
): Promise<void> => {
  const id = String(batchId || '').trim();
  if (!id) return;
  try {
    const leads = await CallingLead.findAll({
      where: {
        batchId: id,
        sheetSourceId: { [Op.ne]: null }
      },
      attributes: ['id']
    });
    for (const lead of leads) {
      scheduleHrLeadSheetWriteBack(lead.id);
    }
  } catch (error) {
    logError('scheduleHrLeadSheetWriteBackForBatch failed (non-fatal)', error, { batchId: id });
  }
};
