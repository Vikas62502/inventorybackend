-- Chairbord Solar Inventory Management System
-- Sample Data Insertion Script (Schema v1.1 - 2025-11-11)
-- Note: Passwords should be hashed with bcrypt via the API before inserting users.

-- ================================================================================
-- SAMPLE USERS
-- ================================================================================
-- Passwords pre-hashed with bcrypt (cost 10). Adjust as needed.
INSERT INTO users (id, username, password, name, role, is_active, created_by_id, created_by_name)
VALUES
('1', 'superadmin', '$2a$10$0SYyNoL42qqMOq6GRWy0IO/JFz0db.f4CJO3FJj3b32hFRjBXaT8e', 'Super Admin', 'super-admin', TRUE, NULL, NULL),
('2', 'admin1', '$2a$10$UxEOpHHS7scPT6MYXpemKe5q.TfUPpIqGfxTGvgt/oTVJIcyu36Bq', 'Admin 1', 'admin', TRUE, '1', 'Super Admin'),
('5', 'admin2', '$2a$10$UxEOpHHS7scPT6MYXpemKe5q.TfUPpIqGfxTGvgt/oTVJIcyu36Bq', 'Admin 2', 'admin', TRUE, '1', 'Super Admin'),
('6', 'admin3', '$2a$10$UxEOpHHS7scPT6MYXpemKe5q.TfUPpIqGfxTGvgt/oTVJIcyu36Bq', 'Admin 3', 'admin', TRUE, '1', 'Super Admin'),
('7', 'admin4', '$2a$10$UxEOpHHS7scPT6MYXpemKe5q.TfUPpIqGfxTGvgt/oTVJIcyu36Bq', 'Admin 4', 'admin', TRUE, '1', 'Super Admin'),
('3', 'agent', '$2a$10$JyJks.7fBRp3yw79NGcorujjN.LWH0Gno2BK4mGUK0c7oZ0YnF3MG', 'Sales Agent', 'agent', FALSE, '2', 'Admin 1'),
('4', 'account', '$2a$10$p4.OvIXIl9vmivC0G2a1KOGiSycFzgtjAqvlWWLBP1dCpncTBXMu6', 'Account Manager', 'account', TRUE, '1', 'Super Admin')
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  password = VALUES(password),
  name = VALUES(name),
  role = VALUES(role),
  is_active = VALUES(is_active),
  created_by_id = VALUES(created_by_id),
  created_by_name = VALUES(created_by_name);

-- ================================================================================
-- SAMPLE PRODUCTS (central inventory managed by Super Admin)
-- ================================================================================
INSERT INTO products (id, name, model, category, wattage, quantity, unit_price, created_by)
VALUES
('1', 'Tata Panel', 'TP-400W', 'Panels', '400W', 500, 220.00, NULL),
('2', 'Adani Panel', 'AP-450W', 'Panels', '450W', 400, 240.00, NULL),
('3', 'Hybrid Solar Inverter', 'HI-5000', 'Inverters', '5000W', 100, 350.00, NULL),
('4', 'Lithium Solar Battery', 'LB-10K', 'Batteries', '10kWh', 80, 450.00, NULL),
('5', 'MPPT Charge Controller', 'CC-100A', 'Charge Controllers', '100A', 200, 180.00, NULL)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  model = VALUES(model),
  category = VALUES(category),
  wattage = VALUES(wattage),
  unit_price = VALUES(unit_price);

-- ================================================================================
-- SAMPLE ADMIN INVENTORY (distributed stock)
-- ================================================================================
-- Replace admin_id values with real admin user IDs after seeding users via the API.
INSERT INTO admin_inventory (id, admin_id, product_id, quantity)
VALUES
('ai1', '2', '1', 50),
('ai2', '2', '3', 10),
('ai3', '5', '2', 30),
('ai4', '5', '4', 5),
('ai5', '6', '1', 25),
('ai6', '6', '5', 15),
('ai7', '7', '2', 20),
('ai8', '7', '3', 8)
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity);

-- ================================================================================
-- SAMPLE ADDRESSES
-- ================================================================================
INSERT INTO addresses (id, line1, line2, city, state, postal_code, country)
VALUES
('addr1', '124 Industrial Estate', 'Phase II', 'Pune', 'Maharashtra', '411001', 'India'),
('addr2', 'Plot 45, Solar Park', 'MIDC Area', 'Nagpur', 'Maharashtra', '440001', 'India'),
('addr3', '742 Evergreen Terrace', NULL, 'Springfield', 'Illinois', '62704', 'USA')
ON DUPLICATE KEY UPDATE
  line1 = VALUES(line1),
  line2 = VALUES(line2),
  city = VALUES(city),
  state = VALUES(state),
  postal_code = VALUES(postal_code),
  country = VALUES(country);

