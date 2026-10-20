import sequelize from './database';
import logger from './logger';

/** Idempotent: Payment Management → Admin Installation release flags. */
const ensureInstallationReleaseColumns = async (): Promise<void> => {
  try {
    await sequelize.query(
      'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS "installationReadyForInstaller" BOOLEAN NOT NULL DEFAULT false;'
    );
    await sequelize.query(
      'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS "installationReleasedAt" TIMESTAMPTZ NULL;'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure quotations installation release columns', { message });
  }
};

/** Idempotent: keeps Sequelize model and DB in sync (avoids 500 on GET /api/quotations). */
const ensureInstallationScheduledAtColumn = async (): Promise<void> => {
  try {
    await sequelize.query(
      'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS "installationScheduledAt" DATE NULL;'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure quotations.installationScheduledAt column', { message });
  }
};

const ensureSystemKwColumn = async (): Promise<void> => {
  try {
    await sequelize.query(
      'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS system_kw NUMERIC(10, 2) NULL;'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure quotations.system_kw column', { message });
  }
};

/** §BG — backfill only when the column is first added, so later unticks are not re-set on restart. */
const ensureIncludeLithiumBatteryColumn = async (): Promise<void> => {
  try {
    const [rows] = await sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'quotation_products' AND column_name = 'includeLithiumBattery'`
    );
    if ((rows as unknown[]).length > 0) return;
    await sequelize.query(
      'ALTER TABLE quotation_products ADD COLUMN IF NOT EXISTS "includeLithiumBattery" BOOLEAN NOT NULL DEFAULT FALSE;'
    );
    await sequelize.query(
      `UPDATE quotation_products SET "includeLithiumBattery" = TRUE
       WHERE COALESCE(TRIM("batteryCapacity"), '') <> '' OR COALESCE("batteryPrice", 0) > 0;`
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure quotation_products.includeLithiumBattery column', { message });
  }
};

const ensurePaymentPhaseCollectDestinationColumn = async (): Promise<void> => {
  try {
    await sequelize.query(`
      ALTER TABLE quotation_payment_phases
        ADD COLUMN IF NOT EXISTS "collectDestination" VARCHAR(16) NULL,
        ADD COLUMN IF NOT EXISTS "collectVendorId" VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS "collectKind" VARCHAR(16) NULL,
        ADD COLUMN IF NOT EXISTS "collectSelfAmount" NUMERIC(14,2) NULL,
        ADD COLUMN IF NOT EXISTS "collectChairbordAmount" NUMERIC(14,2) NULL;
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure quotation_payment_phases collect columns', { message });
  }
};

/** Meta form email + Q&A on calling_leads (§BW). rawPayload already exists on most DBs. */
const ensureCallingLeadFormColumns = async (): Promise<void> => {
  try {
    await sequelize.query(`
      ALTER TABLE calling_leads
        ADD COLUMN IF NOT EXISTS email VARCHAR(256) NULL,
        ADD COLUMN IF NOT EXISTS "formAnswers" JSONB NULL,
        ADD COLUMN IF NOT EXISTS "rawPayload" JSONB NULL;
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure calling_leads form columns', { message });
  }
};

/** Social vs Calling source snapshot on each calling action; backfills rows saved before the columns existed. */
const ensureCallingActionSourceColumns = async (): Promise<void> => {
  try {
    await sequelize.query(`
      ALTER TABLE calling_action_history
        ADD COLUMN IF NOT EXISTS "sourceType" VARCHAR(32) NULL,
        ADD COLUMN IF NOT EXISTS "platform" VARCHAR(64) NULL,
        ADD COLUMN IF NOT EXISTS "campaignName" VARCHAR(256) NULL,
        ADD COLUMN IF NOT EXISTS "sheetSourceId" VARCHAR(50) NULL,
        ADD COLUMN IF NOT EXISTS "uploadFileName" VARCHAR(255) NULL,
        ADD COLUMN IF NOT EXISTS "externalId" VARCHAR(255) NULL;
    `);
    await sequelize.query(CALLING_ACTION_SOURCE_BACKFILL_SQL);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure calling_action_history source columns', { message });
  }
};

const CALLING_ACTION_SOURCE_BACKFILL_SQL = `
  UPDATE calling_action_history h
     SET "sourceType" = CASE
           WHEN l."sheetSourceId" IS NOT NULL THEN COALESCE(NULLIF(b."sourceType", 'csv'), 'google_sheet')
           ELSE COALESCE(NULLIF(b."sourceType", ''), 'csv')
         END,
         "platform" = l."platform",
         "campaignName" = l."campaignName",
         "sheetSourceId" = l."sheetSourceId",
         "uploadFileName" = b."fileName",
         "externalId" = l."externalId"
    FROM calling_leads l
    LEFT JOIN calling_lead_upload_batches b ON b.id = l."batchId"
   WHERE h."leadId" = l.id AND h."sourceType" IS NULL;
`;

const ensureProductUnitColumn = async (): Promise<void> => {
  try {
    await sequelize.query(
      'ALTER TABLE products ADD COLUMN IF NOT EXISTS unit VARCHAR(50) NULL;'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure products.unit column', { message });
  }
};

const ensureInstallationTeamsSchema = async (): Promise<void> => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS "installation_teams" (
        "id" VARCHAR(50) PRIMARY KEY,
        "name" VARCHAR(255) NOT NULL,
        "username" VARCHAR(50) NOT NULL UNIQUE,
        "password" VARCHAR(255) NOT NULL,
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "createdBy" VARCHAR(50) NULL,
        "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(
      'ALTER TABLE quotations ADD COLUMN IF NOT EXISTS "installationTeamId" VARCHAR(50) NULL;'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure installation_teams / quotations.installationTeamId', { message });
  }
};

/** Idempotent: Admin Users tab dashboard access JSONB. */
const ensureUserAccessColumns = async (): Promise<void> => {
  try {
    await sequelize.query(
      "ALTER TABLE dealers ADD COLUMN IF NOT EXISTS access JSONB NOT NULL DEFAULT '[]'::jsonb;"
    );
    await sequelize.query(
      "ALTER TABLE account_managers ADD COLUMN IF NOT EXISTS access JSONB NOT NULL DEFAULT '[]'::jsonb;"
    );
    await sequelize.query(
      "ALTER TABLE visitors ADD COLUMN IF NOT EXISTS access JSONB NOT NULL DEFAULT '[]'::jsonb;"
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure user access columns', { message });
  }
};

const PROFILE_COLUMNS_SQL: Array<[string, string]> = [
  ['gender', 'VARCHAR(20)'],
  ['dateOfBirth', 'DATE'],
  ['fatherName', 'VARCHAR(100)'],
  ['fatherContact', 'VARCHAR(15)'],
  ['governmentIdType', 'VARCHAR(50)'],
  ['governmentIdNumber', 'VARCHAR(50)'],
  ['employeeId', 'VARCHAR(50)'],
  ['addressStreet', 'TEXT'],
  ['addressCity', 'VARCHAR(100)'],
  ['addressState', 'VARCHAR(100)'],
  ['addressPincode', 'VARCHAR(6)']
];

/** Idempotent: unified Users create/edit profile fields on ops + visitors. */
const ensureUnifiedUserProfileColumns = async (): Promise<void> => {
  try {
    for (const [name, type] of PROFILE_COLUMNS_SQL) {
      await sequelize.query(
        `ALTER TABLE account_managers ADD COLUMN IF NOT EXISTS "${name}" ${type};`
      );
      if (name !== 'employeeId') {
        await sequelize.query(`ALTER TABLE visitors ADD COLUMN IF NOT EXISTS "${name}" ${type};`);
      }
    }
    await sequelize.query(
      'ALTER TABLE visitors ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false;'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure unified user profile columns', { message });
  }
};

/** Idempotent: §BD Subvendors + ledger (mirrors 20260928120000-create-subvendors-and-ledger.js). */
const SUBVENDOR_LEASER_PAYMENTS_SQL = `
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
`;

const ensureSubvendorTables = async (): Promise<void> => {
  try {
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subvendors (
        id            UUID PRIMARY KEY,
        kind          VARCHAR(32) NOT NULL CHECK (kind IN ('office_inside', 'office_outside')),
        dealer_id     VARCHAR(50) NULL REFERENCES dealers(id) ON DELETE SET NULL,
        name          VARCHAR(255) NOT NULL,
        contact_name  VARCHAR(255) NOT NULL DEFAULT '',
        mobile        VARCHAR(32)  NOT NULL DEFAULT '',
        email         VARCHAR(255) NOT NULL DEFAULT '',
        city          VARCHAR(128) NOT NULL DEFAULT '',
        category      VARCHAR(64)  NOT NULL DEFAULT 'Other',
        notes         TEXT         NOT NULL DEFAULT '',
        created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      );
    `);
    await sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS subvendors_office_inside_dealer_uidx
        ON subvendors (dealer_id)
        WHERE kind = 'office_inside' AND dealer_id IS NOT NULL;
    `);
    await sequelize.query('CREATE INDEX IF NOT EXISTS subvendors_kind_idx ON subvendors (kind);');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS subvendor_ledger (
        id               UUID PRIMARY KEY,
        quotation_id     VARCHAR(50) NOT NULL UNIQUE REFERENCES quotations(id) ON DELETE CASCADE,
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
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS subvendor_ledger_vendor_idx ON subvendor_ledger (vendor_id);'
    );
    await sequelize.query(
      'ALTER TABLE subvendors ADD COLUMN IF NOT EXISTS profit_ratio NUMERIC(6, 2) NOT NULL DEFAULT 0;'
    );
    await sequelize.query(`
      ALTER TABLE subvendors
        ADD COLUMN IF NOT EXISTS file_cost_per_kw NUMERIC(14, 2) NOT NULL DEFAULT 1000,
        ADD COLUMN IF NOT EXISTS leaser_paid NUMERIC(14, 2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS leaser_remaining NUMERIC(14, 2) NOT NULL DEFAULT 0;
    `);
    await sequelize.query(SUBVENDOR_LEASER_PAYMENTS_SQL);
    // §BM: client ids like `lp-self-{quotationId}-{phase}` are stored verbatim.
    await sequelize.query(`
      DO $$ BEGIN
        IF (SELECT data_type FROM information_schema.columns
            WHERE table_name = 'subvendor_leaser_payments' AND column_name = 'id') = 'uuid' THEN
          ALTER TABLE subvendor_leaser_payments ALTER COLUMN id TYPE TEXT USING id::text;
        END IF;
      END $$;
    `);
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS subvendor_leaser_payments_vendor_idx ON subvendor_leaser_payments (vendor_id, sort_order);'
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure subvendors / subvendor_ledger tables', { message });
  }
};

/** Office Outside records + ledger — separate from quotations (§BX). */
const ensureOfficeOutsideTables = async (): Promise<void> => {
  try {
    await sequelize.query(`
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
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS office_outside_records_vendor_idx ON office_outside_records (vendor_id);'
    );
    await sequelize.query(`
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
    await sequelize.query(
      'CREATE INDEX IF NOT EXISTS office_outside_ledger_vendor_idx ON office_outside_ledger (vendor_id);'
    );
    await sequelize.query(`
      ALTER TABLE office_outside_records
        ADD COLUMN IF NOT EXISTS installments_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(16) NOT NULL DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(30) NULL;
    `);
    await sequelize.query(`
      ALTER TABLE office_outside_records
        ALTER COLUMN file_type DROP NOT NULL,
        ALTER COLUMN file_type DROP DEFAULT;
    `);
    await sequelize.query(`
      ALTER TABLE office_outside_ledger
        ADD COLUMN IF NOT EXISTS cash_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn('Could not ensure office_outside tables', { message });
  }
};

/**
 * Resolves after DB auth + lightweight schema fixes. Server should await this before binding the port
 * so the first request never hits a missing-column error.
 */
export const sequelizeBootstrap = (async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    await ensureInstallationReleaseColumns();
    await ensureProductUnitColumn();
    await ensureInstallationScheduledAtColumn();
    await ensureSystemKwColumn();
    await ensureInstallationTeamsSchema();
    await ensureUserAccessColumns();
    await ensureUnifiedUserProfileColumns();
    await ensureSubvendorTables();
    await ensureOfficeOutsideTables();
    await ensureIncludeLithiumBatteryColumn();
    await ensurePaymentPhaseCollectDestinationColumn();
    await ensureCallingActionSourceColumns();
    await ensureCallingLeadFormColumns();
    logger.info('PostgreSQL database connected successfully');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database connection error', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    });
  }
})();
