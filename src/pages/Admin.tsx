import React, { useState, useEffect } from 'react';
import { 
  Users, 
  User,
  Search, 
  Filter, 
  CreditCard, 
  Calendar, 
  Shield, 
  Lock, 
  ChevronRight,
  TrendingUp,
  Mail,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  ChevronLeft,
  Trash2,
  Download,
  Key,
  Zap,
  X
} from 'lucide-react';
import { collection, query, onSnapshot, doc, updateDoc, getDocs, deleteDoc, where, orderBy } from 'firebase/firestore';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { Teacher, SubscriptionPlan, PlanRequest } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { ConfirmModal } from '../components/UIModals';

export default function Admin() {
  const { user, teacher, logout, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return sessionStorage.getItem('isAdminAuthenticated') === 'true' || teacher?.role === 'admin';
  });

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [planRequests, setPlanRequests] = useState<PlanRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingPlan, setUpdatingPlan] = useState<string | null>(null);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'teachers' | 'requests' | 'pending'>('teachers');
  const [processingTeacherId, setProcessingTeacherId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; teacherId: string; teacherName: string }>({
    isOpen: false,
    teacherId: '',
    teacherName: ''
  });

  useEffect(() => {
    if (teacher?.role === 'admin' && !isAuthenticated) {
      setIsAuthenticated(true);
      sessionStorage.setItem('isAdminAuthenticated', 'true');
    }
  }, [teacher, isAuthenticated]);

  const fetchTeachers = () => {
    if (loading && teachers.length > 0) return; // Already loading
    setLoading(true);
    setFirestoreError(null);
    setDebugInfo(prev => prev + `\n- Initiating fetch at ${new Date().toLocaleTimeString()}`);

    const q = query(collection(db, 'teachers'));
    
    // Safety timeout
    const timeoutId = setTimeout(() => {
      setLoading(currentLoading => {
        if (currentLoading) {
          console.warn("Admin fetch timeout reached");
          setFirestoreError("The connection is taking longer than expected. Please check your internet connection.");
          setDebugInfo(prev => prev + "\n- Timeout reached after 15s");
          return false;
        }
        return currentLoading;
      });
    }, 15000);

    try {
      // Fallback: Try a direct getDocs call first
      getDocs(q).then(snapshot => {
        console.log("Fallback getDocs success, count:", snapshot.docs.length);
        setTeachers(snapshot.docs.map(doc => ({ ...doc.data() } as Teacher)));
        setLoading(false);
        setDebugInfo(prev => prev + `\n- Fallback Success: Received ${snapshot.docs.length} records`);
      }).catch(err => {
        console.warn("Fallback getDocs failed:", err);
      });

      const unsubscribe = onSnapshot(q, (snapshot) => {
        clearTimeout(timeoutId);
        console.log("Teachers snapshot received, count:", snapshot.docs.length);
        setTeachers(snapshot.docs.map(doc => ({ ...doc.data() } as Teacher)));
        setLoading(false);
        setFirestoreError(null);
        setDebugInfo(prev => prev + `\n- Success: Received ${snapshot.docs.length} records at ${new Date().toLocaleTimeString()}`);
      }, (err) => {
        clearTimeout(timeoutId);
        console.error("Firestore error in Admin panel:", err);
        setFirestoreError(err.message || "Permission denied. You might not have admin rights.");
        setLoading(false);
        setDebugInfo(prev => prev + `\n- Error: ${err.code} - ${err.message}`);
      });

      return unsubscribe;
    } catch (err: any) {
      clearTimeout(timeoutId);
      setFirestoreError(err.message);
      setLoading(false);
      setDebugInfo(prev => prev + `\n- Critical Error: ${err.message}`);
    }
  };

  const fetchPlanRequests = () => {
    setRequestsLoading(true);
    const q = query(
      collection(db, 'planRequests'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPlanRequests(snapshot.docs.map(doc => ({ ...doc.data() } as PlanRequest)));
      setRequestsLoading(false);
    }, (err) => {
      console.error("Error fetching plan requests:", err);
      setRequestsLoading(false);
    });

    return unsubscribe;
  };

  useEffect(() => {
    setDebugInfo(prev => prev + `\n- Auth State: user=${!!user}, teacher=${!!teacher}, role=${teacher?.role}, authLoading=${authLoading}`);
    if (teacher?.role === 'admin' && !isAuthenticated) {
      setIsAuthenticated(true);
      sessionStorage.setItem('isAdminAuthenticated', 'true');
    }
  }, [teacher, isAuthenticated, user, authLoading]);

  useEffect(() => {
    if (!isAuthenticated || authLoading) return;
    
    const unsubTeachers = fetchTeachers();
    const unsubRequests = fetchPlanRequests();
    
    return () => {
      if (typeof unsubTeachers === 'function') unsubTeachers();
      if (typeof unsubRequests === 'function') unsubRequests();
    };
  }, [isAuthenticated, authLoading]);

  const handleUpdatePlan = async (teacherId: string, newPlan: SubscriptionPlan) => {
    setUpdatingPlan(teacherId);
    try {
      await updateDoc(doc(db, 'teachers', teacherId), {
        plan: newPlan,
        planStartDate: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teachers');
    } finally {
      setUpdatingPlan(null);
    }
  };

  const handleProcessRequest = async (request: PlanRequest, status: 'Approved' | 'Rejected') => {
    setProcessingRequestId(request.id);
    try {
      // 1. Update the request status
      await updateDoc(doc(db, 'planRequests', request.id), {
        status,
        updatedAt: new Date().toISOString()
      });

      // 2. If approved, update the teacher's plan
      if (status === 'Approved') {
        await updateDoc(doc(db, 'teachers', request.teacherId), {
          plan: request.requestedPlan,
          planStartDate: new Date().toISOString()
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'planRequests');
    } finally {
      setProcessingRequestId(null);
    }
  };

  const handleProcessTeacher = async (teacherId: string, status: 'approved' | 'rejected') => {
    setProcessingTeacherId(teacherId);
    try {
      await updateDoc(doc(db, 'teachers', teacherId), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'teachers');
    } finally {
      setProcessingTeacherId(null);
    }
  };

  const handleResetPassword = async (teacherEmail: string) => {
    try {
      await sendPasswordResetEmail(auth, teacherEmail);
      alert(`Password reset email sent to ${teacherEmail}`);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    try {
      await deleteDoc(doc(db, 'teachers', teacherId));
      setTeachers(prev => prev.filter(t => t.uid !== teacherId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'teachers');
    }
  };

  const handleExportData = () => {
    setIsExporting(true);
    try {
      const headers = ['Name', 'Email', 'Mobile', 'Password', 'Plan', 'Joined Date', 'Status'];
      const csvContent = [
        headers.join(','),
        ...teachers.map(t => [
          `"${t.name || ''}"`,
          `"${t.email || ''}"`,
          `"${t.mobile || ''}"`,
          `"${t.password || ''}"`,
          `"${t.plan || 'Free'}"`,
          `"${t.createdAt ? format(new Date(t.createdAt), 'yyyy-MM-dd') : ''}"`,
          `"${t.status || 'approved'}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `teachers_export_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (authLoading && isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Admin Dashboard</h1>
            <p className="text-slate-500 mt-1">Manage all registered teachers and their subscriptions.</p>
            <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-400">
              <Shield size={12} />
              <span>Logged in as: <span className="text-slate-600">Admin</span></span>
              <span className="px-1.5 py-0.5 rounded-md bg-green-50 text-green-600">
                Administrator
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-3 text-blue-600 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 transition-colors shadow-sm flex items-center gap-2 font-bold"
              title="Back to Dashboard"
            >
              <ChevronLeft size={20} />
              <span>Back to Dashboard</span>
            </button>
            <button
              onClick={handleExportData}
              disabled={isExporting || teachers.length === 0}
              className="p-3 text-emerald-600 bg-emerald-50 border border-emerald-100 rounded-2xl hover:bg-emerald-100 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              title="Export Teachers Data"
            >
              <Download size={20} className={isExporting ? "animate-bounce" : ""} />
              <span className="text-sm font-bold hidden md:inline">Export CSV</span>
            </button>
            <button
              onClick={() => {
                setDebugInfo(prev => prev + "\n- Manual refresh triggered");
                fetchTeachers();
              }}
              disabled={loading}
              className="p-3 text-slate-600 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
              title="Refresh Data"
            >
              <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
              <span className="text-sm font-bold hidden md:inline">Refresh</span>
            </button>
            <button
              onClick={async () => {
                sessionStorage.removeItem('isAdminAuthenticated');
                await logout();
                navigate('/');
              }}
              className="px-5 py-3 text-red-600 bg-red-50 border border-red-100 rounded-2xl hover:bg-red-100 transition-colors font-bold flex items-center gap-2"
            >
              <Lock size={18} />
              Logout Admin
            </button>
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Teachers</p>
                <p className="text-xl font-bold text-slate-900">{teachers.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 border-b border-slate-200">
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-6 py-4 font-bold text-sm transition-all border-b-2 ${
              activeTab === 'teachers' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Teachers List
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`px-6 py-4 font-bold text-sm transition-all border-b-2 relative ${
              activeTab === 'requests' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Plan Requests
            {planRequests.filter(r => r.status === 'Pending').length > 0 && (
              <span className="absolute top-3 right-1 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                {planRequests.filter(r => r.status === 'Pending').length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-4 font-bold text-sm transition-all border-b-2 relative ${
              activeTab === 'pending' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Pending Teachers
            {teachers.filter(t => t.role === 'teacher' && t.status === 'pending').length > 0 && (
              <span className="absolute top-3 right-1 w-5 h-5 bg-orange-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white">
                {teachers.filter(t => t.role === 'teacher' && t.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {debugInfo && (loading || firestoreError) && (
          <div className="bg-slate-900/5 border border-slate-200 p-4 rounded-2xl font-mono text-[10px] text-slate-500 overflow-auto max-h-32">
            <p className="font-bold mb-1 uppercase tracking-widest text-[9px]">Diagnostic Log:</p>
            <pre className="whitespace-pre-wrap">{debugInfo}</pre>
          </div>
        )}

        {firestoreError && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-50 border border-red-100 p-6 rounded-3xl flex flex-col items-center text-center gap-4"
          >
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-red-900">Permission Denied</h3>
              <p className="text-red-600/80 text-sm max-w-md mt-1">
                {firestoreError}
                <br />
                <span className="mt-2 block font-medium">Make sure you are logged in with the admin email: <span className="underline">mrhandsome81091@gmail.com</span></span>
              </p>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-100"
            >
              Retry Connection
            </button>
          </motion.div>
        )}

        {loading && !firestoreError && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-slate-500 font-medium">Fetching teacher records...</p>
          </div>
        )}

        {!loading && !firestoreError && activeTab === 'teachers' && teachers.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center">
              <Users size={32} />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-bold text-slate-900">No Teachers Found</h3>
              <p className="text-slate-500 text-sm">There are currently no registered teachers in the system.</p>
            </div>
          </div>
        )}

        {!loading && !firestoreError && activeTab === 'teachers' && teachers.length > 0 && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="Search teachers by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>
            <button className="flex items-center gap-2 px-5 py-3 text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors font-bold">
              <Filter size={18} />
              Filter
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Password</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Joined Date</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Plan</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <AnimatePresence mode="popLayout">
                  {filteredTeachers.map((teacher) => (
                    <motion.tr
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={teacher.uid}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-slate-100 overflow-hidden flex items-center justify-center text-blue-600 font-bold shadow-inner">
                            {teacher.photoUrl ? (
                              <img src={teacher.photoUrl} alt={teacher.name || 'Teacher'} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              teacher.name?.[0] || 'T'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{teacher.name || 'N/A'}</p>
                            <p className="text-xs text-slate-500">{teacher.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{teacher.uid}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Smartphone size={14} />
                          <span className="text-sm font-medium">{teacher.mobile || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Key size={14} />
                          <span className="text-sm font-mono bg-slate-100 px-2 py-0.5 rounded">{teacher.password || 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar size={14} />
                          <span className="text-sm">{teacher.createdAt ? format(new Date(teacher.createdAt), 'dd MMM yyyy') : 'N/A'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                          teacher.plan === 'Enterprise' 
                            ? "bg-purple-100 text-purple-700 border-purple-200" 
                            : teacher.plan === 'Pro'
                            ? "bg-blue-100 text-blue-700 border-blue-200"
                            : "bg-slate-100 text-slate-700 border-slate-200"
                        }`}>
                          {teacher.plan || 'Free'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(teacher.email || '')}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Send Reset Email"
                          >
                            <RefreshCw size={18} />
                          </button>
                          <select
                            value={teacher.plan || 'Free'}
                            disabled={updatingPlan === teacher.uid}
                            onChange={(e) => handleUpdatePlan(teacher.uid, e.target.value as SubscriptionPlan)}
                            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                          >
                            <option value="Free">Free</option>
                            <option value="Pro">Pro</option>
                            <option value="Enterprise">Enterprise</option>
                          </select>
                          {updatingPlan === teacher.uid && (
                            <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                          )}
                          <button
                            onClick={() => setDeleteConfirm({ isOpen: true, teacherId: teacher.uid, teacherName: teacher.name || 'N/A' })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Teacher"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
        )}

        {/* Plan Requests Tab */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {requestsLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-slate-500 font-medium">Loading requests...</p>
              </div>
            ) : planRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-3xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center">
                  <Zap size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-900">No Plan Requests</h3>
                  <p className="text-slate-500 text-sm">There are no pending or past plan upgrade requests.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Current Plan</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Requested Plan</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {planRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-slate-800">{request.teacherName}</p>
                              <p className="text-xs text-slate-500">{request.teacherEmail}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-600">{request.currentPlan}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold uppercase tracking-wider border border-blue-200">
                              {request.requestedPlan}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-500">{format(new Date(request.createdAt), 'dd MMM, HH:mm')}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                              request.status === 'Approved' 
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200" 
                                : request.status === 'Rejected'
                                ? "bg-red-100 text-red-700 border-red-200"
                                : "bg-amber-100 text-amber-700 border-amber-200"
                            }`}>
                              {request.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            {request.status === 'Pending' && (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleProcessRequest(request, 'Approved')}
                                  disabled={processingRequestId === request.id}
                                  className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleProcessRequest(request, 'Rejected')}
                                  disabled={processingRequestId === request.id}
                                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-bold rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                                >
                                  Reject
                                </button>
                              </div>
                            )}
                            {processingRequestId === request.id && (
                              <div className="w-4 h-4 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin ml-auto" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pending Teachers Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-6">
            {teachers.filter(t => t.role === 'teacher' && t.status === 'pending').length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4 bg-white rounded-3xl border border-slate-200">
                <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-3xl flex items-center justify-center">
                  <User size={32} />
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-bold text-slate-900">No Pending Approvals</h3>
                  <p className="text-slate-500 text-sm">All teacher registration requests have been processed.</p>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User ID</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mobile</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Password</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {teachers.filter(t => t.role === 'teacher' && t.status === 'pending').map((t) => (
                        <tr key={t.uid} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div>
                              <p className="font-bold text-slate-800">{t.name}</p>
                              <p className="text-xs text-slate-500">{t.email}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{t.uid}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-medium text-slate-600">{t.mobile}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{t.password}</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-slate-500">{format(new Date(t.createdAt), 'dd MMM, HH:mm')}</span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleProcessTeacher(t.uid, 'approved')}
                                disabled={processingTeacherId === t.uid}
                                className="px-4 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                {processingTeacherId === t.uid ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <CheckCircle2 size={14} />}
                                Approve
                              </button>
                              <button
                                onClick={() => handleProcessTeacher(t.uid, 'rejected')}
                                disabled={processingTeacherId === t.uid}
                                className="px-4 py-2 bg-red-600 text-white text-xs font-bold rounded-xl hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
                              >
                                {processingTeacherId === t.uid ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <X size={14} />}
                                Reject
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteConfirm.isOpen && (
          <ConfirmModal
            isOpen={deleteConfirm.isOpen}
            onClose={() => setDeleteConfirm({ ...deleteConfirm, isOpen: false })}
            onConfirm={() => handleDeleteTeacher(deleteConfirm.teacherId)}
            title="Delete Teacher"
            message={`Are you sure you want to delete teacher "${deleteConfirm.teacherName}"? This will NOT delete their Firebase Auth account, only their Firestore profile and data access.`}
            confirmLabel="Delete"
            isDestructive
          />
        )}
      </AnimatePresence>
    </div>
  );
}
