const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StockRequestItem = sequelize.define('StockRequestItem', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  stock_request_id: {
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
  }
}, {
  tableName: 'stock_request_items',
  timestamps: false,
  indexes: [
    { fields: ['stock_request_id'], name: 'idx_stock_request_items_request' }
  ]
});

module.exports = StockRequestItem;

