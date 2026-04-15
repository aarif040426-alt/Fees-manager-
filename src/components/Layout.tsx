import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  CreditCard, 
  BarChart3, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  GraduationCap,
  Shield,
  Sun,
  Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logout, db } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const SidebarItem = ({ 
  to, 
  icon: Icon, 
  label, 
  active, 
  onClick 
}: { 
  to: string; 
  icon: any; 
  label: string; 
  active: boolean;
  onClick?: () => void;
  key?: string;
}) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group",
      active 
        ? "bg-blue-600 text-white shadow-lg shadow-blue-100" 
        : "text-slate-600 hover:bg-blue-50 hover:text-blue-600"
    )}
  >
    <Icon size={20} className={cn("transition-transform duration-200 group-hover:scale-110", active ? "text-white" : "text-slate-400 group-hover:text-blue-600")} />
    <span className="font-medium">{label}</span>
  </Link>
);

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { teacher, logout, isRealAdmin, setTheme } = useAuth();

  const toggleTheme = async () => {
    const newTheme = teacher?.theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (teacher?.uid) {
      try {
        await updateDoc(doc(db, 'teachers', teacher.uid), {
          theme: newTheme
        });
      } catch (error) {
        console.error("Error updating theme:", error);
      }
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/dashboard/students', icon: Users, label: 'Students' },
    { to: '/dashboard/payments', icon: CreditCard, label: 'Payments' },
    { to: '/dashboard/reports', icon: BarChart3, label: 'Reports' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings' },
    ...(isRealAdmin ? [{ to: '/admin', icon: Shield, label: 'Admin Panel' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg shadow-blue-100">
              <GraduationCap className="text-white" size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">TutorFlow</h1>
          </div>

          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <SidebarItem
                key={item.to}
                {...item}
                active={location.pathname === item.to}
                onClick={() => setIsSidebarOpen(false)}
              />
            ))}
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-100">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-slate-100 overflow-hidden flex items-center justify-center text-blue-600 font-bold shadow-inner">
                {teacher?.photoUrl ? (
                  <img src={teacher.photoUrl} alt={teacher.name || 'Teacher'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  teacher?.name?.[0] || 'T'
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{teacher?.name || 'Teacher'}</p>
                <p className="text-xs text-slate-500 truncate">{teacher?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors duration-200 group"
            >
              <LogOut size={20} className="text-slate-400 group-hover:text-red-600" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-slate-600 hover:bg-slate-50 rounded-lg lg:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 lg:flex-none">
            <h2 className="text-lg font-semibold text-slate-900 lg:hidden">
              {navItems.find(i => i.to === location.pathname)?.label || 'TutorFlow'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all border border-slate-100 shadow-sm"
              title={teacher?.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {teacher?.theme === 'dark' ? (
                <Sun size={20} className="text-amber-500" />
              ) : (
                <Moon size={20} className="text-slate-600" />
              )}
            </button>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
