/*
  # Fix app_settings table schema

  1. Changes
    - Add missing 'key' column to app_settings table
    - Ensure proper indexing for performance
    - Add default data for application settings

  2. Security
    - Maintain existing RLS policies
*/

-- Add the missing 'key' column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_settings' AND column_name = 'key'
  ) THEN
    ALTER TABLE app_settings ADD COLUMN key text;
  END IF;
END $$;

-- Create unique index on key column for performance
CREATE UNIQUE INDEX IF NOT EXISTS app_settings_key_unique ON app_settings(key);

-- Insert default app settings if they don't exist
INSERT INTO app_settings (key, category, value, label, is_active, sort_order)
VALUES 
  ('main_config', 'system', '{"departments": ["Human Resources", "Information Technology", "Finance", "Operations", "Marketing"], "positions": ["Manager", "Developer", "Analyst", "Coordinator", "Specialist"], "employeeTypes": ["Regular", "Contractual", "Part-time", "Probationary"], "statuses": ["Active", "Resigned", "Terminated", "On Leave"], "documentTypes": ["Resume", "Contract", "ID Copy", "Certificate", "Other"]}', 'Main Application Configuration', true, 1),
  ('company_info', 'system', '{"name": "Your Company Name", "address": "123 Business Street, City, State 12345", "logoUrl": "", "currency": "$"}', 'Company Information', true, 2)
ON CONFLICT (key) DO NOTHING;