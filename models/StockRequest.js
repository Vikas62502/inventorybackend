const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockRequest = sequelize.define('StockRequest', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  primary_product_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  primary_product_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  primary_model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  total_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  requested_by_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  requested_by_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  requested_by_role: {
    type: DataTypes.ENUM('admin', 'agent'),
    allowNull: false
  },
  requested_from: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  requested_from_role: {
    type: DataTypes.ENUM('super-admin', 'admin'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('pending', 'dispatched', 'confirmed', 'rejected'),
    defaultValue: 'pending'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  requested_date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  dispatched_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  confirmed_date: {
    type: DataTypes.DATE,
    allowNull: true
  },
  dispatch_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  confirmation_image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  dispatched_by_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  dispatched_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  confirmed_by_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  confirmed_by_name: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'stock_requests',
  timestamps: false,
  indexes: [
    { fields: ['status'] },
    { fields: ['requested_by_id'] },
    { fields: ['requested_from'] },
    { fields: ['requested_date'] },
    { fields: ['dispatched_date'] },
    { fields: ['confirmed_date'] }
  ]
});

// Associations will be set up in models/index.js

module.exports = StockRequest;

