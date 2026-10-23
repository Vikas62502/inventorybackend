'use strict';

/** Vendor Outside bills (Manage → Bills). Separate from leaser payments. */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS subvendor_bills (
        id              TEXT PRIMARY KEY,
        vendor_id       UUID NOT NULL REFERENCES subvendors(id) ON DELETE CASCADE,
        date            DATE NULL,
        basic_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
        payment_mode    VARCHAR(64) NOT NULL DEFAULT '',
        remark          TEXT NOT NULL DEFAULT '',
        customer_ids    JSONB NOT NULL DEFAULT '[]'::jsonb,
        bill_file_name  VARCHAR(255) NOT NULL DEFAULT '',
        bill_file_data  TEXT NULL,
        bill_file_url   TEXT NULL,
        sort_order      INTEGER NOT NULL DEFAULT 0,
        updated_by      VARCHAR(50) NULL,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS subvendor_bills_vendor_idx ON subvendor_bills (vendor_id, sort_order);'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS subvendor_bills;');
  }
};
