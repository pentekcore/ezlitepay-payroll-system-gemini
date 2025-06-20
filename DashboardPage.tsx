
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants';
import { Employee, TimeLog } from '../types';
import { getEmployees, getTimeLogs, forceClockOutEmployee } from '../services/firebaseService'; // Added forceClockOutEmployee

// Icons using emojis for simplicity, can be replaced with SVGs
const TotalEmployeesIcon = () => <span className="text-2xl p-2 bg-green-200/50 rounded-full">👥</span>;
const PresentTodayIcon = () => <span className="text-2xl p-2 bg-blue-200/50 rounded-full">✅</span>;
const AbsentTodayIcon = () => <span className="text-2xl p-2 bg-red-200/50 rounded-full">❌</span>;
const OnLeaveIcon = () => <span className="text-2xl p-2 bg-yellow-200/50 rounded-full">✈️</span>;

const GiftIcon = () => <span className="text-lg mr-2">🎁</span>;
const CalendarIcon = () => <span className="text-lg mr-2">📅</span>;
const ClockIcon = () => <span className="text-lg mr-2">⏱️</span>;

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  comparisonText?: string;
  colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, comparisonText, colorClass }) => (
  <div className={`p-5 rounded-xl shadow-card bg-white flex items-center justify-between`}>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="text-3xl font-bold text-brand-primary mt-1">{value}</p>
      {comparisonText && <p className="text-xs text-slate-400 mt-1">{comparisonText}</p>}
    </div>
    <div className={`p-3 rounded-full ${colorClass}`}>
      {icon}
    </div>
  </div>
);

