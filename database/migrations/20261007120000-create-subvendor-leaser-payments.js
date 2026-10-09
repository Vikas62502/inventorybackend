'use strict';

/** §BK — Dealer leaser payments per subvendor (replaces SPA localStorage). */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS subvendor_leaser_payments (
        id            TEXT PRIMARY KEY,
        vendor_id     UUID NOT NULL REFERENCES subvendors(id) ON DELETE CASCADE,
        date          DATE NULL,
        amount        NUMERIC(14, 2) NOT NULL DEFAULT 0,
        type          VARCHAR(64) NOT NULL DEFAULT '',
        remark        TEXT NOT NULL DEFAULT '',
        customer_ids  JSONB NOT NULL DEFAULT '[]'::jsonb,
        sort_order    INTEGER NOT NULL DEFAULT 0,
        updated_by    VARCHAR(50) NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS subvendor_leaser_payments_vendor_idx ON subvendor_leaser_payments (vendor_id, sort_order);'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS subvendor_leaser_payments;');
  }
};
