import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { supabase } from '../supabase';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfileInContext: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Default admin email for initial admin user creation if needed
const ADMIN_EMAIL = 'admin@ezlitepay.com';

const mapSupabaseUserToAppUser = (supabaseUser: SupabaseUser, additionalData?: Record<string, any>): User => {
  const appUser: User = {
    uid: supabaseUser.id,
    email: supabaseUser.email,
    displayName: supabaseUser.user_metadata?.display_name || supabaseUser.user_metadata?.full_name || null,
    profilePictureUrl: supabaseUser.user_metadata?.avatar_url || null,
  };

  if (additionalData) {
    if (typeof additionalData.role === 'string') {
      appUser.role = additionalData.role;
    }
    if (additionalData.created_at) {
      appUser.createdAt = new Date(additionalData.created_at);
    }
  }
  return appUser;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleAuthChange = async (session: Session | null) => {
    if (session?.user) {
      let appUser: User;
      try {
        // Fetch additional user data from profiles table
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error fetching user profile:', error);
        }

        appUser = mapSupabaseUserToAppUser(session.user, profileData);

        // Create profile if it doesn't exist and user is admin
        if (!profileData && session.user.email === ADMIN_EMAIL) {
          console.log('Creating admin user profile...');
          const adminData = {
            id: session.user.id,
            email: session.user.email,
            display_name: session.user.user_metadata?.display_name || 'Admin User',
            role: 'admin',
            created_at: new Date().toISOString()
          };

          const { error: insertError } = await supabase
            .from('profiles')
            .insert(adminData);

          if (insertError) {
            console.error('Error creating admin profile:', insertError);
          } else {
            appUser = mapSupabaseUserToAppUser(session.user, adminData);
            console.log('Admin user profile created successfully');
          }
        }
      } catch (error) {
        console.error('Error handling auth change:', error);
        appUser = mapSupabaseUserToAppUser(session.user);
      }
      setUser(appUser);
    } else {
      setUser(null);
    }
    setLoading(false);
  };

  const login = async (email?: string, password?: string) => {
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
    } catch (error) {
      setLoading(false);
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          throw new Error("Invalid email or password. Please try again.");
        }
      }
      throw new Error("Login failed. Please try again later.");
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      setLoading(false);
      throw error;
    }
  };

  const updateUserProfileInContext = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await handleAuthChange(session);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUserProfileInContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};