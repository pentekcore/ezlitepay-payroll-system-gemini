/*
  # Create payrolls table

  1. New Tables
    - `payrolls`
      - `id` (uuid, primary key)
      - `employee_id` (text, foreign key to employees.employee_id)
      - `pay_period_start` (date)
      - `pay_period_end` (date)
      - `pay_date_issued` (date, nullable)
      - `gross_pay` (numeric)
      - `deductions` (numeric)
      - `net_pay` (numeric)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `payrolls` table
    - Add policies for authenticated users to view payrolls
    - Add policies for admins and managers to manage payrolls

  3. Changes
    - Foreign key constraint to employees table
    - Unique constraint on employee_id, pay_period_start, pay_period_end
    - Indexes for performance
    - Update trigger for updated_at column
*/

-- Create the payrolls table
CREATE TABLE IF NOT EXISTS payrolls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id text NOT NULL,
  pay_period_start date NOT NULL,
  pay_period_end date NOT NULL,
  pay_date_issued date,
  gross_pay numeric(10,2) NOT NULL DEFAULT 0,
  deductions numeric(10,2) NOT NULL DEFAULT 0,
  net_pay numeric(10,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add foreign key constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payrolls_employee_id_fkey' 
    AND table_name = 'payrolls'
  ) THEN
    ALTER TABLE payrolls 
    ADD CONSTRAINT payrolls_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add unique constraint only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'unique_payslip_per_period' 
    AND table_name = 'payrolls'
  ) THEN
    ALTER TABLE payrolls 
    ADD CONSTRAINT unique_payslip_per_period 
    UNIQUE (employee_id, pay_period_start, pay_period_end);
  END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_pay_period ON payrolls(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payrolls_created_at ON payrolls(created_at);

-- Enable RLS
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'update_payrolls_updated_at' 
    AND event_object_table = 'payrolls'
  ) THEN
    CREATE TRIGGER update_payrolls_updated_at 
      BEFORE UPDATE ON payrolls 
      FOR EACH ROW 
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- RLS Policies (drop and recreate to ensure they're correct)
DROP POLICY IF EXISTS "Admins and managers can manage payrolls" ON payrolls;
DROP POLICY IF EXISTS "Users can view payrolls" ON payrolls;

-- Create helper function to get user role if it doesn't exist
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