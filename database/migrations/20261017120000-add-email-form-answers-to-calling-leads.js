'use strict';

/**
 * Meta form email + Q&A on calling_leads (FE docs say hr_leads).
 *   email VARCHAR(256), formAnswers JSONB; rawPayload JSONB already exists.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE calling_leads
        ADD COLUMN IF NOT EXISTS email VARCHAR(256) NULL,
        ADD COLUMN IF NOT EXISTS "formAnswers" JSONB NULL,
        ADD COLUMN IF NOT EXISTS "rawPayload" JSONB NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE calling_leads
        DROP COLUMN IF EXISTS email,
        DROP COLUMN IF EXISTS "formAnswers";
    `);
  }
};
