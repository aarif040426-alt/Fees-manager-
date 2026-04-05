import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Shield, 
  Bell, 
  CreditCard, 
  Save,
  Check,
  LogOut,
  Camera,
  Moon,
  Sun,
  Palette,
  Lock,
  Smartphone,
  Globe,
  Zap,
  Crown,
  Star,
  Calendar,
  AlertCircle,
  Eye,
  EyeOff
} from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, handleFirestoreError, OperationType, logout, auth, storage } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Theme, SubscriptionPlan } from '../types';
import { PLAN_LIMITS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AlertModal } from '../components/UIModals';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type SettingsTab = 'Profile' | 'Notifications' | 'Subscription' | 'Security';

export default function Settings() {
  const { teacher, user, setTheme } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<SettingsTab>('Profile');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    mobile: '',
    theme: 'light' as Theme,
    notifications: {
      email: true,
      whatsapp: true,
      paymentReminders: true,
    },
    photoUrl: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });

  useEffect(() => {
    if (teacher) {
      setFormData({
        name: teacher.name || '',
        email: teacher.email || '',
        mobile: teacher.mobile || '',
        theme: teacher.theme || 'light',
        notifications: teacher.notifications || {
          email: true,
          whatsapp: true,
          paymentReminders: true,
        },
        photoUrl: teacher.photoUrl || ''
      });
      setPhotoPreview(teacher.photoUrl || null);
    }
  }, [teacher]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (file: File, teacherUid: string): Promise<string> => {
    const storageRef = ref(storage, `teachers/${teacherUid}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    setLoading(true);
    try {
      let currentPhotoUrl = formData.photoUrl;
      if (photoFile) {
        currentPhotoUrl = await uploadPhoto(photoFile, teacher.uid);
      }
      
      const updateData = { ...formData, photoUrl: currentPhotoUrl };
      await updateDoc(doc(db, 'teachers', teacher.uid), updateData);
      setTheme(formData.theme);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teachers');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradePlan = async (planId: SubscriptionPlan) => {
    if (!teacher) return;
    setUpgradeLoading(planId);
    try {
      await updateDoc(doc(db, 'teachers', teacher.uid), {
        plan: planId,
        planStartDate: new Date().toISOString()
      });
      setAlertData({
        isOpen: true,
        title: 'Plan Upgraded!',
        message: `Congratulations! You have successfully upgraded to the ${planId} plan.`,
        type: 'success'
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teachers');
    } finally {
      setUpgradeLoading(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleThemeChange = (newTheme: Theme) => {
    setFormData(prev => ({ ...prev, theme: newTheme }));
    setTheme(newTheme);
  };

  const toggleNotification = (key: keyof typeof formData.notifications) => {
    const planLimit = teacher ? PLAN_LIMITS[teacher.plan] : PLAN_LIMITS.Free;
    
    if (key === 'whatsapp' && !planLimit.features.whatsappNotifications) {
      setAlertData({
        isOpen: true,
        title: 'Pro Feature',
        message: 'WhatsApp notifications are only available in Pro and Enterprise plans. Please upgrade to enable this feature.',
        type: 'warning'
      });
      return;
    }

    setFormData(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        [key]: !prev.notifications[key]
      }
    }));
  };

  const [securityData, setSecurityData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacher) return;
    
    if (securityData.newPassword !== securityData.confirmPassword) {
      setSecurityMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (securityData.newPassword.length < 6) {
      setSecurityMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    if (teacher.password && securityData.currentPassword !== teacher.password) {
      setSecurityMessage({ type: 'error', text: 'Incorrect current password.' });
      return;
    }

    setSecurityLoading(true);
    setSecurityMessage(null);

    try {
      // 1. Update Firebase Auth password
      if (auth.currentUser) {
        await updatePassword(auth.currentUser, securityData.newPassword);
      }

      // 2. Update Firestore document
      await updateDoc(doc(db, 'teachers', teacher.uid), {
        password: securityData.newPassword
      });
      
      setSecurityMessage({ type: 'success', text: 'Password updated successfully!' });
      setSecurityData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      console.error("Error updating password:", err);
      if (err.code === 'auth/requires-recent-login') {
        setSecurityMessage({ type: 'error', text: 'Please log out and log back in to change your password for security reasons.' });
      } else {
        setSecurityMessage({ type: 'error', text: err.message || 'Failed to update password.' });
      }
    } finally {
      setSecurityLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account, preferences, and subscription.</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-6 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-2xl font-bold transition-all self-start"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 -mx-4 px-4 lg:mx-0 lg:px-0 scrollbar-hide">
          {[
            { label: 'Profile', icon: User, tab: 'Profile' as SettingsTab },
            { label: 'Notifications', icon: Bell, tab: 'Notifications' as SettingsTab },
            { label: 'Subscription', icon: CreditCard, tab: 'Subscription' as SettingsTab },
            { label: 'Security', icon: Shield, tab: 'Security' as SettingsTab },
          ].map((item) => (
            <button
              key={item.label}
              onClick={() => setActiveTab(item.tab)}
              className={`flex-shrink-0 lg:w-full flex items-center gap-3 px-5 py-3 lg:py-4 rounded-2xl font-bold transition-all whitespace-nowrap ${
                activeTab === item.tab 
                  ? "bg-blue-600 text-white shadow-xl shadow-blue-100" 
                  : "text-slate-500 hover:bg-white hover:text-slate-900 border border-transparent hover:border-slate-200 bg-white lg:bg-transparent"
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {activeTab === 'Profile' && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex flex-col sm:flex-row items-center gap-6">
                      <div className="relative group">
                        <div className="w-24 h-24 rounded-3xl bg-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl shadow-blue-100 overflow-hidden">
                          {photoPreview ? (
                            <img src={photoPreview} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            teacher?.name?.[0] || 'T'
                          )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 p-2 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-blue-600 transition-colors cursor-pointer">
                          <Camera size={16} />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <div className="text-center sm:text-left">
                        <h3 className="text-xl font-bold text-slate-900">{teacher?.name || 'Teacher'}</h3>
                        <p className="text-slate-500">{teacher?.email}</p>
                        <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
                          {teacher?.role || 'Teacher'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <User size={18} className="text-slate-400" />
                          </div>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Mail size={18} className="text-slate-400" />
                          </div>
                          <input
                            type="email"
                            disabled
                            value={formData.email}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-500 cursor-not-allowed"
                          />
                        </div>
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Mobile Number</label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Phone size={18} className="text-slate-400" />
                          </div>
                          <input
                            type="tel"
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                            className="block w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                            placeholder="+91 00000 00000"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-bold text-slate-700 ml-1 flex items-center gap-2">
                        <Palette size={18} className="text-blue-600" />
                        Theme Preference
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {[
                          { id: 'light', label: 'Light', icon: Sun, color: 'bg-white border-slate-200 text-slate-900' },
                          { id: 'dark', label: 'Dark', icon: Moon, color: 'bg-slate-900 border-slate-800 text-white' },
                          { id: 'blue', label: 'Ocean', icon: Globe, color: 'bg-blue-600 border-blue-500 text-white' },
                          { id: 'purple', label: 'Royal', icon: Zap, color: 'bg-purple-600 border-purple-500 text-white' },
                        ].map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleThemeChange(t.id as Theme)}
                            className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${
                              formData.theme === t.id 
                                ? "border-blue-500 ring-2 ring-blue-100 scale-105" 
                                : "border-slate-100 hover:border-slate-200"
                            }`}
                          >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${t.color}`}>
                              <t.icon size={20} />
                            </div>
                            <span className="text-xs font-bold text-slate-700">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
                      <button
                        type="submit"
                        disabled={loading}
                        className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-bold transition-all shadow-xl ${
                          saved 
                            ? "bg-emerald-600 text-white shadow-emerald-100" 
                            : "bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700"
                        }`}
                      >
                        {loading ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : saved ? (
                          <Check size={20} />
                        ) : (
                          <Save size={20} />
                        )}
                        {saved ? 'Changes Saved' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {activeTab === 'Notifications' && (
              <motion.div
                key="notifications"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-8"
              >
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Notification Preferences</h3>
                  <p className="text-slate-500 mt-1">Choose how you want to be notified about payments and updates.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'email', label: 'Email Notifications', desc: 'Receive weekly summaries and payment alerts via email.', icon: Mail, locked: false },
                    { id: 'whatsapp', label: 'WhatsApp Alerts', desc: 'Get instant notifications on WhatsApp for new payments.', icon: Phone, locked: teacher ? !PLAN_LIMITS[teacher.plan].features.whatsappNotifications : true },
                    { id: 'paymentReminders', label: 'Automatic Reminders', desc: 'Send automatic fee reminders to parents on due dates.', icon: Bell, locked: false },
                  ].map((item) => (
                    <div key={item.id} className={cn(
                      "flex items-center justify-between p-6 rounded-3xl border transition-all",
                      item.locked ? "bg-slate-50/50 border-slate-100 opacity-60" : "bg-slate-50 border-slate-100"
                    )}>
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm relative">
                          <item.icon size={24} />
                          {item.locked && (
                            <div className="absolute -top-1 -right-1 bg-amber-500 text-white p-1 rounded-full border-2 border-white">
                              <Lock size={10} />
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800">{item.label}</p>
                            {item.locked && (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md">
                                Pro Feature
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500">{item.desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleNotification(item.id as keyof typeof formData.notifications)}
                        className={`w-14 h-8 rounded-full transition-all relative ${
                          formData.notifications[item.id as keyof typeof formData.notifications] 
                            ? "bg-blue-600" 
                            : "bg-slate-300"
                        }`}
                      >
                        <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all shadow-sm ${
                          formData.notifications[item.id as keyof typeof formData.notifications] 
                            ? "left-7" 
                            : "left-1"
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={handleSubmit}
                    className="px-8 py-4 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                  >
                    Save Preferences
                  </button>
                </div>
              </motion.div>
            )}

            {activeTab === 'Subscription' && (
              <motion.div
                key="subscription"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-bold text-slate-900">Current Plan</h3>
                      <p className="text-slate-500 mt-1">You are currently on the {teacher?.plan || 'Free'} plan.</p>
                    </div>
                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm">
                      Active
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { id: 'Free', label: 'Free', price: '₹0', icon: Star, features: ['Up to 10 Students', 'Basic Reports', 'Manual Reminders'] },
                      { id: 'Pro', label: 'Pro', price: '₹499', icon: Zap, features: ['Up to 50 Students', 'Advanced Analytics', 'WhatsApp Automation'] },
                      { id: 'Enterprise', label: 'Enterprise', price: '₹999', icon: Crown, features: ['Unlimited Students', 'Custom Branding', 'Priority Support'] },
                    ].map((plan) => (
                      <div 
                        key={plan.id}
                        className={`p-6 rounded-3xl border-2 transition-all flex flex-col ${
                          teacher?.plan === plan.id 
                            ? "border-blue-500 bg-blue-50/30" 
                            : "border-slate-100 hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-2 rounded-xl ${teacher?.plan === plan.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600"}`}>
                            <plan.icon size={20} />
                          </div>
                          <span className="font-bold text-slate-900">{plan.label}</span>
                        </div>
                        <div className="mb-6">
                          <span className="text-3xl font-bold text-slate-900">{plan.price}</span>
                          <span className="text-slate-500 text-sm">/month</span>
                        </div>
                        <ul className="space-y-3 mb-8 flex-1">
                          {plan.features.map(f => (
                            <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                              <Check size={14} className="text-emerald-500" />
                              {f}
                            </li>
                          ))}
                        </ul>
                        <button
                          disabled={teacher?.plan === plan.id || upgradeLoading !== null}
                          onClick={() => handleUpgradePlan(plan.id as SubscriptionPlan)}
                          className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                            teacher?.plan === plan.id
                              ? "bg-emerald-100 text-emerald-700 cursor-default"
                              : "bg-slate-900 text-white hover:bg-slate-800"
                          }`}
                        >
                          {upgradeLoading === plan.id ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : teacher?.plan === plan.id ? (
                            <>
                              <Check size={18} />
                              Current Plan
                            </>
                          ) : (
                            <>
                              <Zap size={18} />
                              Upgrade to {plan.label}
                            </>
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8">
                  <h4 className="text-lg font-bold text-slate-900 mb-4">Billing History</h4>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white rounded-xl text-slate-600">
                          <Calendar size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">Free Plan Activation</p>
                          <p className="text-xs text-slate-500">{teacher?.planStartDate ? new Date(teacher.planStartDate).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600">₹0.00</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'Security' && (
              <motion.div
                key="security"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-8">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Security Settings</h3>
                    <p className="text-slate-500 mt-1">Manage your password and account security.</p>
                  </div>

                  {securityMessage && (
                    <div className={cn(
                      "p-4 rounded-2xl text-sm font-medium flex items-center gap-2",
                      securityMessage.type === 'success' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-red-50 text-red-700 border border-red-100"
                    )}>
                      <AlertCircle size={18} />
                      {securityMessage.text}
                    </div>
                  )}

                  <form onSubmit={handlePasswordUpdate} className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 ml-1">Current Password</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Lock size={18} className="text-slate-400" />
                        </div>
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          required
                          value={securityData.currentPassword}
                          onChange={(e) => setSecurityData({ ...securityData, currentPassword: e.target.value })}
                          placeholder="••••••••"
                          className="block w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? "text" : "password"}
                            required
                            value={securityData.newPassword}
                            onChange={(e) => setSecurityData({ ...securityData, newPassword: e.target.value })}
                            placeholder="••••••••"
                            className="block w-full px-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 ml-1">Confirm New Password</label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? "text" : "password"}
                            required
                            value={securityData.confirmPassword}
                            onChange={(e) => setSecurityData({ ...securityData, confirmPassword: e.target.value })}
                            placeholder="••••••••"
                            className="block w-full px-4 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 border-t border-slate-100 flex justify-end">
                      <button
                        type="submit"
                        disabled={securityLoading}
                        className="px-8 py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
                      >
                        {securityLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                        Update Password
                      </button>
                    </div>
                  </form>
                </div>

                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
                  <h4 className="text-lg font-bold text-slate-900">Two-Factor Authentication</h4>
                  <div className="flex items-center justify-between p-6 bg-blue-50 rounded-3xl border border-blue-100">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-2xl text-blue-600 shadow-sm">
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">SMS Authentication</p>
                        <p className="text-sm text-slate-500">Protect your account with a secondary code sent to your mobile.</p>
                      </div>
                    </div>
                    <button className="px-6 py-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all text-sm">
                      Enable
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AlertModal
        isOpen={alertData.isOpen}
        onClose={() => setAlertData({ ...alertData, isOpen: false })}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
      />
    </div>
  );
}
