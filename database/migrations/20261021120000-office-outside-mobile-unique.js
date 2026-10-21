'use strict';

/** One customer = one Office Outside row (unique last-10 mobile). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE office_outside_records
      SET customer_mobile = RIGHT(regexp_replace(COALESCE(customer_mobile, ''), '[^0-9]', '', 'g'), 10);
    `);
    await queryInterface.sequelize.query(`
      DELETE FROM office_outside_records
      WHERE id IN (
        SELECT id FROM (
          SELECT id,
            ROW_NUMBER() OVER (
              PARTITION BY customer_mobile
              ORDER BY updated_at DESC, created_at DESC, id DESC
            ) AS rn
          FROM office_outside_records
          WHERE length(customer_mobile) = 10
        ) ranked
        WHERE rn > 1
      );
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS office_outside_mobile_unique
        ON office_outside_records (customer_mobile)
        WHERE length(customer_mobile) = 10;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP INDEX IF EXISTS office_outside_mobile_unique;'
    );
  }
};
