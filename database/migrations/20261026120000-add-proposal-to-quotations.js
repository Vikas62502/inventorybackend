'use strict';

/** Accounts Proposal on admin approve — quotations.proposal */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('quotations');
    if (!table.proposal) {
      await queryInterface.addColumn('quotations', 'proposal', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('quotations');
    if (table.proposal) {
      await queryInterface.removeColumn('quotations', 'proposal');
    }
  }
};
