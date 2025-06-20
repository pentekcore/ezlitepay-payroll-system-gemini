/*
  # Create payrolls table

  1. New Tables
    - `payrolls`
      - `id` (uuid, primary key)
      - `employee_id` (text, references employees.employee_id)
      - `pay_period_start` (date)
      - `pay_period_end` (date)
      - `pay_date_issued` (date)
      - `gross_pay` (numeric)
      - `deductions` (numeric)
      - `net_pay` (numeric)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `payrolls` table
    - Add policies for authenticated users to manage payrolls based on user role

  3. Constraints
    - Unique constraint to prevent duplicate payslips for same employee and period
    - Foreign key constraint to employees table
*/

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

-- Add foreign key constraint
ALTER TABLE payrolls 
ADD CONSTRAINT payrolls_employee_id_fkey 
FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE;

-- Add unique constraint to prevent duplicate payslips
ALTER TABLE payrolls 
ADD CONSTRAINT unique_payslip_per_period 
UNIQUE (employee_id, pay_period_start, pay_period_end);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_pay_period ON payrolls(pay_period_start, pay_period_end);
CREATE INDEX IF NOT EXISTS idx_payrolls_created_at ON payrolls(created_at);

-- Enable RLS
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins and managers can manage payrolls"
  ON payrolls
  FOR ALL
  TO public
  USING (get_user_role(uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]))
  WITH CHECK (get_user_role(uid()) = ANY (ARRAY['admin'::app_role, 'manager'::app_role]));

CREATE POLICY "Users can view payrolls"
  ON payrolls
  FOR SELECT
  TO authenticated
  USING (true);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payrolls_updated_at 
    BEFORE UPDATE ON payrolls 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();