import { db, storage, auth } from '../firebase'; // Actual Firebase init file
import { 
    collection, addDoc, updateDoc, doc, getDocs, query, where, arrayUnion, arrayRemove, 
    deleteDoc, serverTimestamp, getDoc, setDoc, Timestamp, writeBatch, orderBy, limit, startAfter, FieldPath, WhereFilterOp, QueryConstraint
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
// Corrected Firebase Auth import for v9
import { EmailAuthProvider } from 'firebase/auth';

import { Employee, AppSettings, EmployeeDocument, TimeLog, Schedule, Payroll, User } from '../types';

const MOCK_DELAY_FOR_NON_FIREBASE_SIMULATION = 500; // Only if not using Firebase (should be removed)

// --- Helper Functions ---
const convertTimestamps = (data: any): any => {
    if (data && typeof data.toDate === 'function') { // Check if it's a Firestore Timestamp
        return data.toDate();
    }
    if (Array.isArray(data)) {
        return data.map(convertTimestamps);
    }
    if (typeof data === 'object' && data !== null) {
        const res: { [key: string]: any } = {};
        for (const key in data) {
            res[key] = convertTimestamps(data[key]);
        }
        return res;
    }
    return data;
};

const mapToEmployee = (docSnap: any): Employee => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        birthDate: data.birthDate ? (data.birthDate instanceof Timestamp ? data.birthDate.toDate().toISOString().split('T')[0] : data.birthDate) : '',
        startDate: data.startDate ? (data.startDate instanceof Timestamp ? data.startDate.toDate().toISOString().split('T')[0] : data.startDate) : '',
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : undefined),
        updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : undefined),
    } as Employee;
};


// --- Employee Services ---
export const getEmployees = async (): Promise<Employee[]> => {
  console.log("Firebase: Fetching employees");
  try {
    const employeesCol = collection(db, "employees");
    const employeeSnapshot = await getDocs(query(employeesCol, orderBy("firstName")));
    const employeeList = employeeSnapshot.docs.map(docSnap => mapToEmployee(docSnap));
    return employeeList;
  } catch (error) {
    console.error("Error fetching employees from Firebase:", error);
    throw error;
  }
};

export const addEmployee = async (employeeData: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>): Promise<Employee> => {
  console.log("Firebase: Adding employee", employeeData);
  try {
    const dataToSave = {
        ...employeeData,
        birthDate: employeeData.birthDate ? Timestamp.fromDate(new Date(employeeData.birthDate)) : null,
        startDate: employeeData.startDate ? Timestamp.fromDate(new Date(employeeData.startDate)) : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };
    const docRef = await addDoc(collection(db, "employees"), dataToSave);
    return { ...employeeData, id: docRef.id, createdAt: new Date(), updatedAt: new Date() } as Employee; // Approximate
  } catch (error) {
    console.error("Error adding employee to Firebase:", error);
    throw error;
  }
};

export const updateEmployee = async (employeeData: Employee): Promise<Employee> => {
  console.log("Firebase: Updating employee", employeeData.id);
  try {
    const empDocRef = doc(db, "employees", employeeData.id);
    const { id, createdAt, ...dataToUpdate } = employeeData; // Exclude id and createdAt

    const updatePayload: Record<string, any> = {
        ...dataToUpdate,
        birthDate: employeeData.birthDate ? Timestamp.fromDate(new Date(employeeData.birthDate)) : null,
        startDate: employeeData.startDate ? Timestamp.fromDate(new Date(employeeData.startDate)) : null,
        updatedAt: serverTimestamp()
    };
    await updateDoc(empDocRef, updatePayload);
    return { ...employeeData, updatedAt: new Date() } as Employee; // Approximate
  } catch (error) {
    console.error("Error updating employee in Firebase:", error);
    throw error;
  }
};

export const archiveEmployee = async (employeeId: string): Promise<void> => {
  console.log("Firebase: Archiving employee", employeeId);
  try {
    const empDocRef = doc(db, "employees", employeeId);
    await updateDoc(empDocRef, { isArchived: true, status: 'Archived', updatedAt: serverTimestamp() });
  } catch (error) {
    console.error("Error archiving employee in Firebase:", error);
    throw error;
  }
};

