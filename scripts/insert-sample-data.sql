-- Insert sample shipments for testing
-- This script adds sample data to the database

-- Get the customer ID for test@ctcm.com
DO $$
DECLARE
    test_customer_id UUID;
    admin_customer_id UUID;
    shipment_id UUID;
    counter INTEGER;
BEGIN
    -- Get customer IDs
    SELECT id INTO test_customer_id FROM customers WHERE email = 'test@ctcm.com';
    SELECT id INTO admin_customer_id FROM customers WHERE email = 'admin@ctcm.com';
    
    -- Insert 10 sample shipments for test customer
    FOR counter IN 1..10 LOOP
        INSERT INTO shipments (
            customer_id, tracking_number, warehouse_receipt_number, status, shipping_method,
            origin, destination, description, shipper_name, carrier_name, warehouse_location,
            received_date, total_weight_lb, total_weight_kg, created_at
        )
        VALUES (
            test_customer_id,
            'CTCM' || LPAD(counter::TEXT, 6, '0'),
            'WR' || LPAD(counter::TEXT, 6, '0'),
            CASE counter % 5
                WHEN 0 THEN 'delivered'
                WHEN 1 THEN 'in_transit'
                WHEN 2 THEN 'customs_clearance'
                WHEN 3 THEN 'ready_for_pickup'
                ELSE 'received'
            END,
            CASE counter % 2 WHEN 0 THEN 'air' ELSE 'sea' END,
            'Miami, FL, USA',
            'Bridgetown, Barbados',
            'General merchandise shipment #' || counter,
            'Fashion Nova',
            'UPS Ground',
            'SP',
            CURRENT_TIMESTAMP - (INTERVAL '1 day' * counter),
            50.0 + (counter * 10),
            22.68 + (counter * 4.54),
            CURRENT_TIMESTAMP - (INTERVAL '1 day' * counter)
        )
        RETURNING id INTO shipment_id;
        
        -- Insert packages for this shipment
        INSERT INTO packages (shipment_id, pieces_count, package_type, length, width, height, weight, weight_kg, volume)
        VALUES (
            shipment_id,
            2,
            'box',
            24.0,
            18.0,
            12.0,
            (50.0 + (counter * 10)) / 2,
            (22.68 + (counter * 4.54)) / 2,
            (24.0 * 18.0 * 12.0) / 1728
        );
        
        -- Insert shipment event
        INSERT INTO shipment_events (shipment_id, event_type, event_description, location, created_by, created_at)
        VALUES (
            shipment_id,
            'received',
            'Package received at warehouse',
            'Miami Warehouse',
            'warehouse-staff',
            CURRENT_TIMESTAMP - (INTERVAL '1 day' * counter)
        );
        
        -- Insert invoice for delivered shipments
        IF counter % 5 = 0 THEN
            INSERT INTO invoices (customer_id, shipment_id, invoice_number, status, subtotal, tax, total, issue_date, due_date)
            VALUES (
                test_customer_id,
                shipment_id,
                'INV' || LPAD(counter::TEXT, 6, '0'),
                'paid',
                150.00,
                22.50,
                172.50,
                CURRENT_DATE - (counter * 5),
                CURRENT_DATE + (25 - (counter * 5))
            );
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Sample data inserted successfully!';
END $$;
