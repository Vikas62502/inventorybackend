'use strict';

/** §BJ — Subvendor file cost per kW + leaser paid / remaining (INR). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE subvendors
        ADD COLUMN IF NOT EXISTS file_cost_per_kw NUMERIC(14, 2) NOT NULL DEFAULT 1000,
        ADD COLUMN IF NOT EXISTS leaser_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS leaser_remaining NUMERIC(14, 2) NOT NULL DEFAULT 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE subvendors
        DROP COLUMN IF EXISTS file_cost_per_kw,
        DROP COLUMN IF EXISTS leaser_paid,
        DROP COLUMN IF EXISTS leaser_remaining;
    `);
  }
};
