import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Teacher, Theme } from '../types';

interface AuthContextType {
  user: { uid: string; email?: string; displayName?: string } | null;
  teacher: Teacher | null;
  loading: boolean;
  isAuthReady: boolean;
  setTheme: (theme: Theme) => void;
  login: (uid: string, teacher: Teacher) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ uid: string; email?: string; displayName?: string } | null>(null);
  const [teacher, setTeacher] = useState<Teacher | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const applyTheme = (theme: Theme) => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'blue', 'purple');
    root.classList.add(theme);
  };

  const setTheme = (theme: Theme) => {
    applyTheme(theme);
  };

  const login = (uid: string, teacherData: Teacher) => {
    setUser({ uid, email: teacherData.email || '', displayName: teacherData.name || '' });
    setTeacher(teacherData);
    if (teacherData.theme) applyTheme(teacherData.theme);
  };

  const logout = () => {
    auth.signOut();
    setUser(null);
    setTeacher(null);
    applyTheme('light');
  };

  useEffect(() => {
    // Safety timeout for loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization timeout reached");
        setLoading(false);
        setIsAuthReady(true);
      }
    }, 10000);

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // We use the email prefix as the teacherUid to maintain consistency with previous logic
          const teacherUid = firebaseUser.email?.split('@')[0] || firebaseUser.uid;
          
          // Special case for hardcoded Admin
          if (teacherUid === 'admin' && firebaseUser.email === 'admin@tutorflow.com') {
            const adminData: Teacher = {
              uid: 'admin',
              name: 'Administrator',
              email: 'admin@tutorflow.com',
              role: 'admin',
              plan: 'Enterprise',
              planStartDate: new Date().toISOString(),
              theme: 'dark',
              notifications: {
                email: true,
                whatsapp: true,
                paymentReminders: true,
              },
              createdAt: new Date().toISOString(),
            };
            setTeacher(adminData);
            setUser({ uid: 'admin', email: adminData.email, displayName: adminData.name });
            applyTheme('dark');
            // We still try to fetch from Firestore to get any updates, but we have a baseline
          }

          const teacherRef = doc(db, 'teachers', teacherUid);
          const teacherSnap = await getDoc(teacherRef);
          
          if (teacherSnap.exists()) {
            const data = teacherSnap.data() as Teacher;
            setTeacher(data);
            setUser({ uid: teacherUid, email: data.email || '', displayName: data.name || '' });
            if (data.theme) applyTheme(data.theme);
          } else {
            // If user exists in Auth but not in Firestore, don't sign out immediately
            // as it might be a new user being created in Login.tsx
            console.log("Teacher profile not found in Firestore for:", teacherUid);
            setUser({ uid: teacherUid, email: firebaseUser.email || '', displayName: firebaseUser.displayName || '' });
          }
        } catch (error) {
          console.error("Error initializing teacher profile:", error);
          // Still set the basic user info so the app can at least try to load
          setUser({ uid: firebaseUser.uid, email: firebaseUser.email || '', displayName: firebaseUser.displayName || '' });
        }
      } else {
        setUser(null);
        setTeacher(null);
      }
      clearTimeout(loadingTimeout);
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => {
      unsubscribe();
      clearTimeout(loadingTimeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, teacher, loading, isAuthReady, setTheme, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
