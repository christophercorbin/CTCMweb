-- CTCM Database Schema Migration
-- Version: 001
-- Description: Initial schema for freight forwarding system
-- Date: 2026-02-14

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable full-text search
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cognito_sub VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Barbados',
    postal_code VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_customers_cognito_sub ON customers(cognito_sub);
CREATE INDEX idx_customers_email ON customers(email);

-- ============================================================================
-- SHIPMENTS TABLE
-- ============================================================================
CREATE TABLE shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    tracking_number VARCHAR(100) UNIQUE NOT NULL,
    warehouse_receipt_number VARCHAR(100),
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    shipping_method VARCHAR(20) NOT NULL CHECK (shipping_method IN ('air', 'sea')),
    origin VARCHAR(255) DEFAULT 'Miami, FL, USA',
    destination VARCHAR(255) DEFAULT 'Barbados',
    description TEXT,
    notes TEXT,
    
    -- Shipper information
    shipper_name VARCHAR(255),
    shipper_address TEXT,
    shipper_city VARCHAR(100),
    shipper_state VARCHAR(100),
    shipper_country VARCHAR(100),
    
    -- Carrier information
    carrier_name VARCHAR(255),
    pro_number VARCHAR(100),
    supplier VARCHAR(255),
    invoice_number VARCHAR(100),
    po_number VARCHAR(100),
    
    -- Warehouse information
    warehouse_location VARCHAR(100),
    storage_location VARCHAR(100),
    received_by VARCHAR(255),
    received_date TIMESTAMP WITH TIME ZONE,
    
    -- Delivery information
    delivery_method VARCHAR(20) CHECK (delivery_method IN ('pickup', 'home_delivery')),
    delivery_address TEXT,
    
    -- Weight and dimensions (calculated from packages)
    total_weight_lb DECIMAL(10, 2),
    total_weight_kg DECIMAL(10, 2),
    total_volume_ft3 DECIMAL(10, 2),
    volumetric_weight_kg DECIMAL(10, 2),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Full-text search
    search_vector tsvector
);

-- Indexes for performance
CREATE INDEX idx_shipments_customer_id ON shipments(customer_id);
CREATE INDEX idx_shipments_tracking_number ON shipments(tracking_number);
CREATE INDEX idx_shipments_status ON shipments(status);
CREATE INDEX idx_shipments_created_at ON shipments(created_at DESC);
CREATE INDEX idx_shipments_search ON shipments USING GIN(search_vector);

-- Trigger to update search_vector
CREATE OR REPLACE FUNCTION shipments_search_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.tracking_number, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.warehouse_receipt_number, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.shipper_name, '')), 'C');
    RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER shipments_search_update
    BEFORE INSERT OR UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION shipments_search_trigger();

-- ============================================================================
-- PACKAGES TABLE
-- ============================================================================
CREATE TABLE packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    pieces_count INTEGER NOT NULL DEFAULT 1,
    package_type VARCHAR(50) NOT NULL DEFAULT 'box',
    
    -- Dimensions
    length DECIMAL(10, 2),
    width DECIMAL(10, 2),
    height DECIMAL(10, 2),
    dimension_unit VARCHAR(10) DEFAULT 'in',
    
    -- Weight
    weight DECIMAL(10, 2),
    weight_unit VARCHAR(10) DEFAULT 'lb',
    weight_kg DECIMAL(10, 2),
    
    -- Volume
    volume DECIMAL(10, 2),
    volume_unit VARCHAR(10) DEFAULT 'ft3',
    
    description TEXT,
    storage_location VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_packages_shipment_id ON packages(shipment_id);

-- ============================================================================
-- SHIPMENT_CHARGES TABLE
-- ============================================================================
CREATE TABLE shipment_charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    charge_type VARCHAR(50) NOT NULL,
    description TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_shipment_charges_shipment_id ON shipment_charges(shipment_id);

-- ============================================================================
-- SHIPMENT_EVENTS TABLE
-- ============================================================================
CREATE TABLE shipment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    event_description TEXT,
    location VARCHAR(255),
    operation_details TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for fast lookups
