/*
  # Fix role type mismatch in profiles table

  1. Database Schema Changes
    - Convert profiles.role column from text to app_role enum type
    - Handle existing data by casting invalid values to 'user'
    - Set proper default value for new records

  2. Function Updates
    - Recreate get_user_role function with proper type handling
    - Use CASCADE to handle dependent storage policies

  3. Security Policies
    - Recreate all RLS policies that depend on the role column
    - Ensure compatibility with the new enum type
*/

-- First, let's handle any existing invalid role data
UPDATE profiles 
SET role = 'user' 
WHERE role IS NULL OR role NOT IN ('admin', 'manager', 'user');

-- Drop existing policies that depend on the role column
DROP POLICY IF EXISTS "Admins can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

DROP POLICY IF EXISTS "Admins and managers can insert employees" ON employees;
DROP POLICY IF EXISTS "Admins and managers can update employees" ON employees;
DROP POLICY IF EXISTS "Admins can delete employees" ON employees;
DROP POLICY IF EXISTS "Users can view employees" ON employees;

DROP POLICY IF EXISTS "Admins and managers can manage documents" ON documents;
DROP POLICY IF EXISTS "Users can view documents" ON documents;

DROP POLICY IF EXISTS "Admins and managers can manage payrolls" ON payrolls;
DROP POLICY IF EXISTS "Users can view payrolls" ON payrolls;

DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;
DROP POLICY IF EXISTS "Everyone can view settings" ON app_settings;

-- Drop storage policies that depend on get_user_role function
DROP POLICY IF EXISTS "Admins and managers can update files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and managers can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete files" ON storage.objects;

-- Now drop the existing get_user_role function with CASCADE
DROP FUNCTION IF EXISTS get_user_role(uuid) CASCADE;

-- Now alter the profiles table role column type
ALTER TABLE profiles 
ALTER COLUMN role TYPE app_role 
USING CASE 
  WHEN role = 'admin' THEN 'admin'::app_role
  WHEN role = 'manager' THEN 'manager'::app_role
  ELSE 'user'::app_role
END;

-- Set the default value for the role column
ALTER TABLE profiles 
ALTER COLUMN role SET DEFAULT 'user'::app_role;

-- Recreate the get_user_role function with proper type handling
CREATE OR REPLACE FUNCTION get_user_role(user_id uuid)
RETURNS app_role AS $$
BEGIN
  RETURN (
    SELECT COALESCE(role, 'user'::app_role)
    FROM profiles 
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate RLS policies for profiles table
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Recreate RLS policies for user_profiles table
CREATE POLICY "Admins can insert profiles"
  ON user_profiles
  FOR INSERT
  TO public
  WITH CHECK (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Admins can update all profiles"
  ON user_profiles
  FOR UPDATE
  TO public
  USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Admins can view all profiles"
  ON user_profiles
  FOR SELECT
  TO public
  USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO public
  USING (user_id = auth.uid());

CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO public
  USING (user_id = auth.uid());

-- Recreate RLS policies for employees table
CREATE POLICY "Admins and managers can insert employees"
  ON employees
  FOR INSERT
  TO public
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins and managers can update employees"
  ON employees
  FOR UPDATE
  TO public
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can delete employees"
  ON employees
  FOR DELETE
  TO public
  USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Users can view employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate RLS policies for documents table
CREATE POLICY "Admins and managers can manage documents"
  ON documents
  FOR ALL
  TO public
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Users can view documents"
  ON documents
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate RLS policies for payrolls table
CREATE POLICY "Admins and managers can manage payrolls"
  ON payrolls
  FOR ALL
  TO public
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Users can view payrolls"
  ON payrolls
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate RLS policies for app_settings table
CREATE POLICY "Admins can manage settings"
  ON app_settings
  FOR ALL
  TO public
  USING (get_user_role(auth.uid()) = 'admin'::app_role);

CREATE POLICY "Everyone can view settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Recreate storage policies that were dropped
CREATE POLICY "Admins and managers can update files"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins and managers can upload files"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (get_user_role(auth.uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Admins can delete files"
  ON storage.objects
  FOR DELETE
  TO public
  USING (get_user_role(auth.uid()) = 'admin'::app_role);