export const unarchiveEmployee = async (employeeId: string): Promise<void> => {
  console.log("Firebase: Unarchiving employee", employeeId);
  try {
    const empDocRef = doc(db, "employees", employeeId);
    await updateDoc(empDocRef, { isArchived: false, status: 'Active', updatedAt: serverTimestamp() });
  } catch (error) {
    console.error("Error unarchiving employee in Firebase:", error);
    throw error;
  }
};

// --- App Settings Services ---
const APP_SETTINGS_DOC_ID = "appConfiguration";
const COMPANY_INFO_DOC_ID = "companyProfile"; // Or integrate into appConfiguration

export const getAppSettings = async (): Promise<AppSettings> => {
  console.log("Firebase: Fetching app settings");
  const defaultOfflineSettings: AppSettings = {
    departments: ['Default Dept (Offline)'], positions: ['Default Pos (Offline)'],
    employeeTypes: ['Full-time (Offline)'], statuses: ['Active (Offline)'], documentTypes: ['General (Offline)']
  };
  try {
    const docRef = doc(db, "settings", APP_SETTINGS_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestamps(docSnap.data()) as AppSettings;
    } else {
      // Default settings if not found
      const defaultSettings: AppSettings = {
        departments: ['Default Department'], positions: ['Default Position'], 
        employeeTypes: ['Full-time'], statuses: ['Active'], documentTypes: ['General']
      };
      await setDoc(docRef, defaultSettings); // Initialize if doesn't exist
      return defaultSettings;
    }
  } catch (error) {
    console.error("Error fetching app settings from Firebase:", error);
    if (error instanceof Error && (error.message.includes("offline") || error.message.includes("unavailable"))) {
        console.warn("Client is offline. Using default app settings.");
        return defaultOfflineSettings;
    }
    throw error;
  }
};

export const updateAppSettings = async (settingsData: AppSettings): Promise<AppSettings> => {
  console.log("Firebase: Updating app settings", settingsData);
  try {
    const docRef = doc(db, "settings", APP_SETTINGS_DOC_ID);
    await setDoc(docRef, settingsData, { merge: true }); // Use setDoc with merge to create if not exists or update
    return settingsData;
  } catch (error) {
    console.error("Error updating app settings in Firebase:", error);
    throw error;
  }
};


// --- Storage Services ---
export const uploadFileToStorage = async (file: File, path: string): Promise<string> => {
  console.log(`Firebase: Uploading file ${file.name} to ${path}`);
  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Error uploading file to Firebase Storage:", error);
    throw error;
  }
};

// --- Document Management Services ---
export const getEmployeeDocuments = async (employeeIdParam: string): Promise<EmployeeDocument[]> => {
    console.log("Firebase: Fetching documents for employeeId:", employeeIdParam);
    try {
        const q = query(collection(db, "employeeDocuments"), where("employeeId", "==", employeeIdParam), orderBy("uploadedAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                uploadedAt: data.uploadedAt instanceof Timestamp ? data.uploadedAt.toDate() : new Date(data.uploadedAt)
            } as EmployeeDocument;
        });
    } catch (error) {
        console.error("Error fetching employee documents:", error);
        throw error;
    }
};

export const uploadEmployeeDocument = async (file: File, filePath: string): Promise<string> => {
    return uploadFileToStorage(file, filePath);
};

export const addDocumentMetadata = async (docData: Omit<EmployeeDocument, 'id' | 'uploadedAt'>): Promise<EmployeeDocument> => {
    console.log("Firebase: Adding document metadata", docData);
    try {
        const dataToSave = { ...docData, uploadedAt: serverTimestamp() };
        const docRef = await addDoc(collection(db, "employeeDocuments"), dataToSave);
        return { ...docData, id: docRef.id, uploadedAt: new Date() } as EmployeeDocument; // Approximate for client
    } catch (error) {
        console.error("Error adding document metadata:", error);
        throw error;
    }
};

