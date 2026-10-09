'use strict';

/**
 * §BM — Office Inside Collect self / To Chairbord.
 *  - quotation_payment_phases."collectDestination" ('self' | 'chairbord' | NULL)
 *  - subvendor_leaser_payments.id UUID → TEXT so `lp-self-{quotationId}-{phase}` ids persist as sent
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE quotation_payment_phases ADD COLUMN IF NOT EXISTS "collectDestination" VARCHAR(16) NULL;'
    );
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name = 'subvendor_leaser_payments' AND column_name = 'id') = 'uuid' THEN
          ALTER TABLE subvendor_leaser_payments ALTER COLUMN id TYPE TEXT USING id::text;
        END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE quotation_payment_phases DROP COLUMN IF EXISTS "collectDestination";'
    );
  }
};
