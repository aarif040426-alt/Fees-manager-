import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Teacher, Theme } from '../types';

interface AuthContextType {
  user: User | null;
  teacher: Teacher | null;
  loading: boolean;
  isAuthReady: boolean;
  setTheme: (theme: Theme) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        try {
          const teacherRef = doc(db, 'teachers', user.uid);
          const teacherSnap = await getDoc(teacherRef);
          
          if (teacherSnap.exists()) {
            const data = teacherSnap.data() as Teacher;
            // Force admin role for the main admin email
            if (user.email?.toLowerCase() === 'mrhandsome81091@gmail.com') {
              data.role = 'admin';
            }
            setTeacher(data);
            if (data.theme) applyTheme(data.theme);
          } else {
            const newTeacher: Teacher = {
              uid: user.uid,
              name: user.displayName || 'Teacher',
              email: user.email || '',
              role: user.email === 'mrhandsome81091@gmail.com' ? 'admin' : 'teacher',
              plan: 'Free',
              planStartDate: new Date().toISOString(),
              theme: 'light',
              notifications: {
                email: true,
                whatsapp: true,
                paymentReminders: true,
              },
              createdAt: new Date().toISOString(),
            };
            await setDoc(teacherRef, newTeacher);
            setTeacher(newTeacher);
            applyTheme('light');
          }
        } catch (error) {
          console.error("Error initializing teacher profile:", error);
        }
      } else {
        setTeacher(null);
        applyTheme('light');
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, teacher, loading, isAuthReady, setTheme }}>
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
