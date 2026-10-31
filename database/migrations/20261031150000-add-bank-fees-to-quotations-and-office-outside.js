'use strict';

/** Bank fees — loan / cash+loan. Cash = 0. Never added to paid. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const quotations = await queryInterface.describeTable('quotations');
    if (!quotations.bank_fees) {
      await queryInterface.addColumn('quotations', 'bank_fees', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: true,
        defaultValue: 0
      });
    }
    const officeOutside = await queryInterface.describeTable('office_outside_records');
    if (!officeOutside.bank_fees) {
      await queryInterface.addColumn('office_outside_records', 'bank_fees', {
        type: Sequelize.DECIMAL(14, 2),
        allowNull: false,
        defaultValue: 0
      });
    }
  },

  async down(queryInterface) {
    const quotations = await queryInterface.describeTable('quotations');
    if (quotations.bank_fees) {
      await queryInterface.removeColumn('quotations', 'bank_fees');
    }
    const officeOutside = await queryInterface.describeTable('office_outside_records');
    if (officeOutside.bank_fees) {
      await queryInterface.removeColumn('office_outside_records', 'bank_fees');
    }
  }
};