CREATE INDEX idx_shipment_events_shipment_id ON shipment_events(shipment_id);
CREATE INDEX idx_shipment_events_created_at ON shipment_events(created_at DESC);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    shipment_id UUID REFERENCES shipments(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    
    -- Amounts
    subtotal DECIMAL(10, 2) NOT NULL,
    tax DECIMAL(10, 2) DEFAULT 0,
    total DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    
    -- Dates
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    
    notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX idx_invoices_shipment_id ON invoices(shipment_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_issue_date ON invoices(issue_date DESC);

-- ============================================================================
-- DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER,
    mime_type VARCHAR(100),
    s3_key VARCHAR(500) NOT NULL,
    s3_bucket VARCHAR(255) NOT NULL,
    uploaded_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_documents_shipment_id ON documents(shipment_id);
CREATE INDEX idx_documents_customer_id ON documents(customer_id);
CREATE INDEX idx_documents_created_at ON documents(created_at DESC);

-- ============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON shipments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipment_charges_updated_at BEFORE UPDATE ON shipment_charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SAMPLE DATA FOR TESTING
-- ============================================================================

-- Insert sample customer (linked to test@ctcm.com Cognito user)
INSERT INTO customers (cognito_sub, name, email, phone, company, address, city, state, country, postal_code)
VALUES 
    ('demo-customer-1', 'John Doe', 'test@ctcm.com', '+1-246-555-0123', 'Doe Imports', '123 Main Street', 'Bridgetown', 'St. Michael', 'Barbados', 'BB11000'),
    ('demo-admin-1', 'Admin User', 'admin@ctcm.com', '+1-246-555-0100', 'CTCM Admin', '456 Admin Ave', 'Bridgetown', 'St. Michael', 'Barbados', 'BB11001');

-- Insert sample shipments
INSERT INTO shipments (
    customer_id, tracking_number, warehouse_receipt_number, status, shipping_method,
    origin, destination, description, shipper_name, carrier_name, warehouse_location,
    received_date, total_weight_lb, total_weight_kg, created_at
)
SELECT 
    c.id,
    'CTCM' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
    'WR' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
    CASE (ROW_NUMBER() OVER()) % 5
        WHEN 0 THEN 'delivered'
        WHEN 1 THEN 'in_transit'
        WHEN 2 THEN 'customs_clearance'
        WHEN 3 THEN 'ready_for_pickup'
        ELSE 'received'
    END,
    CASE (ROW_NUMBER() OVER()) % 2 WHEN 0 THEN 'air' ELSE 'sea' END,
    'Miami, FL, USA',
    'Bridgetown, Barbados',
    'General merchandise shipment #' || (ROW_NUMBER() OVER()),
    'Fashion Nova',
    'UPS Ground',
    'SP',
    CURRENT_TIMESTAMP - (INTERVAL '1 day' * (ROW_NUMBER() OVER())),
    50.0 + (ROW_NUMBER() OVER()) * 10,
    22.68 + (ROW_NUMBER() OVER()) * 4.54,
    CURRENT_TIMESTAMP - (INTERVAL '1 day' * (ROW_NUMBER() OVER()))
FROM customers c
WHERE c.email = 'test@ctcm.com'
CROSS JOIN generate_series(1, 10) AS s(n);

-- Insert sample packages for each shipment
INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, weight, weight_kg, volume)
SELECT 
    s.id,
    2,
    'box',
    24.0,
    18.0,
    12.0,
    s.total_weight_lb / 2,
    s.total_weight_kg / 2,
    (24.0 * 18.0 * 12.0) / 1728
FROM shipments s;

-- Insert sample shipment events
INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at)
SELECT 
    s.id,
    'received',
    'Package received at warehouse',
    'Miami Warehouse',
    'warehouse-staff',
    s.received_date
FROM shipments s;

-- Insert sample invoices for delivered shipments
INSERT INTO invoices (customer_id, shipment_id, invoice_number, status, subtotal, tax, total, issue_date, due_date)
SELECT 
    s.customer_id,
    s.id,
    'INV' || LPAD((ROW_NUMBER() OVER())::TEXT, 6, '0'),
    'paid',
    150.00,
    22.50,
    172.50,
    CURRENT_DATE - (INTERVAL '5 days' * (ROW_NUMBER() OVER())),
    CURRENT_DATE + (INTERVAL '25 days' - INTERVAL '5 days' * (ROW_NUMBER() OVER()))
FROM shipments s
WHERE s.status = 'delivered';

-- Grant permissions (adjust as needed for your Lambda execution role)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ctcmadmin;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ctcmadmin;

COMMIT;
