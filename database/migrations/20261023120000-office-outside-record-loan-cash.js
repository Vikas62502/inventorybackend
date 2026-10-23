'use strict';

/** Persist loan_amount / cash_amount on office_outside_records (and ledger if missing). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_records
        ADD COLUMN IF NOT EXISTS loan_amount INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cash_amount INTEGER NOT NULL DEFAULT 0;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_ledger
        ADD COLUMN IF NOT EXISTS loan_amount INTEGER NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS cash_amount INTEGER NOT NULL DEFAULT 0;
    `);
    await queryInterface.sequelize.query(`
      UPDATE office_outside_records r
      SET
        loan_amount = CASE
          WHEN COALESCE(r.loan_amount, 0) = 0 THEN ROUND(COALESCE(l.loan_amount, 0))::int
          ELSE r.loan_amount
        END,
        cash_amount = CASE
          WHEN COALESCE(r.cash_amount, 0) = 0 THEN ROUND(COALESCE(l.cash_amount, 0))::int
          ELSE r.cash_amount
        END
      FROM office_outside_ledger l
      WHERE l.record_id = r.id;
    `);
    await queryInterface.sequelize.query(`
      UPDATE office_outside_records
      SET loan_amount = ROUND(subtotal)::int
      WHERE COALESCE(loan_amount, 0) = 0
        AND LOWER(BTRIM(COALESCE(file_type, ''))) = 'loan'
        AND ROUND(subtotal) > 0;
    `);
    await queryInterface.sequelize.query(`
      UPDATE office_outside_ledger l
      SET
        loan_amount = r.loan_amount,
        cash_amount = CASE
          WHEN COALESCE(l.cash_amount, 0) = 0 THEN r.cash_amount
          ELSE l.cash_amount
        END
      FROM office_outside_records r
      WHERE l.record_id = r.id
        AND COALESCE(l.loan_amount, 0) = 0
        AND COALESCE(r.loan_amount, 0) > 0;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE office_outside_records
        DROP COLUMN IF EXISTS loan_amount,
        DROP COLUMN IF EXISTS cash_amount;
    `);
  }
};
