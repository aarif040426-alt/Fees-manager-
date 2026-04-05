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
          // Check for impersonation (only allowed for admins)
          const impersonatedUid = sessionStorage.getItem('impersonatedTeacherUid');
          const realTeacherUid = firebaseUser.email?.split('@')[0] || firebaseUser.uid;
          
          // Special case for hardcoded Admin and User Email
          const isAdminEmail = firebaseUser.email === 'admin@tutorflow.com' || firebaseUser.email === 'mrhandsome81091@gmail.com';
          
          const teacherUid = (isAdminEmail && impersonatedUid) ? impersonatedUid : realTeacherUid;

          if (isAdminEmail && !impersonatedUid) {
            const adminData: Teacher = {
              uid: teacherUid,
              name: firebaseUser.displayName || (firebaseUser.email === 'admin@tutorflow.com' ? 'Administrator' : 'Admin User'),
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
            setTeacher(adminData);
            setUser({ uid: teacherUid, email: adminData.email, displayName: adminData.name });
            applyTheme('dark');
          }

          const teacherRef = doc(db, 'teachers', teacherUid);
          const teacherSnap = await getDoc(teacherRef);
          
          if (teacherSnap.exists()) {
            const data = teacherSnap.data() as Teacher;
            // If impersonating, we keep the admin role for the current session's logic if needed, 
            // but the data will be the teacher's data.
            // Actually, we should probably merge them or just use the teacher data.
            setTeacher(data);
            setUser({ uid: teacherUid, email: data.email || '', displayName: data.name || '' });
            if (data.theme) applyTheme(data.theme);
          } else if (!isAdminEmail) {
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
