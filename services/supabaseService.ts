import { supabase } from '../supabase';
import { Employee, AppSettings, EmployeeDocument, TimeLog, Schedule, Payroll, User } from '../types';

// --- Helper Functions ---
const mapToEmployee = (data: any): Employee => {
  return {
    id: data.id,
    employeeId: data.employee_id,
    firstName: data.first_name,
    lastName: data.last_name,
    profilePictureUrl: data.profile_picture_url,
    gender: data.gender,
    birthDate: data.birth_date,
    position: data.position,
    department: data.department,
    email: data.email,
    startDate: data.start_date,
    employeeType: data.employee_type,
    status: data.status,
    isArchived: data.is_archived,
    mobileNumber: data.mobile_number,
    address: data.address,
    emergencyContactName: data.emergency_contact_name,
    emergencyContactRelationship: data.emergency_contact_relationship,
    emergencyContactNumber: data.emergency_contact_number,
    tinNumber: data.tin_number,
    sssNumber: data.sss_number,
    philhealthNumber: data.philhealth_number,
    pagibigNumber: data.pagibig_number,
    paymentMethod: data.payment_method,
    bankName: data.bank_name,
    accountNumber: data.account_number,
    salaryType: data.salary_type,
    basicSalary: data.basic_salary,
    hourlyRate: data.hourly_rate,
    monthlyEquivalent: data.monthly_equivalent,
    overtimeMultiplier: data.overtime_multiplier,
    regularHolidayMultiplier: data.regular_holiday_multiplier,
    specialHolidayMultiplier: data.special_holiday_multiplier,
    restDayOvertimeMultiplier: data.rest_day_overtime_multiplier,
    sssDeduction: data.sss_deduction,
    philhealthDeduction: data.philhealth_deduction,
    hdmfDeduction: data.hdmf_deduction,
    createdAt: data.created_at ? new Date(data.created_at) : undefined,
    updatedAt: data.updated_at ? new Date(data.updated_at) : undefined,
  } as Employee;
};

const mapFromEmployee = (employee: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>) => {
  return {
    employee_id: employee.employeeId,
    first_name: employee.firstName,
    last_name: employee.lastName,
    profile_picture_url: employee.profilePictureUrl,
    gender: employee.gender,
    birth_date: employee.birthDate,
    position: employee.position,
    department: employee.department,
    email: employee.email,
    start_date: employee.startDate,
    employee_type: employee.employeeType,
    status: employee.status,
    is_archived: employee.isArchived,
    mobile_number: employee.mobileNumber,
    address: employee.address,
    emergency_contact_name: employee.emergencyContactName,
    emergency_contact_relationship: employee.emergencyContactRelationship,
    emergency_contact_number: employee.emergencyContactNumber,
    tin_number: employee.tinNumber,
    sss_number: employee.sssNumber,
    philhealth_number: employee.philhealthNumber,
    pagibig_number: employee.pagibigNumber,
    payment_method: employee.paymentMethod,
    bank_name: employee.bankName,
    account_number: employee.accountNumber,
    salary_type: employee.salaryType,
    basic_salary: employee.basicSalary,
    hourly_rate: employee.hourlyRate,
    monthly_equivalent: employee.monthlyEquivalent,
    overtime_multiplier: employee.overtimeMultiplier,
    regular_holiday_multiplier: employee.regularHolidayMultiplier,
    special_holiday_multiplier: employee.specialHolidayMultiplier,
    rest_day_overtime_multiplier: employee.restDayOvertimeMultiplier,
    sss_deduction: employee.sssDeduction,
    philhealth_deduction: employee.philhealthDeduction,
    hdmf_deduction: employee.hdmfDeduction,
  };
};

// --- Employee Services ---
export const getEmployees = async (): Promise<Employee[]> => {
  console.log("Supabase: Fetching employees");
  try {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('first_name');

    if (error) throw error;
    return data.map(mapToEmployee);
  } catch (error) {
    console.error("Error fetching employees from Supabase:", error);
    throw error;
  }
};

