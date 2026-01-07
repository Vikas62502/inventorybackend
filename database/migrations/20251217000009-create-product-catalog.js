'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('product_catalog', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      category: {
        type: Sequelize.ENUM('panel', 'inverter', 'structure', 'meter', 'cable', 'acdb', 'dcdb', 'battery'),
        allowNull: false
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      model: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      size: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      basePrice: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      specifications: {
        type: Sequelize.JSONB,
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('product_catalog', ['category'], { name: 'idx_product_category' });
    await queryInterface.addIndex('product_catalog', ['brand'], { name: 'idx_product_brand' });
    await queryInterface.addIndex('product_catalog', ['isActive'], { name: 'idx_product_active' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('product_catalog');
  }
};


