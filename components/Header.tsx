import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { DEFAULT_PROFILE_PIC, ROUTES } from '../constants';
import { User } from '../types';

interface HeaderProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ toggleSidebar, isSidebarOpen }) => {
  const { user } = useAuth();

  return (
    <header className="bg-white shadow-sm h-16 flex items-center justify-between px-4 md:px-6 sticky top-0 z-20 flex-shrink-0">
      {/* Left side: Sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="text-slate-500 hover:text-brand-primary p-2 -ml-2 rounded-md"
        aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isSidebarOpen}
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isSidebarOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" /> // Slightly different hamburger
          )}
        </svg>
      </button>
      
      {/* Spacer - Pushes user profile to the right */}
      <div className="flex-grow"></div>

      {/* Right side: User profile */}
      {user && (
        <div className="flex items-center space-x-3">
          <span className="text-slate-700 text-sm font-medium hidden sm:inline">{user.displayName || 'Admin User'}</span>
          <Link to={ROUTES.SETTINGS} state={{ initialTab: 'My Profile' }} className="block">
            <img
              src={user.profilePictureUrl || DEFAULT_PROFILE_PIC}
              alt={user.displayName || 'User'}
              className="h-9 w-9 rounded-full object-cover ring-2 ring-offset-2 ring-brand-accent hover:opacity-90 transition-opacity"
              title="View Profile Settings"
            />
          </Link>
        </div>
      )}
    </header>
  );
};