export const addEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> => {
  console.log("Supabase: Adding employee", employeeData);
  try {
    const dataToSave = mapFromEmployee(employeeData);
    const { data, error } = await supabase
      .from('employees')
      .insert(dataToSave)
      .select()
      .single();

    if (error) throw error;
    return mapToEmployee(data);
  } catch (error) {
    console.error("Error adding employee to Supabase:", error);
    throw error;
  }
};

export const updateEmployee = async (employeeData: Employee): Promise<Employee> => {
  console.log("Supabase: Updating employee", employeeData.id);
  try {
    const { id, createdAt, updatedAt, ...dataToUpdate } = employeeData;
    const updatePayload = mapFromEmployee(dataToUpdate);

    const { data, error } = await supabase
      .from('employees')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return mapToEmployee(data);
  } catch (error) {
    console.error("Error updating employee in Supabase:", error);
    throw error;
  }
};

export const archiveEmployee = async (employeeId: string): Promise<void> => {
  console.log("Supabase: Archiving employee", employeeId);
  try {
    const { error } = await supabase
      .from('employees')
      .update({ is_archived: true, status: 'Archived' })
      .eq('id', employeeId);

    if (error) throw error;
  } catch (error) {
    console.error("Error archiving employee in Supabase:", error);
    throw error;
  }
};

export const unarchiveEmployee = async (employeeId: string): Promise<void> => {
  console.log("Supabase: Unarchiving employee", employeeId);
  try {
    const { error } = await supabase
      .from('employees')
      .update({ is_archived: false, status: 'Active' })
      .eq('id', employeeId);

    if (error) throw error;
  } catch (error) {
    console.error("Error unarchiving employee in Supabase:", error);
    throw error;
  }
};

// --- App Settings Services ---
export const getAppSettings = async (): Promise<AppSettings> => {
  console.log("Supabase: Fetching app settings");
  const defaultSettings: AppSettings = {
    departments: ['Human Resources', 'Information Technology', 'Finance', 'Operations', 'Marketing'],
    positions: ['Manager', 'Developer', 'Analyst', 'Coordinator', 'Specialist'],
    employeeTypes: ['Regular', 'Contractual', 'Part-time', 'Probationary'],
    statuses: ['Active', 'Resigned', 'Terminated', 'On Leave'],
    documentTypes: ['Resume', 'Contract', 'ID Copy', 'Certificate', 'Other']
  };

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'main_config')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      // Initialize default settings
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({ 
          key: 'main_config', 
          category: 'system',
          value: defaultSettings,
          label: 'Main Application Configuration',
          is_active: true,
          sort_order: 1
        });
      
      if (insertError) throw insertError;
      return defaultSettings;
    }

    // Merge database settings with default settings to ensure all properties exist
    const databaseSettings = data.value as Partial<AppSettings>;
    return {
      departments: databaseSettings.departments || defaultSettings.departments,
      positions: databaseSettings.positions || defaultSettings.positions,
      employeeTypes: databaseSettings.employeeTypes || defaultSettings.employeeTypes,
      statuses: databaseSettings.statuses || defaultSettings.statuses,
      documentTypes: databaseSettings.documentTypes || defaultSettings.documentTypes
    };
  } catch (error) {
    console.error("Error fetching app settings from Supabase:", error);
    return defaultSettings;
  }
};

export const updateAppSettings = async (settingsData: AppSettings): Promise<AppSettings> => {
  console.log("Supabase: Updating app settings", settingsData);
  try {
    // First check if the record exists
    const { data: existingData, error: fetchError } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'main_config')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    // Use upsert to handle both insert and update cases
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        key: 'main_config', 
        category: 'system',
        value: settingsData,
        label: 'Main Application Configuration',
        is_active: true,
        sort_order: 1
      }, {
        onConflict: 'key'
      });

    if (error) throw error;
    console.log("Supabase: App settings updated successfully");
    return settingsData;
  } catch (error) {
    console.error("Error updating app settings in Supabase:", error);
    throw error;
  }
};

