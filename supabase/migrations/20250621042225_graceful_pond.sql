/*
  # Fix app_settings table structure and data persistence

  1. Table Structure
    - Ensure app_settings table exists with proper structure
    - Add necessary indexes for performance
    - Handle existing constraints properly

  2. Data Initialization
    - Clean up any malformed data
    - Initialize default settings properly
    - Ensure proper JSON structure

  3. Security
    - Enable RLS on app_settings table
    - Create proper policies for admin management and public viewing
*/

-- Ensure the app_settings table exists with proper structure
CREATE TABLE IF NOT EXISTS app_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  value jsonb NOT NULL,
  label text NOT NULL,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  key text
);

-- Add unique constraint on key only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'app_settings_key_unique' 
    AND table_name = 'app_settings'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- Constraint already exists, do nothing
    NULL;
END $$;

-- Add indexes for better performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_is_active ON app_settings(is_active);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Clean up any existing malformed data
DELETE FROM app_settings WHERE key = 'main_config' AND (value IS NULL OR value = 'null'::jsonb OR value = '{}'::jsonb);

-- Ensure we have a proper main_config entry with default values
DO $$
BEGIN
  -- First try to update existing record
  UPDATE app_settings 
  SET 
    value = '{
      "departments": ["Human Resources", "Information Technology", "Finance", "Operations", "Marketing"],
      "positions": ["Manager", "Developer", "Analyst", "Coordinator", "Specialist"],
      "employeeTypes": ["Regular", "Contractual", "Part-time", "Probationary"],
      "statuses": ["Active", "Resigned", "Terminated", "On Leave"],
      "documentTypes": ["Resume", "Contract", "ID Copy", "Certificate", "Other"]
    }'::jsonb,
    label = 'Main Application Configuration',
    is_active = true,
    sort_order = 1,
    category = 'system'
  WHERE key = 'main_config';
  
  -- If no rows were updated, insert new record
  IF NOT FOUND THEN
    INSERT INTO app_settings (key, category, value, label, is_active, sort_order)
    VALUES (
      'main_config',
      'system',
      '{
        "departments": ["Human Resources", "Information Technology", "Finance", "Operations", "Marketing"],
        "positions": ["Manager", "Developer", "Analyst", "Coordinator", "Specialist"],
        "employeeTypes": ["Regular", "Contractual", "Part-time", "Probationary"],
        "statuses": ["Active", "Resigned", "Terminated", "On Leave"],
        "documentTypes": ["Resume", "Contract", "ID Copy", "Certificate", "Other"]
      }'::jsonb,
      'Main Application Configuration',
      true,
      1
    );
  END IF;
END $$;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can manage settings" ON app_settings;
DROP POLICY IF EXISTS "Everyone can view settings" ON app_settings;

-- Recreate RLS policies
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