const sequelize = require('../config/database');

// Import all models
const User = require('./User');
const Product = require('./Product');
const AdminInventory = require('./AdminInventory');
const StockRequest = require('./StockRequest');
const StockRequestItem = require('./StockRequestItem');
const Address = require('./Address');
const Sale = require('./Sale');
const SaleItem = require('./SaleItem');
const InventoryTransaction = require('./InventoryTransaction');
const StockReturn = require('./StockReturn');

// Define all associations
// User associations
User.hasMany(Product, { foreignKey: 'created_by', as: 'createdProducts' });
User.hasMany(AdminInventory, { foreignKey: 'admin_id', as: 'inventory' });
User.hasMany(StockRequest, { foreignKey: 'requested_by_id', as: 'stockRequests' });
User.hasMany(StockRequest, { foreignKey: 'dispatched_by_id', as: 'dispatchedStockRequests' });
User.hasMany(StockRequest, { foreignKey: 'confirmed_by_id', as: 'confirmedStockRequests' });
User.hasMany(Sale, { foreignKey: 'created_by', as: 'sales' });
User.hasMany(Sale, { foreignKey: 'bill_confirmed_by_id', as: 'billConfirmedSales' });
User.hasMany(InventoryTransaction, { foreignKey: 'created_by', as: 'transactions' });
User.hasMany(StockReturn, { foreignKey: 'admin_id', as: 'returns' });
User.hasMany(StockReturn, { foreignKey: 'processed_by', as: 'processedReturns' });
User.hasMany(User, { foreignKey: 'created_by_id', as: 'createdUsers' });
User.belongsTo(User, { foreignKey: 'created_by_id', as: 'creator' });

// Product associations
Product.hasMany(AdminInventory, { foreignKey: 'product_id', as: 'adminInventory' });
Product.hasMany(InventoryTransaction, { foreignKey: 'product_id', as: 'transactions' });
Product.hasMany(StockReturn, { foreignKey: 'product_id', as: 'returns' });
Product.hasMany(StockRequestItem, { foreignKey: 'product_id', as: 'stockRequestItems' });
Product.hasMany(SaleItem, { foreignKey: 'product_id', as: 'saleItems' });
Product.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });

// AdminInventory associations
AdminInventory.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });
AdminInventory.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// StockRequest associations
StockRequest.belongsTo(Product, { foreignKey: 'primary_product_id', as: 'primaryProduct' });
StockRequest.belongsTo(User, { foreignKey: 'requested_by_id', as: 'requester' });
StockRequest.belongsTo(User, { foreignKey: 'dispatched_by_id', as: 'dispatcher' });
StockRequest.belongsTo(User, { foreignKey: 'confirmed_by_id', as: 'confirmer' });
StockRequest.hasMany(StockRequestItem, { foreignKey: 'stock_request_id', as: 'items', onDelete: 'CASCADE' });
StockRequestItem.belongsTo(StockRequest, { foreignKey: 'stock_request_id', as: 'stockRequest' });
StockRequestItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Sale associations
Sale.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Sale.belongsTo(User, { foreignKey: 'bill_confirmed_by_id', as: 'billConfirmer' });
Sale.belongsTo(Address, { foreignKey: 'billing_address_id', as: 'billingAddress' });
Sale.belongsTo(Address, { foreignKey: 'delivery_address_id', as: 'deliveryAddress' });
Sale.hasMany(SaleItem, { foreignKey: 'sale_id', as: 'items', onDelete: 'CASCADE' });
SaleItem.belongsTo(Sale, { foreignKey: 'sale_id', as: 'sale' });
SaleItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// InventoryTransaction associations
InventoryTransaction.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
InventoryTransaction.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
InventoryTransaction.belongsTo(StockRequest, { foreignKey: 'related_stock_request_id', as: 'relatedStockRequest' });
InventoryTransaction.belongsTo(Sale, { foreignKey: 'related_sale_id', as: 'relatedSale' });

// StockReturn associations
StockReturn.belongsTo(User, { foreignKey: 'admin_id', as: 'admin' });
StockReturn.belongsTo(User, { foreignKey: 'processed_by', as: 'processor' });
StockReturn.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// Sync database (use with caution in production)
const syncDatabase = async (force = false) => {
  try {
    await sequelize.sync({ force });
    console.log('✅ Database models synchronized');
  } catch (error) {
    console.error('❌ Database sync error:', error);
  }
};

module.exports = {
  sequelize,
  User,
  Product,
  AdminInventory,
  StockRequest,
  StockRequestItem,
  Address,
  Sale,
  SaleItem,
  InventoryTransaction,
  StockReturn,
  syncDatabase
};