// --- Storage Services ---
export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
  console.log(`Supabase: Uploading file ${file.name} to ${path}`);
  try {
    const { data, error } = await supabase.storage
      .from('employee-files')
      .upload(path, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('employee-files')
      .getPublicUrl(path);

    return publicUrl;
  } catch (error) {
    console.error("Error uploading file to Supabase Storage:", error);
    throw error;
  }
};

// --- Document Management Services ---
export const getEmployeeDocuments = async (employeeId: string): Promise<EmployeeDocument[]> => {
  console.log("Supabase: Fetching documents for employeeId:", employeeId);
  try {
    const { data, error } = await supabase
      .from('employee_documents')
      .select('*')
      .eq('employee_id', employeeId)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;
    
    return data.map(doc => ({
      id: doc.id,
      employeeId: doc.employee_id,
      documentType: doc.document_type,
      fileName: doc.file_name,
      fileUrl: doc.file_url,
      uploadedAt: new Date(doc.uploaded_at)
    }));
  } catch (error) {
    console.error("Error fetching employee documents:", error);
    throw error;
  }
};

export const uploadEmployeeDocument = async (file: File, filePath: string): Promise<string> => {
  return uploadFileToStorage(file, filePath);
};

export const addDocumentMetadata = async (docData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>): Promise<EmployeeDocument> => {
  console.log("Supabase: Adding document metadata", docData);
  try {
    const { data, error } = await supabase
      .from('employee_documents')
      .insert({
        employee_id: docData.employeeId,
        document_type: docData.documentType,
        file_name: docData.fileName,
        file_url: docData.fileUrl,
      })
      .select()
      .single();

    if (error) throw error;
    
    return {
      id: data.id,
      employeeId: data.employee_id,
      documentType: data.document_type,
      fileName: data.file_name,
      fileUrl: data.file_url,
      uploadedAt: new Date(data.uploaded_at)
    };
  } catch (error) {
    console.error("Error adding document metadata:", error);
    throw error;
  }
};

export const deleteEmployeeDocument = async (docId: string, filePath?: string): Promise<void> => {
  console.log("Supabase: Deleting document", docId, "and file if path provided:", filePath);
  try {
    const { error } = await supabase
      .from('employee_documents')
      .delete()
      .eq('id', docId);

    if (error) throw error;

    if (filePath) {
      const { error: storageError } = await supabase.storage
        .from('employee-files')
        .remove([filePath]);
      
      if (storageError) {
        console.warn(`Could not delete storage file ${filePath}:`, storageError);
      }
    }
  } catch (error) {
    console.error("Error deleting document:", error);
    throw error;
  }
};

// --- Company Info Services ---
export const getCompanyInfo = async (): Promise<{ name: string; address: string; logoUrl: string; currency: string; }> => {
  console.log("Supabase: Fetching company info");
  const defaultInfo = { name: 'Your Company Name', address: '123 Business Rd', logoUrl: '', currency: '$' };

  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', 'company_info')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    
    if (!data) {
      const { error: insertError } = await supabase
        .from('app_settings')
        .insert({ 
          key: 'company_info', 
          category: 'system',
          value: defaultInfo,
          label: 'Company Information',
          is_active: true,
          sort_order: 2
        });
      
      if (insertError) throw insertError;
      return defaultInfo;
    }

    return data.value;
  } catch (error) {
    console.error("Error fetching company info from Supabase:", error);
    return defaultInfo;
  }
};

