'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('quotation_products', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      quotationId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        references: {
          model: 'quotations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      systemType: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      panelBrand: { type: Sequelize.STRING(100), allowNull: true },
      panelSize: { type: Sequelize.STRING(50), allowNull: true },
      panelQuantity: { type: Sequelize.INTEGER, allowNull: true },
      panelPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      dcrPanelBrand: { type: Sequelize.STRING(100), allowNull: true },
      dcrPanelSize: { type: Sequelize.STRING(50), allowNull: true },
      dcrPanelQuantity: { type: Sequelize.INTEGER, allowNull: true },
      nonDcrPanelBrand: { type: Sequelize.STRING(100), allowNull: true },
      nonDcrPanelSize: { type: Sequelize.STRING(50), allowNull: true },
      nonDcrPanelQuantity: { type: Sequelize.INTEGER, allowNull: true },
      inverterType: { type: Sequelize.STRING(50), allowNull: true },
      inverterBrand: { type: Sequelize.STRING(100), allowNull: true },
      inverterSize: { type: Sequelize.STRING(50), allowNull: true },
      inverterPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      structureType: { type: Sequelize.STRING(100), allowNull: true },
      structureSize: { type: Sequelize.STRING(50), allowNull: true },
      structurePrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      meterBrand: { type: Sequelize.STRING(100), allowNull: true },
      meterPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      acCableBrand: { type: Sequelize.STRING(100), allowNull: true },
      acCableSize: { type: Sequelize.STRING(50), allowNull: true },
      acCablePrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      dcCableBrand: { type: Sequelize.STRING(100), allowNull: true },
      dcCableSize: { type: Sequelize.STRING(50), allowNull: true },
      dcCablePrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      acdb: { type: Sequelize.STRING(100), allowNull: true },
      acdbPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      dcdb: { type: Sequelize.STRING(100), allowNull: true },
      dcdbPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      hybridInverter: { type: Sequelize.STRING(100), allowNull: true },
      batteryCapacity: { type: Sequelize.STRING(50), allowNull: true },
      batteryPrice: { type: Sequelize.DECIMAL(12, 2), allowNull: true },
      centralSubsidy: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0
      },
      stateSubsidy: {
        type: Sequelize.DECIMAL(12, 2),
        defaultValue: 0
      },
      subtotal: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      totalAmount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      }
    });

    await queryInterface.addIndex('quotation_products', ['quotationId'], { name: 'idx_quotation_products_quotation' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('quotation_products');
  }
};

