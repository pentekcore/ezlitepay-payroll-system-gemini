
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  profilePictureUrl?: string;
  role?: string; // For admin or other roles
  createdAt?: Date; // When the user record (Firestore part) was created
  // Add other user-specific fields if needed
}

export interface Employee {
  id: string; // Firestore document ID
  employeeId: string; // Custom employee ID
  firstName: string;
  lastName: string;
  profilePictureUrl?: string;
  gender: 'Male' | 'Female' | 'Other' | '';
  birthDate: string; // Consider storing as ISO string or Firebase Timestamp
  position: string;
  department: string;
  email: string;
  startDate: string; // Consider storing as ISO string or Firebase Timestamp
  employeeType: string; // e.g., Full-time, Part-time, Contract
  status: string; // e.g., Active, On Leave, Resigned, Terminated
  isArchived: boolean;

  // Contact Information
  mobileNumber: string;
  address: string;

  // Emergency Contact
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;

  // Government IDs
  tinNumber?: string;
  sssNumber?: string;
  philhealthNumber?: string;
  pagibigNumber?: string;

  // Payment Information
  paymentMethod: 'Bank Transfer' | 'Cash' | 'Check' | '';
  bankName?: string;
  accountNumber?: string;

  // Salary Information
  salaryType: 'Monthly' | 'Daily' | '';
  basicSalary: number; // If Monthly, this is the monthly salary. If Daily, this is the daily rate.
  hourlyRate?: number; // Optional, can be derived
  monthlyEquivalent?: number; // Auto-calculated if salaryType is Daily (basicSalary * 22)

  // Pay Rate Multipliers
  overtimeMultiplier?: number;
  regularHolidayMultiplier?: number;
  specialHolidayMultiplier?: number;
  restDayOvertimeMultiplier?: number;

  // Standard Deductions
  sssDeduction?: number;
  philhealthDeduction?: number;
  hdmfDeduction?: number;

  // Timestamps
  createdAt?: any; // Firebase ServerTimestamp
  updatedAt?: any; // Firebase ServerTimestamp
}

export interface EmployeeDocument {
  id: string; // Firestore document ID
  employeeId: string;
  documentType: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: any; // Firebase ServerTimestamp
}

export interface AppSettings {
  companyName?: string;
  companyAddress?: string;
  companyLogoUrl?: string;
  currencySymbol?: string;
  departments: string[];
  positions: string[];
  employeeTypes: string[];
  statuses: string[]; // Employee statuses
  documentTypes: string[]; // For employee documents
}

// Placeholder for TimeLog, Schedule, Payroll, etc.
export interface TimeLog {
  id: string;
  employeeId: string;
  timestamp: Date; 
  type: 'Clock In' | 'Clock Out';
  method: 'QR' | 'Manual' | 'Forced Manual';
}

export interface Schedule {
  id: string;
  employeeId: string;
  date: string; // ISO Date string
  shiftStartTime: string; // HH:mm
  shiftEndTime: string; // HH:mm
  notes?: string;
}

export interface Payroll {
  id: string;
  employeeId: string;
  payPeriodStart: string;
  payPeriodEnd: string;
  payDateIssued?: string; // Date the payslip was issued/paid
  grossPay: number;
  deductions: number;
  netPay: number;
  payslipUrl?: string; // Link to generated payslip in Storage
  createdAt: any;
  // Optional: store detailed breakdown if needed, or link to a separate detailed record
  // workDays?: WorkDayEntry[]; 
  // earningsBreakdown?: Record<string, number>;
  // deductionsBreakdown?: Record<string, number>;
}

export enum ModalMode {
  ADD = 'add',
  EDIT = 'edit',
  VIEW = 'view',
}

export interface WorkDayEntry {
  id: string; // Could be date string or a unique ID
  date: string; // YYYY-MM-DD
  regHrs: number;
  otHrs: number;
  regHolHrs: number;
  specHolHrs: number;
  isRestDay: boolean;
  notes?: string;
}