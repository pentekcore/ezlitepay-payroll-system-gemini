/*
  # Create time_logs table

  1. New Tables
    - `time_logs`
      - `id` (uuid, primary key)
      - `employee_id` (text, references employees.employee_id)
      - `timestamp` (timestamptz)
      - `type` (text, Clock In/Clock Out)
      - `method` (text, default Manual)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `time_logs` table
    - Add policies for authenticated users to manage time logs

  3. Performance
    - Add indexes for employee_id, timestamp, and type
    - Add date-based index using date truncation
*/

-- Create time_logs table
CREATE TABLE IF NOT EXISTS time_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Clock In', 'Clock Out')),
  method TEXT NOT NULL DEFAULT 'Manual',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add foreign key constraint to employees table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'time_logs_employee_id_fkey'
    AND table_name = 'time_logs'
  ) THEN
    ALTER TABLE time_logs 
    ADD CONSTRAINT time_logs_employee_id_fkey 
    FOREIGN KEY (employee_id) REFERENCES employees(employee_id) ON DELETE CASCADE;
  END IF;
END $$;

-- Enable Row Level Security
ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for time_logs
CREATE POLICY "Authenticated users can view time logs"
  ON time_logs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert time logs"
  ON time_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update time logs"
  ON time_logs
  FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete time logs"
  ON time_logs
  FOR DELETE
  TO authenticated
  USING (true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_time_logs_employee_id ON time_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_timestamp ON time_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_time_logs_type ON time_logs(type);
-- Use date_trunc instead of DATE() function for immutable date indexing
CREATE INDEX IF NOT EXISTS idx_time_logs_date ON time_logs(date_trunc('day', timestamp));