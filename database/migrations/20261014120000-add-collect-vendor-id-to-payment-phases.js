'use strict';

/**
 * Payment management Office "Collected by" = Other (Cash/UPI installments):
 *  - collectVendorId — office-inside subvendor id (only when collectDestination = 'other')
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE quotation_payment_phases
        ADD COLUMN IF NOT EXISTS "collectVendorId" VARCHAR(64) NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE quotation_payment_phases
        DROP COLUMN IF EXISTS "collectVendorId";
    `);
  }
};
