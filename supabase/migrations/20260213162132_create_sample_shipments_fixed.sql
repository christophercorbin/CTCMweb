/*
  # Create Sample Shipments (Air and Sea)

  1. Sample Data Created
    - 3 Air freight shipments with varying statuses
    - 3 Sea freight shipments with varying statuses
    - Multiple packages for each shipment
    - Shipping charges for each shipment
    - Tracking events showing shipment progress

  2. Shipment Types
    - Air Freight: Fast delivery, smaller volumes, higher cost
      - SKY-AIR-001: In transit
      - SKY-AIR-002: Delivered
      - SKY-AIR-003: At warehouse (pending)
    - Sea Freight: Economical, larger volumes, longer transit
      - SKY-SEA-001: In transit
      - SKY-SEA-002: Delivered
      - SKY-SEA-003: Customs clearance

  3. Details
    - Realistic shipper and consignee information
    - Multiple packages per shipment with dimensions and weights
    - Itemized charges (freight, handling, customs, etc.)
    - Timeline events tracking shipment progress
*/

DO $$
DECLARE
  customer_user_id uuid;
  admin_user_id uuid;
  customer_record_id uuid;
  
  -- Air shipment IDs
  air_shipment_1 uuid;
  air_shipment_2 uuid;
  air_shipment_3 uuid;
  
  -- Sea shipment IDs
  sea_shipment_1 uuid;
  sea_shipment_2 uuid;
  sea_shipment_3 uuid;
