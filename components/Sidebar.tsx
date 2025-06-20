
import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { APP_NAME, ROUTES, LogoutIcon, APP_LOGO_URL, APP_LOGO_URL_COLLAPSED, DEFAULT_PROFILE_PIC } from '../constants';
import { useAuth } from '../hooks/useAuth';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

const NavItem: React.FC<{ to: string; label: string; shortLabel: string; icon?: React.ReactNode, isOpen: boolean }> = ({ to, label, shortLabel, icon, isOpen }) => {
  return (
    <NavLink
      to={to}
      className={(navState) => {
        const navLinkIsActive = navState.isActive;
        return `flex items-center py-3 transition-colors duration-150 ease-in-out group ${
          isOpen ? 'px-4 justify-start' : 'px-0 md:px-2 md:justify-center' // Centered when collapsed on md
        } ${
          navLinkIsActive
            ? 'bg-brand-primary-light text-brand-accent font-semibold rounded-md'
            : 'text-slate-100 hover:bg-white/10 hover:text-white rounded-md'
        }`;
      }}
      title={label} // Always show full label on hover
    >
      {(navState) => {
        const childrenIsActive = navState.isActive;
        return (
          <>
            {icon && (
              <span className={`
                ${childrenIsActive ? 'text-brand-accent' : 'text-slate-200 group-hover:text-white'}
                ${isOpen ? 'mr-3' : 'md:mr-0'} h-8 w-8 flex-shrink-0 flex items-center justify-center text-2xl
              `}>
                {icon}
              </span>
            )}
            {isOpen && (
                <span className={`text-sm opacity-100 transition-opacity duration-200`}>
                    {label}
                </span>
            )}
            {/* When collapsed on md screens, text is hidden by parent width and overflow-hidden */}
            {!isOpen && <span className="hidden md:opacity-0">{shortLabel}</span>} 
          </>
        );
      }}
    </NavLink>
  );
};


export const Sidebar: React.FC<SidebarProps> = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const isEffectivelyMobileCollapsed = !isOpen && (typeof window !== 'undefined' && window.innerWidth < 768);

  return (
    <div
      className={`fixed inset-y-0 left-0 z-30 bg-brand-primary text-white flex flex-col shadow-xl scrollbar-sleek ${
        isOpen ? 'w-64' : 'w-0 md:w-20 overflow-hidden'
      } transition-all duration-200 ease-in-out`}
      aria-hidden={!isOpen && isEffectivelyMobileCollapsed}
    >
      {/* Logo */}
      <div className={`flex items-center justify-center h-24 border-b border-white/10 flex-shrink-0 ${isOpen ? 'px-4' : 'px-0 md:px-2'}`}>
        <img 
            src={isOpen ? APP_LOGO_URL : APP_LOGO_URL_COLLAPSED} 
            alt={`${APP_NAME} Logo`} 
            className={`transition-all duration-300 object-contain ${isOpen ? 'h-20' : 'md:h-12 h-0'}`} // h-0 for mobile collapsed
        />
      </div>

      {/* Navigation Links */}
      <nav className={`flex-grow py-4 space-y-1.5 overflow-y-auto overflow-x-hidden ${isOpen ? 'px-3' : 'px-0 md:px-2'}`}>
        <NavItem to={ROUTES.DASHBOARD} label="Dashboard" shortLabel="Dash" icon="🏠" isOpen={isOpen} />
        <NavItem to={ROUTES.EMPLOYEES} label="Employees" shortLabel="Staff" icon="🧑‍🤝‍🧑" isOpen={isOpen} />
        <NavItem to={ROUTES.ATTENDANCE} label="Attendance" shortLabel="Scan" icon="📷" isOpen={isOpen} />
        <NavItem to={ROUTES.TIME_LOGS} label="Time Logs" shortLabel="Logs" icon="⏱️" isOpen={isOpen} />
        <NavItem to={ROUTES.SCHEDULE} label="Schedule" shortLabel="Sched" icon="🗓️" isOpen={isOpen} />
        <NavItem to={ROUTES.PAYROLL} label="Payroll" shortLabel="Pay" icon="💰" isOpen={isOpen} />
        <NavItem to={ROUTES.REPORTS} label="Reports" shortLabel="Stats" icon="📊" isOpen={isOpen} />
        <NavItem to={ROUTES.SETTINGS} label="Settings" shortLabel="Prefs" icon="⚙️" isOpen={isOpen} />
      </nav>

      {/* Bottom Logout Button */}
      {user && (
         <div className={`border-t border-white/10 flex-shrink-0 ${isOpen ? 'p-4' : 'md:p-2 flex flex-col items-center'}`}>
          <button
            onClick={handleLogout}
            className={`w-full flex items-center py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-brand-primary bg-brand-accent hover:bg-brand-accent-hover focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-brand-primary 
              ${isOpen ? 'px-4 justify-center' : 'md:w-12 md:h-12 md:p-0 justify-center'}`}
            title="Logout"
          >
            {isOpen && <span>Logout</span>}
            {!isOpen && (
              <span className="text-white hidden md:inline-block"> {/* Ensure icon is visible on md screens */}
                <LogoutIcon />
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
