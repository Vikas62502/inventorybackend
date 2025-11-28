const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SaleItem = sequelize.define('SaleItem', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  sale_id: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  product_id: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  product_name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  model: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1
    }
  },
  unit_price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  line_total: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  gst_rate: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0
    }
  }
}, {
  tableName: 'sale_items',
  timestamps: false,
  indexes: [
    { fields: ['sale_id'], name: 'idx_sale_items_sale' },
    { fields: ['product_id'], name: 'idx_sale_items_product' }
  ]
});

module.exports = SaleItem;

