'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('pricing_rules', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      productCategory: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      size: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      pricePerUnit: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      effectiveFrom: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      effectiveTo: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('pricing_rules', ['productCategory', 'brand'], { name: 'idx_pricing_category_brand' });
    await queryInterface.addIndex('pricing_rules', ['effectiveFrom', 'effectiveTo'], { name: 'idx_pricing_dates' });
    await queryInterface.addIndex('pricing_rules', ['isActive'], { name: 'idx_pricing_active' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('pricing_rules');
  }
};

