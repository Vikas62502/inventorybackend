'use strict';

/** Accounts → Vendor Outside hop (`sent_to_outside_at`). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_records
        ADD COLUMN IF NOT EXISTS sent_to_outside_at TIMESTAMPTZ NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_records
        DROP COLUMN IF EXISTS sent_to_outside_at;
    `);
  }
};
