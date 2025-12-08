'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // View: Admin Inventory Summary
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW v_admin_inventory_summary AS
      SELECT
          u.id AS admin_id,
          u.name AS admin_name,
          COUNT(DISTINCT ai.product_id) AS total_products,
          COALESCE(SUM(ai.quantity), 0) AS total_stock
      FROM users u
      LEFT JOIN admin_inventory ai ON u.id = ai.admin_id
      WHERE u.role = 'admin'
      GROUP BY u.id, u.name;
    `);

    // View: Stock Request Summary
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW v_stock_request_summary AS
      SELECT
          sr.status,
          sr.requested_by_role,
          COUNT(*) AS request_count,
          SUM(sr.total_quantity) AS total_quantity,
          SUM(COALESCE(items.distinct_products, 0)) AS distinct_products
      FROM stock_requests sr
      LEFT JOIN (
          SELECT stock_request_id, COUNT(*) AS distinct_products
          FROM stock_request_items
          GROUP BY stock_request_id
      ) items ON sr.id = items.stock_request_id
      GROUP BY sr.status, sr.requested_by_role;
    `);

    // View: Dispatched Requests Pending
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW v_dispatched_requests_pending AS
      SELECT
          sr.id,
          sr.primary_product_name,
          sr.primary_model,
          sr.total_quantity,
          sr.requested_by_name,
          sr.requested_by_role,
          sr.dispatched_by_name,
          sr.dispatched_date,
          sr.dispatch_image,
          DATE_PART('day', NOW() - sr.dispatched_date) AS days_since_dispatch
      FROM stock_requests sr
      WHERE sr.status = 'dispatched'
      ORDER BY sr.dispatched_date ASC NULLS LAST;
    `);

    // View: Sales Summary
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW v_sales_summary AS
      SELECT
          type,
          payment_status,
          COUNT(*) AS sale_count,
          SUM(total_quantity) AS total_quantity,
          SUM(total_amount) AS total_revenue,
          SUM(subtotal) AS total_subtotal
      FROM sales
      GROUP BY type, payment_status;
    `);

    // View: Sale Items Expanded
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW v_sale_items_expanded AS
      SELECT
          s.id AS sale_id,
          s.customer_name,
          s.type,
          s.payment_status,
          si.product_name,
          si.model,
          si.quantity,
          si.unit_price,
          si.line_total,
          si.gst_rate
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id;
    `);

    // View: B2B Bill Status
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW v_b2b_bill_status AS
      SELECT
          s.id,
          s.customer_name,
          s.company_name,
          s.product_summary,
          s.total_amount,
          s.payment_status,
          CASE
              WHEN s.bill_image IS NOT NULL THEN 'Bill Uploaded'
              ELSE 'Bill Pending'
          END AS bill_status,
          s.bill_confirmed_date,
          s.bill_confirmed_by_name
      FROM sales s
      WHERE s.type = 'B2B'
      ORDER BY s.sale_date DESC;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Drop views
    await queryInterface.sequelize.query(`
      DROP VIEW IF EXISTS v_b2b_bill_status;
    `);

    await queryInterface.sequelize.query(`
      DROP VIEW IF EXISTS v_sale_items_expanded;
    `);

    await queryInterface.sequelize.query(`
      DROP VIEW IF EXISTS v_sales_summary;
    `);

    await queryInterface.sequelize.query(`
      DROP VIEW IF EXISTS v_dispatched_requests_pending;
    `);

    await queryInterface.sequelize.query(`
      DROP VIEW IF EXISTS v_stock_request_summary;
    `);

    await queryInterface.sequelize.query(`
      DROP VIEW IF EXISTS v_admin_inventory_summary;
    `);
  }
};


