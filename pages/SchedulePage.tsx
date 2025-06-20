
import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { Schedule, Employee } from '../types';
import { Modal } from '../components/Modal';
import BulkScheduleModal from '../components/BulkScheduleModal';
import { AddIcon, EditIcon, DeleteIcon } from '../constants';
import { getSchedules, addSchedule, updateSchedule, deleteSchedule, getEmployees, addBulkSchedules } from '../services/supabaseService';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const SchedulePage: React.FC = () => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('monthly');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [scheduleFormData, setScheduleFormData] = useState<Partial<Omit<Schedule, 'id'>>>({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    shiftStartTime: '09:00',
    shiftEndTime: '17:00',
    notes: ''
  });

  // State for the "Day Schedules" modal
  const [isDaySchedulesModalOpen, setIsDaySchedulesModalOpen] = useState(false);
  const [selectedDayForModal, setSelectedDayForModal] = useState<string | null>(null);
  const [schedulesForDayModal, setSchedulesForDayModal] = useState<Schedule[]>([]);


  const fetchScheduleData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedSchedules, fetchedEmployees] = await Promise.all([
        getSchedules({ date: selectedDate, view: viewMode }),
        getEmployees()
      ]);
      setSchedules(fetchedSchedules);
      setEmployees(fetchedEmployees.filter(emp => !emp.isArchived));
    } catch (err) {
      console.error("Error fetching schedule data:", err);
      setError("Failed to load schedule data.");
    } finally {
      setIsLoading(false);
    }
  }, [selectedDate, viewMode]);

  useEffect(() => {
    fetchScheduleData();
  }, [fetchScheduleData]);

  const handleOpenModal = (schedule?: Schedule) => {
    if (schedule) {
      setEditingSchedule(schedule);
      setScheduleFormData({
        employeeId: schedule.employeeId,
        date: schedule.date ? new Date(schedule.date + 'T00:00:00').toISOString().split('T')[0] : new Date().toISOString().split('T')[0], // Ensure local interpretation
        shiftStartTime: schedule.shiftStartTime,
        shiftEndTime: schedule.shiftEndTime,
        notes: schedule.notes
      });
    } else {
      setEditingSchedule(null);
      setScheduleFormData({
        employeeId: employees.length > 0 ? employees[0].employeeId : '',
        date: selectedDate,
        shiftStartTime: '09:00',
        shiftEndTime: '17:00',
        notes: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingSchedule(null);
  };
  
  const handleOpenBulkModal = () => {
    setIsBulkModalOpen(true);
  };

  const handleCloseBulkModal = () => {
    setIsBulkModalOpen(false);
  };


  const handleFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setScheduleFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSaveSchedule = async (e: FormEvent) => {
    e.preventDefault();
    if (!scheduleFormData.employeeId || !scheduleFormData.date || !scheduleFormData.shiftStartTime || !scheduleFormData.shiftEndTime) {
        alert("Employee, date, start time, and end time are required.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      if (editingSchedule) {
        await updateSchedule({ ...editingSchedule, ...scheduleFormData } as Schedule);
      } else {
        await addSchedule(scheduleFormData as Omit<Schedule, 'id'>);
      }
      handleCloseModal();
      fetchScheduleData();
    } catch (err) {
      console.error("Error saving schedule:", err);
      const errorMsg = `Failed to save schedule: ${err instanceof Error ? err.message : "Unknown error"}`;
      alert(errorMsg);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveBulkSchedule = async (bulkScheduleData: Array<Omit<Schedule, 'id'>>) => {
    if (bulkScheduleData.length === 0) {
        alert("No schedules to add.");
        return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
        await addBulkSchedules(bulkScheduleData);
        handleCloseBulkModal();
        fetchScheduleData();
        alert(`Successfully added ${bulkScheduleData.length} schedule entries.`);
    } catch (err) {
        console.error("Error saving bulk schedules:", err);
        const errorMsg = `Failed to save bulk schedules: ${err instanceof Error ? err.message : "Unknown error"}`;
        alert(errorMsg);
        setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!window.confirm("Are you sure you want to delete this schedule entry?")) return;
    setIsSubmitting(true); 
    setError(null);
    try {
      await deleteSchedule(scheduleId);
      fetchScheduleData();
    } catch (err) {
      console.error("Error deleting schedule:", err);
      const errorMsg = `Failed to delete schedule: ${err instanceof Error ? err.message : "Unknown error"}`;
      alert(errorMsg);
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const getMonthName = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00'); // Ensure it's treated as local for formatting
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }
  
  const getFormattedDate = (dateString: string) => {
     const date = new Date(dateString + 'T00:00:00');
     return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const renderSchedulesTable = () => {
    if (isLoading && schedules.length === 0) {
        return <div className="text-center text-slate-500 py-20 bg-white shadow-card rounded-xl"><p>Loading schedules...</p></div>;
    }
    if (!isLoading && schedules.length === 0) {
      return (
        <div className="text-center py-16 text-slate-500 bg-white shadow-card rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                 <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xl font-semibold mb-1">No Schedules Found</p>
            <p className="text-sm">There are no schedules for the selected period.</p>
        </div>
    );
    }

    return (
      <div className="bg-white shadow-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-100">
                <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Employee</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Shift</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Notes</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Actions</th>
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {schedules.map(sch => {
                const employee = employees.find(e => e.employeeId === sch.employeeId);
                return (
                    <tr key={sch.id} className="hover:bg-slate-50/75 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{new Date(sch.date + 'T00:00:00').toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-normal text-sm font-medium text-slate-800 break-words">{employee ? `${employee.firstName} ${employee.lastName}` : sch.employeeId}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{sch.shiftStartTime} - {sch.shiftEndTime}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 max-w-xs whitespace-normal break-words" title={sch.notes || undefined}>{sch.notes || <span className="text-slate-400 italic">N/A</span>}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button 
                            type="button"
                            onClick={() => handleOpenModal(sch)} 
                            className="p-1.5 text-brand-accent hover:text-brand-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-brand-accent rounded-full hover:bg-brand-accent/10" 
                            title="Edit" 
                            disabled={isSubmitting}
                            aria-label={`Edit schedule for ${employee ? employee.firstName : sch.employeeId} on ${sch.date}`}
                        >
                           Edit
                        </button>
                        <button 
                            type="button"
                            onClick={() => handleDeleteSchedule(sch.id)} 
                            className="p-1.5 text-red-500 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-500 rounded-full hover:bg-red-500/10 ml-2" 
                            title="Delete" 
                            disabled={isSubmitting}
                            aria-label={`Delete schedule for ${employee ? employee.firstName : sch.employeeId} on ${sch.date}`}
                        >
                           X
                        </button>
                    </td>
                    </tr>
                );
                })}
            </tbody>
            </table>
        </div>
      </div>
    );
  };
  
  const renderMonthlyCalendarView = () => {
    const currentMonthDate = new Date(selectedDate + 'T00:00:00'); 
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); 

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    const daysInMonth = lastDayOfMonth.getDate();
    const firstDayOfWeek = firstDayOfMonth.getDay(); 

    const today = new Date();
    today.setHours(0,0,0,0); 

    const calendarDays = [];

    for (let i = 0; i < firstDayOfWeek; i++) {
        const prevMonthDay = new Date(year, month, 0); 
        prevMonthDay.setDate(prevMonthDay.getDate() - (firstDayOfWeek - 1 - i));
        calendarDays.push({
            date: prevMonthDay,
            isCurrentMonth: false,
            schedules: [], 
            isToday: false,
        });
    }

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = date.toISOString().split('T')[0];
        const daySchedules = schedules.filter(s => s.date === dateStr)
            .sort((a, b) => a.shiftStartTime.localeCompare(b.shiftStartTime)); 

        calendarDays.push({
            date: date,
            isCurrentMonth: true,
            schedules: daySchedules,
            isToday: date.getTime() === today.getTime(),
        });
    }

    const totalCells = Math.ceil(calendarDays.length / 7) * 7; 
    let nextMonthDayCounter = 1;
    while (calendarDays.length < totalCells) {
        const nextMonthDay = new Date(year, month + 1, nextMonthDayCounter++);
        calendarDays.push({
            date: nextMonthDay,
            isCurrentMonth: false,
            schedules: [],
            isToday: false,
        });
    }

    const goToPreviousMonth = () => {
        const prevMonth = new Date(year, month -1, 1);
        setSelectedDate(prevMonth.toISOString().split('T')[0]);
    };
    const goToNextMonth = () => {
        const nextMonth = new Date(year, month + 1, 1);
        setSelectedDate(nextMonth.toISOString().split('T')[0]);
    };

    if (isLoading && schedules.length === 0) {
        return <div className="text-center text-slate-500 py-20 bg-white shadow-card rounded-xl"><p>Loading schedules...</p></div>;
    }

    return (
        <div className="bg-white shadow-card rounded-xl p-4 md:p-6">
            <div className="flex justify-between items-center mb-4">
                <button type="button" onClick={goToPreviousMonth} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-accent" aria-label="Previous month">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <h2 className="text-xl font-semibold text-brand-primary">
                    {currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button type="button" onClick={goToNextMonth} className="p-2 rounded-full hover:bg-slate-100 text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-accent" aria-label="Next month">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
            </div>

            <div className="grid grid-cols-7 gap-px bg-slate-200 border border-slate-200 rounded-t-md overflow-hidden">
                {DAYS_OF_WEEK.map(day => (
                    <div key={day} className="py-2 px-1 text-center font-medium text-xs text-slate-600 bg-slate-50">
                        {day}
                    </div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-px bg-slate-200 border-x border-b border-slate-200 rounded-b-md overflow-hidden">
                {calendarDays.map((dayObj, index) => {
                    const maxSchedulesToShow = 3;
                    const employeeLookup = (empId: string) => employees.find(e => e.employeeId === empId);

                    return (
                        <div
                            key={index}
                            className={`p-1.5 md:p-2 min-h-[90px] md:min-h-[110px] relative flex flex-col group
                                ${dayObj.isCurrentMonth 
                                    ? (dayObj.isToday ? 'bg-brand-accent/10 ring-1 ring-inset ring-brand-accent z-10' : 'bg-white hover:bg-slate-50/75') 
                                    : 'bg-slate-100 text-slate-400'}
                            `}
                        >
                            <span className={`text-xs font-semibold ${dayObj.isCurrentMonth ? (dayObj.isToday ? 'text-brand-accent font-bold' : 'text-slate-700') : 'text-slate-400'}`}>
                                {dayObj.date.getDate()}
                            </span>
                            {dayObj.isCurrentMonth && (
                                <div className="mt-1 space-y-0.5 overflow-hidden flex-grow">
                                    {dayObj.schedules.slice(0, maxSchedulesToShow).map(sch => {
                                        const emp = employeeLookup(sch.employeeId);
                                        return (
                                            <button
                                                type="button"
                                                key={sch.id}
                                                onClick={() => handleOpenModal(sch)}
                                                className="w-full text-left p-0.5 md:p-1 text-[10px] leading-tight rounded bg-green-100 hover:bg-green-200 text-green-700 hover:text-green-800 truncate block focus:outline-none focus:ring-1 focus:ring-green-400"
                                                title={`${emp ? emp.firstName : sch.employeeId}: ${sch.shiftStartTime}-${sch.shiftEndTime}${sch.notes ? ` (${sch.notes})` : ''}`}
                                            >
                                                <span className="font-medium">{emp ? emp.firstName : sch.employeeId}:</span> {sch.shiftStartTime}
                                            </button>
                                        );
                                    })}
                                    {dayObj.schedules.length > maxSchedulesToShow && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const dayDateStr = dayObj.date.toISOString().split('T')[0];
                                                const allDaySchedules = schedules.filter(s => s.date === dayDateStr)
                                                                           .sort((a,b) => a.shiftStartTime.localeCompare(b.shiftStartTime));
                                                setSelectedDayForModal(dayDateStr);
                                                setSchedulesForDayModal(allDaySchedules);
                                                setIsDaySchedulesModalOpen(true);
                                            }}
                                            className="text-[9px] md:text-[10px] text-brand-accent hover:text-brand-accent-hover font-medium mt-0.5 text-center w-full focus:outline-none focus:ring-1 focus:ring-brand-accent rounded"
                                            aria-label={`View all ${dayObj.schedules.length} schedules for ${dayObj.date.toLocaleDateString()}`}
                                        >
                                            ...{dayObj.schedules.length - maxSchedulesToShow} more
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
      );
  };


  return (
    <div className="container mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-center mb-6 md:mb-8 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-brand-primary">Employee Schedules</h1>
        <div className="flex items-center gap-3">
            <button
                type="button"
                onClick={handleOpenBulkModal}
                className="btn btn-alternate-action"
                disabled={isSubmitting || isLoading}
                aria-label="Add Bulk Schedules"
            >
                <span className="ml-0">Add Bulk</span>
            </button>
            <button
                type="button"
                onClick={() => handleOpenModal()}
                className="btn btn-alternate-action"
                disabled={isSubmitting || isLoading}
                aria-label="Add Single Schedule"
            >
                <span className="ml-0">Add Single</span>
            </button>
        </div>
      </div>

      <div className="mb-6 md:mb-8 p-5 bg-white shadow-card rounded-xl">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-x-6 gap-y-4 items-center">
            <div className="md:col-span-4 flex items-center space-x-2">
                <label htmlFor="viewModeToggle" className="text-sm font-medium text-slate-700 whitespace-nowrap sr-only">View Mode:</label>
                 <div id="viewModeToggle" role="radiogroup" aria-label="Schedule view mode" className="flex w-full space-x-2">
                    {(['daily', 'monthly'] as const).map(mode => (
                        <button
                            key={mode}
                            type="button"
                            role="radio"
                            aria-checked={viewMode === mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors w-full
                                ${viewMode === mode ? 'bg-brand-accent text-white shadow-sm ring-2 ring-brand-accent-hover ring-offset-1' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                            `}
                        >
                            {mode.charAt(0).toUpperCase() + mode.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            <div className="md:col-span-4">
                 <label htmlFor="selectedDate" className="sr-only">{viewMode === 'daily' ? 'Select Date' : 'Select Month'}</label>
                 <input
                    type={viewMode === 'daily' ? 'date' : 'month'}
                    id="selectedDate"
                    value={viewMode === 'daily' ? selectedDate : selectedDate.substring(0, 7)}
                    onChange={(e) => setSelectedDate(viewMode === 'daily' ? e.target.value : `${e.target.value}-01`)}
                    className="input-base w-full"
                    aria-label={viewMode === 'daily' ? 'Select Date for Daily View' : 'Select Month for Monthly View'}
                />
            </div>
             <div className="md:col-span-4 text-center md:text-left">
                <p className="text-md font-semibold text-brand-primary" aria-live="polite">
                    {viewMode === 'daily' ? `Displaying: ${getFormattedDate(selectedDate)}` : `Displaying: ${getMonthName(selectedDate)}`}
                </p>
            </div>
        </div>
      </div>
      
      {error && <div role="alert" className="my-4 text-sm text-red-700 bg-red-100 p-3 rounded-md text-center border border-red-300">{error}</div>}
      
      {viewMode === 'monthly' ? renderMonthlyCalendarView() : renderSchedulesTable()}

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          title={editingSchedule ? "Edit Schedule" : "Add New Schedule"}
          footer={
            <>
              <button type="button" onClick={handleCloseModal} className="btn btn-neutral" disabled={isSubmitting}>Cancel</button>
              <button type="submit" form="scheduleForm" className="btn btn-secondary" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : 'Save Schedule'}</button>
            </>
          }
        >
          <form id="scheduleForm" onSubmit={handleSaveSchedule} className="space-y-4">
            <div>
              <label htmlFor="employeeId-modal" className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
              <select
                name="employeeId"
                id="employeeId-modal"
                value={scheduleFormData.employeeId}
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
            <div>
              <label htmlFor="date-modal" className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <input
                type="date"
                name="date"
                id="date-modal"
                value={scheduleFormData.date}
                onChange={handleFormChange}
                required
                className="input-base mt-1 block w-full"
                disabled={isSubmitting}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="shiftStartTime-modal" className="block text-sm font-medium text-slate-700 mb-1">Shift Start Time</label>
                <input
                  type="time"
                  name="shiftStartTime"
                  id="shiftStartTime-modal"
                  value={scheduleFormData.shiftStartTime}
                  onChange={handleFormChange}
                  required
                  className="input-base mt-1 block w-full"
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label htmlFor="shiftEndTime-modal" className="block text-sm font-medium text-slate-700 mb-1">Shift End Time</label>
                <input
                  type="time"
                  name="shiftEndTime"
                  id="shiftEndTime-modal"
                  value={scheduleFormData.shiftEndTime}
                  onChange={handleFormChange}
                  required
                  className="input-base mt-1 block w-full"
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div>
              <label htmlFor="notes-modal" className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
              <textarea
                name="notes"
                id="notes-modal"
                value={scheduleFormData.notes}
                onChange={handleFormChange}
                rows={3}
                className="input-base mt-1 block w-full"
                placeholder="e.g., Special instructions, cover for..."
                disabled={isSubmitting}
              />
            </div>
          </form>
        </Modal>
      )}
       {isBulkModalOpen && (
        <BulkScheduleModal
          isOpen={isBulkModalOpen}
          onClose={handleCloseBulkModal}
          employees={employees}
          onSave={handleSaveBulkSchedule}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Day Schedules Modal */}
      {isDaySchedulesModalOpen && selectedDayForModal && (
        <Modal
          isOpen={isDaySchedulesModalOpen}
          onClose={() => setIsDaySchedulesModalOpen(false)}
          title={`Schedules for ${getFormattedDate(selectedDayForModal)}`}
          size="lg"
        >
          {schedulesForDayModal.length > 0 ? (
            <ul className="space-y-3 max-h-[60vh] overflow-y-auto scrollbar-sleek pr-2">
              {schedulesForDayModal.map(sch => {
                const emp = employees.find(e => e.employeeId === sch.employeeId);
                return (
                  <li key={sch.id} className="p-3 bg-slate-50 rounded-md border border-slate-200 hover:shadow-sm transition-shadow">
                    <button
                      type="button"
                      onClick={() => {
                        handleOpenModal(sch); // Open edit modal
                        setIsDaySchedulesModalOpen(false); // Close this modal
                      }}
                      className="w-full text-left focus:outline-none group"
                      aria-label={`Edit schedule for ${emp ? emp.firstName + ' ' + emp.lastName : sch.employeeId} from ${sch.shiftStartTime} to ${sch.shiftEndTime}`}
                    >
                      <div className="flex justify-between items-center">
                        <p className="font-semibold text-brand-primary group-hover:text-brand-accent">
                          {emp ? `${emp.firstName} ${emp.lastName}` : sch.employeeId}
                        </p>
                        <span className="text-xs text-slate-500 group-hover:text-brand-accent">Click to Edit</span>
                      </div>
                      <p className="text-sm text-slate-700">
                        {sch.shiftStartTime} - {sch.shiftEndTime}
                      </p>
                      {sch.notes && (
                        <p className="text-xs text-slate-500 mt-1 italic truncate" title={sch.notes}>
                          Notes: {sch.notes}
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-slate-500 text-center py-5">No schedules found for this day.</p>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SchedulePage;