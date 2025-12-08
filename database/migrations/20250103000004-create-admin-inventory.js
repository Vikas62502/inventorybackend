'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('admin_inventory', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      admin_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'CASCADE'
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
      quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add unique constraint on (admin_id, product_id)
    await queryInterface.addIndex('admin_inventory', ['admin_id', 'product_id'], {
      unique: true,
      name: 'admin_inventory_admin_product_unique'
    });

    // Add check constraint for quantity
    await queryInterface.sequelize.query(`
      ALTER TABLE admin_inventory ADD CONSTRAINT admin_inventory_quantity_check 
      CHECK (quantity >= 0)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('admin_inventory');
  }
};


