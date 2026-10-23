'use strict';

/** Meta lead_status=CREATED must not live on dealer_lead_assignments.status. */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE "dealer_lead_assignments"
      SET
        "status" = (
          CASE
            WHEN "dealerId" IS NULL OR BTRIM("dealerId") = ''
              OR LOWER(BTRIM("dealerId")) IN ('unassigned', 'pool', 'open', 'null', 'none', '-', 'na', 'n/a')
            THEN 'queued'
            ELSE 'assigned'
          END
        )::"enum_dealer_lead_assignments_status",
        "assignedAt" = COALESCE("assignedAt", NOW()),
        "updatedAt" = NOW()
      WHERE LOWER(BTRIM(COALESCE("status"::text, ''))) IN ('created', 'open', 'pending');
    `);
  },

  async down() {
    /* irreversible status remap */
  }
};
