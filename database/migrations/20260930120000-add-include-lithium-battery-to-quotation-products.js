'use strict';

/** §BG — persist "Include lithium battery" on quotation products. */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.columns
       WHERE table_name = 'quotation_products' AND column_name = 'includeLithiumBattery'`
    );
    if (rows.length > 0) return;
    await queryInterface.sequelize.query(
      'ALTER TABLE quotation_products ADD COLUMN "includeLithiumBattery" BOOLEAN NOT NULL DEFAULT FALSE;'
    );
    await queryInterface.sequelize.query(
      `UPDATE quotation_products SET "includeLithiumBattery" = TRUE
       WHERE COALESCE(TRIM("batteryCapacity"), '') <> '' OR COALESCE("batteryPrice", 0) > 0;`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE quotation_products DROP COLUMN IF EXISTS "includeLithiumBattery";'
    );
  }
};
