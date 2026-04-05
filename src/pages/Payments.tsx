import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Calendar,
  User,
  IndianRupee,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Receipt,
  FileText,
  MessageCircle
} from 'lucide-react';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Payment, Student, PaymentStatus } from '../types';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { ReceiptModal, AnnualReportModal, DeleteConfirmationModal } from '../components/PaymentModals';
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

  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider", styles[status])}>
      {status}
    </span>
  );
};

export default function Payments() {
  const { teacher, user } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [receiptModal, setReceiptModal] = useState<{ payment: Payment; student: Student; isOpen: boolean }>({ payment: null as any, student: null as any, isOpen: false });
  const [reportModal, setReportModal] = useState<{ student: Student; isOpen: boolean }>({ student: null as any, isOpen: false });
  const [deleteModal, setDeleteModal] = useState<{ paymentId: string; studentName: string; month: string; isOpen: boolean }>({ paymentId: '', studentName: '', month: '', isOpen: false });

  const monthKey = format(selectedMonth, 'yyyy-MM');

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) return;

    const headers = ['Student Name', 'Parent Name', 'Mobile', 'Board', 'Standard', 'Month', 'Amount', 'Method', 'Status', 'Paid At'];
    const rows = filteredPayments.map(p => {
      const student = students.find(s => s.id === p.studentId);
      return [
        student?.name || 'Unknown',
        student?.parentName || 'N/A',
        student?.mobile || 'N/A',
        student?.board || 'N/A',
        student?.standard || 'N/A',
        format(new Date(p.month + '-01'), 'MMMM yyyy'),
        p.amount || 0,
        p.method || 'Cash',
        p.status,
        p.paidAt ? format(new Date(p.paidAt), 'dd MMM yyyy') : 'N/A'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `payments_${monthKey}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    if (!user) return;

    const studentsQuery = query(
      collection(db, 'students'),
      where('teacherId', '==', user.uid)
    );

    const paymentsQuery = query(
      collection(db, 'payments'),
      where('teacherId', '==', user.uid),
      orderBy('paidAt', 'desc')
    );

    const unsubStudents = onSnapshot(studentsQuery, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
    });

    const unsubPayments = onSnapshot(paymentsQuery, (snapshot) => {
      setPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'payments'));

    return () => {
      unsubStudents();
      unsubPayments();
    };
  }, [user]);

  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const student = students.find(s => s.id === p.studentId);
      const matchesSearch = student?.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           p.month.includes(searchQuery);
      const matchesMonth = p.month === monthKey;
      return matchesSearch && matchesMonth;
    });
  }, [payments, students, searchQuery, monthKey]);

  const stats = useMemo(() => {
    const currentMonthPayments = payments.filter(p => p.month === monthKey);
    const totalCollected = currentMonthPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const paidCount = currentMonthPayments.filter(p => p.status === 'Paid').length;
    return { totalCollected, paidCount };
  }, [payments, monthKey]);

  const changeMonth = (offset: number) => {
    setSelectedMonth(prev => offset > 0 ? addMonths(prev, 1) : subMonths(prev, 1));
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'payments', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'payments');
    }
  };

  const handleQuickWhatsAppShare = (payment: Payment, student: Student) => {
    const message = `*Payment Receipt*\n\n` +
      `*Receipt No:* #${payment.id.slice(-6).toUpperCase()}\n` +
      `*Student:* ${student.name}\n` +
      `*Month:* ${format(new Date(payment.month + '-01'), 'MMMM yyyy')}\n` +
      `*Amount:* ₹${payment.amount}\n` +
      `*Mode:* ${payment.method}\n` +
      `*Date:* ${payment.paidAt ? format(new Date(payment.paidAt), 'dd MMM yyyy') : 'N/A'}\n\n` +
      `Thank you for your payment!\n` +
      `Generated by TutorFlow on ${format(new Date(), 'dd MMM yyyy')}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${student.mobile?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Payment History</h1>
          <p className="text-slate-500 mt-1">Review and manage all student fee transactions.</p>
        </div>

        <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm self-start">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <div className="px-6 py-2 flex items-center gap-2 min-w-[160px] justify-center">
            <Calendar size={18} className="text-blue-600" />
            <span className="font-bold text-slate-800">{format(selectedMonth, 'MMMM yyyy')}</span>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-slate-50 rounded-xl transition-colors">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600">
            <IndianRupee size={32} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Collected this Month</p>
            <h3 className="text-3xl font-bold text-slate-900">₹{stats.totalCollected}</h3>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-6">
          <div className="bg-blue-50 p-4 rounded-2xl text-blue-600">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Successful Payments</p>
            <h3 className="text-3xl font-bold text-slate-900">{stats.paidCount}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by student name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
          
          <button 
            onClick={handleExportCSV}
            disabled={filteredPayments.length === 0}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 text-slate-600 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition-colors font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Month</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Method</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <AnimatePresence mode="popLayout">
                {filteredPayments.map((payment) => {
                  const student = students.find(s => s.id === payment.studentId);
                  return (
                    <motion.tr
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      key={payment.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold text-xs">
                            {student?.name[0] || 'S'}
                          </div>
                          <span className="font-bold text-slate-800">{student?.name || 'Unknown Student'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-slate-600">{format(new Date(payment.month + '-01'), 'MMMM yyyy')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-slate-800">₹{payment.amount}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                          {payment.method || 'Cash'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={payment.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-slate-500">
                          {payment.paidAt ? format(new Date(payment.paidAt), 'dd MMM, yyyy') : 'N/A'}
                        </span>
                      </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleQuickWhatsAppShare(payment, student!)}
                              className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                              title="Share via WhatsApp"
                            >
                              <MessageCircle size={18} />
                            </button>
                            <button
                              onClick={() => setReceiptModal({ payment, student: student!, isOpen: true })}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                              title="View Receipt"
                            >
                              <Receipt size={18} />
                            </button>
                            <button
                              onClick={() => setReportModal({ student: student!, isOpen: true })}
                              className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                              title="Annual Report"
                            >
                              <FileText size={18} />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ 
                                paymentId: payment.id, 
                                studentName: student?.name || 'Unknown', 
                                month: payment.month, 
                                isOpen: true 
                              })}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                              title="Delete Payment"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-slate-100">
          <AnimatePresence mode="popLayout">
            {filteredPayments.map((payment) => {
              const student = students.find(s => s.id === payment.studentId);
              return (
                <motion.div
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={payment.id}
                  className="p-4 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {student?.name[0] || 'S'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{student?.name || 'Unknown Student'}</p>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          {payment.method || 'Cash'} • ₹{payment.amount}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>

                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl">
                    <div className="text-[10px] font-medium text-slate-500">
                      Paid on: {payment.paidAt ? format(new Date(payment.paidAt), 'dd MMM, yyyy') : 'N/A'}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickWhatsAppShare(payment, student!)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                      >
                        <MessageCircle size={18} />
                      </button>
                      <button
                        onClick={() => setReceiptModal({ payment, student: student!, isOpen: true })}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <Receipt size={18} />
                      </button>
                      <button
                        onClick={() => setReportModal({ student: student!, isOpen: true })}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <FileText size={18} />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ 
                          paymentId: payment.id, 
                          studentName: student?.name || 'Unknown', 
                          month: payment.month, 
                          isOpen: true 
                        })}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {filteredPayments.length === 0 && !loading && (
          <div className="px-6 py-20 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="bg-slate-100 p-4 rounded-full text-slate-400">
                <CreditCard size={40} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-800">No payment records found</p>
                <p className="text-slate-500">Payments will appear here once students are marked as paid.</p>
              </div>
            </div>
          </div>
        )}
      </div>
      <AnimatePresence>
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
            onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
            onConfirm={() => handleDelete(deleteModal.paymentId)}
            studentName={deleteModal.studentName}
            month={deleteModal.month}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
