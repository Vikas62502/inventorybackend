'use strict';

/**
 * Office Inside "Collected by" (Cash/UPI installments):
 *  - collectKind ('complete' | 'partial' | NULL; only when collectDestination = 'self')
 *  - collectSelfAmount / collectChairbordAmount (INR split of paidAmount)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE quotation_payment_phases
        ADD COLUMN IF NOT EXISTS "collectKind" VARCHAR(16) NULL,
        ADD COLUMN IF NOT EXISTS "collectSelfAmount" NUMERIC(14,2) NULL,
        ADD COLUMN IF NOT EXISTS "collectChairbordAmount" NUMERIC(14,2) NULL;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE quotation_payment_phases
        DROP COLUMN IF EXISTS "collectChairbordAmount",
        DROP COLUMN IF EXISTS "collectSelfAmount",
        DROP COLUMN IF EXISTS "collectKind";
    `);
  }
};
