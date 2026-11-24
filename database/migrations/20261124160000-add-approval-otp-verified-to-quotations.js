'use strict';

/** Status timeline OTP verifier stash (verify → approve). REQUIRED §CH / FE §75. */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('quotations');
    if (!table.approvalOtpVerifiedBy) {
      await queryInterface.addColumn('quotations', 'approvalOtpVerifiedBy', {
        type: Sequelize.STRING(20),
        allowNull: true
      });
    }
    if (!table.approvalOtpVerifiedAt) {
      await queryInterface.addColumn('quotations', 'approvalOtpVerifiedAt', {
        type: Sequelize.DATE,
        allowNull: true
      });
    }
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('quotations');
    if (table.approvalOtpVerifiedAt) {
      await queryInterface.removeColumn('quotations', 'approvalOtpVerifiedAt');
    }
    if (table.approvalOtpVerifiedBy) {
      await queryInterface.removeColumn('quotations', 'approvalOtpVerifiedBy');
    }
  }
};
