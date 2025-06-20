
import React, { useState, useEffect, useCallback } from 'react';
import { APP_NAME, APP_LOGO_URL } from '../constants';
import { Employee } from '../types';
import { getEmployees, getCompanyInfo } from '../services/supabaseService';

const MAX_BREAKS = 2;
const MAX_LUNCHES = 1; // Per clock-in session

interface EmployeeAttendanceState {
  employeeId: string;
  name: string;
  status: 'Clocked Out' | 'Clocked In' | 'On Break' | 'On Lunch';
  lastClockInTime?: Date;
  breakStartTime?: Date;
  breakCount: number;
  lunchStartTime?: Date;
  lunchTakenThisSession: boolean;
  lastActivityTime: Date;
  lastMessage: string;
}

// Simulate scanning a specific employee for demo purposes
const SIMULATED_EMP_ID = 'E004'; // Eva Williams from mock data

const AttendancePage: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [displayMessage, setDisplayMessage] = useState<string>("Click 'Simulate Scan' to begin.");
  const [actionButtons, setActionButtons] = useState<Array<{ label: string; action: () => void; style?: string }>>([]);
  
  const [employeeStates, setEmployeeStates] = useState<Record<string, EmployeeAttendanceState>>({});
  const [currentScannedEmployee, setCurrentScannedEmployee] = useState<EmployeeAttendanceState | null>(null);
  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);

  // State for company specific branding
  const [companyName, setCompanyName] = useState<string>(APP_NAME);
  const [companyLogoUrl, setCompanyLogoUrl] = useState<string>(APP_LOGO_URL);
  const [isCompanyInfoLoading, setIsCompanyInfoLoading] = useState<boolean>(true);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    
    const fetchInitialData = async () => {
        setIsCompanyInfoLoading(true);
        try {
            const [emps, companyInfo] = await Promise.all([
                getEmployees(),
                getCompanyInfo()
            ]);
            setAllEmployees(emps);
            if (companyInfo) {
                setCompanyName(companyInfo.name || APP_NAME);
                setCompanyLogoUrl(companyInfo.logoUrl || APP_LOGO_URL);
            }
        } catch (error) {
            console.error("Failed to fetch initial data for Attendance Page:", error);
            // Fallbacks are already set in useState initial values
        } finally {
            setIsCompanyInfoLoading(false);
        }
    };

    fetchInitialData();
    return () => clearInterval(timer);
  }, []);

  const getEmployeeName = useCallback((employeeId: string): string => {
    const emp = allEmployees.find(e => e.employeeId === employeeId);
    return emp ? `${emp.firstName} ${emp.lastName}` : employeeId;
  }, [allEmployees]);


  const updateEmployeeState = useCallback((employeeId: string, updates: Partial<EmployeeAttendanceState>) => {
    setEmployeeStates(prev => {
      const existingState = prev[employeeId] || {
        employeeId,
        name: getEmployeeName(employeeId),
        status: 'Clocked Out',
        breakCount: 0,
        lunchTakenThisSession: false,
        lastActivityTime: new Date(),
        lastMessage: '',
      };
      const newState = { ...existingState, ...updates, name: getEmployeeName(employeeId), lastActivityTime: new Date() };
      
      if (currentScannedEmployee && currentScannedEmployee.employeeId === employeeId) {
        setCurrentScannedEmployee(newState);
      }
      setDisplayMessage(newState.lastMessage || displayMessage);
      updateActionButtons(newState);
      return { ...prev, [employeeId]: newState };
    });
  }, [getEmployeeName, currentScannedEmployee, displayMessage]);

  const updateActionButtons = (state: EmployeeAttendanceState | null) => {
    if (!state) {
      setActionButtons([]);
      return;
    }
    const buttons: Array<{ label: string; action: () => void; style?: string }> = [];
    switch (state.status) {
      case 'Clocked In':
        if (state.breakCount < MAX_BREAKS) {
          buttons.push({ label: 'Start Break', action: () => handleStartBreak(state.employeeId) });
        }
        if (!state.lunchTakenThisSession) {
            buttons.push({ label: 'Start Lunch', action: () => handleStartLunch(state.employeeId) });
        }
        buttons.push({ label: 'Clock Out', action: () => handleClockOut(state.employeeId), style: 'bg-red-500/80 hover:bg-red-600/80 text-white focus:ring-red-400' });
        break;
      case 'On Break':
        buttons.push({ label: 'End Break', action: () => handleEndBreak(state.employeeId) });
        break;
      case 'On Lunch':
        buttons.push({ label: 'End Lunch', action: () => handleEndLunch(state.employeeId) });
        break;
      case 'Clocked Out':
        break;
    }
    setActionButtons(buttons);
  };
  
  const processScannedId = useCallback((employeeId: string) => {
    const name = getEmployeeName(employeeId);
    let state = employeeStates[employeeId];

    if (!state || state.status === 'Clocked Out') {
      const newClockInTime = new Date();
      updateEmployeeState(employeeId, {
        status: 'Clocked In',
        lastClockInTime: newClockInTime,
        breakCount: 0,
        lunchTakenThisSession: false, 
        lastMessage: `${name} (${employeeId}) Clocked In at ${newClockInTime.toLocaleTimeString()}.`,
      });
    } else {
      setCurrentScannedEmployee(state); 
      setDisplayMessage(`${name} (${employeeId}) is currently ${state.status}. Last activity: ${state.lastActivityTime.toLocaleTimeString()}`);
      updateActionButtons(state);
    }
  }, [employeeStates, updateEmployeeState, getEmployeeName]);

  const handleStartBreak = (employeeId: string) => {
    const state = employeeStates[employeeId];
    if (state && state.status === 'Clocked In' && state.breakCount < MAX_BREAKS) {
      const breakTime = new Date();
      updateEmployeeState(employeeId, {
        status: 'On Break',
        breakStartTime: breakTime,
        breakCount: state.breakCount + 1,
        lastMessage: `${state.name} started Break #${state.breakCount + 1} at ${breakTime.toLocaleTimeString()}.`,
      });
    } else if (state && state.breakCount >= MAX_BREAKS) {
        setDisplayMessage(`${state.name} has reached the maximum of ${MAX_BREAKS} breaks.`);
    }
  };

  const handleEndBreak = (employeeId: string) => {
    const state = employeeStates[employeeId];
    if (state && state.status === 'On Break') {
      const endTime = new Date();
      updateEmployeeState(employeeId, {
        status: 'Clocked In',
        breakStartTime: undefined,
        lastMessage: `${state.name} ended Break at ${endTime.toLocaleTimeString()}. Now Clocked In.`,
      });
    }
  };

  const handleStartLunch = (employeeId: string) => {
    const state = employeeStates[employeeId];
    if (state && state.status === 'Clocked In' && !state.lunchTakenThisSession) {
      const lunchTime = new Date();
      updateEmployeeState(employeeId, {
        status: 'On Lunch',
        lunchStartTime: lunchTime,
        lunchTakenThisSession: true,
        lastMessage: `${state.name} started Lunch at ${lunchTime.toLocaleTimeString()}.`,
      });
    } else if (state && state.lunchTakenThisSession) {
        setDisplayMessage(`${state.name} has already taken lunch this session.`);
    }
  };

  const handleEndLunch = (employeeId: string) => {
    const state = employeeStates[employeeId];
    if (state && state.status === 'On Lunch') {
      const endTime = new Date();
      updateEmployeeState(employeeId, {
        status: 'Clocked In',
        lunchStartTime: undefined,
        lastMessage: `${state.name} ended Lunch at ${endTime.toLocaleTimeString()}. Now Clocked In.`,
      });
    }
  };

  const handleClockOut = (employeeId: string) => {
    const state = employeeStates[employeeId];
    if (state && (state.status === 'Clocked In' || state.status === 'On Break' || state.status === 'On Lunch')) {
      const clockOutTime = new Date();
      updateEmployeeState(employeeId, {
        status: 'Clocked Out',
        breakStartTime: undefined, 
        lunchStartTime: undefined,
        lastMessage: `${state.name} Clocked Out at ${clockOutTime.toLocaleTimeString()}.`,
      });
    }
  };

  const simulateScan = () => {
    if (!SIMULATED_EMP_ID) {
        setDisplayMessage("No employee ID configured for simulation.");
        return;
    }
    processScannedId(SIMULATED_EMP_ID);
  };


  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-primary to-slate-900 text-white p-4 selection:bg-brand-accent selection:text-brand-primary">
      <div className="w-full max-w-xl bg-white/10 backdrop-blur-md p-6 md:p-8 rounded-2xl shadow-2xl text-center">
        {!isCompanyInfoLoading && companyLogoUrl && (
            <img 
                src={companyLogoUrl} 
                alt={`${companyName} Logo`} 
                className="mx-auto h-12 mb-3 filter drop-shadow-md object-contain" // Added object-contain
                style={{ filter: 'brightness(0) invert(1) drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
            />
        )}
        <h1 className="text-3xl md:text-4xl font-bold mb-1">
            {isCompanyInfoLoading ? APP_NAME : companyName} Attendance
        </h1>
        <p className="text-lg md:text-xl font-light text-slate-300 mb-4">
          {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
        <p className="text-5xl md:text-6xl font-mono font-bold mb-6 tracking-wide text-brand-accent drop-shadow-sm">
          {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>

        <button 
            onClick={simulateScan}
            className="w-full btn-primary py-3 text-lg mb-5"
        >
            Simulate Scan ({getEmployeeName(SIMULATED_EMP_ID) || 'Employee'} - {SIMULATED_EMP_ID})
        </button>
        
        <div className="mt-1 mb-5 text-center min-h-[40px] bg-slate-700/50 p-3 rounded-lg shadow-inner">
            <p className={`text-md md:text-lg transition-opacity duration-300 ${displayMessage ? 'opacity-100' : 'opacity-0'}`}>
                {displayMessage}
            </p>
        </div>

        {currentScannedEmployee && actionButtons.length > 0 && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {actionButtons.map((btn, index) => (
              <button
                key={index}
                onClick={btn.action}
                className={`py-2.5 text-sm ${btn.style ? btn.style : 'btn-secondary'}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        )}
         {currentScannedEmployee && currentScannedEmployee.status !== 'Clocked Out' && actionButtons.length === 0 && (
            <p className="text-slate-400 text-sm mt-3">No further actions available for current state. Scan again to refresh options if applicable.</p>
        )}

        <footer className="mt-8 text-xs text-slate-400/70">
          Powered by {isCompanyInfoLoading ? APP_NAME : companyName} &copy; {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
};

export default AttendancePage;