export const deleteEmployeeDocument = async (docId: string, filePath?: string): Promise<void> => {
    console.log("Firebase: Deleting document metadata", docId, "and file if path provided:", filePath);
    try {
        await deleteDoc(doc(db, "employeeDocuments", docId));
        if (filePath) {
          const fileRef = ref(storage, filePath);
          await deleteObject(fileRef).catch(err => console.warn(`Could not delete storage file ${filePath}:`, err.code === 'storage/object-not-found' ? 'File not found.' : err));
        }
    } catch (error) {
        console.error("Error deleting document:", error);
        throw error;
    }
};


// --- User Profile and Company Info (within settings or separate collection) ---
export const getCompanyInfo = async (): Promise<{ name: string; address: string; logoUrl: string; currency: string; }> => {
  console.log("Firebase: Fetching company info");
  const defaultOfflineInfo = { name: 'Company (Offline)', address: 'N/A', logoUrl: '', currency: '$' };
  try {
    const docRef = doc(db, "settings", COMPANY_INFO_DOC_ID);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return convertTimestamps(docSnap.data()) as { name: string; address: string; logoUrl: string; currency: string; };
    } else {
      const defaultInfo = { name: 'Your Company Name', address: '123 Business Rd', logoUrl: '', currency: '$' };
      await setDoc(docRef, defaultInfo);
      return defaultInfo;
    }
  } catch (error) {
    console.error("Error fetching company info from Firebase:", error);
     if (error instanceof Error && (error.message.includes("offline") || error.message.includes("unavailable"))) {
        console.warn("Client is offline. Using default company info.");
        return defaultOfflineInfo;
    }
    throw error;
  }
};

export const updateCompanyInfo = async (info: { name: string; address: string; logoUrl: string; currency: string; }): Promise<void> => {
  console.log("Firebase: Updating company info", info);
  try {
    const docRef = doc(db, "settings", COMPANY_INFO_DOC_ID);
    await setDoc(docRef, info, { merge: true });
  } catch (error) {
    console.error("Error updating company info in Firebase:", error);
    throw error;
  }
};

export const updateUserProfile = async (profileUpdates: { displayName?: string; email?: string; photoURL?: string }): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("No authenticated user found.");
  console.log("Firebase: Updating user profile for UID:", currentUser.uid, profileUpdates);
  
  try {
    // Update Firebase Auth profile
    await currentUser.updateProfile({ // Use currentUser.updateProfile
      displayName: profileUpdates.displayName,
      photoURL: profileUpdates.photoURL,
      // Note: Email update is more complex, requires re-authentication usually, and is not directly handled here.
    });

    // Update user document in Firestore (optional, if you store user data there)
    const userDocRef = doc(db, "users", currentUser.uid);
    const updatesForFirestore: Record<string, any> = { updatedAt: serverTimestamp() };
    if (profileUpdates.displayName) updatesForFirestore.displayName = profileUpdates.displayName;
    if (profileUpdates.photoURL) updatesForFirestore.profilePictureUrl = profileUpdates.photoURL; // Assuming field name consistency

    await setDoc(userDocRef, updatesForFirestore, { merge: true });
    
  } catch (error) {
    console.error("Error updating user profile in Firebase:", error);
    throw error;
  }
};

export const changeUserPassword = async (currentPassword_param: string, newPassword_param: string): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || !currentUser.email) throw new Error("No authenticated user with email found.");
  console.log("Firebase: Attempting to change password for user:", currentUser.email);
  try {
    const credential = EmailAuthProvider.credential(currentUser.email, currentPassword_param);
    await currentUser.reauthenticateWithCredential(credential); // Use currentUser.reauthenticateWithCredential
    await currentUser.updatePassword(newPassword_param); // Use currentUser.updatePassword
    console.log("Firebase: Password changed successfully.");
  } catch (error) {
    console.error("Error changing password in Firebase:", error);
    throw error; // Let the UI handle specific error messages (e.g., wrong current password)
  }
};

