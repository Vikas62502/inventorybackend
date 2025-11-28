const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Address = sequelize.define('Address', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true
  },
  line1: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  line2: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  city: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  state: {
    type: DataTypes.STRING(120),
    allowNull: false
  },
  postal_code: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  country: {
    type: DataTypes.STRING(120),
    allowNull: false
  }
}, {
  tableName: 'addresses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

module.exports = Address;

