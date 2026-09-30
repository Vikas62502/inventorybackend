'use strict';

/** §BE — Subvendor profit ratio (percent 0–100, two decimals). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE subvendors ADD COLUMN IF NOT EXISTS profit_ratio NUMERIC(6, 2) NOT NULL DEFAULT 0;'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('ALTER TABLE subvendors DROP COLUMN IF EXISTS profit_ratio;');
  }
};
