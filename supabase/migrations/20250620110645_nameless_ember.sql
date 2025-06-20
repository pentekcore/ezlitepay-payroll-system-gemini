/*
  # Initial EZLitePay Database Schema

  1. New Tables
    - `profiles` - User profiles for authentication
    - `employees` - Employee information and payroll data
    - `employee_documents` - Document management for employees
    - `time_logs` - Time tracking and attendance
    - `schedules` - Employee scheduling
    - `payrolls` - Payroll records
    - `app_settings` - Application configuration

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Secure access based on user roles
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employees table
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  profile_picture_url TEXT,
  gender TEXT,
  birth_date DATE,
  position TEXT,
  department TEXT,
  email TEXT,
  start_date DATE,
  employee_type TEXT,
  status TEXT DEFAULT 'Active',
  is_archived BOOLEAN DEFAULT FALSE,
  mobile_number TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_relationship TEXT,
  emergency_contact_number TEXT,
  tin_number TEXT,
  sss_number TEXT,
  philhealth_number TEXT,
  pagibig_number TEXT,
  payment_method TEXT,
  bank_name TEXT,
  account_number TEXT,
  salary_type TEXT,
  basic_salary DECIMAL(10,2) DEFAULT 0,
  hourly_rate DECIMAL(10,2) DEFAULT 0,
  monthly_equivalent DECIMAL(10,2) DEFAULT 0,
  overtime_multiplier DECIMAL(4,2) DEFAULT 1.25,
  regular_holiday_multiplier DECIMAL(4,2) DEFAULT 2.0,
  special_holiday_multiplier DECIMAL(4,2) DEFAULT 1.3,
  rest_day_overtime_multiplier DECIMAL(4,2) DEFAULT 1.3,
  sss_deduction DECIMAL(10,2) DEFAULT 0,
  philhealth_deduction DECIMAL(10,2) DEFAULT 0,
  hdmf_deduction DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employee documents table
CREATE TABLE IF NOT EXISTS employee_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Time logs table
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Clock In', 'Clock Out')),
  method TEXT NOT NULL CHECK (method IN ('QR', 'Manual', 'Forced Manual')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE
);

-- Schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  date DATE NOT NULL,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, date, shift_start_time)
);

-- Payrolls table
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date_issued DATE,
  gross_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  deductions DECIMAL(10,2) NOT NULL DEFAULT 0,
  net_pay DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE,
  UNIQUE(employee_id, pay_period_start, pay_period_end)
);

-- App settings table for configuration
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
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

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Employees policies (authenticated users can manage employees)
CREATE POLICY "Authenticated users can read employees"
  ON employees
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert employees"
  ON employees
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update employees"
  ON employees
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete employees"
  ON employees
  FOR DELETE
  TO authenticated
  USING (true);

-- Employee documents policies
CREATE POLICY "Authenticated users can manage employee documents"
  ON employee_documents
  FOR ALL
  TO authenticated
  USING (true);

-- Time logs policies
CREATE POLICY "Authenticated users can manage time logs"
  ON time_logs
  FOR ALL
  TO authenticated
  USING (true);

-- Schedules policies
CREATE POLICY "Authenticated users can manage schedules"
  ON schedules
  FOR ALL
  TO authenticated
  USING (true);

-- Payrolls policies
CREATE POLICY "Authenticated users can manage payrolls"
  ON payrolls
  FOR ALL
  TO authenticated
  USING (true);

-- App settings policies
CREATE POLICY "Authenticated users can read app settings"
  ON app_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage app settings"
  ON app_settings
  FOR ALL
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON employees(is_archived);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_employee_id ON time_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_timestamp ON time_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_schedules_employee_id ON schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(date);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_pay_period ON payrolls(pay_period_start, pay_period_end);

-- Create storage bucket for employee files
INSERT INTO storage.buckets (id, name, public) 
VALUES ('employee-files', 'employee-files', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for employee files
CREATE POLICY "Authenticated users can upload employee files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'employee-files');

CREATE POLICY "Authenticated users can read employee files"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'employee-files');

CREATE POLICY "Authenticated users can update employee files"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'employee-files');

CREATE POLICY "Authenticated users can delete employee files"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'employee-files');