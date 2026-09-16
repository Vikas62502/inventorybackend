'use strict';

/**
 * §BB — Final settlement columns on quotations (Sep 2026).
 *
 * This repo’s Sequelize models use camelCase column names (`underscored: false`),
 * matching existing `finalSettlementApplied` / `finalSettlementAmount` migrations.
 * Spec SQL often shows snake_case; we create camelCase here so model ↔ DB match.
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('quotations');
    const addIfMissing = async (column, spec) => {
      if (!table[column]) {
        await queryInterface.addColumn('quotations', column, spec);
        table[column] = true;
      }
    };

    await addIfMissing('finalSettlementApplied', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await addIfMissing('finalSettlementAmount', {
      type: Sequelize.DECIMAL(12, 2),
      allowNull: true,
      defaultValue: 0
    });
    await addIfMissing('finalSettlementRemarks', {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('quotations');
    // Only remove remarks on down — applied/amount may pre-exist from older migrations.
    if (table.finalSettlementRemarks) {
      await queryInterface.removeColumn('quotations', 'finalSettlementRemarks');
    }
  }
};
