'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Users indexes
    await queryInterface.addIndex('users', ['username'], {
      name: 'idx_users_username'
    });
    await queryInterface.addIndex('users', ['role'], {
      name: 'idx_users_role'
    });
    await queryInterface.addIndex('users', ['is_active'], {
      name: 'idx_users_is_active'
    });
    await queryInterface.addIndex('users', ['created_by_id'], {
      name: 'idx_users_created_by'
    });

    // Products indexes
    await queryInterface.addIndex('products', ['name'], {
      name: 'idx_products_name'
    });
    await queryInterface.addIndex('products', ['model'], {
      name: 'idx_products_model'
    });
    await queryInterface.addIndex('products', ['category'], {
      name: 'idx_products_category'
    });

    // Admin Inventory indexes
    await queryInterface.addIndex('admin_inventory', ['admin_id'], {
      name: 'idx_admin_inventory_admin'
    });
    await queryInterface.addIndex('admin_inventory', ['product_id'], {
      name: 'idx_admin_inventory_product'
    });

    // Stock Requests indexes
    await queryInterface.addIndex('stock_requests', ['status'], {
      name: 'idx_stock_requests_status'
    });
    await queryInterface.addIndex('stock_requests', ['requested_by_id'], {
      name: 'idx_stock_requests_requested_by'
    });
    await queryInterface.addIndex('stock_requests', ['requested_from'], {
      name: 'idx_stock_requests_requested_from'
    });
    await queryInterface.addIndex('stock_requests', ['requested_date'], {
      name: 'idx_stock_requests_requested_date'
    });
    await queryInterface.addIndex('stock_requests', ['dispatched_date'], {
      name: 'idx_stock_requests_dispatched_date'
    });
    await queryInterface.addIndex('stock_requests', ['confirmed_date'], {
      name: 'idx_stock_requests_confirmed_date'
    });

    // Stock Request Items indexes
    await queryInterface.addIndex('stock_request_items', ['stock_request_id'], {
      name: 'idx_stock_request_items_request'
    });

    // Sales indexes
    await queryInterface.addIndex('sales', ['type'], {
      name: 'idx_sales_type'
    });
    await queryInterface.addIndex('sales', ['payment_status'], {
      name: 'idx_sales_payment_status'
    });
    await queryInterface.addIndex('sales', ['sale_date'], {
      name: 'idx_sales_sale_date'
    });
    await queryInterface.addIndex('sales', ['customer_name'], {
      name: 'idx_sales_customer_name'
    });
    await queryInterface.addIndex('sales', ['bill_confirmed_date'], {
      name: 'idx_sales_bill_confirmed_date'
    });

    // Sale Items indexes
    await queryInterface.addIndex('sale_items', ['sale_id'], {
      name: 'idx_sale_items_sale'
    });
    await queryInterface.addIndex('sale_items', ['product_id'], {
      name: 'idx_sale_items_product'
    });

    // Inventory Transactions indexes
    await queryInterface.addIndex('inventory_transactions', ['product_id'], {
      name: 'idx_inventory_transactions_product'
    });
    await queryInterface.addIndex('inventory_transactions', ['transaction_type'], {
      name: 'idx_inventory_transactions_type'
    });
    await queryInterface.addIndex('inventory_transactions', ['timestamp'], {
      name: 'idx_inventory_transactions_timestamp'
    });
    await queryInterface.addIndex('inventory_transactions', ['reference'], {
      name: 'idx_inventory_transactions_reference'
    });

    // Stock Returns indexes
    await queryInterface.addIndex('stock_returns', ['admin_id'], {
      name: 'idx_stock_returns_admin'
    });
    await queryInterface.addIndex('stock_returns', ['product_id'], {
      name: 'idx_stock_returns_product'
    });
    await queryInterface.addIndex('stock_returns', ['status'], {
      name: 'idx_stock_returns_status'
    });
    await queryInterface.addIndex('stock_returns', ['return_date'], {
      name: 'idx_stock_returns_return_date'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes in reverse order
    await queryInterface.removeIndex('stock_returns', 'idx_stock_returns_return_date');
    await queryInterface.removeIndex('stock_returns', 'idx_stock_returns_status');
    await queryInterface.removeIndex('stock_returns', 'idx_stock_returns_product');
    await queryInterface.removeIndex('stock_returns', 'idx_stock_returns_admin');

    await queryInterface.removeIndex('inventory_transactions', 'idx_inventory_transactions_reference');
    await queryInterface.removeIndex('inventory_transactions', 'idx_inventory_transactions_timestamp');
    await queryInterface.removeIndex('inventory_transactions', 'idx_inventory_transactions_type');
    await queryInterface.removeIndex('inventory_transactions', 'idx_inventory_transactions_product');

    await queryInterface.removeIndex('sale_items', 'idx_sale_items_product');
    await queryInterface.removeIndex('sale_items', 'idx_sale_items_sale');

    await queryInterface.removeIndex('sales', 'idx_sales_bill_confirmed_date');
    await queryInterface.removeIndex('sales', 'idx_sales_customer_name');
    await queryInterface.removeIndex('sales', 'idx_sales_sale_date');
    await queryInterface.removeIndex('sales', 'idx_sales_payment_status');
    await queryInterface.removeIndex('sales', 'idx_sales_type');

    await queryInterface.removeIndex('stock_request_items', 'idx_stock_request_items_request');

    await queryInterface.removeIndex('stock_requests', 'idx_stock_requests_confirmed_date');
    await queryInterface.removeIndex('stock_requests', 'idx_stock_requests_dispatched_date');
    await queryInterface.removeIndex('stock_requests', 'idx_stock_requests_requested_date');
    await queryInterface.removeIndex('stock_requests', 'idx_stock_requests_requested_from');
    await queryInterface.removeIndex('stock_requests', 'idx_stock_requests_requested_by');
    await queryInterface.removeIndex('stock_requests', 'idx_stock_requests_status');

    await queryInterface.removeIndex('admin_inventory', 'idx_admin_inventory_product');
    await queryInterface.removeIndex('admin_inventory', 'idx_admin_inventory_admin');

    await queryInterface.removeIndex('products', 'idx_products_category');
    await queryInterface.removeIndex('products', 'idx_products_model');
    await queryInterface.removeIndex('products', 'idx_products_name');

    await queryInterface.removeIndex('users', 'idx_users_created_by');
    await queryInterface.removeIndex('users', 'idx_users_is_active');
    await queryInterface.removeIndex('users', 'idx_users_role');
    await queryInterface.removeIndex('users', 'idx_users_username');
  }
};

