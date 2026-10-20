'use strict';

/** Office Outside payment details + ledger cash_amount / GST inputs. */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_records
        ADD COLUMN IF NOT EXISTS installments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(16) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) NULL;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_records
        ALTER COLUMN file_type DROP NOT NULL,
        ALTER COLUMN file_type DROP DEFAULT;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_ledger
        ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_records
        DROP COLUMN IF EXISTS installments_json,
        DROP COLUMN IF EXISTS payment_status,
        DROP COLUMN IF EXISTS payment_mode;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_ledger
        DROP COLUMN IF EXISTS cash_amount;
    `);
  }
};
