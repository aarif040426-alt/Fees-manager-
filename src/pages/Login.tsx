import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { db, auth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '../lib/AuthContext';
import { GraduationCap, User, Lock, ArrowRight, Shield, AlertCircle, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Teacher } from '../types';

export default function Login() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError(null);

    let email = username;
    let teacherUid = username.toLowerCase().replace(/\s+/g, '_');

    if (!username.includes('@')) {
      email = `${username.toLowerCase().replace(/\s+/g, '_')}@tutorflow.com`;
    } else {
      teacherUid = username.split('@')[0];
    }

    try {
      // 1. Try to sign in with Firebase Auth
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Special case for admins
        const isAdminEmail = firebaseUser.email === 'admin@tutorflow.com' || firebaseUser.email === 'mrhandsome81091@gmail.com';
        
        const teacherRef = doc(db, 'teachers', teacherUid);
        const teacherSnap = await getDoc(teacherRef);

        if (teacherSnap.exists()) {
          const data = teacherSnap.data() as Teacher;
          login(teacherUid, data);
          if (data.role === 'admin' || isAdminEmail) {
            sessionStorage.setItem('isAdminAuthenticated', 'true');
            navigate('/admin');
          } else {
            navigate('/');
          }
        } else if (isAdminEmail) {
          // Admin might not have a record yet
          const adminData: Teacher = {
            uid: teacherUid,
            name: firebaseUser.displayName || 'Admin User',
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
          await setDoc(teacherRef, adminData);
          login(teacherUid, adminData);
          sessionStorage.setItem('isAdminAuthenticated', 'true');
          navigate('/admin');
        } else {
          setError('Teacher profile not found.');
        }
      } catch (err: any) {
        if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
          // 2. Create new Teacher account if not found (only for non-admin emails)
          if (email === 'admin@tutorflow.com' || email === 'mrhandsome81091@gmail.com') {
            setError('Invalid admin credentials.');
            return;
          }

          try {
            await createUserWithEmailAndPassword(auth, email, password);
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              setError('Invalid password for this teacher account.');
              return;
            }
            throw createErr;
          }

          // If creation succeeded, we are now authenticated and can write to Firestore
          const newTeacher: Teacher = {
            uid: teacherUid,
            name: username,
            email: email,
            role: 'teacher',
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
          const teacherRef = doc(db, 'teachers', teacherUid);
          await setDoc(teacherRef, newTeacher);
          login(teacherUid, newTeacher);
          navigate('/');
        } else if (err.code === 'auth/wrong-password') {
          setError('Invalid password for this teacher account.');
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      console.error("Login error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password login is not enabled in Firebase. Please enable it in the Firebase Console (Authentication > Sign-in method).');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid username or password. Please try again.');
      } else {
        setError(err.message || 'An error occurred during login. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-blue-100 p-8 md:p-12 border border-slate-100"
        >
          <div className="flex flex-col items-center mb-10 text-center">
            <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 mb-6">
              <GraduationCap className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">TutorFlow</h1>
            <p className="text-slate-500 text-lg">Manage your tuition fees with ease.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Username / ID</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Login to Dashboard</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center">
            <p className="text-slate-400 text-xs">
              Secure access for teachers.
            </p>
          </div>
        </motion.div>

        <p className="text-center text-slate-500 mt-8 text-sm">
          By continuing, you agree to our <span className="text-blue-600 font-semibold cursor-pointer">Terms of Service</span> and <span className="text-blue-600 font-semibold cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
