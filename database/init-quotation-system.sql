-- ================================================================================
-- Solar Quotation Management System
-- PostgreSQL Database Initialization Script
-- Version: 1.0
-- Date: December 17, 2025
-- ================================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================================================
-- 1. USERS & AUTHENTICATION
-- ================================================================================

-- Dealers Table (includes admin users)
CREATE TABLE IF NOT EXISTS dealers (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    company VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('dealer', 'admin')),
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_dealer_username ON dealers(username);
CREATE INDEX IF NOT EXISTS idx_dealer_email ON dealers(email);
CREATE INDEX IF NOT EXISTS idx_dealer_role ON dealers(role);

-- Visitors Table
CREATE TABLE IF NOT EXISTS visitors (
    id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    mobile VARCHAR(15) NOT NULL,
    "employeeId" VARCHAR(50) UNIQUE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_username ON visitors(username);
CREATE INDEX IF NOT EXISTS idx_visitor_email ON visitors(email);
CREATE INDEX IF NOT EXISTS idx_visitor_active ON visitors("isActive");

-- ================================================================================
-- 2. CUSTOMERS
-- ================================================================================

CREATE TABLE IF NOT EXISTS customers (
    id VARCHAR(50) PRIMARY KEY,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    "streetAddress" TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL,
    pincode VARCHAR(6) NOT NULL,
    "dealerId" VARCHAR(50),
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("dealerId") REFERENCES dealers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_customer_mobile ON customers(mobile);
CREATE INDEX IF NOT EXISTS idx_customer_dealer ON customers("dealerId");
CREATE INDEX IF NOT EXISTS idx_customer_location ON customers(state, city);

-- ================================================================================
-- 3. QUOTATIONS
-- ================================================================================

CREATE TABLE IF NOT EXISTS quotations (
    id VARCHAR(50) PRIMARY KEY,
    "dealerId" VARCHAR(50) NOT NULL,
    "customerId" VARCHAR(50) NOT NULL,
    "systemType" VARCHAR(50) NOT NULL CHECK ("systemType" IN ('on-grid', 'off-grid', 'hybrid', 'dcr', 'non-dcr', 'both', 'customize')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    discount DECIMAL(5,2) DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "validUntil" DATE NOT NULL,
    FOREIGN KEY ("dealerId") REFERENCES dealers(id),
    FOREIGN KEY ("customerId") REFERENCES customers(id)
);

CREATE INDEX IF NOT EXISTS idx_quotation_dealer ON quotations("dealerId");
CREATE INDEX IF NOT EXISTS idx_quotation_customer ON quotations("customerId");
CREATE INDEX IF NOT EXISTS idx_quotation_status ON quotations(status);
CREATE INDEX IF NOT EXISTS idx_quotation_date ON quotations("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_quotation_dealer_status ON quotations("dealerId", status);
CREATE INDEX IF NOT EXISTS idx_quotation_date_status ON quotations("createdAt" DESC, status);

-- Quotation Products Table
CREATE TABLE IF NOT EXISTS quotation_products (
    id VARCHAR(50) PRIMARY KEY,
    "quotationId" VARCHAR(50) UNIQUE NOT NULL,
    "systemType" VARCHAR(50) NOT NULL,
    
    -- Panel Configuration
    "panelBrand" VARCHAR(100),
    "panelSize" VARCHAR(50),
    "panelQuantity" INTEGER,
    "panelPrice" DECIMAL(12,2),
    
    -- DCR/Non-DCR Configuration
    "dcrPanelBrand" VARCHAR(100),
    "dcrPanelSize" VARCHAR(50),
    "dcrPanelQuantity" INTEGER,
    "nonDcrPanelBrand" VARCHAR(100),
    "nonDcrPanelSize" VARCHAR(50),
    "nonDcrPanelQuantity" INTEGER,
    
    -- Inverter Configuration
    "inverterType" VARCHAR(50),
    "inverterBrand" VARCHAR(100),
    "inverterSize" VARCHAR(50),
    "inverterPrice" DECIMAL(12,2),
    
    -- Structure & Mounting
    "structureType" VARCHAR(100),
    "structureSize" VARCHAR(50),
    "structurePrice" DECIMAL(12,2),
    
    -- Electrical Components
    "meterBrand" VARCHAR(100),
    "meterPrice" DECIMAL(12,2),
    "acCableBrand" VARCHAR(100),
    "acCableSize" VARCHAR(50),
    "acCablePrice" DECIMAL(12,2),
    "dcCableBrand" VARCHAR(100),
    "dcCableSize" VARCHAR(50),
    "dcCablePrice" DECIMAL(12,2),
    acdb VARCHAR(100),
    "acdbPrice" DECIMAL(12,2),
    dcdb VARCHAR(100),
    "dcdbPrice" DECIMAL(12,2),
    
    -- Battery (for hybrid/off-grid)
    "hybridInverter" VARCHAR(100),
    "batteryCapacity" VARCHAR(50),
    "batteryPrice" DECIMAL(12,2),
    
    -- Subsidies
    "centralSubsidy" DECIMAL(12,2) DEFAULT 0,
    "stateSubsidy" DECIMAL(12,2) DEFAULT 0,
    
    -- Totals
    subtotal DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    
    FOREIGN KEY ("quotationId") REFERENCES quotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_quotation_products_quotation ON quotation_products("quotationId");

-- Custom Panels Table (for 'customize' system type)
CREATE TABLE IF NOT EXISTS custom_panels (
    id VARCHAR(50) PRIMARY KEY,
    "quotationId" VARCHAR(50) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    size VARCHAR(50) NOT NULL,
    quantity INTEGER NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('dcr', 'non-dcr')),
    price DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("quotationId") REFERENCES quotations(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_custom_panel_quotation ON custom_panels("quotationId");

-- ================================================================================
-- 4. VISITS
-- ================================================================================

CREATE TABLE IF NOT EXISTS visits (
    id VARCHAR(50) PRIMARY KEY,
    "quotationId" VARCHAR(50) NOT NULL,
    "dealerId" VARCHAR(50) NOT NULL,
    "visitDate" DATE NOT NULL,
    "visitTime" TIME NOT NULL,
    location TEXT NOT NULL,
    "locationLink" VARCHAR(500) NOT NULL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'completed', 'incomplete', 'rejected', 'rescheduled')),
    feedback TEXT,
    "rejectionReason" TEXT,
    length DECIMAL(10,2),
    width DECIMAL(10,2),
    height DECIMAL(10,2),
    images JSONB,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("quotationId") REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY ("dealerId") REFERENCES dealers(id)
);

CREATE INDEX IF NOT EXISTS idx_visit_quotation ON visits("quotationId");
CREATE INDEX IF NOT EXISTS idx_visit_dealer ON visits("dealerId");
CREATE INDEX IF NOT EXISTS idx_visit_date ON visits("visitDate", "visitTime");
CREATE INDEX IF NOT EXISTS idx_visit_status ON visits(status);
CREATE INDEX IF NOT EXISTS idx_visit_dealer_date ON visits("dealerId", "visitDate", status);

-- Visit Assignments Table
CREATE TABLE IF NOT EXISTS visit_assignments (
    id VARCHAR(50) PRIMARY KEY,
    "visitId" VARCHAR(50) NOT NULL,
    "visitorId" VARCHAR(50) NOT NULL,
    "visitorName" VARCHAR(255) NOT NULL,
    "assignedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("visitId") REFERENCES visits(id) ON DELETE CASCADE,
    FOREIGN KEY ("visitorId") REFERENCES visitors(id),
    UNIQUE ("visitId", "visitorId")
);

CREATE INDEX IF NOT EXISTS idx_assignment_visit ON visit_assignments("visitId");
CREATE INDEX IF NOT EXISTS idx_assignment_visitor ON visit_assignments("visitorId");
CREATE INDEX IF NOT EXISTS idx_visitor_assignments ON visit_assignments("visitorId", "visitId");

-- ================================================================================
-- 5. SYSTEM DATA & CONFIGURATION
-- ================================================================================

-- Product Catalog Table
CREATE TABLE IF NOT EXISTS product_catalog (
    id VARCHAR(50) PRIMARY KEY,
    category VARCHAR(50) NOT NULL CHECK (category IN ('panel', 'inverter', 'structure', 'meter', 'cable', 'acdb', 'dcdb', 'battery')),
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    size VARCHAR(50),
    "basePrice" DECIMAL(12,2) NOT NULL,
    description TEXT,
    specifications JSONB,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_category ON product_catalog(category);
CREATE INDEX IF NOT EXISTS idx_product_brand ON product_catalog(brand);
CREATE INDEX IF NOT EXISTS idx_product_active ON product_catalog("isActive");

-- Pricing Rules Table
CREATE TABLE IF NOT EXISTS pricing_rules (
    id VARCHAR(50) PRIMARY KEY,
    "productCategory" VARCHAR(50) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    size VARCHAR(50),
    "pricePerUnit" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "effectiveTo" DATE,
    "isActive" BOOLEAN DEFAULT TRUE,
    "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pricing_category_brand ON pricing_rules("productCategory", brand);
CREATE INDEX IF NOT EXISTS idx_pricing_dates ON pricing_rules("effectiveFrom", "effectiveTo");
CREATE INDEX IF NOT EXISTS idx_pricing_active ON pricing_rules("isActive");

-- System Config Table
CREATE TABLE IF NOT EXISTS system_config (
    "configKey" VARCHAR(100) PRIMARY KEY,
    "configValue" TEXT NOT NULL,
    "dataType" VARCHAR(20) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_config_category ON system_config(category);

-- ================================================================================
-- COMMENTS FOR DOCUMENTATION
-- ================================================================================

COMMENT ON TABLE dealers IS 'Dealers and admin users. Admin users have role=''admin''';
COMMENT ON TABLE visitors IS 'Field agents/visitors who conduct site visits';
COMMENT ON TABLE customers IS 'Customer information linked to dealers';
COMMENT ON TABLE quotations IS 'Main quotation records with status tracking';
COMMENT ON TABLE quotation_products IS 'Product configuration for each quotation (1:1 with quotations)';
COMMENT ON TABLE custom_panels IS 'Custom panel configurations for ''customize'' system type';
COMMENT ON TABLE visits IS 'Site visit scheduling and tracking';
COMMENT ON TABLE visit_assignments IS 'Many-to-many relationship between visits and visitors';
COMMENT ON TABLE product_catalog IS 'Central product catalog for all product types';
COMMENT ON TABLE pricing_rules IS 'Dynamic pricing rules based on date ranges';
COMMENT ON TABLE system_config IS 'System-wide configuration key-value pairs';

-- ================================================================================
-- END OF SCHEMA
-- ================================================================================

