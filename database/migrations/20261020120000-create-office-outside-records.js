'use strict';

/**
 * Office Outside is a separate dataset (not quotations).
 *   office_outside_records + office_outside_ledger
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS office_outside_records (
        id                    UUID PRIMARY KEY,
        vendor_id             UUID NULL REFERENCES subvendors(id) ON DELETE SET NULL,
        customer_name         VARCHAR(255) NOT NULL DEFAULT '',
        customer_mobile       VARCHAR(32)  NOT NULL DEFAULT '',
        address               TEXT         NOT NULL DEFAULT '',
        city                  VARCHAR(128) NOT NULL DEFAULT '',
        system_kw             NUMERIC(10, 3) NOT NULL DEFAULT 0,
        subtotal              NUMERIC(14, 2) NOT NULL DEFAULT 0,
        file_type             VARCHAR(16)  NOT NULL DEFAULT 'cash',
        status                VARCHAR(32)  NOT NULL DEFAULT 'draft',
        sent_to_accounts_at   TIMESTAMPTZ  NULL,
        sent_to_accounts_by   VARCHAR(50)  NULL,
        slip_items            JSONB        NULL,
        slip_notes            TEXT         NOT NULL DEFAULT '',
        notes                 TEXT         NOT NULL DEFAULT '',
        created_by            VARCHAR(50)  NULL,
        updated_by            VARCHAR(50)  NULL,
        created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS office_outside_records_vendor_idx ON office_outside_records (vendor_id);'
    );
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS office_outside_records_status_idx ON office_outside_records (status, created_at DESC);'
    );

    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS office_outside_ledger (
        id               UUID PRIMARY KEY,
        record_id        UUID NOT NULL UNIQUE REFERENCES office_outside_records(id) ON DELETE CASCADE,
        vendor_id        UUID NULL REFERENCES subvendors(id) ON DELETE SET NULL,
        loan_amount      NUMERIC(14, 2) NOT NULL DEFAULT 0,
        received_amount  NUMERIC(14, 2) NOT NULL DEFAULT 0,
        remaining        NUMERIC(14, 2) NOT NULL DEFAULT 0,
        proposal         NUMERIC(14, 2) NOT NULL DEFAULT 0,
        cost_of_site     NUMERIC(14, 2) NOT NULL DEFAULT 0,
        file_charges     NUMERIC(14, 2) NOT NULL DEFAULT 0,
        pi               NUMERIC(14, 2) NOT NULL DEFAULT 0,
        gst_charges      NUMERIC(14, 2) NOT NULL DEFAULT 0,
        others           NUMERIC(14, 2) NOT NULL DEFAULT 0,
        updated_by       VARCHAR(50) NULL,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await queryInterface.sequelize.query(
      'CREATE INDEX IF NOT EXISTS office_outside_ledger_vendor_idx ON office_outside_ledger (vendor_id);'
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS office_outside_ledger;');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS office_outside_records;');
  }
};
