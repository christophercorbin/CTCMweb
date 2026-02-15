/*
  # Add automatic customer record creation on user signup

  1. New Functions
    - `handle_new_user()` - Automatically creates a customer record when a user signs up
  
  2. New Triggers
    - `on_auth_user_created` - Trigger that fires when a new user is created
  
  3. Security
    - Function runs with security definer to bypass RLS
    - Only creates customer records, doesn't modify auth data
*/

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create a customer record for the new user
  INSERT INTO public.customers (
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
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'company', ''),
    COALESCE(NEW.raw_user_meta_data->>'address', ''),
    'Customer Name' || E'\n' || 'Skybox Air Warehouse' || E'\n' || '456 Airport Rd' || E'\n' || 'Miami, FL 33142' || E'\n' || 'USA',
    'Customer Name' || E'\n' || 'Skybox Sea Port' || E'\n' || '789 Harbor Dr' || E'\n' || 'Miami, FL 33132' || E'\n' || 'USA'
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
