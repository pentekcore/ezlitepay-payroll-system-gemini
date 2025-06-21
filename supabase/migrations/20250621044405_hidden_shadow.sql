/*
  # Fix app_settings table and ensure proper configuration

  1. Table Structure
    - Ensure app_settings table exists with proper columns
    - Handle unique constraint safely
    - Add necessary indexes

  2. Data Initialization
    - Clean up malformed data
    - Initialize default configuration values
    - Ensure proper JSON structure

  3. Security
    - Enable RLS on app_settings table
    - Create policies for admin management and public viewing
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

-- Check if unique constraint exists and add it if it doesn't
DO $$
DECLARE
  constraint_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM pg_constraint c
    JOIN pg_class t ON c.conrelid = t.oid
    JOIN pg_namespace n ON t.relnamespace = n.oid
    WHERE c.conname = 'app_settings_key_unique'
    AND t.relname = 'app_settings'
    AND n.nspname = 'public'
  ) INTO constraint_exists;
  
  IF NOT constraint_exists THEN
    ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);
  END IF;
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
DECLARE
  config_exists boolean;
BEGIN
  -- Check if main_config exists
  SELECT EXISTS (
    SELECT 1 FROM app_settings WHERE key = 'main_config'
  ) INTO config_exists;
  
  IF config_exists THEN
    -- Update existing record
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
  ELSE
    -- Insert new record
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