export const updateCompanyInfo = async (info: { name: string; address: string; logoUrl: string; currency: string; }): Promise<void> => {
  console.log("Supabase: Updating company info", info);
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        key: 'company_info', 
        category: 'system',
        value: info,
        label: 'Company Information',
        is_active: true,
        sort_order: 2
      });

    if (error) throw error;
  } catch (error) {
    console.error("Error updating company info in Supabase:", error);
    throw error;
  }
};

// --- User Profile Services ---
export const updateUserProfile = async (profileUpdates: { displayName?: string; email?: string; photoURL?: string }): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("No authenticated user found.");
  
  console.log("Supabase: Updating user profile for UID:", user.id, profileUpdates);
  
  try {
    // Update auth metadata
    const { error: authError } = await supabase.auth.updateUser({
      data: {
        display_name: profileUpdates.displayName,
        avatar_url: profileUpdates.photoURL,
      }
    });

    if (authError) throw authError;

    // Fetch existing profile to get current role
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Update profile table
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        display_name: profileUpdates.displayName,
        avatar_url: profileUpdates.photoURL,
        role: existingProfile?.role || 'authenticated',
      });

    if (profileError) throw profileError;
  } catch (error) {
    console.error("Error updating user profile in Supabase:", error);
    throw error;
  }
};

export const changeUserPassword = async (currentPassword: string, newPassword: string): Promise<void> => {
  console.log("Supabase: Attempting to change password");
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) throw error;
    console.log("Supabase: Password changed successfully.");
  } catch (error) {
    console.error("Error changing password in Supabase:", error);
    throw error;
  }
};

