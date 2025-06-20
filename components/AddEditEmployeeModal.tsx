
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Modal } from './Modal';
import { Employee, AppSettings, ModalMode } from '../types';
import { DEFAULT_PROFILE_PIC, UploadIcon } from '../constants';
import { getAppSettings, addEmployee, updateEmployee, uploadFileToStorage } from '../services/supabaseService';

interface AddEditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
  employeeToEdit?: Employee;
  onSave: (employee: Employee, mode: ModalMode) => void;
}

const initialEmployeeState: Omit<Employee, 'id' | 'createdAt' | 'updatedAt'> = {
  employeeId: '',
  firstName: '',
  lastName: '',
  profilePictureUrl: '',
  gender: '',
  birthDate: '',
  position: '',
  department: '',
  email: '',
  startDate: '',
  employeeType: '',
  status: 'Active',
  isArchived: false,
  mobileNumber: '',
  address: '',
  emergencyContactName: '',
  emergencyContactRelationship: '',
  emergencyContactNumber: '',
  tinNumber: '',
  sssNumber: '',
  philhealthNumber: '',
  pagibigNumber: '',
  paymentMethod: '',
  bankName: '',
  accountNumber: '',
  salaryType: '',
  basicSalary: 0,
  hourlyRate: 0,
  monthlyEquivalent: 0,
  overtimeMultiplier: 1.25,
  regularHolidayMultiplier: 2,
  specialHolidayMultiplier: 1.3,
  restDayOvertimeMultiplier: 1.3, // Standard for many regions
  sssDeduction: 0,
  philhealthDeduction: 0,
  hdmfDeduction: 0,
};


