'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('stock_requests', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      primary_product_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'products',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      primary_product_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      primary_model: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      total_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      requested_by_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      requested_by_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      requested_by_role: {
        type: Sequelize.STRING(10),
        allowNull: false
      },
      requested_from: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      requested_from_role: {
        type: Sequelize.STRING(12),
        allowNull: false
      },
      status: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'pending'
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      requested_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      dispatched_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      confirmed_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      dispatch_image: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      confirmation_image: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      dispatched_by_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      dispatched_by_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      confirmed_by_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      confirmed_by_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      }
    });

    // Add check constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE stock_requests ADD CONSTRAINT stock_requests_requested_by_role_check 
      CHECK (requested_by_role IN ('admin', 'agent'))
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE stock_requests ADD CONSTRAINT stock_requests_requested_from_role_check 
      CHECK (requested_from_role IN ('super-admin', 'admin'))
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE stock_requests ADD CONSTRAINT stock_requests_status_check 
      CHECK (status IN ('pending', 'dispatched', 'confirmed', 'rejected'))
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE stock_requests ADD CONSTRAINT stock_requests_total_quantity_check 
      CHECK (total_quantity > 0)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('stock_requests');
  }
};

