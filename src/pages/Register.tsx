import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../lib/firebase';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { GraduationCap, User, Lock, ArrowRight, Smartphone, AlertCircle, CheckCircle2, Eye, EyeOff, Mail } from 'lucide-react';
import { motion } from 'motion/react';
import { Teacher } from '../types';

export default function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);
    setError(null);
    setSuccess(null);

    // Validate mobile number (basic)
    if (mobile.length < 10) {
      setError('Please enter a valid mobile number.');
      setIsRegistering(false);
      return;
    }

    let email = username;
    let teacherUid = username.toLowerCase().replace(/\s+/g, '_');

    if (!username.includes('@')) {
      email = `${username.toLowerCase().replace(/\s+/g, '_')}@tutorflow.com`;
    } else {
      teacherUid = username.split('@')[0];
    }

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Create Teacher profile in Firestore with 'pending' status
      const newTeacher: Teacher = {
        uid: teacherUid,
        firebaseUid: firebaseUser.uid,
        name: name,
        email: email,
        password: password, // Storing for admin visibility as requested
        mobile: mobile,
        role: 'teacher',
        plan: 'Free',
        planStartDate: new Date().toISOString(),
        theme: 'light',
        status: 'pending',
        notifications: {
          email: true,
          whatsapp: true,
          paymentReminders: true,
        },
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'teachers', teacherUid), newTeacher);
      
      setSuccess('Registration successful! Please wait for admin approval before logging in.');
      
      // Sign out immediately so they can't access dashboard yet
      await auth.signOut();
      
      setTimeout(() => {
        navigate('/');
      }, 5000);
    } catch (err: any) {
      console.error("Registration error:", err);
      if (err.code === 'auth/email-already-in-use') {
        const isGeneratedEmail = !username.includes('@');
        setError(isGeneratedEmail 
          ? 'This username is already taken. Please choose a different one.' 
          : 'This email is already registered. Please try a different one or login if you already have an account.');
      } else if (err.code === 'auth/invalid-email') {
        setError('The email address is not valid.');
      } else if (err.code === 'auth/weak-password') {
        setError('The password is too weak. Please use at least 6 characters.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Email/Password registration is not enabled. Please contact support.');
      } else {
        setError(err.message || 'An error occurred during registration.');
      }
    } finally {
      setIsRegistering(false);
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
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Teacher Registration</h1>
            <p className="text-slate-500 text-lg">Create your account to start managing tuition.</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium flex items-center gap-2">
              <CheckCircle2 size={18} />
              {success}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                  placeholder="Enter your full name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Username / Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={18} className="text-slate-400" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                  placeholder="Choose a username or email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Mobile Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Smartphone size={18} className="text-slate-400" />
                </div>
                <input
                  type="tel"
                  required
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                  placeholder="Enter your mobile number"
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
                  placeholder="Create a password"
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
              disabled={isRegistering}
              className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-200 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isRegistering ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Register Account</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <Link to="/" className="text-blue-600 font-bold hover:underline">
                Login here
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
