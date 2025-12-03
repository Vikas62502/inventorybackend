'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sales', {
      id: {
        type: Sequelize.STRING(50),
        primaryKey: true,
        allowNull: false
      },
      type: {
        type: Sequelize.STRING(3),
        allowNull: false
      },
      customer_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      product_summary: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      total_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      subtotal: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      tax_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      discount_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      payment_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending'
      },
      sale_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      image: {
        type: Sequelize.STRING(500),
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
      company_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      gst_number: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      contact_person: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      billing_address_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'addresses',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      delivery_address_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'addresses',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      delivery_matches_billing: {
        type: Sequelize.BOOLEAN,
        allowNull: true
      },
      customer_email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      customer_phone: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      delivery_instructions: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      bill_image: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      bill_confirmed_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      bill_confirmed_by_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onDelete: 'SET NULL'
      },
      bill_confirmed_by_name: {
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
      ALTER TABLE sales ADD CONSTRAINT sales_type_check 
      CHECK (type IN ('B2B', 'B2C'))
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sales ADD CONSTRAINT sales_payment_status_check 
      CHECK (payment_status IN ('pending', 'completed'))
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sales ADD CONSTRAINT sales_total_quantity_check 
      CHECK (total_quantity > 0)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sales ADD CONSTRAINT sales_subtotal_check 
      CHECK (subtotal >= 0)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sales ADD CONSTRAINT sales_tax_amount_check 
      CHECK (tax_amount >= 0)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sales ADD CONSTRAINT sales_discount_amount_check 
      CHECK (discount_amount >= 0)
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE sales ADD CONSTRAINT sales_total_amount_check 
      CHECK (total_amount >= 0)
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('sales');
  }
};

