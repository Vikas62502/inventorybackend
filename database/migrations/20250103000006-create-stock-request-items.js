'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_request_items', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      stock_request_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'stock_requests',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      product_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      product_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      model: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });

    // Add check constraint for quantity
    await queryInterface.sequelize.query(`
      ALTER TABLE stock_request_items ADD CONSTRAINT stock_request_items_quantity_check 
      CHECK (quantity > 0)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('stock_request_items');
  }
};

