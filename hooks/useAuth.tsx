import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
// Corrected and consolidated Firebase Auth imports for v9
import type { User as FirebaseUserType } from 'firebase/auth'; // Explicit type import
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from 'firebase/auth'; // Value imports
import { auth, db } from '../firebase'; // Import auth and db from your firebase.ts
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { User } from '../types'; // Your app's User type

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

// Helper function to convert Firestore Timestamps in an object to JS Dates
const convertFirestoreTimestamps = (data: any): any => {
  if (!data) return data;
  if (data instanceof Timestamp) {
    return data.toDate();
  }
  if (Array.isArray(data)) {
    return data.map(convertFirestoreTimestamps);
  }
  if (typeof data === 'object' && data !== null) { // Ensure data is not null before iterating
    const res: { [key: string]: any } = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) { // Check for own properties
         res[key] = convertFirestoreTimestamps(data[key]);
      }
    }
    return res;
  }
  return data;
};

const mapFirebaseUserToAppUser = (firebaseUser: FirebaseUserType, additionalData?: Record<string, any>): User => {
  const appUser: User = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    profilePictureUrl: firebaseUser.photoURL,
  };

  if (additionalData) {
    // Explicitly pick known and expected fields from additionalData
    if (typeof additionalData.role === 'string') {
      appUser.role = additionalData.role;
    }
    // Ensure createdAt is a JS Date (it should be after convertFirestoreTimestamps)
    if (additionalData.createdAt instanceof Date) {
      appUser.createdAt = additionalData.createdAt;
    }
    // Add other fields from additionalData explicitly if they are part of the User type
    // e.g., if (typeof additionalData.someOtherField === 'string') appUser.someOtherField = additionalData.someOtherField;
  }
  return appUser;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => { 
      if (firebaseUser) {
        let appUser: User;
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);
          
          let processedAdditionalData;
          if (userDocSnap.exists()) {
              processedAdditionalData = convertFirestoreTimestamps(userDocSnap.data());
          }

          appUser = mapFirebaseUserToAppUser(firebaseUser, processedAdditionalData);
          
          if (firebaseUser.email === ADMIN_EMAIL && !userDocSnap.exists()) {
              console.log("Attempting to create admin user document in Firestore...");
              const adminData = { 
                  email: firebaseUser.email, 
                  displayName: firebaseUser.displayName || "Admin User",
                  role: "admin",
                  createdAt: new Date() 
              };
              try {
                  await setDoc(userDocRef, adminData);
                  appUser = mapFirebaseUserToAppUser(firebaseUser, convertFirestoreTimestamps(adminData));
                  console.log("Admin user document created in Firestore.");
              } catch (error) {
                  console.error("Error creating admin user document in Firestore:", error);
                  // appUser would already be set from firebaseUser and potentially non-existent processedAdditionalData
              }
          }
        } catch (error) {
            console.error("useAuth: Error fetching user document (possibly offline):", error);
            // Fallback to basic Firebase Auth user data if Firestore fetch fails
            appUser = mapFirebaseUserToAppUser(firebaseUser, undefined);
        }
        setUser(appUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email?: string, password?: string) => {
    if (!email || !password) {
        throw new Error("Email and password are required.");
    }
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password); 
      // onAuthStateChanged will handle setting the user state and setLoading(false)
    } catch (error) {
      console.error("Firebase login error:", error);
      // setLoading(false) here might be redundant if onAuthStateChanged fires quickly on failure,
      // but it's safer to ensure loading state is reset.
      setLoading(false); 
      if (error instanceof Error && (error.message.includes('auth/invalid-credential') || error.message.includes('auth/user-not-found') || error.message.includes('auth/wrong-password') || error.message.includes('auth/invalid-email'))) {
        throw new Error("Invalid email or password. Please try again.");
      }
      throw new Error("Login failed. Please try again later.");
    }
    // No finally setLoading(false) here, as successful login relies on onAuthStateChanged
  };

  const logout = async () => {
    setLoading(true); 
    try {
      await signOut(auth); // onAuthStateChanged will set user to null and setLoading(false)
    } catch (error) {
      console.error("Firebase logout error:", error);
      setLoading(false); // Ensure loading is reset on error
      throw error;
    }
  };
  
  const updateUserProfileInContext = async () => {
    if (auth.currentUser) {
      // It's possible to be offline here too.
      try {
        const userDocRef = doc(db, "users", auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        let processedAdditionalData;
        if (userDocSnap.exists()) {
            processedAdditionalData = convertFirestoreTimestamps(userDocSnap.data());
        }
        const appUser = mapFirebaseUserToAppUser(auth.currentUser, processedAdditionalData);
        setUser(appUser);
      } catch (error) {
        console.error("updateUserProfileInContext: Error fetching updated user document (possibly offline):", error);
        // Fallback: update with only auth.currentUser data if Firestore fails
        const appUser = mapFirebaseUserToAppUser(auth.currentUser, undefined);
        setUser(appUser);
      }
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