// --- TimeLog Services ---
export const getTimeLogs = async (filters?: { date?: string; employeeId?: string; startDate?: string; endDate?: string }): Promise<TimeLog[]> => {
    console.log("Firebase: Fetching time logs with filters:", filters);
    try {
        const timeLogsCol = collection(db, "timeLogs");
        const queryConstraints: QueryConstraint[] = [];

        if (filters?.employeeId) {
            queryConstraints.push(where("employeeId", "==", filters.employeeId));
        }

        if (filters?.date) {
            const dayStart = Timestamp.fromDate(new Date(filters.date + "T00:00:00"));
            const dayEnd = Timestamp.fromDate(new Date(filters.date + "T23:59:59.999"));
            queryConstraints.push(where("timestamp", ">=", dayStart));
            queryConstraints.push(where("timestamp", "<=", dayEnd));
        } else if (filters?.startDate && filters?.endDate) {
            const periodStart = Timestamp.fromDate(new Date(filters.startDate + "T00:00:00"));
            const periodEnd = Timestamp.fromDate(new Date(filters.endDate + "T23:59:59.999"));
            queryConstraints.push(where("timestamp", ">=", periodStart));
            queryConstraints.push(where("timestamp", "<=", periodEnd));
        }
        
        queryConstraints.push(orderBy("timestamp", "asc")); // Always sort by time

        const q = query(timeLogsCol, ...queryConstraints);
        const snapshot = await getDocs(q);
        
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                timestamp: (data.timestamp as Timestamp).toDate() // Convert Firestore Timestamp to JS Date
            } as TimeLog;
        });
    } catch (error) {
        console.error("Error fetching time logs from Firebase:", error);
        throw error;
    }
};

export const addTimeLog = async (logData: Omit<TimeLog, 'id'>): Promise<TimeLog> => {
    console.log("Firebase: Adding time log", logData);
    try {
        const dataToSave = {
            ...logData,
            timestamp: Timestamp.fromDate(logData.timestamp as Date) // Expect JS Date, convert to FS Timestamp
        };
        const docRef = await addDoc(collection(db, "timeLogs"), dataToSave);
        // Return with JS Date for consistency in app state
        return { ...logData, id: docRef.id, timestamp: logData.timestamp } as TimeLog;
    } catch (error) {
        console.error("Error adding time log to Firebase:", error);
        throw error;
    }
};

export const updateTimeLog = async (logData: TimeLog): Promise<TimeLog> => {
    console.log("Firebase: Updating time log", logData.id);
    try {
        const logDocRef = doc(db, "timeLogs", logData.id);
        const { id, ...dataToUpdate } = logData;
        const updatePayload = {
            ...dataToUpdate,
             timestamp: Timestamp.fromDate(logData.timestamp as Date) // Expect JS Date, convert to FS Timestamp
        };
        await updateDoc(logDocRef, updatePayload);
        return logData; // Return with JS Date
    } catch (error) {
        console.error("Error updating time log in Firebase:", error);
        throw error;
    }
};

export const forceClockOutEmployee = async (employeeId: string): Promise<void> => {
  console.log("Firebase: Force clock out for employee", employeeId);
  try {
    const logData: Omit<TimeLog, 'id'> = {
      employeeId: employeeId,
      timestamp: new Date(), // Use JS Date, addTimeLog will convert
      type: 'Clock Out',
      method: 'Forced Manual'
    };
    await addTimeLog(logData);
    console.log("Firebase: Added forced clock out log for", employeeId);
  } catch (error) {
    console.error("Error forcing clock out in Firebase:", error);
    throw error;
  }
};


