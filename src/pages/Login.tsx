import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { loginWithGoogle } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { GraduationCap, Mail, Phone, ArrowRight, Shield, Lock, Users, ChevronRight, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (user && !isAdminMode) {
    return <Navigate to="/" />;
  }

  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (isAdminMode && user.email?.toLowerCase() === 'mrhandsome81091@gmail.com') {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Failed to login with Google. Please try again.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAdminError('Please login with Google first to establish a database connection.');
      return;
    }
    if (adminUsername === 'admin' && adminPassword === 'Admin@250522') {
      sessionStorage.setItem('isAdminAuthenticated', 'true');
      navigate('/admin');
    } else {
      setAdminError('Invalid admin credentials');
    }
  };

  const handleGoogleAdminLogin = async () => {
    try {
      const user = await loginWithGoogle();
      if (user.email?.toLowerCase() === 'mrhandsome81091@gmail.com') {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        navigate('/admin');
      } else {
        setAdminError('Only mrhandsome81091@gmail.com is authorized for Google Admin access.');
      }
    } catch (err) {
      setAdminError('Failed to login with Google.');
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
          <AnimatePresence mode="wait">
            {!isAdminMode ? (
              <motion.div
                key="main-login"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center mb-10 text-center">
                  <div className="bg-blue-600 p-4 rounded-2xl shadow-lg shadow-blue-200 mb-6">
                    <GraduationCap className="text-white" size={40} />
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">TutorFlow</h1>
                  <p className="text-slate-500 text-lg">Manage your tuition fees with ease.</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium">
                    {error}
                  </div>
                )}

                <div className="space-y-4">
                  <button
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 font-semibold py-4 px-6 rounded-2xl hover:bg-slate-50 transition-all duration-200 group relative overflow-hidden"
                  >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                    <span>Continue with Google</span>
                    <ArrowRight size={18} className="absolute right-6 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-200" />
                  </button>

                  <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-100"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-4 bg-white text-slate-400 font-medium uppercase tracking-wider">Or</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Phone size={18} className="text-slate-400" />
                      </div>
                      <input
                        type="tel"
                        placeholder="Enter Mobile Number"
                        className="block w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
                      />
                    </div>
                    <button
                      disabled
                      className="w-full bg-blue-600 text-white font-bold py-4 px-6 rounded-2xl hover:bg-blue-700 transition-all duration-200 shadow-lg shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Login with Mobile
                    </button>
                    <p className="text-center text-xs text-slate-400 mt-4">
                      Mobile login is currently under maintenance. Please use Google.
                    </p>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-6">
                    <button
                      onClick={() => setIsAdminMode(true)}
                      className="w-full flex items-center justify-center gap-2 text-slate-500 hover:text-blue-600 font-bold transition-colors py-2"
                    >
                      <Shield size={18} />
                      <span>Admin Login</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="admin-login"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex flex-col items-center mb-8 text-center">
                  <div className="bg-slate-900 p-4 rounded-2xl shadow-lg shadow-slate-200 mb-6">
                    <Shield className="text-white" size={32} />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-1">Admin Portal</h2>
                  <p className="text-slate-500">Secure access for system administrators</p>
                </div>

                {!user && (
                  <div className="bg-amber-50 border border-amber-100 text-amber-700 p-4 rounded-2xl text-sm font-medium flex flex-col gap-3 mb-6">
                    <div className="flex items-center gap-2">
                      <AlertCircle size={18} />
                      <span>Google Login Required</span>
                    </div>
                    <p className="text-xs opacity-80">For security, you must sign in with your Google account first to establish a database connection.</p>
                  </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-6">
                  {user ? (
                    user.email?.toLowerCase() === 'mrhandsome81091@gmail.com' ? (
                      <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                          <Shield size={24} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-blue-900">Admin Account Detected</p>
                          <p className="text-xs text-blue-700 mt-1">You are logged in as {user.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.setItem('isAdminAuthenticated', 'true');
                            navigate('/admin');
                          }}
                          className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                        >
                          <ChevronRight size={18} />
                          Continue to Admin Dashboard
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm text-slate-600 mb-6">
                          <p className="font-bold text-slate-800">Google Session Active</p>
                          <p className="text-xs mt-1">You can now use admin credentials to access the portal.</p>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                              <Users size={18} className="text-slate-400" />
                            </div>
                            <input
                              type="text"
                              required
                              value={adminUsername}
                              onChange={(e) => setAdminUsername(e.target.value)}
                              className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                              placeholder="Enter admin username"
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
                              type="password"
                              required
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                              placeholder="Enter admin password"
                            />
                          </div>
                        </div>

                        {adminError && (
                          <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm font-medium">
                            <AlertCircle size={16} />
                            {adminError}
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-xl shadow-slate-200 transition-all flex items-center justify-center gap-2"
                        >
                          <ChevronRight size={20} />
                          Access Dashboard
                        </button>
                      </>
                    )
                  ) : (
                    <div className="space-y-6">
                      <div className="bg-amber-50 border border-amber-100 text-amber-700 p-6 rounded-3xl flex flex-col items-center text-center gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center">
                          <AlertCircle size={24} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-amber-900">Google Login Required</h3>
                          <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                            For security, you must sign in with your Google account first to establish a database connection.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleGoogleAdminLogin}
                          className="w-full py-3.5 bg-amber-600 text-white rounded-2xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
                        >
                          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5 brightness-0 invert" />
                          Login with Google
                        </button>
                      </div>
                      
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <div className="w-full border-t border-slate-100"></div>
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="px-4 bg-white text-slate-400 font-bold uppercase tracking-widest">Or Credentials</span>
                        </div>
                      </div>

                      <div className="opacity-40 pointer-events-none grayscale">
                        <div className="space-y-2 mb-4">
                          <label className="text-sm font-bold text-slate-700 ml-1">Username</label>
                          <input disabled className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="admin" />
                        </div>
                        <div className="space-y-2 mb-6">
                          <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
                          <input disabled className="block w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl" placeholder="••••••••" />
                        </div>
                        <button disabled className="w-full py-4 bg-slate-300 text-white font-bold rounded-2xl">Access Dashboard</button>
                      </div>
                    </div>
                  )}
                  
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAdminMode(false);
                        setAdminError(null);
                      }}
                      className="w-full py-3 text-slate-500 hover:text-slate-700 font-bold transition-colors"
                    >
                      Back to Teacher Login
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="text-center text-slate-500 mt-8 text-sm">
          By continuing, you agree to our <span className="text-blue-600 font-semibold cursor-pointer">Terms of Service</span> and <span className="text-blue-600 font-semibold cursor-pointer">Privacy Policy</span>.
        </p>
      </div>
    </div>
  );
}
