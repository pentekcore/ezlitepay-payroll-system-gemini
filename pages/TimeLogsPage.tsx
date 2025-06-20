
import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { TimeLog, Employee } from '../types';
import { getTimeLogs, addTimeLog, updateTimeLog, getEmployees } from '../services/supabaseService';
import { Modal } from '../components/Modal';
import { AddIcon, EditIcon } from '../constants';

const TimeLogsPage: React.FC = () => {
  const [timeLogs, setTimeLogs] = useState<TimeLog[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For form submissions
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<{ date: string; employeeId: string }>({
    date: new Date().toISOString().split('T')[0],
    employeeId: '',
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<TimeLog | null>(null);
  const [logFormData, setLogFormData] = useState<Partial<Omit<TimeLog, 'id' | 'timestamp'>> & { timestampDate?: string; timestampTime?: string }>({
    employeeId: '',
    type: 'Clock In',
    method: 'Manual',
    timestampDate: new Date().toISOString().split('T')[0],
    timestampTime: new Date().toTimeString().split(' ')[0].substring(0,5),
  });

  const fetchTimeLogsAndEmployees = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedLogs, fetchedEmployees] = await Promise.all([
        getTimeLogs(filters),
        getEmployees() 
      ]);
      setTimeLogs(fetchedLogs);
      setEmployees(fetchedEmployees.filter(emp => !emp.isArchived)); 
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Failed to load time logs or employee data.");
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchTimeLogsAndEmployees();
  }, [fetchTimeLogsAndEmployees]);

  const handleFilterChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleOpenModal = (log?: TimeLog) => {
    if (log) {
      setEditingLog(log);
      const logTimestamp = log.timestamp; // Already a JS Date
      setLogFormData({
        employeeId: log.employeeId,
        type: log.type,
        method: log.method,
        timestampDate: logTimestamp.toISOString().split('T')[0],
        timestampTime: logTimestamp.toTimeString().split(' ')[0].substring(0,5),
      });
    } else {
      setEditingLog(null);
      setLogFormData({
        employeeId: filters.employeeId || (employees.length > 0 ? employees[0].employeeId : ''), // Default to first employee or current filter
        type: 'Clock In',
        method: 'Manual',
        timestampDate: filters.date || new Date().toISOString().split('T')[0],
        timestampTime: new Date().toTimeString().split(' ')[0].substring(0,5),
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLog(null);
  };

  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setLogFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveLog = async (e: FormEvent) => {
    e.preventDefault();
    if (!logFormData.employeeId || !logFormData.timestampDate || !logFormData.timestampTime) {
        alert("Employee ID, date, and time are required.");
        return;
    }

    const combinedTimestamp = new Date(`${logFormData.timestampDate}T${logFormData.timestampTime}:00`);
    if (isNaN(combinedTimestamp.getTime())) {
        alert("Invalid date or time format.");
        return;
    }
    
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingLog) {
        await updateTimeLog({
          ...editingLog,
          employeeId: logFormData.employeeId!,
          type: logFormData.type!,
          method: logFormData.method!,
          timestamp: combinedTimestamp, // Pass JS Date
        });
      } else {
        await addTimeLog({
          employeeId: logFormData.employeeId!,
          type: logFormData.type!,
          method: logFormData.method!,
          timestamp: combinedTimestamp,  // Pass JS Date
        });
      }
      handleCloseModal();
      fetchTimeLogsAndEmployees(); 
    } catch (err) {
      console.error("Error saving time log:", err);
      const errorMsg = `Failed to save time log: ${err instanceof Error ? err.message : "Unknown error"}`;
      alert(errorMsg);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-primary">Time Logs</h1>
        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="btn btn-secondary"
          aria-label="Add Manual Time Log"
        >
          Add Manual Log
        </button>
      </div>

      <div className="mb-6 md:mb-8 p-5 bg-white shadow-card rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
            <label htmlFor="date-filter" className="block text-sm font-medium text-slate-700 mb-1">Date</label>
            <input
                type="date"
                name="date"
                id="date-filter"
                value={filters.date}
                onChange={handleFilterChange}
                className="input-base w-full"
                aria-label="Filter by date"
            />
            </div>
            <div>
            <label htmlFor="employeeIdFilter" className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
            <select
                name="employeeId"
                id="employeeIdFilter"
                value={filters.employeeId}
                onChange={handleFilterChange}
                className="input-base bg-white w-full"
                aria-label="Filter by employee"
            >
                <option value="">All Employees</option>
                {employees.map(emp => (
                <option key={emp.id} value={emp.employeeId}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                ))}
            </select>
            </div>
        </div>
      </div>

      {error && <p role="alert" className="my-4 text-sm text-red-600 bg-red-100 p-3 rounded-md text-center border border-red-300">{error}</p>}

      {isLoading && timeLogs.length === 0 ? (
        <div className="text-center text-slate-500 py-20 bg-white shadow-card rounded-xl"><p>Loading time logs...</p></div>
      ) : !isLoading && timeLogs.length === 0 ? (
        <div className="text-center py-16 text-slate-500 bg-white shadow-card rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0zM7 8h10M7 12h4m6 0h.01M7 16h10" />
            </svg>
            <p className="text-xl font-semibold">No Time Logs Found</p>
            <p className="text-sm">No entries match your current filters.</p>
        </div>
      ) : (
        <div className="bg-white shadow-card rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Name</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Timestamp</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Type</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Method</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {timeLogs.map((log) => {
                  const employee = employees.find(e => e.employeeId === log.employeeId);
                  const logTimestamp = log.timestamp; // Already a JS Date
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/75 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{log.employeeId}</td>
                      <td className="px-6 py-4 whitespace-normal break-words text-sm font-medium text-slate-800">{employee ? `${employee.firstName} ${employee.lastName}` : 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{!isNaN(logTimestamp.getTime()) ? logTimestamp.toLocaleString() : 'Invalid Date'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">
                          <span className={`px-2.5 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${log.type === 'Clock In' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                              {log.type}
                          </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{log.method}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(log)}
                          className="p-1.5 text-brand-accent hover:text-brand-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-accent rounded-full hover:bg-brand-accent/10"
                          title="Edit Log"
                          disabled={isSubmitting}
                          aria-label={`Edit time log for ${employee ? employee.firstName : log.employeeId}`}
                        >
                          <EditIcon />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isModalOpen && (
        <Modal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            title={editingLog ? "Edit Time Log" : "Add Manual Time Log"}
            footer={
                <>
                  <button type="button" onClick={handleCloseModal} className="btn btn-neutral" disabled={isSubmitting}>Cancel</button>
                  <button type="submit" form="timeLogForm" className="btn btn-secondary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Log'}</button>
                </>
            }
        >
          <form id="timeLogForm" onSubmit={handleSaveLog} className="space-y-4">
            <div>
              <label htmlFor="employeeId-modal" className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
              <select
                name="employeeId"
                id="employeeId-modal"
                value={logFormData.employeeId}
                onChange={handleFormChange}
                required
                className="input-base mt-1 block w-full bg-white"
                disabled={isSubmitting}
              >
                <option value="" disabled>Select Employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.employeeId}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="timestampDate-modal" className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                    <input
                        type="date"
                        name="timestampDate"
                        id="timestampDate-modal"
                        value={logFormData.timestampDate}
                        onChange={handleFormChange}
                        required
                        className="input-base mt-1 block w-full"
                        disabled={isSubmitting}
                    />
                </div>
                <div>
                    <label htmlFor="timestampTime-modal" className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                    <input
                        type="time"
                        name="timestampTime"
                        id="timestampTime-modal"
                        value={logFormData.timestampTime}
                        onChange={handleFormChange}
                        required
                        className="input-base mt-1 block w-full"
                        disabled={isSubmitting}
                    />
                </div>
            </div>
            <div>
              <label htmlFor="type-modal" className="block text-sm font-medium text-slate-700 mb-1">Log Type</label>
              <select
                name="type"
                id="type-modal"
                value={logFormData.type}
                onChange={handleFormChange}
                required
                className="input-base mt-1 block w-full bg-white"
                disabled={isSubmitting}
              >
                <option value="Clock In">Clock In</option>
                <option value="Clock Out">Clock Out</option>
              </select>
            </div>
            <div>
              <label htmlFor="method-modal" className="block text-sm font-medium text-slate-700 mb-1">Method</label>
              <select
                name="method"
                id="method-modal"
                value={logFormData.method}
                onChange={handleFormChange}
                required
                className="input-base mt-1 block w-full bg-slate-100 cursor-not-allowed"
                disabled 
              >
                <option value="Manual">Manual</option>
                <option value="QR" disabled>QR (System Generated)</option>
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default TimeLogsPage;
