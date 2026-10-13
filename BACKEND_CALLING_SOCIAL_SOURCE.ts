// @ts-nocheck
/**
 * =============================================================================
 * BACKEND REFERENCE — Calling actions: Social Media vs Calling data source
 * (Oct 2026, REQUIRED §BS / HANDOFF §68)
 * =============================================================================
 * FE labels this §BR / HANDOFF §64; those numbers are taken in this repo.
 *
 * Status: IMPLEMENTED. No new routes.
 *
 * -----------------------------------------------------------------------------
 * 1) Fields on every row (camel + snake)
 * -----------------------------------------------------------------------------
 *   sourceType / source_type           'google_sheet' | 'csv' | batch sourceType
 *   platform                           'fb' | 'ig' | 'meta' | null
 *   campaignName / campaign_name
 *   sheetSourceId / sheet_source_id    hr_sheet_sources id (social sheets only)
 *   uploadFileName / upload_file_name  upload batch fileName ("Google Sheet: Ajmer Leads" / CSV name)
 *   externalId / external_id           Meta lead id (e.g. "l:1589843572551797")
 *   isSocialMedia / is_social_media    convenience boolean
 *   leadSource / lead_source           'social_media' | 'calling_data'
 *
 *   Social = sheetSourceId set, sourceType google_sheet / meta / social, or platform ig / fb / meta / instagram /
 *   facebook. CSV uploads stay 'csv'.
 *
 * -----------------------------------------------------------------------------
 * 2) Endpoints
 * -----------------------------------------------------------------------------
 *   GET   /api/dealers/me/calling-queue/next | /current   lead + tab arrays — buildDealerQueueSocialFields(lead, batch)
 *   GET   /api/dealers/me/calling-actions (+ /dialled, /connected, /not-connected)
 *   GET   /api/admin/calling-actions, /api/hr/calling-actions
 *   PATCH /api/dealers/me/calling-queue/:leadId/action    snapshots the source onto the history row + echoes it
 *   Action rows use callingActionSourceFields(row): snapshot columns first, then row.lead (rows saved before §BS).
 *
 * -----------------------------------------------------------------------------
 * 3) Schema — calling_action_history (camelCase columns, all nullable)
 * -----------------------------------------------------------------------------
 *   "sourceType" VARCHAR(32), "platform" VARCHAR(64), "campaignName" VARCHAR(256),
 *   "sheetSourceId" VARCHAR(50), "uploadFileName" VARCHAR(255), "externalId" VARCHAR(255)
 *   Boot ensure: ensureCallingActionSourceColumns (config/sequelizeBootstrap.ts)
 *   Migration:   database/migrations/20261013120000-add-source-to-calling-action-history.js
 *   Backfill (rows with "sourceType" IS NULL; runs on every boot):
 */
const CALLING_ACTION_SOURCE_BACKFILL_SQL = `
UPDATE calling_action_history h
   SET "sourceType" = CASE WHEN l."sheetSourceId" IS NOT NULL
                           THEN COALESCE(NULLIF(b."sourceType", 'csv'), 'google_sheet')
                           ELSE COALESCE(NULLIF(b."sourceType", ''), 'csv') END,
       "platform" = l."platform",
       "campaignName" = l."campaignName",
       "sheetSourceId" = l."sheetSourceId",
       "uploadFileName" = b."fileName",
       "externalId" = l."externalId"
  FROM calling_leads l
  LEFT JOIN calling_lead_upload_batches b ON b.id = l."batchId"
 WHERE h."leadId" = l.id AND h."sourceType" IS NULL;
`;

/**
 * -----------------------------------------------------------------------------
 * 4) PATCH snapshot (controllers/callingLeadController.ts → upsertActionHistory)
 * -----------------------------------------------------------------------------
 */
// const uploadBatch = lead?.batchId
//   ? await CallingLeadUploadBatch.findByPk(lead.batchId, { attributes: ['fileName', 'sourceType'], transaction })
//   : null;
// const source = resolveCallingActionSource(lead, uploadBatch);
// const historyPayload = { ...existingFields, ...source };

/**
 * -----------------------------------------------------------------------------
 * 5) Example echo (dev, Meta lead)
 * -----------------------------------------------------------------------------
 *   { sourceType: 'google_sheet', platform: 'fb', campaignName: 'chairbord ads set',
 *     sheetSourceId: '208776e5-…', uploadFileName: 'Google Sheet: Ajmer Leads',
 *     externalId: 'l:1589843572551797', isSocialMedia: true, leadSource: 'social_media' }
 *   CSV lead → { sourceType: 'csv', platform: null, uploadFileName: 'CSV Shalimar Chouraha … .csv',
 *     isSocialMedia: false, leadSource: 'calling_data' }
 */
export { CALLING_ACTION_SOURCE_BACKFILL_SQL };
