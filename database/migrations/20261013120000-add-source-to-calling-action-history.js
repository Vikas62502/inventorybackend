'use strict';

/**
 * Calling actions echo Social Media vs Calling data source (§BS).
 * Snapshot of the lead's source on each action + backfill of existing rows.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE calling_action_history
        ADD COLUMN IF NOT EXISTS "sourceType" VARCHAR(32) NULL,
        ADD COLUMN IF NOT EXISTS "platform" VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS "campaignName" VARCHAR(256) NULL,
        ADD COLUMN IF NOT EXISTS "sheetSourceId" VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS "uploadFileName" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(255) NULL;
    `);
    await queryInterface.sequelize.query(`
      UPDATE calling_action_history h
         SET "sourceType" = CASE
               WHEN l."sheetSourceId" IS NOT NULL THEN COALESCE(NULLIF(b."sourceType", 'csv'), 'google_sheet')
               ELSE COALESCE(NULLIF(b."sourceType", ''), 'csv')
             END,
             "platform" = l."platform",
             "campaignName" = l."campaignName",
             "sheetSourceId" = l."sheetSourceId",
             "uploadFileName" = b."fileName",
             "externalId" = l."externalId"
        FROM calling_leads l
        LEFT JOIN calling_lead_upload_batches b ON b.id = l."batchId"
       WHERE h."leadId" = l.id AND h."sourceType" IS NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE calling_action_history
        DROP COLUMN IF EXISTS "externalId",
        DROP COLUMN IF EXISTS "uploadFileName",
        DROP COLUMN IF EXISTS "sheetSourceId",
        DROP COLUMN IF EXISTS "campaignName",
        DROP COLUMN IF EXISTS "platform",
        DROP COLUMN IF EXISTS "sourceType";
    `);
  }
};
