import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from './firebase';
import { onAuthStateChanged, setPersistence, browserSessionPersistence } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { Teacher, Theme } from '../types';

interface AuthContextType {
  user: { uid: string; email?: string; displayName?: string } | null;
  teacher: Teacher | null;
  loading: boolean;
  isAuthReady: boolean;
  isRealAdmin: boolean;
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
  const [isRealAdmin, setIsRealAdmin] = useState(false);

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
    setIsRealAdmin(false);
    applyTheme('light');
  };

  useEffect(() => {
    // Set persistence to session (logout on tab close)
    setPersistence(auth, browserSessionPersistence).catch(err => {
      console.error("Error setting persistence:", err);
    });

    // Safety timeout for loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn("Auth initialization timeout reached");
        setLoading(false);
        setIsAuthReady(true);
      }
    }, 10000);

    let unsubscribeTeacher: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      // Clean up previous teacher listener if it exists
      if (unsubscribeTeacher) {
        unsubscribeTeacher();
        unsubscribeTeacher = null;
      }

      if (firebaseUser) {
        try {
          const teacherUid = firebaseUser.email?.split('@')[0] || firebaseUser.uid;
          
          // Special case for hardcoded Admin and User Email
          const isAdminEmail = firebaseUser.email?.toLowerCase() === 'admin@tutorflow.com' || firebaseUser.email?.toLowerCase() === 'mrhandsome81091@gmail.com';
          
          setIsRealAdmin(isAdminEmail);

          if (isAdminEmail) {
            const basicAdmin: Teacher = {
              uid: teacherUid,
              name: firebaseUser.displayName || (firebaseUser.email?.toLowerCase() === 'admin@tutorflow.com' ? 'Administrator' : 'Admin User'),
              email: firebaseUser.email || '',
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
            setTeacher(basicAdmin);
            setUser({ uid: teacherUid, email: basicAdmin.email, displayName: basicAdmin.name });
            applyTheme('dark');
          }

          // Listen to teacher profile in real-time
          const teacherRef = doc(db, 'teachers', teacherUid);
          unsubscribeTeacher = onSnapshot(teacherRef, (teacherSnap) => {
            if (teacherSnap.exists()) {
              const data = teacherSnap.data() as Teacher;
              
              // Check for approval status
              if (data.role === 'teacher' && data.status !== 'approved') {
                console.warn("User account not approved:", teacherUid);
                auth.signOut();
                setUser(null);
                setTeacher(null);
                if (unsubscribeTeacher) unsubscribeTeacher();
                return;
              }

              // Ensure admin emails always have admin role
              if (isAdminEmail && data.role !== 'admin') {
                data.role = 'admin';
              }
              setTeacher(data);
              setUser({ uid: teacherUid, email: data.email || '', displayName: data.name || '' });
              if (data.theme) applyTheme(data.theme);
            } else if (!isAdminEmail) {
              console.log("Teacher profile not found in Firestore for:", teacherUid);
              setUser({ uid: teacherUid, email: firebaseUser.email || '', displayName: firebaseUser.displayName || '' });
            }
          }, (error) => {
            console.error("Error listening to teacher profile:", error);
          });

        } catch (error) {
          console.error("Error initializing teacher profile:", error);
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
      unsubscribeAuth();
      if (unsubscribeTeacher) unsubscribeTeacher();
      clearTimeout(loadingTimeout);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, teacher, loading, isAuthReady, isRealAdmin, setTheme, login, logout }}>
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
