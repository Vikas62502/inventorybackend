'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('inventory_transactions', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      product_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'products',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      transaction_type: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      reference: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      related_stock_request_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'stock_requests',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      related_sale_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'sales',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add check constraint for transaction_type
    await queryInterface.sequelize.query(`
      ALTER TABLE inventory_transactions ADD CONSTRAINT inventory_transactions_transaction_type_check 
      CHECK (transaction_type IN ('purchase', 'sale', 'return', 'adjustment', 'transfer'))
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('inventory_transactions');
  }
};