const AddEditEmployeeModal: React.FC<AddEditEmployeeModalProps> = ({ isOpen, onClose, mode, employeeToEdit, onSave }) => {
  const [formData, setFormData] = useState<Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>>(initialEmployeeState);
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSettings, setIsFetchingSettings] = useState(true);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsFetchingSettings(true);
      getAppSettings()
        .then(settings => {
          setAppSettings(settings);
          if (mode === ModalMode.EDIT && employeeToEdit) {
            const formattedEmployeeToEdit = {
              ...employeeToEdit,
              birthDate: employeeToEdit.birthDate ? new Date(employeeToEdit.birthDate).toISOString().split('T')[0] : '',
              startDate: employeeToEdit.startDate ? new Date(employeeToEdit.startDate).toISOString().split('T')[0] : '',
            };
            setFormData(formattedEmployeeToEdit);
            setProfileImagePreview(employeeToEdit.profilePictureUrl || null);
          } else {
            setFormData({...initialEmployeeState, employeeId: `EMP${Date.now().toString().slice(-6)}`}); // Auto-generate a temp ID
            setProfileImagePreview(null);
          }
        })
        .catch(error => {
            console.error("Error fetching app settings:", error);
            // Potentially set an error state to show in modal
        })
        .finally(() => setIsFetchingSettings(false));
    } else {
      // Reset form when modal closes
      setFormData(initialEmployeeState);
      setProfileImageFile(null);
      setProfileImagePreview(null);
    }
  }, [isOpen, mode, employeeToEdit]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    let processedValue: string | number | boolean = value;
  
    if (type === 'number' && name !== 'employeeId' && name !== 'accountNumber' && name !== 'mobileNumber' && name !== 'emergencyContactNumber' && name !== 'tinNumber' && name !== 'sssNumber' && name !== 'philhealthNumber' && name !== 'pagibigNumber'  ) {
      processedValue = parseFloat(value) || 0;
    }
  
    setFormData(prev => {
      const newFormData = { ...prev, [name]: processedValue };
  
      if (name === 'salaryType' || name === 'basicSalary') {
        if (newFormData.salaryType === 'Daily' && newFormData.basicSalary > 0) {
          newFormData.monthlyEquivalent = newFormData.basicSalary * 22;
        } else if (newFormData.salaryType === 'Monthly') {
          newFormData.monthlyEquivalent = newFormData.basicSalary;
        } else {
          newFormData.monthlyEquivalent = 0;
        }
      }
  
      if (name === 'status') {
        if (value === 'Resigned' || value === 'Terminated') {
          newFormData.isArchived = true;
        } else if (value === 'Active') {
          newFormData.isArchived = false;
        }
      }
      return newFormData;
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setProfileImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === ModalMode.VIEW) {
      onClose();
      return;
    }
    setIsLoading(true);

    let imageUrl = formData.profilePictureUrl;
    if (profileImageFile) {
      try {
        const imagePath = `employee_profiles/${formData.employeeId || `new_${Date.now()}`}/${profileImageFile.name}`;
        imageUrl = await uploadFileToStorage(profileImageFile, imagePath);
      } catch (error) {
        console.error("Error uploading profile image:", error);
        alert("Failed to upload profile image. Please try again.");
        setIsLoading(false);
        return;
      }
    }

    const finalEmployeeData: Employee = {
      ...(employeeToEdit && mode === ModalMode.EDIT ? { id: employeeToEdit.id } : { id: '' }),
      ...formData,
      profilePictureUrl: imageUrl || formData.profilePictureUrl || '',
      birthDate: formData.birthDate ? new Date(formData.birthDate).toISOString() : '',
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : '',
    };
    
    try {
      let savedEmployee: Employee;
      if (mode === ModalMode.ADD) {
        savedEmployee = await addEmployee(finalEmployeeData);
      } else {
        savedEmployee = await updateEmployee(finalEmployeeData);
      }
      onSave(savedEmployee, mode);
      onClose();
    } catch (error) {
      console.error(`Error saving employee:`, error);
      alert(`Failed to save employee: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  const renderField = (label: string, name: keyof Omit<Employee, 'id' | 'createdAt' | 'updatedAt'>, type: string = 'text', options?: string[], required: boolean = false, props: object = {}) => (
    <div className="mb-1"> {/* Reduced bottom margin */}
      <label htmlFor={name} className="block text-sm font-semibold text-slate-700 mb-1">{label}{required && <span className="text-red-500">*</span>}</label>
      {type === 'select' ? (
        <select
          id={name}
          name={name}
          value={String(formData[name] || '')}
          onChange={handleChange}
          disabled={mode === ModalMode.VIEW || isLoading || isFetchingSettings}
          required={required}
          className="input-base mt-0.5 bg-white"
          {...props}
        >
          <option value="">Select {label}</option>
          {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      ) : type === 'textarea' ? (
        <textarea
          id={name}
          name={name}
          value={String(formData[name] || '')}
          onChange={handleChange}
          rows={2} // Reduced rows
          disabled={mode === ModalMode.VIEW || isLoading || isFetchingSettings}
          required={required}
          className="input-base mt-0.5"
          {...props}
        />
      ) : (
        <input
          type={type}
          id={name}
          name={name}
          value={type === 'date' ? (formData[name] ? String(formData[name]).split('T')[0] : '') : String(formData[name] || '')}
          onChange={handleChange}
          disabled={mode === ModalMode.VIEW || isLoading || isFetchingSettings}
          required={required}
          className="input-base mt-0.5"
          {...props}
        />
      )}
    </div>
  );

  const renderSection = (title: string, fields: React.ReactNode, gridCols: string = 'md:grid-cols-2') => (
    <div className="mb-5 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
      <h4 className="text-lg font-semibold text-brand-primary mb-4 pb-2 border-b border-slate-300">{title}</h4>
      <div className={`grid grid-cols-1 ${gridCols} gap-x-4 gap-y-3`}>
        {fields}
      </div>
    </div>
  );

  const modalTitle = mode === ModalMode.ADD ? "Add New Employee" : mode === ModalMode.EDIT ? "Edit Employee Details" : "View Employee Details";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle} size="3xl"
      footer={mode !== ModalMode.VIEW && (
        <>
          <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-neutral">
            Cancel
          </button>
          <button type="submit" form="employeeForm" disabled={isLoading || isFetchingSettings} className="btn btn-secondary">
            {isLoading ? 'Saving...' : (mode === ModalMode.ADD ? 'Add Employee' : 'Save Changes')}
          </button>
        </>
      )}
    >
      {isFetchingSettings && <div className="text-center p-10 text-slate-500">Loading form options...</div>}
      {!isFetchingSettings && (
        <form id="employeeForm" onSubmit={handleSubmit} className="space-y-0"> {/* Reduced space-y */}
          <div className="flex flex-col items-center mb-5">
            <img 
              src={profileImagePreview || formData.profilePictureUrl || DEFAULT_PROFILE_PIC} 
              alt="Profile" 
              className="w-28 h-28 rounded-full object-cover mb-3 border-4 border-slate-200 shadow-sm"
            />
            {mode !== ModalMode.VIEW && (
              <label htmlFor="profilePictureUrl" className="btn btn-ghost text-sm py-1.5 px-3">
                <UploadIcon />
                <span className="ml-2">Upload Photo</span>
              </label>
            )}
            <input type="file" id="profilePictureUrl" name="profilePictureUrl" onChange={handleFileChange} accept="image/*" className="hidden" disabled={mode === ModalMode.VIEW || isLoading} />
          </div>

          {renderSection("Personal Information", (
            <>
              {renderField("Employee ID", "employeeId", "text", [], true, {placeholder: "e.g., EMP001"})}
              {renderField("First Name", "firstName", "text", [], true)}
              {renderField("Last Name", "lastName", "text", [], true)}
              {renderField("Email", "email", "email", [], true)}
              {renderField("Gender", "gender", "select", ["Male", "Female", "Other"], true)}
              {renderField("Birth Date", "birthDate", "date", [], true)}
              {renderField("Start Date", "startDate", "date", [], true)}
              {renderField("Position", "position", "select", appSettings?.positions || [], true)}
              {renderField("Department", "department", "select", appSettings?.departments || [], true)}
              {renderField("Employee Type", "employeeType", "select", appSettings?.employeeTypes || [], true)}
              {renderField("Status", "status", "select", appSettings?.statuses || [], true)}
            </>
          ), "md:grid-cols-3")}

          {renderSection("Contact Information", (
            <>
              {renderField("Mobile Number", "mobileNumber", "tel", [], true)}
              {renderField("Address", "address", "textarea")}
            </>
          ))}

          {renderSection("Emergency Contact", (
            <>
              {renderField("Contact Name", "emergencyContactName")}
              {renderField("Relationship", "emergencyContactRelationship")}
              {renderField("Contact Number", "emergencyContactNumber", "tel")}
            </>
          ), "md:grid-cols-3")}
          
          {renderSection("Government IDs", (
            <>
              {renderField("TIN Number", "tinNumber")}
              {renderField("SSS Number", "sssNumber")}
              {renderField("PhilHealth Number", "philhealthNumber")}
              {renderField("Pag-IBIG Number", "pagibigNumber")}
            </>
          ), "md:grid-cols-2")}

          {renderSection("Payment Information", (
            <>
              {renderField("Payment Method", "paymentMethod", "select", ["Bank Transfer", "Cash", "Check"])}
              {formData.paymentMethod === 'Bank Transfer' && (
                <>
                  {renderField("Bank Name", "bankName")}
                  {renderField("Account Number", "accountNumber")}
                </>
              )}
            </>
          ), formData.paymentMethod === 'Bank Transfer' ? "md:grid-cols-3" : "md:grid-cols-1")}

          {renderSection("Salary Information", (
            <>
              {renderField("Salary Type", "salaryType", "select", ["Monthly", "Daily"], true)}
              {renderField("Basic Salary", "basicSalary", "number", [], true)}
              {renderField("Monthly Equivalent", "monthlyEquivalent", "number", [], false, {readOnly: true, className: "input-base mt-0.5 bg-slate-100 cursor-not-allowed"})}
              {renderField("Hourly Rate (Optional)", "hourlyRate", "number")}
            </>
          ), "md:grid-cols-2")}

          {renderSection("Pay Rate Multipliers", (
            <>
              {renderField("Overtime", "overtimeMultiplier", "number")}
              {renderField("Regular Holiday", "regularHolidayMultiplier", "number")}
              {renderField("Special Holiday", "specialHolidayMultiplier", "number")}
              {renderField("Rest Day OT", "restDayOvertimeMultiplier", "number")}
            </>
          ), "md:grid-cols-2 lg:grid-cols-4")}

          {renderSection("Standard Deductions", (
            <>
              {renderField("SSS Deduction", "sssDeduction", "number")}
              {renderField("PhilHealth Deduction", "philhealthDeduction", "number")}
              {renderField("HDMF (Pag-IBIG) Deduction", "hdmfDeduction", "number")}
            </>
          ), "md:grid-cols-3")}
        </form>
      )}
    </Modal>
  );
};

export default AddEditEmployeeModal;