const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const InventoryTransaction = sequelize.define('InventoryTransaction', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  product_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  transaction_type: {
    type: DataTypes.ENUM('purchase', 'sale', 'return', 'adjustment', 'transfer'),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  reference: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  related_stock_request_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  related_sale_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'inventory_transactions',
  timestamps: false,
  indexes: [
    { fields: ['product_id'] },
    { fields: ['transaction_type'] },
    { fields: ['timestamp'] },
    { fields: ['reference'] }
  ]
});

// Associations will be set up in models/index.js

module.exports = InventoryTransaction;