BEGIN
  -- Get user IDs
  SELECT id INTO customer_user_id FROM auth.users WHERE email = 'customer@skybox.com';
  SELECT id INTO admin_user_id FROM auth.users WHERE email = 'admin@skybox.com';
  SELECT id INTO customer_record_id FROM customers WHERE user_id = customer_user_id;

  -- ===================
  -- AIR FREIGHT SHIPMENTS
  -- ===================

  -- Air Shipment 1: In Transit
  INSERT INTO shipments (
    id, tracking_number, warehouse_receipt_number, customer_id, status,
    received_date, received_by,
    shipper_name, shipper_address, shipper_city, shipper_state, shipper_country, shipper_zip,
    consignee_name, consignee_contact, consignee_address, consignee_city, consignee_state, consignee_country, consignee_zip, consignee_email, consignee_phone,
    carrier_name, pro_number,
    supplier, invoice_number, po_number,
    warehouse_location, description, notes,
    created_at
  ) VALUES (
    gen_random_uuid(), 'SKY-AIR-001', 'WR-AIR-001', customer_record_id, 'in_transit',
    now() - interval '2 days', 'John Williams',
    'TechSupply Inc', '123 Tech Blvd', 'San Francisco', 'CA', 'USA', '94102',
    'John Customer', 'Jane Receiver', '456 Customer Ave', 'New York', 'NY', 'USA', '10001', 'customer@skybox.com', '+1-555-0200',
    'FedEx Express', 'FDX789456123',
    'TechSupply Inc', 'TS-INV-2024-045', 'PO-2024-089',
    'Miami Air Warehouse - Zone A3', 'Electronics - Laptops and Accessories', 'Priority air freight - Handle with care',
    now() - interval '3 days'
  ) RETURNING id INTO air_shipment_1;

  -- Packages for Air Shipment 1
  INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, dimension_unit, weight, weight_unit, weight_kg, description, storage_location, invoice_number, part_number) VALUES
  (air_shipment_1, 5, 'box', 20, 14, 8, 'in', 35, 'lb', 15.88, 'Dell Laptops - 5 units', 'A3-101', 'TS-INV-2024-045', 'DELL-LAT-7430'),
  (air_shipment_1, 3, 'box', 12, 10, 6, 'in', 8, 'lb', 3.63, 'Laptop Chargers and Accessories', 'A3-102', 'TS-INV-2024-045', 'DELL-ACC-KIT');

  -- Charges for Air Shipment 1
  INSERT INTO shipment_charges (shipment_id, charge_type, amount, description) VALUES
  (air_shipment_1, 'Air Freight', 485.00, 'Express air freight - 2-3 day delivery'),
  (air_shipment_1, 'Handling', 45.00, 'Warehouse handling and processing'),
  (air_shipment_1, 'Insurance', 25.00, 'Cargo insurance'),
  (air_shipment_1, 'Documentation', 15.00, 'Documentation and filing fees');

  -- Events for Air Shipment 1
  INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at) VALUES
  (air_shipment_1, 'received', 'Package received at origin facility', 'San Francisco, CA', 'System', now() - interval '3 days'),
  (air_shipment_1, 'departed', 'Departed origin facility', 'San Francisco International Airport', 'System', now() - interval '2 days 18 hours'),
  (air_shipment_1, 'in_transit', 'In transit to destination', 'En route to Miami', 'System', now() - interval '2 days 12 hours'),
  (air_shipment_1, 'arrived', 'Arrived at hub', 'Miami International Airport', 'System', now() - interval '2 days'),
  (air_shipment_1, 'customs_clearance', 'Customs clearance in progress', 'Miami Customs Office', 'System', now() - interval '1 day 18 hours');

  -- Air Shipment 2: Delivered
  INSERT INTO shipments (
    id, tracking_number, warehouse_receipt_number, customer_id, status,
    received_date, received_by,
    shipper_name, shipper_address, shipper_city, shipper_state, shipper_country, shipper_zip,
    consignee_name, consignee_contact, consignee_address, consignee_city, consignee_state, consignee_country, consignee_zip, consignee_email, consignee_phone,
    carrier_name, pro_number,
    supplier, invoice_number, po_number,
    warehouse_location, description, notes,
    created_at
  ) VALUES (
    gen_random_uuid(), 'SKY-AIR-002', 'WR-AIR-002', customer_record_id, 'delivered',
    now() - interval '15 days', 'Maria Garcia',
    'PharmaCorp', '789 Medical Dr', 'Boston', 'MA', 'USA', '02101',
    'John Customer', 'Jane Receiver', '456 Customer Ave', 'New York', 'NY', 'USA', '10001', 'customer@skybox.com', '+1-555-0200',
    'DHL Express', 'DHL456789012',
    'PharmaCorp', 'PC-INV-2024-023', 'PO-2024-067',
    'Miami Air Warehouse - Zone B1', 'Medical Supplies - Temperature Controlled', 'Delivered successfully - Signature obtained',
    now() - interval '16 days'
  ) RETURNING id INTO air_shipment_2;

  -- Packages for Air Shipment 2
  INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, dimension_unit, weight, weight_unit, weight_kg, description, storage_location, invoice_number) VALUES
  (air_shipment_2, 2, 'box', 18, 12, 10, 'in', 25, 'lb', 11.34, 'Medical Supplies - Temperature Sensitive', 'B1-045', 'PC-INV-2024-023');

  -- Charges for Air Shipment 2
  INSERT INTO shipment_charges (shipment_id, charge_type, amount, description) VALUES
  (air_shipment_2, 'Air Freight', 395.00, 'Priority air freight'),
  (air_shipment_2, 'Handling', 40.00, 'Special handling - temperature controlled'),
  (air_shipment_2, 'Insurance', 30.00, 'Enhanced cargo insurance');

  -- Events for Air Shipment 2
  INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at) VALUES
  (air_shipment_2, 'received', 'Package received at origin', 'Boston, MA', 'System', now() - interval '16 days'),
  (air_shipment_2, 'departed', 'Departed origin facility', 'Boston Logan International', 'System', now() - interval '15 days 20 hours'),
  (air_shipment_2, 'arrived', 'Arrived at destination hub', 'Miami International Airport', 'System', now() - interval '15 days 16 hours'),
  (air_shipment_2, 'customs_cleared', 'Cleared customs', 'Miami Customs Office', 'System', now() - interval '15 days 12 hours'),
  (air_shipment_2, 'out_for_delivery', 'Out for delivery', 'Miami Distribution Center', 'System', now() - interval '15 days 8 hours'),
  (air_shipment_2, 'delivered', 'Delivered successfully', 'New York, NY', 'System', now() - interval '15 days');

  -- Air Shipment 3: At Warehouse (Pending)
  INSERT INTO shipments (
    id, tracking_number, warehouse_receipt_number, customer_id, status,
    received_date, received_by,
    shipper_name, shipper_address, shipper_city, shipper_state, shipper_country, shipper_zip,
    consignee_name, consignee_contact, consignee_address, consignee_city, consignee_state, consignee_country, consignee_zip, consignee_email, consignee_phone,
    carrier_name, pro_number,
    supplier, invoice_number, po_number,
    warehouse_location, description, notes,
    created_at
  ) VALUES (
    gen_random_uuid(), 'SKY-AIR-003', 'WR-AIR-003', customer_record_id, 'at_warehouse',
    now() - interval '1 day', 'Sarah Johnson',
    'Fashion House LA', '555 Fashion Ave', 'Los Angeles', 'CA', 'USA', '90001',
    'John Customer', 'Jane Receiver', '456 Customer Ave', 'New York', 'NY', 'USA', '10001', 'customer@skybox.com', '+1-555-0200',
    'UPS Next Day Air', 'UPS123456789',
    'Fashion House LA', 'FH-INV-2024-156', 'PO-2024-103',
    'Miami Air Warehouse - Zone C2', 'Fashion Apparel - Spring Collection', 'Awaiting customer release instructions',
    now() - interval '2 days'
  ) RETURNING id INTO air_shipment_3;

  -- Packages for Air Shipment 3
  INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, dimension_unit, weight, weight_unit, weight_kg, description, storage_location, invoice_number) VALUES
  (air_shipment_3, 8, 'box', 24, 18, 12, 'in', 45, 'lb', 20.41, 'Designer Clothing - Mixed Items', 'C2-078', 'FH-INV-2024-156'),
  (air_shipment_3, 5, 'box', 20, 16, 10, 'in', 28, 'lb', 12.70, 'Accessories and Footwear', 'C2-079', 'FH-INV-2024-156');

  -- Charges for Air Shipment 3
  INSERT INTO shipment_charges (shipment_id, charge_type, amount, description) VALUES
  (air_shipment_3, 'Air Freight', 525.00, 'Next day air freight'),
  (air_shipment_3, 'Handling', 55.00, 'Warehouse receiving and storage'),
  (air_shipment_3, 'Storage', 30.00, 'Warehouse storage (2 days)');

  -- Events for Air Shipment 3
  INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at) VALUES
  (air_shipment_3, 'received', 'Package received at origin', 'Los Angeles, CA', 'System', now() - interval '2 days'),
  (air_shipment_3, 'departed', 'Departed origin facility', 'LAX Airport', 'System', now() - interval '1 day 20 hours'),
  (air_shipment_3, 'arrived', 'Arrived at destination', 'Miami International Airport', 'System', now() - interval '1 day 16 hours'),
  (air_shipment_3, 'customs_cleared', 'Cleared customs', 'Miami Customs Office', 'System', now() - interval '1 day 12 hours'),
  (air_shipment_3, 'at_warehouse', 'Arrived at warehouse', 'Skybox Miami Air Warehouse', 'Sarah Johnson', now() - interval '1 day');

  -- ===================
  -- SEA FREIGHT SHIPMENTS
  -- ===================

  -- Sea Shipment 1: In Transit
  INSERT INTO shipments (
    id, tracking_number, warehouse_receipt_number, customer_id, status,
    received_date, received_by,
    shipper_name, shipper_address, shipper_city, shipper_state, shipper_country, shipper_zip,
    consignee_name, consignee_contact, consignee_address, consignee_city, consignee_state, consignee_country, consignee_zip, consignee_email, consignee_phone,
    carrier_name, pro_number,
    supplier, invoice_number, po_number,
    warehouse_location, description, notes,
    created_at
  ) VALUES (
    gen_random_uuid(), 'SKY-SEA-001', 'WR-SEA-001', customer_record_id, 'in_transit',
    now() - interval '25 days', 'Robert Chen',
    'Global Manufacturing Ltd', '888 Industrial Park', 'Shanghai', 'Shanghai', 'China', '200000',
    'John Customer', 'Jane Receiver', '456 Customer Ave', 'New York', 'NY', 'USA', '10001', 'customer@skybox.com', '+1-555-0200',
    'Maersk Line', 'MAEU789456123',
    'Global Manufacturing Ltd', 'GM-INV-2024-0789', 'PO-2024-045',
    'Miami Sea Port - Container Yard D', 'Industrial Equipment - 20ft Container', 'ETA: 3 days - Vessel on schedule',
    now() - interval '26 days'
  ) RETURNING id INTO sea_shipment_1;

  -- Packages for Sea Shipment 1
  INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, dimension_unit, weight, weight_unit, weight_kg, description, storage_location, invoice_number) VALUES
  (sea_shipment_1, 45, 'pallet', 48, 40, 60, 'in', 2850, 'lb', 1293.00, 'CNC Machine Parts - Crated', 'CY-D-045', 'GM-INV-2024-0789'),
  (sea_shipment_1, 30, 'pallet', 48, 40, 48, 'in', 1920, 'lb', 871.00, 'Electronic Components - Mixed', 'CY-D-046', 'GM-INV-2024-0789');

  -- Charges for Sea Shipment 1
  INSERT INTO shipment_charges (shipment_id, charge_type, amount, description) VALUES
  (sea_shipment_1, 'Ocean Freight', 2850.00, '20ft Container - Shanghai to Miami'),
  (sea_shipment_1, 'Port Charges', 450.00, 'Origin and destination port fees'),
  (sea_shipment_1, 'Documentation', 125.00, 'Bill of Lading and customs paperwork'),
  (sea_shipment_1, 'Insurance', 180.00, 'Marine cargo insurance');

  -- Events for Sea Shipment 1
  INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at) VALUES
  (sea_shipment_1, 'received', 'Container loaded at origin port', 'Shanghai Port, China', 'System', now() - interval '26 days'),
  (sea_shipment_1, 'departed', 'Vessel departed', 'Shanghai Port', 'System', now() - interval '25 days'),
  (sea_shipment_1, 'in_transit', 'In transit - Pacific crossing', 'Pacific Ocean', 'System', now() - interval '20 days'),
  (sea_shipment_1, 'in_transit', 'Transited through Panama Canal', 'Panama Canal', 'System', now() - interval '8 days'),
  (sea_shipment_1, 'in_transit', 'In transit - Caribbean Sea', 'Caribbean Sea', 'System', now() - interval '5 days');

  -- Sea Shipment 2: Delivered
  INSERT INTO shipments (
    id, tracking_number, warehouse_receipt_number, customer_id, status,
    received_date, received_by,
    shipper_name, shipper_address, shipper_city, shipper_state, shipper_country, shipper_zip,
    consignee_name, consignee_contact, consignee_address, consignee_city, consignee_state, consignee_country, consignee_zip, consignee_email, consignee_phone,
    carrier_name, pro_number,
    supplier, invoice_number, po_number,
    warehouse_location, description, notes,
    created_at
  ) VALUES (
    gen_random_uuid(), 'SKY-SEA-002', 'WR-SEA-002', customer_record_id, 'delivered',
    now() - interval '45 days', 'Michael Torres',
    'Euro Furniture GmbH', '123 Handelsstrasse', 'Hamburg', 'Hamburg', 'Germany', '20095',
    'John Customer', 'Jane Receiver', '456 Customer Ave', 'New York', 'NY', 'USA', '10001', 'customer@skybox.com', '+1-555-0200',
    'Hapag-Lloyd', 'HLCU567890123',
    'Euro Furniture GmbH', 'EF-INV-2024-0234', 'PO-2024-021',
    'Miami Sea Port - Delivered', 'Furniture - Office Equipment', 'Successfully delivered - All items accounted for',
    now() - interval '46 days'
  ) RETURNING id INTO sea_shipment_2;

  -- Packages for Sea Shipment 2
  INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, dimension_unit, weight, weight_unit, weight_kg, description, storage_location, invoice_number) VALUES
  (sea_shipment_2, 25, 'crate', 72, 48, 60, 'in', 3200, 'lb', 1452.00, 'Office Desks - Disassembled', 'DELIVERED', 'EF-INV-2024-0234'),
  (sea_shipment_2, 50, 'box', 36, 24, 24, 'in', 1850, 'lb', 839.00, 'Office Chairs - Packaged', 'DELIVERED', 'EF-INV-2024-0234');

  -- Charges for Sea Shipment 2
  INSERT INTO shipment_charges (shipment_id, charge_type, amount, description) VALUES
  (sea_shipment_2, 'Ocean Freight', 3200.00, '40ft Container - Hamburg to Miami'),
  (sea_shipment_2, 'Port Charges', 580.00, 'Port handling fees'),
  (sea_shipment_2, 'Customs Clearance', 225.00, 'Customs brokerage and clearance'),
  (sea_shipment_2, 'Delivery', 350.00, 'Final mile delivery to customer'),
  (sea_shipment_2, 'Documentation', 150.00, 'Bill of Lading and paperwork');

  -- Events for Sea Shipment 2
  INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at) VALUES
  (sea_shipment_2, 'received', 'Container loaded at origin', 'Hamburg Port, Germany', 'System', now() - interval '46 days'),
  (sea_shipment_2, 'departed', 'Vessel departed', 'Hamburg Port', 'System', now() - interval '45 days'),
  (sea_shipment_2, 'in_transit', 'In transit - Atlantic crossing', 'Atlantic Ocean', 'System', now() - interval '35 days'),
  (sea_shipment_2, 'arrived', 'Arrived at destination port', 'Port of Miami', 'System', now() - interval '15 days'),
  (sea_shipment_2, 'customs_clearance', 'Customs inspection started', 'Miami Customs Office', 'System', now() - interval '14 days'),
  (sea_shipment_2, 'customs_cleared', 'Customs cleared', 'Miami Customs Office', 'System', now() - interval '12 days'),
  (sea_shipment_2, 'out_for_delivery', 'Out for delivery', 'Miami Distribution Center', 'System', now() - interval '11 days'),
  (sea_shipment_2, 'delivered', 'Delivered to customer', 'New York, NY', 'System', now() - interval '10 days');

  -- Sea Shipment 3: Customs Clearance
  INSERT INTO shipments (
    id, tracking_number, warehouse_receipt_number, customer_id, status,
    received_date, received_by,
    shipper_name, shipper_address, shipper_city, shipper_state, shipper_country, shipper_zip,
    consignee_name, consignee_contact, consignee_address, consignee_city, consignee_state, consignee_country, consignee_zip, consignee_email, consignee_phone,
    carrier_name, pro_number,
    supplier, invoice_number, po_number,
    warehouse_location, description, notes,
    created_at
  ) VALUES (
    gen_random_uuid(), 'SKY-SEA-003', 'WR-SEA-003', customer_record_id, 'customs_clearance',
    now() - interval '32 days', 'Lisa Anderson',
    'Asian Textiles Co', '456 Factory Road', 'Guangzhou', 'Guangdong', 'China', '510000',
    'John Customer', 'Jane Receiver', '456 Customer Ave', 'New York', 'NY', 'USA', '10001', 'customer@skybox.com', '+1-555-0200',
    'COSCO Shipping', 'COSU345678901',
    'Asian Textiles Co', 'AT-INV-2024-0567', 'PO-2024-078',
    'Miami Sea Port - Customs Hold', 'Textiles and Fabrics - 40ft Container', 'Customs documentation review in progress',
    now() - interval '33 days'
  ) RETURNING id INTO sea_shipment_3;

  -- Packages for Sea Shipment 3
  INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, dimension_unit, weight, weight_unit, weight_kg, description, storage_location, invoice_number) VALUES
  (sea_shipment_3, 120, 'roll', 60, 24, 24, 'in', 4200, 'lb', 1905.00, 'Cotton Fabric Rolls - Various Colors', 'CY-E-123', 'AT-INV-2024-0567'),
  (sea_shipment_3, 80, 'bale', 48, 36, 36, 'in', 2850, 'lb', 1293.00, 'Synthetic Fabric Bales', 'CY-E-124', 'AT-INV-2024-0567');

  -- Charges for Sea Shipment 3
  INSERT INTO shipment_charges (shipment_id, charge_type, amount, description) VALUES
  (sea_shipment_3, 'Ocean Freight', 3650.00, '40ft Container - Guangzhou to Miami'),
  (sea_shipment_3, 'Port Charges', 520.00, 'Port handling and storage fees'),
  (sea_shipment_3, 'Customs Clearance', 285.00, 'Customs brokerage services'),
  (sea_shipment_3, 'Documentation', 165.00, 'Import documentation and filing'),
  (sea_shipment_3, 'Inspection Fee', 125.00, 'Customs inspection fee');

  -- Events for Sea Shipment 3
  INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at) VALUES
  (sea_shipment_3, 'received', 'Container loaded at origin', 'Guangzhou Port, China', 'System', now() - interval '33 days'),
  (sea_shipment_3, 'departed', 'Vessel departed', 'Guangzhou Port', 'System', now() - interval '32 days'),
  (sea_shipment_3, 'in_transit', 'In transit - Pacific route', 'South China Sea', 'System', now() - interval '28 days'),
  (sea_shipment_3, 'in_transit', 'Transited through Panama Canal', 'Panama Canal', 'System', now() - interval '10 days'),
  (sea_shipment_3, 'arrived', 'Arrived at destination port', 'Port of Miami', 'System', now() - interval '3 days'),
  (sea_shipment_3, 'customs_clearance', 'Customs clearance in progress', 'Miami Customs Office', 'Lisa Anderson', now() - interval '2 days');

END $$;