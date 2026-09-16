'use strict';

/**
 * §BB — Heal settled quotations that have finalSettlementApplied=true but
 * remainingAmount NULL / non-zero or paymentStatus not completed.
 * SPA tabs (Completed vs Pending & Partial) depend on GET remaining=0 + completed.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE quotations
      SET
        "remainingAmount" = 0,
        "paymentStatus" = 'completed'
      WHERE "finalSettlementApplied" = true
        AND (
          "remainingAmount" IS NULL
          OR "remainingAmount" <> 0
          OR "paymentStatus" IS DISTINCT FROM 'completed'
        )
    `);
  },

  async down() {
    // Irreversible data heal — no-op
  }
};
