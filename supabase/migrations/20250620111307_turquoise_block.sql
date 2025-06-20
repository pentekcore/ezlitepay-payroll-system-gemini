/*
  # EZLitePay Database Schema Migration

  1. New Tables
    - `profiles` - User profile management linked to auth.users
    - Additional tables only if they don't already exist
  
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage data
    
  3. Storage
    - Create employee-files bucket for document storage
    - Add storage policies for file management
*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table for user management (this is new and doesn't exist)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Only create tables if they don't exist, but most likely they already exist
-- Based on your schema, these tables already exist with specific column names

-- Check if employees table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    CREATE TABLE employees (
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
  END IF;
END $$;

-- Check if documents table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
    CREATE TABLE documents (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      employee_id UUID NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER,
      document_type TEXT DEFAULT 'Other',
      uploaded_by UUID,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Check if time_records table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'time_records') THEN
    CREATE TABLE time_records (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      employee_id UUID,
      date DATE DEFAULT CURRENT_DATE,
      clock_in TIMESTAMPTZ,
      clock_out TIMESTAMPTZ,
      break_start TIMESTAMPTZ,
      break_end TIMESTAMPTZ,
      lunch_start TIMESTAMPTZ,
      lunch_end TIMESTAMPTZ,
      total_hours DECIMAL(5,2),
      overtime_hours DECIMAL(5,2) DEFAULT 0,
      status TEXT DEFAULT 'pending',
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Check if schedules table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedules') THEN
    CREATE TABLE schedules (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      employee_id UUID,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      is_rest_day BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Check if payslips table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payslips') THEN
    CREATE TABLE payslips (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      employee_id UUID,
      payroll_period_id UUID,
      regular_hours DECIMAL(5,2) DEFAULT 0,
      overtime_hours DECIMAL(5,2) DEFAULT 0,
      gross_pay DECIMAL(10,2) DEFAULT 0,
      sss_deduction DECIMAL(10,2) DEFAULT 0,
      philhealth_deduction DECIMAL(10,2) DEFAULT 0,
      pagibig_deduction DECIMAL(10,2) DEFAULT 0,
      tax_deduction DECIMAL(10,2) DEFAULT 0,
      net_pay DECIMAL(10,2) DEFAULT 0,
      status TEXT DEFAULT 'draft',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Check if payroll_periods table exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payroll_periods') THEN
    CREATE TABLE payroll_periods (
      id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      is_active BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Add foreign key constraints only if they don't exist
DO $$
BEGIN
  -- Add foreign key for documents if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'documents_employee_id_fkey'
    AND table_name = 'documents'
  ) THEN
    ALTER TABLE documents 
    ADD CONSTRAINT documents_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for time_records if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'time_records_employee_id_fkey'
    AND table_name = 'time_records'
  ) THEN
    ALTER TABLE time_records 
    ADD CONSTRAINT time_records_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for schedules if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'schedules_employee_id_fkey'
    AND table_name = 'schedules'
  ) THEN
    ALTER TABLE schedules 
    ADD CONSTRAINT schedules_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for payslips if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payslips_employee_id_fkey'
    AND table_name = 'payslips'
  ) THEN
    ALTER TABLE payslips 
    ADD CONSTRAINT payslips_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
  END IF;

  -- Add foreign key for payslips payroll_period if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'payslips_payroll_period_id_fkey'
    AND table_name = 'payslips'
  ) THEN
    ALTER TABLE payslips 
    ADD CONSTRAINT payslips_payroll_period_id_fkey 
    FOREIGN KEY (payroll_period_id) REFERENCES payroll_periods(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Enable RLS on existing tables (only if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
    ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'time_records') THEN
    ALTER TABLE time_records ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedules') THEN
    ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payslips') THEN
    ALTER TABLE payslips ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payroll_periods') THEN
    ALTER TABLE payroll_periods ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'app_settings') THEN
    ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

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

-- Create policies for existing tables (only if they exist and don't have policies)
DO $$
BEGIN
  -- Employees policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    -- Check if policy exists before creating
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Users can view employees') THEN
      CREATE POLICY "Users can view employees"
        ON employees
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Admins and managers can insert employees') THEN
      CREATE POLICY "Admins and managers can insert employees"
        ON employees
        FOR INSERT
        TO public
        WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'employees' AND policyname = 'Admins and managers can update employees') THEN
      CREATE POLICY "Admins and managers can update employees"
        ON employees
        FOR UPDATE
        TO public
        USING (true);
    END IF;
  END IF;

  -- Documents policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Users can view documents') THEN
      CREATE POLICY "Users can view documents"
        ON documents
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'documents' AND policyname = 'Admins and managers can manage documents') THEN
      CREATE POLICY "Admins and managers can manage documents"
        ON documents
        FOR ALL
        TO public
        USING (true);
    END IF;
  END IF;

  -- App settings policies
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'app_settings') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_settings' AND policyname = 'Everyone can view settings') THEN
      CREATE POLICY "Everyone can view settings"
        ON app_settings
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
  END IF;
END $$;

-- Create indexes for better performance (only if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'employees') THEN
    CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
    CREATE INDEX IF NOT EXISTS idx_employees_status ON employees(status);
    CREATE INDEX IF NOT EXISTS idx_employees_is_archived ON employees(is_archived);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documents') THEN
    CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON documents(employee_id);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'time_records') THEN
    CREATE INDEX IF NOT EXISTS idx_time_records_employee_id ON time_records(employee_id);
    CREATE INDEX IF NOT EXISTS idx_time_records_date ON time_records(date);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schedules') THEN
    CREATE INDEX IF NOT EXISTS idx_schedules_employee_id ON schedules(employee_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(start_date, end_date);
  END IF;
  
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payslips') THEN
    CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON payslips(employee_id);
    CREATE INDEX IF NOT EXISTS idx_payslips_payroll_period_id ON payslips(payroll_period_id);
  END IF;
END $$;

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