
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { APP_NAME, APP_LOGO_URL }
    from '../constants';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
    } catch (err) {
      console.error("Login failed:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred during login.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-primary to-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            className="mx-auto h-20 w-auto mb-6 filter drop-shadow-lg" // Added filter for potential logo enhancement
            src={APP_LOGO_URL} 
            alt={`${APP_NAME} Logo`}
            style={{ filter: 'brightness(0) invert(1) drop-shadow(0 2px 3px rgba(0,0,0,0.3))' }} // Making Reshot SVG logo white
          />
          <h2 className=" text-center text-4xl font-bold text-white">
            Welcome to {APP_NAME}
          </h2>
           <p className="mt-2 text-center text-sm text-slate-300">
            Sign in to access your dashboard.
          </p>
        </div>
        
        <div className="bg-white p-8 rounded-2xl shadow-2xl space-y-6">
            {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md text-center">{error}</p>}
            <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
                <label htmlFor="email-address" className="block text-sm font-medium text-slate-700 mb-1">
                Email address
                </label>
                <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="input-base"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                />
            </div>
            <div>
                <label htmlFor="password_id" className="block text-sm font-medium text-slate-700 mb-1">
                Password
                </label>
                <input
                id="password_id"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="input-base"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                />
            </div>

            {/* Optional: Remember me / Forgot password */}
            {/* <div className="flex items-center justify-between">
                <div className="text-sm">
                <a href="#" className="btn-link">
                    Forgot your password?
                </a>
                </div>
            </div> */}

            <div>
                <button
                type="submit"
                disabled={loading}
                className="w-full btn btn-primary py-3"
                >
                {loading ? (
                    <svg className="animate-spin h-5 w-5 text-white mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    "Sign in"
                )}
                </button>
            </div>
            </form>
            {/* Removed misleading demo text
            <p className="mt-4 text-center text-xs text-slate-500">
            (Demo: Any email/password will work to proceed)
            </p>
            */}
        </div>
         <p className="mt-8 text-center text-xs text-slate-400">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
};

export default LoginPage;