// --- Schedule Services ---
export const getSchedules = async (filters?: { date?: string; view?: 'daily' | 'monthly'; employeeId?: string }): Promise<Schedule[]> => {
    console.log("Firebase: Fetching schedules with filters:", filters);
    try {
        const schedulesCol = collection(db, "schedules");
        const queryConstraints: QueryConstraint[] = [];

        if (filters?.employeeId) {
            queryConstraints.push(where("employeeId", "==", filters.employeeId));
        }
        if (filters?.date) {
            if (filters.view === 'daily') {
                queryConstraints.push(where("date", "==", filters.date));
            } else if (filters.view === 'monthly') {
                const monthStart = filters.date.substring(0, 7) + "-01";
                const tempDate = new Date(filters.date.substring(0, 7) + "-01T00:00:00"); // Ensure local interpretation
                const monthEnd = new Date(tempDate.getFullYear(), tempDate.getMonth() + 1, 0).toISOString().split('T')[0];
                queryConstraints.push(where("date", ">=", monthStart));
                queryConstraints.push(where("date", "<=", monthEnd));
            }
        }
        queryConstraints.push(orderBy("date", "asc"), orderBy("shiftStartTime", "asc"));

        const q = query(schedulesCol, ...queryConstraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Schedule));
    } catch (error) {
        console.error("Error fetching schedules from Firebase:", error);
        throw error;
    }
};

export const addSchedule = async (scheduleData: Omit<Schedule, 'id'>): Promise<Schedule> => {
    console.log("Firebase: Adding schedule", scheduleData);
    try {
        const docRef = await addDoc(collection(db, "schedules"), scheduleData);
        return { ...scheduleData, id: docRef.id } as Schedule;
    } catch (error) {
        console.error("Error adding schedule to Firebase:", error);
        throw error;
    }
};

export const addBulkSchedules = async (schedulesData: Array<Omit<Schedule, 'id'>>): Promise<Schedule[]> => {
    console.log("Firebase: Adding bulk schedules", schedulesData.length);
    const batch = writeBatch(db);
    const newSchedules: Schedule[] = [];
    try {
        schedulesData.forEach(scheduleItem => {
            const docRef = doc(collection(db, "schedules")); // Auto-generate ID
            batch.set(docRef, scheduleItem);
            newSchedules.push({ ...scheduleItem, id: docRef.id } as Schedule);
        });
        await batch.commit();
        return newSchedules;
    } catch (error) {
        console.error("Error adding bulk schedules to Firebase:", error);
        throw error;
    }
};

export const updateSchedule = async (scheduleData: Schedule): Promise<Schedule> => {
    console.log("Firebase: Updating schedule", scheduleData.id);
    try {
        const schedDocRef = doc(db, "schedules", scheduleData.id);
        const { id, ...dataToUpdate } = scheduleData;
        await updateDoc(schedDocRef, dataToUpdate);
        return scheduleData;
    } catch (error) {
        console.error("Error updating schedule in Firebase:", error);
        throw error;
    }
};

export const deleteSchedule = async (scheduleId: string): Promise<void> => {
    console.log("Firebase: Deleting schedule", scheduleId);
    try {
        await deleteDoc(doc(db, "schedules", scheduleId));
    } catch (error) {
        console.error("Error deleting schedule from Firebase:", error);
        throw error;
    }
};

// --- Payroll Services ---
export const getPayrolls = async (filters: { payPeriodStart: string; payPeriodEnd: string; employeeId?: string }): Promise<Payroll[]> => {
    console.log("Firebase: Fetching payrolls with filters:", filters);
    try {
        const payrollsCol = collection(db, "payrolls");
        const queryConstraints: QueryConstraint[] = [
            where("payPeriodStart", ">=", filters.payPeriodStart),
            where("payPeriodEnd", "<=", filters.payPeriodEnd),
            orderBy("payPeriodStart", "desc"), // Or employeeId, payDateIssued
        ];
        if (filters.employeeId) {
            queryConstraints.push(where("employeeId", "==", filters.employeeId));
        }
        
        const q = query(payrollsCol, ...queryConstraints);
        const snapshot = await getDocs(q);
        return snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
                id: docSnap.id,
                ...data,
                createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date(data.createdAt)
            } as Payroll;
        });
    } catch (error) {
        console.error("Error fetching payrolls from Firebase:", error);
        throw error;
    }
};

