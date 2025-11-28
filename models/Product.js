const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  wattage: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    validate: {
      min: 0
    }
  },
  image: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  created_by: {
    type: DataTypes.STRING(50),
    allowNull: true
  }
}, {
  tableName: 'products',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { fields: ['name'] },
    { fields: ['model'] },
    { fields: ['category'] },
    {
      unique: true,
      fields: ['name', 'model'],
      name: 'uq_product_name_model'
    }
  ]
});

// Associations will be set up in models/index.js

module.exports = Product;

