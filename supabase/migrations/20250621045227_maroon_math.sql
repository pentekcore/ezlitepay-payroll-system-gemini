/*
  # Fix App Settings Configuration

  1. Table Structure
    - Creates app_settings table with proper JSONB column
    - Adds unique constraint on key column safely
    - Creates performance indexes

  2. Data Initialization
    - Cleans up any malformed configuration data
    - Initializes default application settings
    - Sets up company information defaults

  3. Security
    - Enables RLS on app_settings table
    - Creates policies for admin management and user viewing
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

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  BEGIN
    ALTER TABLE app_settings ADD CONSTRAINT app_settings_key_unique UNIQUE (key);
  EXCEPTION
    WHEN duplicate_object THEN
      -- Constraint already exists, continue
      NULL;
    WHEN duplicate_table THEN
      -- Constraint already exists with different name, continue
      NULL;
  END;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON app_settings(key);
CREATE INDEX IF NOT EXISTS idx_app_settings_category ON app_settings(category);
CREATE INDEX IF NOT EXISTS idx_app_settings_is_active ON app_settings(is_active);

-- Enable RLS
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Clean up any existing malformed data (using proper JSONB operations)
DELETE FROM app_settings 
WHERE key = 'main_config' 
AND (
  value IS NULL 
  OR value::text = 'null'
  OR value = '{}'::jsonb
  OR NOT (value ? 'departments')
);

-- Initialize or update the main configuration
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
  sort_order = EXCLUDED.sort_order,
  category = EXCLUDED.category;

-- Initialize company info if it doesn't exist
INSERT INTO app_settings (key, category, value, label, is_active, sort_order)
VALUES (
  'company_info',
  'system',
  '{
    "name": "Your Company Name",
    "address": "123 Business Street, City, State 12345",
    "logoUrl": "",
    "currency": "$"
  }'::jsonb,
  'Company Information',
  true,
  2
)
ON CONFLICT (key) DO NOTHING;

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