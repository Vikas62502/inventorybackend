-- Chairbord Solar Inventory Management System
-- PostgreSQL Database Initialization Script (Schema v1.1 - 2025-11-11)

-- Create database (run this separately as superuser)
-- CREATE DATABASE chairbord_solar;
-- \c chairbord_solar;

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================================
-- 1. USERS TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('super-admin', 'admin', 'agent', 'account')),
    is_active BOOLEAN DEFAULT FALSE,
    created_by_id VARCHAR(50),
    created_by_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by_id);

-- ================================================================================
-- 2. PRODUCTS TABLE (Central Inventory - Super Admin)
-- ================================================================================
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    category VARCHAR(120) NOT NULL,
    wattage VARCHAR(50),
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    unit_price NUMERIC(12, 2),
    image VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(50),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE (name, model)
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_model ON products(model);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

-- ================================================================================
-- 3. ADMIN_INVENTORY TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS admin_inventory (
    id VARCHAR(50) PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    UNIQUE (admin_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_admin_inventory_admin ON admin_inventory(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_inventory_product ON admin_inventory(product_id);

-- ================================================================================
-- 4. STOCK_REQUESTS TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS stock_requests (
    id VARCHAR(50) PRIMARY KEY,
    primary_product_id VARCHAR(50),
    primary_product_name VARCHAR(255),
    primary_model VARCHAR(255),
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    requested_by_id VARCHAR(50),
    requested_by_name VARCHAR(255) NOT NULL,
    requested_by_role VARCHAR(10) NOT NULL CHECK (requested_by_role IN ('admin', 'agent')),
    requested_from VARCHAR(50) NOT NULL,
    requested_from_role VARCHAR(12) NOT NULL CHECK (requested_from_role IN ('super-admin', 'admin')),
    status VARCHAR(10) DEFAULT 'pending' CHECK (status IN ('pending', 'dispatched', 'confirmed', 'rejected')),
    rejection_reason TEXT,
    requested_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    dispatched_date TIMESTAMP,
    confirmed_date TIMESTAMP,
    dispatch_image VARCHAR(500),
    confirmation_image VARCHAR(500),
    dispatched_by_id VARCHAR(50),
    dispatched_by_name VARCHAR(255),
    confirmed_by_id VARCHAR(50),
    confirmed_by_name VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (primary_product_id) REFERENCES products(id) ON DELETE SET NULL,
    FOREIGN KEY (requested_by_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (dispatched_by_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (confirmed_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_requests_status ON stock_requests(status);
CREATE INDEX IF NOT EXISTS idx_stock_requests_requested_by ON stock_requests(requested_by_id);
CREATE INDEX IF NOT EXISTS idx_stock_requests_requested_from ON stock_requests(requested_from);
CREATE INDEX IF NOT EXISTS idx_stock_requests_requested_date ON stock_requests(requested_date);
CREATE INDEX IF NOT EXISTS idx_stock_requests_dispatched_date ON stock_requests(dispatched_date);
CREATE INDEX IF NOT EXISTS idx_stock_requests_confirmed_date ON stock_requests(confirmed_date);

-- ================================================================================
-- 5. STOCK_REQUEST_ITEMS TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS stock_request_items (
    id VARCHAR(50) PRIMARY KEY,
    stock_request_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    FOREIGN KEY (stock_request_id) REFERENCES stock_requests(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_request_items_request ON stock_request_items(stock_request_id);

-- ================================================================================
-- 6. ADDRESSES TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS addresses (
    id VARCHAR(50) PRIMARY KEY,
    line1 VARCHAR(255) NOT NULL,
    line2 VARCHAR(255),
    city VARCHAR(120) NOT NULL,
    state VARCHAR(120) NOT NULL,
    postal_code VARCHAR(30) NOT NULL,
    country VARCHAR(120) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================================
-- 7. SALES TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS sales (
    id VARCHAR(50) PRIMARY KEY,
    type VARCHAR(3) NOT NULL CHECK (type IN ('B2B', 'B2C')),
    customer_name VARCHAR(255) NOT NULL,
    product_summary VARCHAR(500) NOT NULL,
    total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
    subtotal NUMERIC(15, 2) NOT NULL CHECK (subtotal >= 0),
    tax_amount NUMERIC(15, 2) DEFAULT 0 CHECK (tax_amount >= 0),
    discount_amount NUMERIC(15, 2) DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount NUMERIC(15, 2) NOT NULL CHECK (total_amount >= 0),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed')),
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    image VARCHAR(500),
    created_by VARCHAR(50),
    company_name VARCHAR(255),
    gst_number VARCHAR(50),
    contact_person VARCHAR(255),
    billing_address_id VARCHAR(50),
    delivery_address_id VARCHAR(50),
    delivery_matches_billing BOOLEAN,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    delivery_instructions TEXT,
    bill_image VARCHAR(500),
    bill_confirmed_date TIMESTAMP,
    bill_confirmed_by_id VARCHAR(50),
    bill_confirmed_by_name VARCHAR(255),
    notes TEXT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (billing_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    FOREIGN KEY (delivery_address_id) REFERENCES addresses(id) ON DELETE SET NULL,
    FOREIGN KEY (bill_confirmed_by_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(type);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_sale_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_customer_name ON sales(customer_name);
CREATE INDEX IF NOT EXISTS idx_sales_bill_confirmed_date ON sales(bill_confirmed_date);

-- ================================================================================
-- 8. SALE_ITEMS TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS sale_items (
    id VARCHAR(50) PRIMARY KEY,
    sale_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50),
    product_name VARCHAR(255) NOT NULL,
    model VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    line_total NUMERIC(15, 2) NOT NULL CHECK (line_total >= 0),
    gst_rate NUMERIC(5, 2) DEFAULT 0 CHECK (gst_rate >= 0),
    FOREIGN KEY (sale_id) REFERENCES sales(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- ================================================================================
-- 9. INVENTORY_TRANSACTIONS TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id VARCHAR(50) PRIMARY KEY,
    product_id VARCHAR(50) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'return', 'adjustment', 'transfer')),
    quantity INTEGER NOT NULL,
    reference VARCHAR(255),
    related_stock_request_id VARCHAR(50),
    related_sale_id VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (related_stock_request_id) REFERENCES stock_requests(id) ON DELETE SET NULL,
    FOREIGN KEY (related_sale_id) REFERENCES sales(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_timestamp ON inventory_transactions(timestamp);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference ON inventory_transactions(reference);

-- ================================================================================
-- 10. STOCK_RETURNS TABLE
-- ================================================================================
CREATE TABLE IF NOT EXISTS stock_returns (
    id VARCHAR(50) PRIMARY KEY,
    admin_id VARCHAR(50) NOT NULL,
    product_id VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    return_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    processed_by VARCHAR(50),
    processed_date TIMESTAMP,
    notes TEXT,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_stock_returns_admin ON stock_returns(admin_id);
CREATE INDEX IF NOT EXISTS idx_stock_returns_product ON stock_returns(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_returns_status ON stock_returns(status);
CREATE INDEX IF NOT EXISTS idx_stock_returns_return_date ON stock_returns(return_date);

-- ================================================================================
-- TRIGGER: Update updated_at timestamp
-- ================================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_inventory_updated_at
    BEFORE UPDATE ON admin_inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================================================
-- VIEWS (Reporting)
-- ================================================================================
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

