'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sale_items', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      sale_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        references: {
          model: 'sales',
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
      },
      unit_price: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      line_total: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      gst_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0
      }
    });

    // Add check constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE sale_items ADD CONSTRAINT sale_items_quantity_check 
      CHECK (quantity > 0)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sale_items ADD CONSTRAINT sale_items_unit_price_check 
      CHECK (unit_price >= 0)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sale_items ADD CONSTRAINT sale_items_line_total_check 
      CHECK (line_total >= 0)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sale_items ADD CONSTRAINT sale_items_gst_rate_check 
      CHECK (gst_rate >= 0)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sale_items');
  }
};