interface ActiveEmployeeMonitorInfo {
  id: string; // Document ID
  employeeId: string; // Custom Employee ID (e.g., E001)
  name: string;
  profilePictureUrl?: string;
  status: string; // e.g., "Clocked In"
  statusStartTime: Date; 
  department?: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date()); 

  const [todayBirthdays, setTodayBirthdays] = useState<Employee[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Employee[]>([]);
  const [todayAnniversaries, setTodayAnniversaries] = useState<Array<Employee & { yearsOfService: number }>>([]);
  const [upcomingAnniversaries, setUpcomingAnniversaries] = useState<Array<Employee & { yearsOfService: number }>>([]);
  
  const [tardinessFilter, setTardinessFilter] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [activeEmployeesForMonitor, setActiveEmployeesForMonitor] = useState<ActiveEmployeeMonitorInfo[]>([]);
  const [forceLogoutStates, setForceLogoutStates] = useState<Record<string, boolean>>({});


  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [emps, allTimeLogs] = await Promise.all([
          getEmployees(),
          getTimeLogs() 
      ]);
      setEmployees(emps.filter(e => !e.isArchived)); 

      const today = new Date();
      const todayMonth = today.getMonth();
      const todayDate = today.getDate();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);
      const currentYear = today.getFullYear();

      const tb: Employee[] = [];
      const ub: Employee[] = [];
      const ta: Array<Employee & { yearsOfService: number }> = [];
      const ua: Array<Employee & { yearsOfService: number }> = [];

      emps.filter(e => !e.isArchived && e.status === 'Active').forEach(emp => {
        if (emp.birthDate) {
          const birthDate = new Date(emp.birthDate + "T00:00:00");
          const birthMonth = birthDate.getMonth();
          const birthDay = birthDate.getDate();
          if (birthMonth === todayMonth && birthDay === todayDate) tb.push(emp);
          else {
            const nextBirthdayThisYear = new Date(currentYear, birthMonth, birthDay);
            const nextBirthdayNextYear = new Date(currentYear + 1, birthMonth, birthDay);
            if ((nextBirthdayThisYear >= today && nextBirthdayThisYear <= nextWeek) || 
                (nextBirthdayNextYear >= today && nextBirthdayNextYear <= nextWeek && currentYear !== nextBirthdayThisYear.getFullYear())) {
                 ub.push(emp);
            }
          }
        }
        if (emp.startDate) {
          const startDate = new Date(emp.startDate + "T00:00:00");
          const startMonth = startDate.getMonth();
          const startDay = startDate.getDate();
          const years = currentYear - startDate.getFullYear();
          if (startMonth === todayMonth && startDay === todayDate && years > 0) ta.push({ ...emp, yearsOfService: years });
          else {
            const nextAnniversaryThisYear = new Date(currentYear, startMonth, startDay);
            const nextAnniversaryNextYear = new Date(currentYear + 1, startMonth, startDay);
             if (((nextAnniversaryThisYear > today && nextAnniversaryThisYear <= nextWeek) ||
                 (nextAnniversaryNextYear > today && nextAnniversaryNextYear <= nextWeek && currentYear !== nextAnniversaryThisYear.getFullYear())) 
                 && (currentYear - startDate.getFullYear() >=0)) {
                ua.push({ ...emp, yearsOfService: currentYear - startDate.getFullYear() + (nextAnniversaryThisYear < today ? 1 : 0) });
             }
          }
        }
      });
      setTodayBirthdays(tb);
      setUpcomingBirthdays(ub.sort((a,b) => (new Date(a.birthDate).getMonth()*100 + new Date(a.birthDate).getDate()) - (new Date(b.birthDate).getMonth()*100 + new Date(b.birthDate).getDate())));
      setTodayAnniversaries(ta);
      setUpcomingAnniversaries(ua.sort((a,b) => (new Date(a.startDate).getMonth()*100 + new Date(a.startDate).getDate()) - (new Date(b.startDate).getMonth()*100 + new Date(b.startDate).getDate())));
      
      const todayString = today.toISOString().split('T')[0];
      const currentActiveEmployees: ActiveEmployeeMonitorInfo[] = [];

      emps.filter(e => !e.isArchived && e.status === 'Active').forEach(emp => {
        const empTodayLogs = allTimeLogs
          .filter(log => log.employeeId === emp.employeeId && log.timestamp.toISOString().split('T')[0] === todayString)
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        if (empTodayLogs.length > 0) {
          const lastLog = empTodayLogs[empTodayLogs.length - 1];
          if (lastLog.type === 'Clock In') {
            currentActiveEmployees.push({
              id: emp.id,
              employeeId: emp.employeeId, // Store employeeId
              name: `${emp.firstName} ${emp.lastName}`,
              profilePictureUrl: emp.profilePictureUrl,
              department: emp.department,
              status: 'Clocked In',
              statusStartTime: lastLog.timestamp 
            });
          }
        }
      });
      setActiveEmployeesForMonitor(currentActiveEmployees);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    const timerId = setInterval(() => setCurrentTime(new Date()), 1000); 
    return () => clearInterval(timerId);
  }, [fetchDashboardData]);

  const handleForceLogout = async (employeeId: string, employeeName: string) => {
    if (!window.confirm(`Are you sure you want to force clock out ${employeeName}? This action cannot be undone.`)) {
      return;
    }
    setForceLogoutStates(prev => ({ ...prev, [employeeId]: true }));
    try {
      await forceClockOutEmployee(employeeId);
      alert(`${employeeName} has been clocked out.`);
      // Refresh data to update the monitor
      await fetchDashboardData(); 
    } catch (error) {
      console.error(`Error forcing logout for ${employeeId}:`, error);
      alert(`Failed to force clock out ${employeeName}. Please try again.`);
    } finally {
      setForceLogoutStates(prev => ({ ...prev, [employeeId]: false }));
    }
  };

  const activeEmployeesCount = employees.filter(e => e.status === 'Active' && !e.isArchived).length;
  
  const quickAccessLinks = [
    { label: "Add New Employee", to: ROUTES.EMPLOYEES, state: { openAddModal: true } },
    { label: "Process Payroll", to: ROUTES.PAYROLL },
    { label: "View Attendance", to: ROUTES.ATTENDANCE },
    { label: "Generate Reports", to: ROUTES.REPORTS },
  ];

  const formatDuration = (startTime: Date, endTime: Date): string => {
    let diff = Math.max(0, endTime.getTime() - startTime.getTime()); 

    const hours = Math.floor(diff / (1000 * 60 * 60));
    diff -= hours * (1000 * 60 * 60);

    const minutes = Math.floor(diff / (1000 * 60));
    diff -= minutes * (1000 * 60);

    const seconds = Math.floor(diff / 1000);

    let durationString = "";
    if (hours > 0) durationString += `${hours}h `;
    if (minutes > 0 || hours > 0) durationString += `${minutes}m `; 
    durationString += `${seconds}s`;
    
    return durationString.trim();
  };

  return (
    <div className="container mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold text-brand-primary mb-6 md:mb-8">
        Dashboard
      </h1>

      {/* Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6 mb-8">
        <StatCard title="Total Employees" value={isLoading ? '...' : activeEmployeesCount} icon={<TotalEmployeesIcon />} comparisonText="+0% vs last month" colorClass="bg-green-100 text-green-700"/>
        <StatCard title="Present Today" value={isLoading ? '...' : activeEmployeesForMonitor.length} icon={<PresentTodayIcon />} comparisonText="+0% vs last month" colorClass="bg-blue-100 text-blue-700"/>
        <StatCard title="Absent Today" value="0" icon={<AbsentTodayIcon />} comparisonText="+0% vs last month" colorClass="bg-red-100 text-red-700"/>
        <StatCard title="On Leave" value="0" icon={<OnLeaveIcon />} comparisonText="0% vs last month" colorClass="bg-yellow-100 text-yellow-700"/>
      </div>

      {/* Quick Access */}
      <div className="mb-8 p-5 bg-white shadow-card rounded-xl">
        <h2 className="text-xl font-semibold text-brand-primary mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickAccessLinks.map(link => (
            <Link
              key={link.label}
              to={link.to}
              state={link.state}
              className="block p-4 bg-slate-50 hover:bg-slate-100 rounded-lg shadow-sm transition-all duration-200 text-center focus:outline-none focus:ring-2 focus:ring-brand-accent"
            >
              <p className="text-sm font-medium text-brand-primary">{link.label}</p>
            </Link>
          ))}
        </div>
      </div>
      
      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Employee Status Monitor (Left Column) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-card">
          <h2 className="text-xl font-semibold text-brand-primary mb-1">Employee Status Monitor</h2>
          <p className="text-xs text-slate-500 mb-4">Employees currently active. (Data from Time Logs)</p>
          {isLoading ? (
             <div className="h-60 flex items-center justify-center text-slate-400 text-sm">Loading status...</div>
          ) : activeEmployeesForMonitor.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-sleek pr-2">
              {activeEmployeesForMonitor.map(emp => (
                <div key={emp.id} className="flex items-center p-3 bg-slate-50/70 rounded-lg border border-slate-200 hover:shadow-sm transition-shadow">
                  <img src={emp.profilePictureUrl || undefined} alt={emp.name} className="w-10 h-10 rounded-full object-cover mr-3"/>
                  <div className="flex-grow">
                    <p className="font-medium text-sm text-slate-800">{emp.name}</p>
                    <p className="text-xs text-slate-500">{emp.department}</p>
                  </div>
                  <div className="text-right flex flex-col items-end space-y-1">
                     <div>
                        <span className="px-2 py-0.5 inline-block rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            {emp.status}
                        </span>
                        <p className="text-xs text-slate-400 mt-0.5">
                        for {formatDuration(emp.statusStartTime, currentTime)}
                        </p>
                    </div>
                    <button
                        onClick={() => handleForceLogout(emp.employeeId, emp.name)}
                        disabled={forceLogoutStates[emp.employeeId]}
                        className="px-2.5 py-1 text-xs btn btn-neutral hover:bg-red-100 hover:text-red-600 focus:ring-red-400 disabled:opacity-60"
                        title="Force Clock Out"
                        aria-label={`Force clock out ${emp.name}`}
                    >
                        {forceLogoutStates[emp.employeeId] ? 'Logging out...' : 'Force Out'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-60 flex items-center justify-center border border-dashed border-slate-200 rounded-md bg-slate-50/50">
              <p className="text-slate-400 text-sm">No employees are currently clocked in or active.</p>
            </div>
          )}
        </div>

        {/* Birthdays & Anniversaries (Right Column) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl shadow-card">
            <h3 className="text-lg font-semibold text-brand-primary mb-3 flex items-center"><GiftIcon />Birthdays</h3>
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-600">Today's Birthdays:</p>
              {isLoading && <p className="text-xs text-slate-400">Loading...</p>}
              {!isLoading && todayBirthdays.length === 0 && <p className="text-xs text-slate-400">No birthdays today.</p>}
              {todayBirthdays.map(emp => <p key={emp.id} className="text-xs text-slate-700">{emp.firstName} {emp.lastName}</p>)}
              
              <p className="font-medium text-slate-600 pt-2 mt-2 border-t border-slate-100">Upcoming Birthdays (Next 7 Days):</p>
              {isLoading && <p className="text-xs text-slate-400">Loading...</p>}
              {!isLoading && upcomingBirthdays.length === 0 && <p className="text-xs text-slate-400">No upcoming birthdays this week.</p>}
              {upcomingBirthdays.map(emp => (
                <div key={emp.id} className="flex justify-between items-center text-xs text-slate-700">
                  <span>{emp.firstName} {emp.lastName}</span>
                  <span className="text-slate-500 text-[10px]">{new Date(emp.birthDate+'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-card">
            <h3 className="text-lg font-semibold text-brand-primary mb-3 flex items-center"><CalendarIcon />Anniversaries</h3>
             <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-600">Today's Anniversaries:</p>
              {isLoading && <p className="text-xs text-slate-400">Loading...</p>}
              {!isLoading && todayAnniversaries.length === 0 && <p className="text-xs text-slate-400">No work anniversaries today.</p>}
              {todayAnniversaries.map(emp => (
                <p key={emp.id} className="text-xs text-slate-700">{emp.firstName} {emp.lastName} ({emp.yearsOfService} years)</p>
              ))}

              <p className="font-medium text-slate-600 pt-2 mt-2 border-t border-slate-100">Upcoming Anniversaries (Next 7 Days):</p>
              {isLoading && <p className="text-xs text-slate-400">Loading...</p>}
              {!isLoading && upcomingAnniversaries.length === 0 && <p className="text-xs text-slate-400">No upcoming anniversaries this week.</p>}
              {upcomingAnniversaries.map(emp => (
                <div key={emp.id} className="flex items-center text-xs text-slate-700">
                    <img src={emp.profilePictureUrl || undefined} alt="" className="w-5 h-5 rounded-full mr-1.5 object-cover"/>
                    <div className="flex-grow flex justify-between items-center">
                        <span>{emp.firstName} {emp.lastName} ({emp.yearsOfService} years)</span>
                        <span className="text-slate-500 text-[10px]">{new Date(emp.startDate+'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                    </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tardiness Report */}
      <div className="bg-white p-6 rounded-xl shadow-card">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-brand-primary flex items-center"><ClockIcon />Tardiness Report</h2>
            <select 
                value={tardinessFilter} 
                onChange={(e) => setTardinessFilter(e.target.value as any)}
                className="input-base text-sm py-1 px-2 w-auto bg-white"
            >
                <option value="daily">Daily</option>
                <option value="weekly">This Week</option>
                <option value="monthly">This Month</option>
            </select>
        </div>
        <p className="text-xs text-slate-500 mb-3">Today: 0 employees late, 0 mins.</p>
        <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="p-2 text-left font-medium text-slate-500">Date</th>
                        <th className="p-2 text-left font-medium text-slate-500">Employee</th>
                        <th className="p-2 text-left font-medium text-slate-500">Position</th>
                        <th className="p-2 text-right font-medium text-slate-500">Late (Mins)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td colSpan={4} className="p-10 text-center text-slate-400 border-t border-dashed">
                            No tardiness records for this period.
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