// --- TimeLog Services ---
export const getTimeLogs = async (filters?: { date?: string; employeeId?: string; startDate?: string; endDate?: string }): Promise<TimeLog[]> => {
  console.log("Supabase: Fetching time logs with filters:", filters);
  try {
    let query = supabase
      .from('time_logs')
      .select('*');

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    if (filters?.date) {
      const dayStart = `${filters.date}T00:00:00`;
      const dayEnd = `${filters.date}T23:59:59.999`;
      query = query.gte('timestamp', dayStart).lte('timestamp', dayEnd);
    } else if (filters?.startDate && filters?.endDate) {
      const periodStart = `${filters.startDate}T00:00:00`;
      const periodEnd = `${filters.endDate}T23:59:59.999`;
      query = query.gte('timestamp', periodStart).lte('timestamp', periodEnd);
    }

    query = query.order('timestamp', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return data.map(log => ({
      id: log.id,
      employeeId: log.employee_id,
      timestamp: new Date(log.timestamp),
      type: log.type,
      method: log.method
    }));
  } catch (error) {
    console.error("Error fetching time logs from Supabase:", error);
    throw error;
  }
};

export const addTimeLog = async (logData: Omit<TimeLog, 'id'>): Promise<TimeLog> => {
  console.log("Supabase: Adding time log", logData);
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .insert({
        employee_id: logData.employeeId,
        timestamp: logData.timestamp.toISOString(),
        type: logData.type,
        method: logData.method
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      employeeId: data.employee_id,
      timestamp: new Date(data.timestamp),
      type: data.type,
      method: data.method
    };
  } catch (error) {
    console.error("Error adding time log to Supabase:", error);
    throw error;
  }
};

export const updateTimeLog = async (logData: TimeLog): Promise<TimeLog> => {
  console.log("Supabase: Updating time log", logData.id);
  try {
    const { data, error } = await supabase
      .from('time_logs')
      .update({
        employee_id: logData.employeeId,
        timestamp: logData.timestamp.toISOString(),
        type: logData.type,
        method: logData.method
      })
      .eq('id', logData.id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      employeeId: data.employee_id,
      timestamp: new Date(data.timestamp),
      type: data.type,
      method: data.method
    };
  } catch (error) {
    console.error("Error updating time log in Supabase:", error);
    throw error;
  }
};

export const forceClockOutEmployee = async (employeeId: string): Promise<void> => {
  console.log("Supabase: Force clock out for employee", employeeId);
  try {
    const logData: Omit<TimeLog, 'id'> = {
      employeeId: employeeId,
      timestamp: new Date(),
      type: 'Clock Out',
      method: 'Forced Manual'
    };
    await addTimeLog(logData);
    console.log("Supabase: Added forced clock out log for", employeeId);
  } catch (error) {
    console.error("Error forcing clock out in Supabase:", error);
    throw error;
  }
};

// --- Schedule Services ---
export const getSchedules = async (filters?: { date?: string; view?: 'daily' | 'monthly'; employeeId?: string }): Promise<Schedule[]> => {
  console.log("Supabase: Fetching schedules with filters:", filters);
  try {
    let query = supabase
      .from('schedules')
      .select('*');

    if (filters?.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    if (filters?.date) {
      if (filters.view === 'daily') {
        query = query.eq('start_date', filters.date);
      } else if (filters.view === 'monthly') {
        const monthStart = filters.date.substring(0, 7) + "-01";
        const tempDate = new Date(filters.date.substring(0, 7) + "-01T00:00:00");
        const monthEnd = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).toISOString().split('T')[0];
        query = query.gte('start_date', monthStart).lte('start_date', monthEnd);
      }
    }

    query = query.order('start_date', { ascending: true }).order('start_time', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    return data.map(schedule => ({
      id: schedule.id,
      employeeId: schedule.employee_id,
      date: schedule.start_date,
      shiftStartTime: schedule.start_time,
      shiftEndTime: schedule.end_time,
      notes: schedule.notes
    }));
  } catch (error) {
    console.error("Error fetching schedules from Supabase:", error);
    throw error;
  }
};

export const addSchedule = async (scheduleData: Omit<Schedule, 'id'>): Promise<Schedule> => {
  console.log("Supabase: Adding schedule", scheduleData);
  try {
    const { data, error } = await supabase
      .from('schedules')
      .insert({
        employee_id: scheduleData.employeeId,
        start_date: scheduleData.date,
        end_date: scheduleData.date,
        start_time: scheduleData.shiftStartTime,
        end_time: scheduleData.shiftEndTime,
        notes: scheduleData.notes
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      employeeId: data.employee_id,
      date: data.start_date,
      shiftStartTime: data.start_time,
      shiftEndTime: data.end_time,
      notes: data.notes
    };
  } catch (error) {
    console.error("Error adding schedule to Supabase:", error);
    throw error;
  }
};

export const addBulkSchedules = async (schedulesData: Array<Omit<Schedule, 'id'>>): Promise<Schedule[]> => {
  console.log("Supabase: Adding bulk schedules", schedulesData.length);
  try {
    const insertData = schedulesData.map(schedule => ({
      employee_id: schedule.employeeId,
      start_date: schedule.date,
      end_date: schedule.date,
      start_time: schedule.shiftStartTime,
      end_time: schedule.shiftEndTime,
      notes: schedule.notes
    }));

    const { data, error } = await supabase
      .from('schedules')
      .insert(insertData)
      .select();

    if (error) throw error;

    return data.map(schedule => ({
      id: schedule.id,
      employeeId: schedule.employee_id,
      date: schedule.start_date,
      shiftStartTime: schedule.start_time,
      shiftEndTime: schedule.end_time,
      notes: schedule.notes
    }));
  } catch (error) {
    console.error("Error adding bulk schedules to Supabase:", error);
    throw error;
  }
};

export const updateSchedule = async (scheduleData: Schedule): Promise<Schedule> => {
  console.log("Supabase: Updating schedule", scheduleData.id);
  try {
    const { data, error } = await supabase
      .from('schedules')
      .update({
        employee_id: scheduleData.employeeId,
        start_date: scheduleData.date,
        end_date: scheduleData.date,
        start_time: scheduleData.shiftStartTime,
        end_time: scheduleData.shiftEndTime,
        notes: scheduleData.notes
      })
      .eq('id', scheduleData.id)
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      employeeId: data.employee_id,
      date: data.start_date,
      shiftStartTime: data.start_time,
      shiftEndTime: data.end_time,
      notes: data.notes
    };
  } catch (error) {
    console.error("Error updating schedule in Supabase:", error);
    throw error;
  }
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
  console.log("Supabase: Deleting schedule", scheduleId);
  try {
    const { error } = await supabase
      .from('schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) throw error;
  } catch (error) {
    console.error("Error deleting schedule from Supabase:", error);
    throw error;
  }
};

// --- Payroll Services ---
export const getPayrolls = async (filters: { payPeriodStart: string; payPeriodEnd: string; employeeId?: string }): Promise<Payroll[]> => {
  console.log("Supabase: Fetching payrolls with filters:", filters);
  try {
    let query = supabase
      .from('payrolls')
      .select('*')
      .gte('pay_period_start', filters.payPeriodStart)
      .lte('pay_period_end', filters.payPeriodEnd)
      .order('pay_period_start', { ascending: false });

    if (filters.employeeId) {
      query = query.eq('employee_id', filters.employeeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return data.map(payroll => ({
      id: payroll.id,
      employeeId: payroll.employee_id,
      payPeriodStart: payroll.pay_period_start,
      payPeriodEnd: payroll.pay_period_end,
      payDateIssued: payroll.pay_date_issued,
      grossPay: payroll.gross_pay,
      deductions: payroll.deductions,
      netPay: payroll.net_pay,
      createdAt: new Date(payroll.created_at)
    }));
  } catch (error) {
    console.error("Error fetching payrolls from Supabase:", error);
    throw error;
  }
};

export const addSinglePayslip = async (payslipData: Omit<Payroll, 'id' | 'createdAt'>): Promise<Payroll> => {
  console.log("Supabase: Adding single payslip", payslipData);
  try {
    const { data, error } = await supabase
      .from('payrolls')
      .upsert({
        employee_id: payslipData.employeeId,
        pay_period_start: payslipData.payPeriodStart,
        pay_period_end: payslipData.payPeriodEnd,
        pay_date_issued: payslipData.payDateIssued,
        gross_pay: payslipData.grossPay,
        deductions: payslipData.deductions,
        net_pay: payslipData.netPay
      }, {
        onConflict: 'employee_id,pay_period_start,pay_period_end'
      })
      .select()
      .single();

    if (error) throw error;

    return {
      id: data.id,
      employeeId: data.employee_id,
      payPeriodStart: data.pay_period_start,
      payPeriodEnd: data.pay_period_end,
      payDateIssued: data.pay_date_issued,
      grossPay: data.gross_pay,
      deductions: data.deductions,
      netPay: data.net_pay,
      createdAt: new Date(data.created_at)
    };
  } catch (error) {
    console.error("Error adding single payslip to Supabase:", error);
    throw error;
  }
};

export const createPayroll = async (params: { payPeriodStart: string; payPeriodEnd: string }): Promise<void> => {
  console.log("Supabase: Creating payroll run for period", params);
  try {
    const { data: activeEmployees, error: empError } = await supabase
      .from('employees')
      .select('*')
      .eq('is_archived', false)
      .eq('status', 'Active');

    if (empError) throw empError;

    const payrollEntries = activeEmployees.map(emp => {
      // Simplified payroll calculation
      let grossPay = 0;
      if (emp.salary_type === 'Monthly') {
        grossPay = emp.basic_salary;
      } else if (emp.salary_type === 'Daily') {
        grossPay = emp.basic_salary * 22;
      } else {
        grossPay = (emp.hourly_rate || emp.basic_salary / 8) * 22 * 8;
      }

      const totalDeductions = (emp.sss_deduction || 0) + (emp.philhealth_deduction || 0) + (emp.hdmf_deduction || 0);
      const netPay = grossPay - totalDeductions;

      return {
        employee_id: emp.employee_id,
        pay_period_start: params.payPeriodStart,
        pay_period_end: params.payPeriodEnd,
        pay_date_issued: new Date().toISOString().split('T')[0],
        gross_pay: parseFloat(grossPay.toFixed(2)),
        deductions: parseFloat(totalDeductions.toFixed(2)),
        net_pay: parseFloat(netPay.toFixed(2))
      };
    });

    const { error } = await supabase
      .from('payrolls')
      .upsert(payrollEntries, {
        onConflict: 'employee_id,pay_period_start,pay_period_end'
      });

    if (error) throw error;
    console.log("Supabase: Payroll run completed successfully");
  } catch (error) {
    console.error("Error creating payroll run in Supabase:", error);
    throw error;
  }
};

// --- Report Generation ---
export const generateReport = async (reportType: string, dateRange: { start: string, end: string }): Promise<any[]> => {
  console.log("Supabase: Generating report:", reportType, "for range:", dateRange);

  try {
    switch (reportType) {
      case 'payroll_summary':
        const { data: payrolls, error: payrollError } = await supabase
          .from('payrolls')
          .select(`
            *,
            employees!inner(employee_id, first_name, last_name)
          `)
          .gte('pay_period_start', dateRange.start)
          .lte('pay_period_end', dateRange.end);

        if (payrollError) throw payrollError;

        return payrolls.map(p => ({
          EmployeeID: p.employee_id,
          Name: `${p.employees.first_name} ${p.employees.last_name}`,
          GrossPay: p.gross_pay.toFixed(2),
          Deductions: p.deductions.toFixed(2),
          NetPay: p.net_pay.toFixed(2),
          PayPeriod: `${p.pay_period_start} to ${p.pay_period_end}`,
          PayDate: p.pay_date_issued || 'N/A'
        }));

      case 'attendance_overview':
        const { data: timeLogs, error: timeLogError } = await supabase
          .from('time_logs')
          .select(`
            *,
            employees!inner(employee_id, first_name, last_name)
          `)
          .gte('timestamp', `${dateRange.start}T00:00:00`)
          .lte('timestamp', `${dateRange.end}T23:59:59.999`)
          .order('timestamp', { ascending: true });

        if (timeLogError) throw timeLogError;

        return timeLogs.map(tl => ({
          EmployeeID: tl.employee_id,
          Name: `${tl.employees.first_name} ${tl.employees.last_name}`,
          Timestamp: new Date(tl.timestamp).toLocaleString(),
          Type: tl.type,
          Method: tl.method
        }));

      case 'employee_masterlist':
        const { data: allEmployees, error: empError } = await supabase
          .from('employees')
          .select('*')
          .order('first_name');

        if (empError) throw empError;

        return allEmployees.map(e => ({
          EmployeeID: e.employee_id,
          FirstName: e.first_name,
          LastName: e.last_name,
          Position: e.position,
          Department: e.department,
          Email: e.email,
          Status: e.status,
          StartDate: e.start_date,
          IsArchived: e.is_archived,
        }));

      case 'leave_balances':
        const { data: activeEmployees, error: activeEmpError } = await supabase
          .from('employees')
          .select('*')
          .eq('is_archived', false)
          .order('first_name');

        if (activeEmpError) throw activeEmpError;

        return activeEmployees.map(e => ({
          EmployeeID: e.employee_id,
          Name: `${e.first_name} ${e.last_name}`,
          Department: e.department,
          VacationLeaveBalance: 10,
          SickLeaveBalance: 5,
        }));

      default:
        console.warn(`Report type '${reportType}' not implemented in Supabase service.`);
        return [{ message: `Report type '${reportType}' mock data not implemented.` }];
    }
  } catch (error) {
    console.error(`Error generating report '${reportType}' from Supabase:`, error);
    throw error;
  }
};