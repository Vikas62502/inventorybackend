import { Op } from 'sequelize';
import CallingLead from '../models/CallingLead';
import CallingLeadUploadBatch from '../models/CallingLeadUploadBatch';

type UploadBatchMeta = Pick<
  CallingLeadUploadBatch,
  'id' | 'fileName' | 'sourceType' | 'sourceSheetTab'
>;

export const loadUploadBatchMapByIds = async (
  batchIds: Array<string | null | undefined>
): Promise<Map<string, UploadBatchMeta>> => {
  const unique = [...new Set(batchIds.map((id) => String(id || '').trim()).filter(Boolean))];
  if (!unique.length) return new Map();

  const rows = await CallingLeadUploadBatch.findAll({
    where: { id: { [Op.in]: unique } },
    attributes: ['id', 'fileName', 'sourceType', 'sourceSheetTab']
  });

  return new Map(rows.map((row) => [row.id, row]));
};

/** Echo Meta / Google Sheet identity fields on dealer calling-queue lead rows (§AT / §AN). */
export const buildDealerQueueSocialFields = (
  lead: CallingLead | null | undefined,
  batch?: UploadBatchMeta | null
): Record<string, unknown> => {
  if (!lead) return {};

  const sourceType =
    String(batch?.sourceType || '').trim() || (lead.sheetSourceId ? 'google_sheet' : 'csv');
  const platform = String(lead.platform || '').trim().toLowerCase();
  const isSocial =
    sourceType === 'google_sheet' ||
    sourceType === 'social_media' ||
    sourceType === 'social' ||
    sourceType === 'meta' ||
    Boolean(lead.sheetSourceId) ||
    platform === 'ig' ||
    platform === 'fb' ||
    platform === 'meta' ||
    platform === 'instagram' ||
    platform === 'facebook';

  const identity = {
    sourceType,
    source_type: sourceType,
    sheetSourceId: lead.sheetSourceId || null,
    sheet_source_id: lead.sheetSourceId || null,
    platform: lead.platform || null
  };

  if (!isSocial) return identity;

  const uploadFileName = batch?.fileName || null;
  const leadStatus = lead.sheetLeadStatus || null;

  return {
    ...identity,
    uploadFileName,
    upload_file_name: uploadFileName,
    fileName: uploadFileName,
    file_name: uploadFileName,
    sourceSheetTab: batch?.sourceSheetTab || null,
    source_sheet_tab: batch?.sourceSheetTab || null,
    leadStatus,
    lead_status: leadStatus,
    sheetLeadStatus: leadStatus,
    sheet_lead_status: leadStatus,
    campaignName: lead.campaignName || null,
    campaign_name: lead.campaignName || null,
    adName: lead.adName || null,
    ad_name: lead.adName || null,
    remarks: lead.remarks || null,
    remarks2: lead.remarks2 || null,
    remarks_2: lead.remarks2 || null,
    kw: lead.kNumber || null,
    kNumber: lead.kNumber || null,
    firstCallResponse: lead.firstCallResponse || null,
    first_call_response: lead.firstCallResponse || null,
    secondCallResponse: lead.secondCallResponse || null,
    second_call_response: lead.secondCallResponse || null,
    externalId: lead.externalId || null,
    external_id: lead.externalId || null,
    finalDecision: lead.finalDecision || null,
    final_decision: lead.finalDecision || null,
    finalDecisionReason: lead.finalDecisionReason || null,
    final_decision_reason: lead.finalDecisionReason || null,
    assignedPersonName: lead.assignedPersonName || null,
    assigned_person_name: lead.assignedPersonName || null,
    loginFlag: lead.loginFlag ?? null,
    login_flag: lead.loginFlag ?? null,
    raw: lead.rawPayload || null,
    raw_json: lead.rawPayload || null
  };
};

const SOCIAL_SOURCE_TYPES = new Set(['google_sheet', 'social_media', 'social', 'meta']);
const SOCIAL_PLATFORMS = new Set(['ig', 'fb', 'meta', 'instagram', 'facebook']);

const textOrNull = (value: unknown): string | null => {
  const s = String(value ?? '').trim();
  return s ? s : null;
};

export type CallingActionSource = {
  sourceType: string;
  platform: string | null;
  campaignName: string | null;
  sheetSourceId: string | null;
  uploadFileName: string | null;
  externalId: string | null;
};

/** Source snapshot for a new calling action (PATCH) — from the lead + its upload batch. */
export const resolveCallingActionSource = (
  lead: Partial<CallingLead> | null | undefined,
  batch?: { fileName?: string | null; sourceType?: string | null } | null
): CallingActionSource => {
  const sheetSourceId = textOrNull(lead?.sheetSourceId);
  const batchType = textOrNull(batch?.sourceType);
  const sourceType = sheetSourceId
    ? batchType && batchType !== 'csv'
      ? batchType
      : 'google_sheet'
    : batchType || 'csv';
  return {
    sourceType,
    platform: textOrNull(lead?.platform),
    campaignName: textOrNull(lead?.campaignName),
    sheetSourceId,
    uploadFileName: textOrNull(batch?.fileName),
    externalId: textOrNull(lead?.externalId)
  };
};

/**
 * Calling-action echo (§BS): Social Media vs Calling data source, camel + snake.
 * Prefers the snapshot stored on the action; falls back to the joined lead for rows saved before the snapshot.
 * Social = google_sheet / meta / social sourceType, any sheetSourceId, or ig / fb / meta platform. CSV stays csv.
 */
export const callingActionSourceFields = (row: Record<string, any>) => {
  const lead = row.lead || null;
  const sheetSourceId = textOrNull(row.sheetSourceId ?? row.sheet_source_id ?? lead?.sheetSourceId);
  const sourceType =
    textOrNull(row.sourceType ?? row.source_type) || (sheetSourceId ? 'google_sheet' : lead ? 'csv' : null);
  const platform = textOrNull(row.platform ?? lead?.platform);
  const campaignName = textOrNull(row.campaignName ?? row.campaign_name ?? lead?.campaignName);
  const uploadFileName = textOrNull(row.uploadFileName ?? row.upload_file_name);
  const externalId = textOrNull(row.externalId ?? row.external_id ?? lead?.externalId);
  const isSocialMedia =
    SOCIAL_SOURCE_TYPES.has(String(sourceType || '').toLowerCase()) ||
    Boolean(sheetSourceId) ||
    SOCIAL_PLATFORMS.has(String(platform || '').toLowerCase());
  const leadSource = isSocialMedia ? 'social_media' : 'calling_data';
  return {
    sourceType,
    source_type: sourceType,
    platform,
    campaignName,
    campaign_name: campaignName,
    sheetSourceId,
    sheet_source_id: sheetSourceId,
    uploadFileName,
    upload_file_name: uploadFileName,
    externalId,
    external_id: externalId,
    isSocialMedia,
    is_social_media: isSocialMedia,
    leadSource,
    lead_source: leadSource
  };
};