export const addSinglePayslip = async (payslipData: Omit<Payroll, 'id' | 'createdAt'>): Promise<Payroll> => {
    console.log("Firebase: Adding single payslip", payslipData);
    try {
        // Check for existing to prevent duplicates if this is a manual override of a batch
        const q = query(collection(db, "payrolls"), 
            where("employeeId", "==", payslipData.employeeId),
            where("payPeriodStart", "==", payslipData.payPeriodStart),
            where("payPeriodEnd", "==", payslipData.payPeriodEnd)
        );
        const existing = await getDocs(q);

        if (!existing.empty) {
            // Update existing if found
            const existingDocRef = existing.docs[0].ref;
            const dataToUpdate = { ...payslipData, createdAt: serverTimestamp() };
            await updateDoc(existingDocRef, dataToUpdate);
            return { ...payslipData, id: existingDocRef.id, createdAt: new Date() } as Payroll;
        } else {
            // Add new if not found
            const dataToSave = { ...payslipData, createdAt: serverTimestamp() };
            const docRef = await addDoc(collection(db, "payrolls"), dataToSave);
            return { ...payslipData, id: docRef.id, createdAt: new Date() } as Payroll;
        }
    } catch (error) {
        console.error("Error adding single payslip to Firebase:", error);
        throw error;
    }
};

export const createPayroll = async (params: { payPeriodStart: string; payPeriodEnd: string }): Promise<void> => {
    console.log("Firebase: Creating payroll run for period", params);
    try {
        const employeesSnapshot = await getDocs(query(collection(db, "employees"), where("isArchived", "==", false), where("status", "==", "Active")));
        const activeEmployees = employeesSnapshot.docs.map(docSnap => mapToEmployee(docSnap));
        
        const batch = writeBatch(db);

        for (const emp of activeEmployees) {
            // Placeholder: Basic salary calculation. Real calculation is more complex.
            // This logic should be expanded in a real app based on time logs, daily/hourly rates, OT, etc.
            let grossPay = 0;
            if (emp.salaryType === 'Monthly') {
                grossPay = emp.basicSalary;
            } else if (emp.salaryType === 'Daily') {
                // Simplified: assumes 22 days in pay period for daily rate. Needs actual calculation.
                grossPay = emp.basicSalary * 22; 
            } else { // Hourly etc.
                grossPay = (emp.hourlyRate || emp.basicSalary / 8) * 22 * 8; // Highly simplified
            }

            const totalDeductions = (emp.sssDeduction || 0) + (emp.philhealthDeduction || 0) + (emp.hdmfDeduction || 0);
            const netPay = grossPay - totalDeductions;

            const payrollEntry: Omit<Payroll, 'id'> = {
                employeeId: emp.employeeId,
                payPeriodStart: params.payPeriodStart,
                payPeriodEnd: params.payPeriodEnd,
                payDateIssued: new Date().toISOString().split('T')[0], // Default pay date
                grossPay: parseFloat(grossPay.toFixed(2)),
                deductions: parseFloat(totalDeductions.toFixed(2)),
                netPay: parseFloat(netPay.toFixed(2)),
                // payslipUrl: "to be generated", // Placeholder
                createdAt: serverTimestamp() as any, // Cast to any as serverTimestamp is special
            };
            
            // Check for existing to avoid duplicates in batch, update if exists, else create
            const q = query(collection(db, "payrolls"), 
                where("employeeId", "==", emp.employeeId),
                where("payPeriodStart", "==", params.payPeriodStart),
                where("payPeriodEnd", "==", params.payPeriodEnd)
            );
            const existing = await getDocs(q);
            if (!existing.empty) {
                 batch.update(existing.docs[0].ref, payrollEntry);
            } else {
                const payrollDocRef = doc(collection(db, "payrolls"));
                batch.set(payrollDocRef, payrollEntry);
            }
        }
        await batch.commit();
        console.log("Firebase: Payroll run batch committed.");
    } catch (error) {
        console.error("Error creating payroll run in Firebase:", error);
        throw error;
    }
};

