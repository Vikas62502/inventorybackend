'use strict';

/**
 * Admin Banking (§41) — persist assigned person / remarks / location / document names
 * on quotations so Submitted-tab details survive refresh.
 *
 * Sequelize models use camelCase column names (`underscored: false`).
 * bankProcessDone / bankProcessDoneAt already exist (20260725120000-bank-process-done.js).
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

    await addIfMissing('bankAssignedPersonName', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await addIfMissing('bankRemarks', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await addIfMissing('bankLocation', {
      type: Sequelize.STRING(255),
      allowNull: true
    });
    await addIfMissing('bankDocumentNames', {
      type: Sequelize.JSONB,
      allowNull: true
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('quotations');
    for (const column of [
      'bankDocumentNames',
      'bankLocation',
      'bankRemarks',
      'bankAssignedPersonName'
    ]) {
      if (table[column]) {
        await queryInterface.removeColumn('quotations', column);
      }
    }
  }
};
