import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MessageCircle, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Users,
  DollarSign,
  Calendar as CalendarIcon,
  Trash2,
  FileText,
  Receipt
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, isSameMonth, isAfter, parseISO } from 'date-fns';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Student, Payment, PaymentStatus, PaymentMethod } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { PaymentMethodModal, ReceiptModal, AnnualReportModal, DeleteConfirmationModal } from '../components/PaymentModals';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StatusBadge = ({ status }: { status: PaymentStatus }) => {
  const styles = {
    Paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
    Pending: "bg-rose-100 text-rose-700 border-rose-200",
    Partial: "bg-amber-100 text-amber-700 border-amber-200",
  };

  const icons = {
    Paid: <CheckCircle2 size={14} />,
    Pending: <Clock size={14} />,
    Partial: <AlertCircle size={14} />,
  };

  return (
    <span className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border", styles[status])}>
      {icons[status]}
      {status}
    </span>
  );
};

export default function Dashboard() {
  const { teacher, user } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [students, setStudents] = useState<Student[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<'All' | 'Paid' | 'Pending'>('All');
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<{ student: Student; isOpen: boolean }>({ student: null as any, isOpen: false });
  const [receiptModal, setReceiptModal] = useState<{ payment: Payment; student: Student; isOpen: boolean }>({ payment: null as any, student: null as any, isOpen: false });
  const [reportModal, setReportModal] = useState<{ student: Student; isOpen: boolean }>({ student: null as any, isOpen: false });
  const [deleteModal, setDeleteModal] = useState<{ student: Student; isOpen: boolean }>({ student: null as any, isOpen: false });

  const monthKey = format(selectedMonth, 'yyyy-MM');

  useEffect(() => {
    if (!user) return;

    const studentsQuery = query(
      collection(db, 'students'),
      where('teacherId', '==', user.uid)
    );

    const paymentsQuery = query(
      collection(db, 'payments'),
      where('teacherId', '==', user.uid),
      where('month', '==', monthKey)
    );

    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'payments'));

    return () => {
      unsubStudents();
      unsubPayments();
    };
  }, [user, monthKey]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           s.standard?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (statusFilter === 'All') return matchesSearch;
      
      const payment = payments.find(p => p.studentId === s.id);
      const status = payment?.status || 'Pending';
      return matchesSearch && status === statusFilter;
    });
  }, [students, searchQuery, statusFilter, payments]);

  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalExpected = students.reduce((acc, s) => acc + s.feeAmount, 0);
    const totalPaid = payments.filter(p => p.status === 'Paid').reduce((acc, p) => acc + (p.amount || 0), 0);
    const pendingCount = students.length - payments.filter(p => p.status === 'Paid').length;
    
    return { totalStudents, totalExpected, totalPaid, pendingCount };
  }, [students, payments]);

  const handleMarkAsPaid = async (student: Student, method: PaymentMethod = 'Cash') => {
    const currentUid = teacher?.uid || user?.uid;
    if (!currentUid) return;
    
    const paymentId = `${student.id}_${monthKey}`;
    const paymentRef = doc(db, 'payments', paymentId);
    
    try {
      await setDoc(paymentRef, {
        teacherId: currentUid,
        studentId: student.id,
        month: monthKey,
        amount: student.feeAmount,
        status: 'Paid',
        method: method,
        paidAt: new Date().toISOString()
      });
      setPaymentModal({ student: null as any, isOpen: false });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'payments');
    }
  };

  const handleDeletePayment = async (studentId: string) => {
    const paymentId = `${studentId}_${monthKey}`;
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'payments');
    }
  };

  const handleSendReminder = (student: Student) => {
    const monthName = format(selectedMonth, 'MMMM');
    const message = `Dear Parent, this is a reminder for ${student.name}'s fees for ${monthName}. Amount: ${student.feeAmount}. Please ignore if already paid.`;
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${student.mobile?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const getNextDueDate = (student: Student) => {
    // Find the latest payment for this student
    const studentPayments = payments
      .filter(p => p.studentId === student.id && p.status === 'Paid')
      .sort((a, b) => b.month.localeCompare(a.month));

    let nextMonth: Date;
    if (studentPayments.length > 0) {
      const lastPaymentMonth = parseISO(`${studentPayments[0].month}-01`);
      nextMonth = addMonths(lastPaymentMonth, 1);
    } else {
      // If no payments, use joining date or current month
      nextMonth = student.joiningDate ? parseISO(student.joiningDate) : startOfMonth(new Date());
    }

    // If nextMonth is in the past compared to current selected month, 
    // and current month is not paid, next due is current month
    const currentMonthStart = startOfMonth(selectedMonth);
    const isCurrentPaid = payments.some(p => p.studentId === student.id && p.month === format(selectedMonth, 'yyyy-MM') && p.status === 'Paid');
    
    if (!isCurrentPaid && isAfter(currentMonthStart, nextMonth)) {
      return currentMonthStart;
    }

    return nextMonth;
  };

  const changeMonth = (offset: number) => {
    setSelectedMonth(prev => offset > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  return (
    <div className="space-y-8">
      {/* Header & Month Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard</h1>
          <p className="text-slate-500 mt-1">Track and manage your tuition fee payments.</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start">
          <button 
            onClick={() => changeMonth(-1)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="px-6 py-2 flex items-center gap-2 min-w-[160px] justify-center">
            <CalendarIcon size={18} className="text-blue-600" />
            <span className="font-bold text-slate-800">{format(selectedMonth, 'MMMM yyyy')}</span>
          </div>
          <button 
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'blue' },
          { label: 'Expected Fees', value: `₹${stats.totalExpected}`, icon: DollarSign, color: 'emerald' },
          { label: 'Collected', value: `₹${stats.totalPaid}`, icon: TrendingUp, color: 'indigo' },
          { label: 'Pending', value: stats.pendingCount, icon: AlertCircle, color: 'rose' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900">{stat.value}</h3>
              </div>
              <div className={cn("p-3 rounded-2xl", `bg-${stat.color}-50 text-${stat.color}-600`)}>
                <stat.icon size={24} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search students or standards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200 appearance-none cursor-pointer min-w-[120px]"
            >
              <option value="All">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Standard</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Monthly Fee</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {filteredStudents.map((student) => {
                  const payment = payments.find(p => p.studentId === student.id);
                  const status = payment?.status || 'Pending';

                  return (
                    <motion.tr
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={student.id}
                      className="hover:bg-slate-50/50 transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-blue-600 font-bold shadow-sm">
                            {student.photoUrl ? (
                              <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              student.name[0]
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">{student.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <Clock size={10} className="text-slate-400" />
                              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                Next Due: {format(getNextDueDate(student), 'MMM yyyy')}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                          {student.standard}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-slate-800">₹{student.feeAmount}</p>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {status === 'Pending' ? (
                            <>
                              <button
                                onClick={() => setPaymentModal({ student, isOpen: true })}
                                className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                                title="Mark as Paid"
                              >
                                <CheckCircle2 size={20} />
                              </button>
                              <button
                                onClick={() => handleSendReminder(student)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="Send Reminder"
                              >
                                <MessageCircle size={20} />
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <div className="text-right mr-2">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">{payment?.method}</p>
                                <p className="text-[10px] text-slate-400 font-medium italic">
                                  {payment?.paidAt ? format(new Date(payment.paidAt), 'dd MMM') : 'N/A'}
                                </p>
                              </div>
                              <button
                                onClick={() => setReceiptModal({ payment: payment!, student, isOpen: true })}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="View Receipt"
                              >
                                <Receipt size={18} />
                              </button>
                              <button
                                onClick={() => setDeleteModal({ student, isOpen: true })}
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                title="Delete Payment"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          )}
                          <button
                            onClick={() => setReportModal({ student, isOpen: true })}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                            title="Annual Report"
                          >
                            <FileText size={18} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
              {filteredStudents.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                        <Users size={40} />
                      </div>
                      <div>
                        <p className="text-lg font-bold text-slate-800">No students found</p>
                        <p className="text-slate-500">Try adjusting your search or add a new student.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <AnimatePresence>
        {paymentModal.isOpen && (
          <PaymentMethodModal
            isOpen={paymentModal.isOpen}
            onClose={() => setPaymentModal({ student: null as any, isOpen: false })}
            onConfirm={(method) => handleMarkAsPaid(paymentModal.student, method)}
            student={paymentModal.student}
            month={monthKey}
          />
        )}
        {receiptModal.isOpen && (
          <ReceiptModal
            isOpen={receiptModal.isOpen}
            onClose={() => setReceiptModal({ payment: null as any, student: null as any, isOpen: false })}
            payment={receiptModal.payment}
            student={receiptModal.student}
            teacherName={teacher?.name || user?.displayName || 'Teacher'}
          />
        )}
        {reportModal.isOpen && (
          <AnnualReportModal
            isOpen={reportModal.isOpen}
            onClose={() => setReportModal({ student: null as any, isOpen: false })}
            student={reportModal.student}
            teacherName={teacher?.name || user?.displayName || 'Teacher'}
          />
        )}
        {deleteModal.isOpen && (
          <DeleteConfirmationModal
            isOpen={deleteModal.isOpen}
            onClose={() => setDeleteModal({ student: null as any, isOpen: false })}
            onConfirm={() => handleDeletePayment(deleteModal.student.id)}
            studentName={deleteModal.student.name}
            month={monthKey}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
