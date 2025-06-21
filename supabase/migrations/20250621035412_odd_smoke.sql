/*
  # Fix app_settings table and ensure proper data persistence

  1. Tables
    - Ensure app_settings table has proper structure
    - Add indexes for better performance
    - Ensure proper constraints

  2. Data
    - Clean up any malformed data
    - Ensure proper JSON structure for settings

  3. Security
    - Ensure RLS policies are correct
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
  key text UNIQUE
);

-- Add unique constraint on key if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'app_settings_key_unique' 
    AND table_name = 'app_settings'
  ) THEN
    ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_is_active ON app_settings(is_active);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Clean up any existing malformed data
DELETE FROM app_settings WHERE key = 'main_config' AND (value IS NULL OR value = 'null'::jsonb);

-- Ensure we have a proper main_config entry with default values
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
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  label = EXCLUDED.label,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Drop existing policies
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