// --- Report Generation ---
// This will be more complex as it involves fetching and processing data
export const generateReport = async (reportType: string, dateRange: { start: string, end: string }): Promise<any[]> => {
    console.log("Firebase: Generating report:", reportType, "for range:", dateRange);
    
    // Convert date strings to Firestore Timestamps for querying if field is Timestamp
    // For string fields like payPeriodStart/End, use strings directly.

    try {
        switch(reportType) {
            case 'payroll_summary':
                const payrollsCol = collection(db, "payrolls");
                const payrollQuery = query(payrollsCol, 
                                          where("payPeriodStart", ">=", dateRange.start), 
                                          where("payPeriodEnd", "<=", dateRange.end)); 
                const payrollSnapshot = await getDocs(payrollQuery);
                const payrolls = payrollSnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}) as Payroll);
                const employeesForPayroll = await getEmployees(); 
                return payrolls.map(p => {
                    const emp = employeesForPayroll.find(e => e.employeeId === p.employeeId);
                    return { 
                        EmployeeID: p.employeeId, 
                        Name: emp ? `${emp.firstName} ${emp.lastName}` : 'N/A',
                        GrossPay: p.grossPay.toFixed(2), 
                        Deductions: p.deductions.toFixed(2), 
                        NetPay: p.netPay.toFixed(2), 
                        PayPeriod: `${p.payPeriodStart} to ${p.payPeriodEnd}`, 
                        PayDate: p.payDateIssued || 'N/A' 
                    };
                });

            case 'attendance_overview':
                const timeLogsCol = collection(db, "timeLogs");
                 // For querying Firestore Timestamps
                const startDateForQuery = Timestamp.fromDate(new Date(dateRange.start + "T00:00:00"));
                const endDateForQuery = Timestamp.fromDate(new Date(dateRange.end + "T23:59:59.999"));
                const attendanceQuery = query(timeLogsCol, 
                                            where("timestamp", ">=", startDateForQuery), 
                                            where("timestamp", "<=", endDateForQuery),
                                            orderBy("timestamp", "asc"));
                const attendanceSnapshot = await getDocs(attendanceQuery);
                const timeLogs = attendanceSnapshot.docs.map(docSnap => {
                    const data = docSnap.data();
                    return {
                        id: docSnap.id,
                        ...data,
                        timestamp: (data.timestamp as Timestamp).toDate() // Already converted to JS Date
                    } as TimeLog;
                });
                const employeesForAttendance = await getEmployees();
                return timeLogs.map(tl => {
                    const emp = employeesForAttendance.find(e => e.employeeId === tl.employeeId);
                    return { 
                        EmployeeID: tl.employeeId, 
                        Name: emp ? `${emp.firstName} ${emp.lastName}` : 'N/A',
                        Timestamp: tl.timestamp.toLocaleString(), 
                        Type: tl.type, 
                        Method: tl.method 
                    };
                });
            
            case 'employee_masterlist':
                const allEmployees = await getEmployees();
                 return allEmployees.map(e => ({
                    EmployeeID: e.employeeId,
                    FirstName: e.firstName,
                    LastName: e.lastName,
                    Position: e.position,
                    Department: e.department,
                    Email: e.email,
                    Status: e.status,
                    StartDate: e.startDate,
                    IsArchived: e.isArchived,
                }));

            case 'leave_balances': 
                const activeEmployees = (await getEmployees()).filter(e => !e.isArchived);
                return activeEmployees.map(e => ({
                    EmployeeID: e.employeeId,
                    Name: `${e.firstName} ${e.lastName}`,
                    Department: e.department,
                    VacationLeaveBalance: 10, 
                    SickLeaveBalance: 5,       
                }));

            default:
                console.warn(`Report type '${reportType}' not implemented in Firebase service.`);
                return [{ message: `Report type '${reportType}' mock data not implemented.`}];
        }
    } catch (error) {
        console.error(`Error generating report '${reportType}' from Firebase:`, error);
        throw error;
    }
};