-- ================================================================================
-- SAMPLE STOCK REQUESTS (headers)
-- ================================================================================
INSERT INTO stock_requests (
    id,
    primary_product_id,
    primary_product_name,
    primary_model,
    total_quantity,
    requested_by_id,
    requested_by_name,
    requested_by_role,
    requested_from,
    requested_from_role,
    status,
    requested_date,
    notes
) VALUES
('req1', '1', 'Tata Panel', 'TP-400W', 50, '2', 'Admin 1', 'admin', 'super-admin', 'super-admin', 'pending', NOW() - INTERVAL 2 DAY, NULL),
('req2', '3', 'Hybrid Solar Inverter', 'HI-5000', 20, '5', 'Admin 2', 'admin', 'super-admin', 'super-admin', 'dispatched', NOW() - INTERVAL 5 DAY, NULL),
('req3', '2', 'Adani Panel', 'AP-450W', 30, '6', 'Admin 3', 'admin', '5', 'admin', 'pending', NOW() - INTERVAL 1 DAY, 'Needed for upcoming installation, priority delivery'),
('req4', '2', 'Adani Panel', 'AP-450W', 28, '3', 'Sales Agent', 'agent', '2', 'admin', 'pending', NOW() - INTERVAL 6 HOUR, 'Please deliver before Friday')
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  total_quantity = VALUES(total_quantity);

-- ================================================================================
-- SAMPLE STOCK REQUEST ITEMS (line items)
-- ================================================================================
INSERT INTO stock_request_items (id, stock_request_id, product_id, product_name, model, quantity)
VALUES
('sri1', 'req1', '1', 'Tata Panel', 'TP-400W', 50),
('sri2', 'req2', '3', 'Hybrid Solar Inverter', 'HI-5000', 20),
('sri3', 'req3', '2', 'Adani Panel', 'AP-450W', 30),
('sri4', 'req4', '2', 'Adani Panel', 'AP-450W', 20),
('sri5', 'req4', '4', 'Lithium Solar Battery', 'LB-10K', 8)
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity);

-- ================================================================================
-- SAMPLE SALES (headers)
-- ================================================================================
INSERT INTO sales (
    id,
    type,
    customer_name,
    product_summary,
    total_quantity,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    payment_status,
    sale_date,
    created_by,
    company_name,
    gst_number,
    contact_person,
    billing_address_id,
    delivery_address_id,
    delivery_matches_billing,
    bill_image,
    bill_confirmed_date,
    bill_confirmed_by_id,
    bill_confirmed_by_name,
    notes
) VALUES
('sale1', 'B2B', 'GreenEnergy Corp', 'Tata Panel (80), Hybrid Solar Inverter (20)', 100, 24600.00, 2460.00, 0.00, 27060.00, 'completed', NOW() - INTERVAL 3 DAY, '3', 'GreenEnergy Corp', '27AAACG1234R1Z5', 'Anita Sharma', 'addr1', 'addr2', FALSE, '/images/bill-sale1.jpg', NOW() - INTERVAL 5 DAY, '4', 'Account Manager', NULL),
('sale2', 'B2C', 'John Smith', 'Hybrid Solar Inverter (1), Lithium Solar Battery (2)', 3, 4800.00, 0.00, 0.00, 4800.00, 'pending', NOW() - INTERVAL 1 DAY, '3', NULL, NULL, NULL, NULL, 'addr3', FALSE, NULL, NULL, NULL, NULL, 'Ring the bell twice')
ON DUPLICATE KEY UPDATE
  total_amount = VALUES(total_amount),
  payment_status = VALUES(payment_status);

-- ================================================================================
-- SAMPLE SALE ITEMS (line items)
-- ================================================================================
INSERT INTO sale_items (id, sale_id, product_id, product_name, model, quantity, unit_price, line_total, gst_rate)
VALUES
('si1', 'sale1', '1', 'Tata Panel', 'TP-400W', 80, 220.00, 17600.00, 10.00),
('si2', 'sale1', '3', 'Hybrid Solar Inverter', 'HI-5000', 20, 350.00, 7000.00, 10.00),
('si3', 'sale2', '3', 'Hybrid Solar Inverter', 'HI-5000', 1, 1200.00, 1200.00, 0.00),
('si4', 'sale2', '4', 'Lithium Solar Battery', 'LB-10K', 2, 1800.00, 3600.00, 0.00)
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  unit_price = VALUES(unit_price),
  line_total = VALUES(line_total),
  gst_rate = VALUES(gst_rate);

-- ================================================================================
-- SAMPLE INVENTORY TRANSACTIONS
-- ================================================================================
INSERT INTO inventory_transactions (
    id,
    product_id,
    transaction_type,
    quantity,
    reference,
    related_stock_request_id,
    related_sale_id,
    notes,
    created_by
) VALUES
('txn1', '1', 'transfer', -50, 'req2', 'req2', NULL, 'Transferred to Admin 2', '1'),
('txn2', '1', 'sale', -100, 'sale1', NULL, 'sale1', 'B2B Sale to GreenEnergy Corp', '3')
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  notes = VALUES(notes);

-- ================================================================================
-- SAMPLE STOCK RETURNS
-- ================================================================================
INSERT INTO stock_returns (
    id,
    admin_id,
    product_id,
    quantity,
    reason,
    status,
    notes
) VALUES
('ret1', '2', '1', 10, 'Excess stock', 'pending', NULL)
ON DUPLICATE KEY UPDATE
  quantity = VALUES(quantity),
  status = VALUES(status);

-- ================================================================================
-- NOTES FOR SETUP
-- ================================================================================
-- 1. Create users via the API so passwords are stored securely (bcrypt).
-- 2. Update the created_by / admin_id / requested_by_id fields above with real user IDs after seeding.
-- 3. Use API endpoints to manage workflow transitions (dispatch/confirm requests, confirm bills, etc.).

