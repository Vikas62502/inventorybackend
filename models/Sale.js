const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Sale = sequelize.define('Sale', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('B2B', 'B2C'),
    allowNull: false
  },
  customer_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  product_summary: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  total_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  subtotal: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  tax_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  discount_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  total_amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'completed'),
    defaultValue: 'pending'
  },
  sale_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  company_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  gst_number: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  contact_person: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  billing_address_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  delivery_address_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  delivery_matches_billing: {
    type: DataTypes.BOOLEAN,
    allowNull: true
  },
  customer_email: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isEmail: {
        msg: 'customer_email must be a valid email'
      }
    }
  },
  customer_phone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  delivery_instructions: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  bill_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  bill_confirmed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bill_confirmed_by_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  bill_confirmed_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'sales',
  timestamps: false,
  indexes: [
    { fields: ['type'], name: 'idx_sales_type' },
    { fields: ['payment_status'], name: 'idx_sales_payment_status' },
    { fields: ['sale_date'], name: 'idx_sales_sale_date' },
    { fields: ['customer_name'], name: 'idx_sales_customer_name' },
    { fields: ['bill_confirmed_date'], name: 'idx_sales_bill_confirmed_date' }
  ]
});

// Associations will be set up in models/index.js

module.exports = Sale;

