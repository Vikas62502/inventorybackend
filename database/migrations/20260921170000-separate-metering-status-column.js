'use strict';

/**
 * Separate metering_status from installation_status (§ independent columns).
 * Heal rows where metering stages were stored on installationStatus.
 */

const METERING_STAGES = [
  'pending_metering',
  'metering_in_progress',
  'metering_approved',
  'meter_installation_pending',
  'mco'
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable('quotations');

    if (!table.meteringStatus && !table.metering_status) {
      await queryInterface.addColumn('quotations', 'meteringStatus', {
        type: Sequelize.STRING(64),
        allowNull: true,
        defaultValue: null
      });
    }

    const col = table.meteringStatus
      ? 'meteringStatus'
      : table.metering_status
        ? 'metering_status'
        : 'meteringStatus';

    // Copy leaked metering stages onto meteringStatus
    await queryInterface.sequelize.query(`
      UPDATE quotations
      SET "${col}" = "installationStatus"
      WHERE "installationStatus" IN (${METERING_STAGES.map((s) => `'${s}'`).join(',')})
        AND ("${col}" IS NULL OR TRIM("${col}") = '')
    `);

    // Restore installation_status to installer_approved when it held a metering stage
    await queryInterface.sequelize.query(`
      UPDATE quotations
      SET "installationStatus" = 'installer_approved'
      WHERE "installationStatus" IN (${METERING_STAGES.map((s) => `'${s}'`).join(',')})
    `);

    await queryInterface.addIndex('quotations', [col], {
      name: 'idx_quotations_metering_status',
      concurrently: false
    }).catch(() => {
      /* index may already exist */
    });
  },

  async down(queryInterface) {
    const table = await queryInterface.describeTable('quotations');
    try {
      await queryInterface.removeIndex('quotations', 'idx_quotations_metering_status');
    } catch {
      /* ignore */
    }
    if (table.meteringStatus) {
      // Optionally copy back for rollback (best-effort)
      await queryInterface.sequelize.query(`
        UPDATE quotations
        SET "installationStatus" = "meteringStatus"
        WHERE "meteringStatus" IS NOT NULL
          AND TRIM("meteringStatus") <> ''
          AND "installationStatus" = 'installer_approved'
      `);
      await queryInterface.removeColumn('quotations', 'meteringStatus');
    }
  }
};
