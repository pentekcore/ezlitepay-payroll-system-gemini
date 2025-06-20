import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { Modal } from './Modal';
import { Employee, Schedule } from '../types';

interface BulkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onSave: (schedules: Array<Omit<Schedule, 'id'>>) => void;
  isSubmitting: boolean;
}

type BulkMode = 'week' | 'month';
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BulkScheduleModal: React.FC<BulkScheduleModalProps> = ({
  isOpen,
  onClose,
  employees,
  onSave,
  isSubmitting,
}) => {
  const [employeeId, setEmployeeId] = useState<string>('');
  const [mode, setMode] = useState<BulkMode>('week');
  const [weekStartDate, setWeekStartDate] = useState<string>('');
  const [monthYear, setMonthYear] = useState<string>(''); // YYYY-MM
  const [selectedDays, setSelectedDays] = useState<Record<string, boolean>>({
    Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false,
  });
  const [shiftStartTime, setShiftStartTime] = useState<string>('09:00');
  const [shiftEndTime, setShiftEndTime] = useState<string>('17:00');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      // Set default employee if available
      if (employees.length > 0 && !employeeId) {
        setEmployeeId(employees[0].employeeId);
      }
      // Set default dates
      const today = new Date();
      if (!weekStartDate) {
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + (1 - today.getDay() + 7) % 7); // Next Monday or today if Monday
        if (nextMonday < today) nextMonday.setDate(nextMonday.getDate() + 7); // ensure it's future or today
        setWeekStartDate(nextMonday.toISOString().split('T')[0]);
      }
      if (!monthYear) {
        setMonthYear(today.toISOString().substring(0, 7)); // Current month YYYY-MM
      }
    } else {
        // Optionally reset fields on close, or keep them for next open
        // setEmployeeId(employees.length > 0 ? employees[0].employeeId : '');
        // setMode('week');
        // etc.
    }
  }, [isOpen, employees, employeeId, weekStartDate, monthYear]);

  const handleDayToggle = (day: string) => {
    setSelectedDays(prev => ({ ...prev, [day]: !prev[day] }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!employeeId || !shiftStartTime || !shiftEndTime) {
      alert("Employee, start time, and end time are required.");
      return;
    }

    const schedulesToCreate: Array<Omit<Schedule, 'id'>> = [];
    const baseScheduleData = { employeeId, shiftStartTime, shiftEndTime, notes };

    if (mode === 'week') {
      if (!weekStartDate) {
        alert("Please select a week start date.");
        return;
      }
      const startDate = new Date(weekStartDate + 'T00:00:00'); // Treat as local
      for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        const dayName = DAYS_OF_WEEK[currentDate.getDay()];
        if (selectedDays[dayName]) {
          schedulesToCreate.push({
            ...baseScheduleData,
            date: currentDate.toISOString().split('T')[0],
          });
        }
      }
    } else { // month mode
      if (!monthYear) {
        alert("Please select a month and year.");
        return;
      }
      const [year, month] = monthYear.split('-').map(Number);
      const daysInMonth = new Date(year, month, 0).getDate(); // month is 1-indexed for Date constructor day 0
      for (let day = 1; day <= daysInMonth; day++) {
        const currentDate = new Date(year, month - 1, day); // month is 0-indexed for Date constructor
        const dayName = DAYS_OF_WEEK[currentDate.getDay()];
        if (selectedDays[dayName]) {
          schedulesToCreate.push({
            ...baseScheduleData,
            date: currentDate.toISOString().split('T')[0],
          });
        }
      }
    }
    onSave(schedulesToCreate);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Bulk Schedule"
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn btn-neutral" disabled={isSubmitting}>Cancel</button>
          <button type="submit" form="bulkScheduleForm" className="btn btn-secondary" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Bulk Schedule'}
          </button>
        </>
      }
    >
      <form id="bulkScheduleForm" onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="bulkEmployeeId" className="block text-sm font-medium text-slate-700 mb-1">Employee</label>
          <select
            id="bulkEmployeeId"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
            required
            className="input-base w-full bg-white"
            disabled={isSubmitting}
          >
            <option value="" disabled>Select Employee</option>
            {employees.map(emp => (
              <option key={emp.id} value={emp.employeeId}>{emp.firstName} {emp.lastName} ({emp.employeeId})</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Scheduling Mode</label>
          <div className="flex space-x-4">
            {(['week', 'month'] as BulkMode[]).map(m => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-sm rounded-md font-medium transition-colors w-full
                  ${mode === m ? 'bg-brand-accent text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}
                `}
                disabled={isSubmitting}
              >
                Full {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {mode === 'week' && (
          <div>
            <label htmlFor="weekStartDate" className="block text-sm font-medium text-slate-700 mb-1">Week Starting On</label>
            <input
              type="date"
              id="weekStartDate"
              value={weekStartDate}
              onChange={(e) => setWeekStartDate(e.target.value)}
              required={mode === 'week'}
              className="input-base w-full"
              disabled={isSubmitting}
            />
          </div>
        )}

        {mode === 'month' && (
          <div>
            <label htmlFor="monthYear" className="block text-sm font-medium text-slate-700 mb-1">Select Month</label>
            <input
              type="month"
              id="monthYear"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              required={mode === 'month'}
              className="input-base w-full"
              disabled={isSubmitting}
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Apply to Days</label>
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                type="button"
                onClick={() => handleDayToggle(day)}
                className={`p-2 text-xs rounded-md border transition-colors
                  ${selectedDays[day] ? 'bg-brand-secondary text-white border-brand-secondary-hover' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}
                `}
                disabled={isSubmitting}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="bulkShiftStartTime" className="block text-sm font-medium text-slate-700 mb-1">Shift Start Time</label>
            <input
              type="time"
              id="bulkShiftStartTime"
              value={shiftStartTime}
              onChange={(e) => setShiftStartTime(e.target.value)}
              required
              className="input-base w-full"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label htmlFor="bulkShiftEndTime" className="block text-sm font-medium text-slate-700 mb-1">Shift End Time</label>
            <input
              type="time"
              id="bulkShiftEndTime"
              value={shiftEndTime}
              onChange={(e) => setShiftEndTime(e.target.value)}
              required
              className="input-base w-full"
              disabled={isSubmitting}
            />
          </div>
        </div>

        <div>
          <label htmlFor="bulkNotes" className="block text-sm font-medium text-slate-700 mb-1">Notes (Optional)</label>
          <textarea
            id="bulkNotes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="input-base w-full"
            placeholder="General notes for these shifts"
            disabled={isSubmitting}
          />
        </div>
      </form>
    </Modal>
  );
};

export default BulkScheduleModal;
