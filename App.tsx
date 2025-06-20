
import React, { useState } from 'react';
import { HashRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import EmployeesPage from './pages/EmployeesPage';
import SettingsPage from './pages/SettingsPage';
import AttendancePage from './pages/AttendancePage';
import TimeLogsPage from './pages/TimeLogsPage';
import SchedulePage from './pages/SchedulePage';
import PayrollPage from './pages/PayrollPage';
import ReportsPage from './pages/ReportsPage';
import { ROUTES, BRAND_COLORS } from './constants';
import { useAuth } from './hooks/useAuth';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, loading } = useAuth(); // Using mock auth for now

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-brand-primary">
        <div className="text-center">
          {/* You could add the APP_LOGO_URL here if desired */}
          <svg className="animate-spin h-10 w-10 text-brand-accent mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-xl font-semibold text-white">Loading EZLitePay...</p>
        </div>
      </div>
    );
  }
  
  const mainContentMarginClass = isSidebarOpen 
    ? 'ml-64' // Sidebar open width (w-64)
    : 'ml-0 md:ml-20'; // Sidebar closed (w-0 on mobile, md:w-20 on medium screens up)

  return (
    <HashRouter>
      <div className="flex h-screen bg-slate-100">
        {user ? (
          <>
            <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />
            <div 
              className={`flex-1 flex flex-col overflow-hidden transition-all duration-200 ease-in-out ${mainContentMarginClass}`}
            >
              <Header toggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
              <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 p-6 md:p-8">
                <Routes>
                  <Route path={ROUTES.DASHBOARD} element={<DashboardPage />} />
                  <Route path={ROUTES.EMPLOYEES} element={<EmployeesPage />} />
                  <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                  <Route path={ROUTES.ATTENDANCE} element={<AttendancePage />} />
                  <Route path={ROUTES.TIME_LOGS} element={<TimeLogsPage />} />
                  <Route path={ROUTES.SCHEDULE} element={<SchedulePage />} />
                  <Route path={ROUTES.PAYROLL} element={<PayrollPage />} />
                  <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
                  <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} />} />
                </Routes>
              </main>
            </div>
          </>
        ) : (
          <Routes>
            <Route path={ROUTES.LOGIN} element={<LoginPage />} />
            <Route path="*" element={<Navigate to={ROUTES.LOGIN} />} />
          </Routes>
        )}
      </div>
    </HashRouter>
  );
};

export default App;