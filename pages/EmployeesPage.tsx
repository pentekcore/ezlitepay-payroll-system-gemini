
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import EmployeeCard from '../components/EmployeeCard';
import AddEditEmployeeModal from '../components/AddEditEmployeeModal';
import DocumentManagementModal from '../components/DocumentManagementModal';
import QrCodeModal from '../components/QrCodeModal';
import AiAssistantModal from '../components/AiAssistantModal'; // Added AI Assistant Modal
import { Employee, AppSettings, ModalMode } from '../types';
import { AddIcon } from '../constants';
import { getEmployees, getAppSettings, archiveEmployee, unarchiveEmployee } from '../services/supabaseService';

const EmployeesPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);

  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [addEditModalMode, setAddEditModalMode] = useState<ModalMode>(ModalMode.ADD);
  const [employeeToEdit, setEmployeeToEdit] = useState<Employee | undefined>(undefined);

  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [selectedEmployeeForModal, setSelectedEmployeeForModal] = useState<Employee | null>(null);

  // State for AI Assistant Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedEmployeeForAi, setSelectedEmployeeForAi] = useState<Employee | null>(null);


  const fetchInitialData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [emps, settings] = await Promise.all([
        getEmployees(),
        getAppSettings()
      ]);
      setEmployees(emps);
      setAppSettings(settings);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load employee data. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);


  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    let currentEmployees = employees.filter(emp => activeTab === 'active' ? !emp.isArchived : emp.isArchived);

    if (departmentFilter) {
      currentEmployees = currentEmployees.filter(emp => emp.department === departmentFilter);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      currentEmployees = currentEmployees.filter(emp =>
        emp.firstName.toLowerCase().includes(lowerSearchTerm) ||
        emp.lastName.toLowerCase().includes(lowerSearchTerm) ||
        emp.employeeId.toLowerCase().includes(lowerSearchTerm) ||
        emp.email.toLowerCase().includes(lowerSearchTerm) ||
        emp.position.toLowerCase().includes(lowerSearchTerm)
      );
    }
    setFilteredEmployees(currentEmployees);
  }, [employees, activeTab, departmentFilter, searchTerm]);


  const handleOpenAddModal = () => {
    setEmployeeToEdit(undefined);
    setAddEditModalMode(ModalMode.ADD);
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setAddEditModalMode(ModalMode.EDIT);
    setIsAddEditModalOpen(true);
  };
  
  const handleOpenViewModal = (employee: Employee) => {
    setEmployeeToEdit(employee);
    setAddEditModalMode(ModalMode.VIEW);
    setIsAddEditModalOpen(true);
  };

  const handleArchiveToggle = async (employee: Employee) => {
    if (!window.confirm(`Are you sure you want to ${employee.isArchived ? 'unarchive' : 'archive'} ${employee.firstName} ${employee.lastName}?`)) return;
    // Optimistic UI update can be added here
    try {
      if (employee.isArchived) {
        await unarchiveEmployee(employee.id);
      } else {
        await archiveEmployee(employee.id);
      }
      await fetchInitialData(); // Refresh data
    } catch (err) {
      console.error("Error archiving/unarchiving employee:", err);
      alert("Operation failed. Please try again.");
      // Revert optimistic update if it was added
    }
  };

  const handleOpenDocumentsModal = (employee: Employee) => {
    setSelectedEmployeeForModal(employee);
    setIsDocModalOpen(true);
  };

  const handleOpenQrCodeModal = (employee: Employee) => {
    setSelectedEmployeeForModal(employee);
    setIsQrModalOpen(true);
  };

  const handleOpenAiModal = (employee: Employee) => {
    setSelectedEmployeeForAi(employee);
    setIsAiModalOpen(true);
  };
  
  const handleSaveEmployee = async (savedEmployee: Employee, mode: ModalMode) => {
      console.log(`${mode === ModalMode.ADD ? 'Added' : 'Updated'} employee:`, savedEmployee);
      await fetchInitialData(); 
  };


  const handleResetFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('');
    // setActiveTab('active'); // Optionally reset tab, but usually users expect tab to persist
  };

  if (isLoading && employees.length === 0) {
    return (
      <div className="flex flex-col justify-center items-center h-96 text-slate-500">
        <svg className="animate-spin h-8 w-8 text-brand-accent mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg">Loading employees...</p>
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-5 bg-red-50 text-red-600 rounded-lg shadow border border-red-200">{error}</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-primary">Employee Management</h1>
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="btn-secondary"
        >
          Add New Employee
        </button>
      </div>

      {/* Filters and Tabs */}
      <div className="mb-6 md:mb-8 p-5 bg-white shadow-card rounded-xl">
        <div className="border-b border-slate-200 mb-5">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            {(['active', 'archived'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm capitalize
                  ${activeTab === tab
                    ? 'border-brand-accent text-brand-accent'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }
                `}
              >
                {tab} Employees
              </button>
            ))}
          </nav>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="md:col-span-1">
                <label htmlFor="search-employee" className="sr-only">Search Employees</label>
                <input
                type="text"
                id="search-employee"
                placeholder="Search by name, ID, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-base w-full"
                />
            </div>
            <div className="md:col-span-1">
                <label htmlFor="department-filter" className="sr-only">Department</label>
                <select
                id="department-filter"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="input-base w-full bg-white"
                >
                <option value="">All Departments</option>
                {(appSettings?.departments || []).map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
            </div>
            <button
                type="button"
                onClick={handleResetFilters}
                className="btn btn-neutral w-full md:w-auto"
            >
                Reset Filters
            </button>
        </div>
      </div>

      {/* Employee Grid */}
      {isLoading && <p className="text-center text-slate-500 text-sm">Updating employee list...</p>}
      {!isLoading && filteredEmployees.length === 0 && (
        <div className="text-center py-16 text-slate-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0zM7 16l1.5-1.5M17 16l-1.5-1.5" />
            </svg>
            <p className="text-xl font-semibold">No Employees Found</p>
            <p className="text-sm">No employees match your current filters.</p>
        </div>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 md:gap-6">
        {filteredEmployees.map(employee => (
          <EmployeeCard
            key={employee.id}
            employee={employee}
            onView={handleOpenViewModal}
            onEdit={handleOpenEditModal}
            onArchiveToggle={handleArchiveToggle}
            onDocuments={handleOpenDocumentsModal}
            onQrCode={handleOpenQrCodeModal}
            onAskAi={handleOpenAiModal}
          />
        ))}
      </div>

      {/* Modals */}
      {isAddEditModalOpen && (
        <AddEditEmployeeModal
          isOpen={isAddEditModalOpen}
          onClose={() => setIsAddEditModalOpen(false)}
          mode={addEditModalMode}
          employeeToEdit={employeeToEdit}
          onSave={handleSaveEmployee}
        />
      )}
      {isDocModalOpen && selectedEmployeeForModal && (
        <DocumentManagementModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          employee={selectedEmployeeForModal}
        />
      )}
      {isQrModalOpen && selectedEmployeeForModal &&(
        <QrCodeModal
          isOpen={isQrModalOpen}
          onClose={() => setIsQrModalOpen(false)}
          employee={selectedEmployeeForModal}
        />
      )}
      {isAiModalOpen && selectedEmployeeForAi && (
        <AiAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          employee={selectedEmployeeForAi}
        />
      )}
    </div>
  );
};

export default EmployeesPage;
