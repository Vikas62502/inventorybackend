'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const addIndexIfMissing = async (tableName, indexName, fields) => {
      const existing = await queryInterface.showIndex(tableName);
      if (existing.some((idx) => idx.name === indexName)) return;
      await queryInterface.addIndex(tableName, fields, { name: indexName });
    };

    await addIndexIfMissing('quotations', 'idx_quotations_metering_status', ['meteringStatus']);
    await addIndexIfMissing(
      'office_outside_records',
      'office_outside_records_sent_accounts_idx',
      ['sent_to_accounts_at']
    );
    await addIndexIfMissing(
      'office_outside_records',
      'office_outside_records_sent_outside_idx',
      ['sent_to_outside_at']
    );
  },

  async down(queryInterface) {
    const dropIfExists = async (tableName, indexName) => {
      const existing = await queryInterface.showIndex(tableName);
      if (!existing.some((idx) => idx.name === indexName)) return;
      await queryInterface.removeIndex(tableName, indexName);
    };

    await dropIfExists('office_outside_records', 'office_outside_records_sent_outside_idx');
    await dropIfExists('office_outside_records', 'office_outside_records_sent_accounts_idx');
    await dropIfExists('quotations', 'idx_quotations_metering_status');
  }
};
