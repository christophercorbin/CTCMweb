/*
  # Create test users for the system

  1. Users Created
    - Admin user: admin@skybox.com (password: admin123)
    - Customer user: customer@skybox.com (password: customer123)
  
  2. Changes
    - Insert test users into auth.users
    - Set proper roles in user metadata
    - Create customer records for both users
    - Create sample invoices for the customer
  
  3. Security
    - Uses secure password hashing
    - Sets proper role metadata
*/

-- Create admin user
DO $$
DECLARE
  admin_user_id uuid;
  customer_user_id uuid;
  customer_record_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@skybox.com';

  -- Create admin user if doesn't exist
  IF admin_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      role,
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'admin@skybox.com',
      crypt('admin123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"admin","name":"Admin User"}',
      now(),
      now(),
      '',
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO admin_user_id;

    -- Create customer record for admin
    INSERT INTO customers (
      id,
      user_id,
      name,
      email,
      phone,
      company,
      address,
      air_skybox_address,
      sea_skybox_address
    ) VALUES (
      gen_random_uuid(),
      admin_user_id,
      'Admin User',
      'admin@skybox.com',
      '+1-555-0100',
      'Skybox Admin',
      '123 Admin St, Miami, FL 33101',
      'Admin User\nSkybox Air Warehouse\n456 Airport Rd\nMiami, FL 33142\nUSA',
      'Admin User\nSkybox Sea Port\n789 Harbor Dr\nMiami, FL 33132\nUSA'
    );
  END IF;

  -- Check if customer user already exists
  SELECT id INTO customer_user_id
  FROM auth.users
  WHERE email = 'customer@skybox.com';

  -- Create customer user if doesn't exist
  IF customer_user_id IS NULL THEN
    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      role,
      aud
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'customer@skybox.com',
      crypt('customer123', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"role":"customer","name":"John Customer"}',
      now(),
      now(),
      '',
      'authenticated',
      'authenticated'
    )
    RETURNING id INTO customer_user_id;

    -- Create customer record for customer
    INSERT INTO customers (
      id,
      user_id,
      name,
      email,
      phone,
      company,
      address,
      air_skybox_address,
      sea_skybox_address
    ) VALUES (
      gen_random_uuid(),
      customer_user_id,
      'John Customer',
      'customer@skybox.com',
      '+1-555-0200',
      'ABC Company',
      '456 Customer Ave, New York, NY 10001',
      'John Customer\nSkybox Air Warehouse\n456 Airport Rd\nMiami, FL 33142\nUSA\nRef: CUST001',
      'John Customer\nSkybox Sea Port\n789 Harbor Dr\nMiami, FL 33132\nUSA\nRef: CUST001'
    )
    RETURNING id INTO customer_record_id;

    -- Create sample invoices for the customer
    INSERT INTO invoices (
      id,
      customer_id,
      invoice_number,
      shipment_id,
      shipment_tracking,
      amount,
      status,
      issue_date,
      due_date,
      paid_date
    ) VALUES
    (
      gen_random_uuid(),
      customer_user_id,
      'INV-2024-001',
      gen_random_uuid(),
      'SKY123456789',
      299.99,
      'paid',
      now() - interval '30 days',
      now() - interval '15 days',
      now() - interval '20 days'
    ),
    (
      gen_random_uuid(),
      customer_user_id,
      'INV-2024-002',
      gen_random_uuid(),
      'SKY987654321',
      450.00,
      'pending',
      now() - interval '10 days',
      now() + interval '5 days',
      NULL
    ),
    (
      gen_random_uuid(),
      customer_user_id,
      'INV-2024-003',
      gen_random_uuid(),
      'SKY555666777',
      125.50,
      'overdue',
      now() - interval '45 days',
      now() - interval '30 days',
      NULL
    );
  END IF;

END $$;
