import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Shield, Lock, Users, Eye, EyeOff, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../lib/AuthContext';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Teacher } from '../types';

export default function AdminLogin() {
  const { user, teacher, login, loading } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && teacher?.role === 'admin') {
    return <Navigate to="/admin" />;
  }

  const handleForgotPassword = async () => {
    if (!username) {
      setError('Please enter your admin username or email first.');
      return;
    }

    setIsResetting(true);
    setError('');
    setSuccess('');

    let email = username;
    if (!username.includes('@')) {
      if (username === 'Admin') {
        email = 'admin@tutorflow.com';
      } else if (username === 'mrhandsome81091') {
        email = 'mrhandsome81091@gmail.com';
      } else {
        setError('Please enter your admin username or email first.');
        setIsResetting(false);
        return;
      }
    }

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess('Admin password reset email sent!');
    } catch (err: any) {
      console.error("Admin reset error:", err);
      setError(err.message || 'Failed to send reset email.');
    } finally {
      setIsResetting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');
    setSuccess('');

    try {
      let email = '';
      let isHardcodedAdmin = false;

      if (username === 'Admin' && password === 'Aayat@250522') {
        email = 'admin@tutorflow.com';
        isHardcodedAdmin = true;
      } else if (username.includes('@')) {
        email = username;
      } else if (username === 'mrhandsome81091') {
        email = 'mrhandsome81091@gmail.com';
      } else {
        throw new Error('Invalid admin credentials');
      }

      // 1. Sign in with Firebase Auth
      let firebaseUser;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        firebaseUser = userCredential.user;
      } catch (err: any) {
        // If user not found and it's an allowed admin email, try to create it
        const isAdminEmail = email === 'admin@tutorflow.com' || email === 'mrhandsome81091@gmail.com';
        if ((err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') && isAdminEmail) {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          firebaseUser = userCredential.user;
        } else {
          throw err;
        }
      }

      // 2. Check if this user is allowed to be an admin
      const isAdminEmail = firebaseUser.email === 'admin@tutorflow.com' || firebaseUser.email === 'mrhandsome81091@gmail.com';
      
      if (!isAdminEmail) {
        throw new Error('This account does not have administrator privileges.');
      }

      const teacherUid = firebaseUser.email?.split('@')[0] || firebaseUser.uid;
      const adminData: Teacher = {
        uid: teacherUid,
        name: firebaseUser.displayName || (isHardcodedAdmin ? 'Administrator' : 'Admin User'),
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
      
      // 3. Ensure Firestore record exists
      const adminRef = doc(db, 'teachers', teacherUid);
      const adminSnap = await getDoc(adminRef);
      if (!adminSnap.exists()) {
        await setDoc(adminRef, adminData);
      } else {
        // Update role to admin if it's not already
        const existingData = adminSnap.data() as Teacher;
        if (existingData.role !== 'admin') {
          await setDoc(adminRef, { ...existingData, role: 'admin' }, { merge: true });
        }
      }

      // 4. Update AuthContext and Session
      login(teacherUid, adminData);
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } catch (err: any) {
      console.error("Admin login error:", err);
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
        setError('Invalid admin credentials. Please check your password.');
      } else {
        setError(err.message || 'An error occurred during admin login.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-2xl p-10"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white mb-4 shadow-xl shadow-blue-900/20">
              <Shield size={32} />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Admin Portal</h1>
            <p className="text-slate-500 text-sm">Secure access for system administrators</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Users size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Enter admin username"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-bold text-slate-700">Password</label>
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={isResetting}
                  className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  {isResetting ? 'Sending...' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={18} className="text-slate-400" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="Enter admin password"
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

            {error && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-medium">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-xl text-sm font-medium">
                <CheckCircle2 size={16} />
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoggingIn ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ChevronRight size={20} />
                  <span>Access Dashboard</span>
                </>
              )}
            </button>
          </form>
        </motion.div>
        
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/login')}
            className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            ← Back to Teacher Login
          </button>
        </div>
      </div>
    </div>
  );
}
