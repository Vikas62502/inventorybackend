'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('custom_panels', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      quotationId: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'quotations',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      brand: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      size: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      type: {
        type: Sequelize.ENUM('dcr', 'non-dcr'),
        allowNull: false
      },
      price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('custom_panels', ['quotationId'], { name: 'idx_custom_panel_quotation' });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('custom_panels');
  }
};


