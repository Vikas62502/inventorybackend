const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AdminInventory = sequelize.define('AdminInventory', {
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
    allowNull: false,
    defaultValue: 0
  }
}, {
  tableName: 'admin_inventory',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['admin_id'] },
    { fields: ['product_id'] },
    { 
      unique: true,
      fields: ['admin_id', 'product_id'],
      name: 'unique_admin_product'
    }
  ]
});

// Associations will be set up in models/index.js

module.exports = AdminInventory;

