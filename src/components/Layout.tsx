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
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { logout } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
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
        ? "bg-[#2563eb] text-[#ffffff] shadow-lg shadow-[#bfdbfe]" 
        : "text-[#475569] hover:bg-[#eff6ff] hover:text-[#2563eb]"
    )}
  >
    <Icon size={20} className={cn("transition-transform duration-200 group-hover:scale-110", active ? "text-[#ffffff]" : "text-[#94a3b8] group-hover:text-[#2563eb]")} />
    <span className="font-medium">{label}</span>
  </Link>
);

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { teacher } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/students', icon: Users, label: 'Students' },
    { to: '/payments', icon: CreditCard, label: 'Payments' },
    { to: '/reports', icon: BarChart3, label: 'Reports' },
    { to: '/settings', icon: Settings, label: 'Settings' },
    ...(teacher?.role === 'admin' ? [{ to: '/admin', icon: Shield, label: 'Admin Panel' }] : []),
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
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
          "fixed inset-y-0 left-0 z-50 w-64 bg-[#ffffff] border-r border-[#e2e8f0] transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-10 px-2">
            <div className="bg-[#2563eb] p-2 rounded-xl shadow-lg shadow-[#bfdbfe]">
              <GraduationCap className="text-[#ffffff]" size={24} />
            </div>
            <h1 className="text-xl font-bold text-[#1e293b] tracking-tight">TutorFlow</h1>
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

          <div className="mt-auto pt-6 border-t border-[#f1f5f9]">
            <div className="flex items-center gap-3 px-2 mb-6">
              <div className="w-10 h-10 rounded-full bg-[#dbeafe] flex items-center justify-center text-[#2563eb] font-bold">
                {teacher?.name?.[0] || 'T'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#1e293b] truncate">{teacher?.name || 'Teacher'}</p>
                <p className="text-xs text-[#64748b] truncate">{teacher?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-[#475569] hover:bg-[#fef2f2] hover:text-[#dc2626] rounded-lg transition-colors duration-200 group"
            >
              <LogOut size={20} className="text-[#94a3b8] group-hover:text-[#dc2626]" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#ffffff] border-b border-[#e2e8f0] flex items-center justify-between px-6 sticky top-0 z-30">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-[#475569] hover:bg-[#f1f5f9] rounded-lg lg:hidden"
          >
            <Menu size={24} />
          </button>
          
          <div className="flex-1 lg:flex-none">
            <h2 className="text-lg font-semibold text-[#1e293b] lg:hidden">
              {navItems.find(i => i.to === location.pathname)?.label || 'TutorFlow'}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Add any global actions here */}
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
