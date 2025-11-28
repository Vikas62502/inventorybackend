const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockReturn = sequelize.define('StockReturn', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  admin_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  product_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  return_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed'),
    defaultValue: 'pending'
  },
  processed_by: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  processed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_returns',
  timestamps: false,
  indexes: [
    { fields: ['admin_id'] },
    { fields: ['product_id'] },
    { fields: ['status'] },
    { fields: ['return_date'] }
  ]
});

// Associations will be set up in models/index.js

module.exports = StockReturn;

