import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  CreditCard, 
  Banknote, 
  Download, 
  Printer, 
  Share2,
  Calendar,
  User,
  IndianRupee,
  FileText,
  CheckCircle2,
  Trash2,
  MessageCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { Student, Payment, PaymentMethod } from '../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const PaymentMethodModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  student,
  month 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: (method: PaymentMethod) => void;
  student: Student;
  month: string;
}) => {
  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-[#ffffff] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden"
      >
        <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[#0f172a]">Confirm Payment</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-xl transition-colors">
            <X size={20} className="text-[#94a3b8]" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-[#64748b] font-medium">Marking payment for</p>
            <h3 className="text-2xl font-bold text-[#0f172a]">{student.name}</h3>
            <p className="text-[#2563eb] font-bold text-lg">₹{student.feeAmount}</p>
            <p className="text-xs text-[#94a3b8] uppercase tracking-widest font-bold">
              {format(new Date(month + '-01'), 'MMMM yyyy')}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => onConfirm('Cash')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#f1f5f9] hover:border-[#10b981] hover:bg-[#ecfdf5] transition-all group"
            >
              <div className="p-3 rounded-xl bg-[#d1fae5] text-[#059669] group-hover:scale-110 transition-transform">
                <Banknote size={24} />
              </div>
              <span className="font-bold text-[#334155]">Cash</span>
            </button>
            <button
              onClick={() => onConfirm('Online')}
              className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-[#f1f5f9] hover:border-[#3b82f6] hover:bg-[#eff6ff] transition-all group"
            >
              <div className="p-3 rounded-xl bg-[#dbeafe] text-[#2563eb] group-hover:scale-110 transition-transform">
                <CreditCard size={24} />
              </div>
              <span className="font-bold text-[#334155]">Online</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export const ReceiptModal = ({ 
  isOpen, 
  onClose, 
  payment, 
  student,
  teacherName,
  tuitionName
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  payment: Payment;
  student: Student;
  teacherName: string;
  tuitionName?: string;
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  if (!isOpen || !payment || !student) return null;

  const handleDownloadPDF = async () => {
    const element = document.getElementById('receipt-content');
    if (!element) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('receipt-content');
          if (el) {
            el.style.backgroundColor = '#ffffff';
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
          }
          // Fix oklch parsing error in html2canvas by replacing oklch with hex fallback in cloned styles
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.innerHTML.includes('oklch')) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#64748b');
            }
          });
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${student.name.replace(/\s+/g, '_')}_${payment.month}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #receipt-content, #receipt-content * { visibility: visible; }
          #receipt-content { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-lg bg-[#ffffff] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden print:shadow-none print:rounded-none"
      >
        <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between print:hidden">
          <h2 className="text-xl font-bold text-[#0f172a]">Payment Receipt</h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint} 
              className="p-2 hover:bg-[#f1f5f9] rounded-xl transition-colors text-[#64748b]"
              title="Print Receipt"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isGenerating}
              className="p-2 hover:bg-[#f1f5f9] rounded-xl transition-colors text-[#2563eb] disabled:opacity-50"
              title="Download PDF"
            >
              <Download size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-xl transition-colors">
              <X size={20} className="text-[#94a3b8]" />
            </button>
          </div>
        </div>

        <div className="p-10 space-y-8" id="receipt-content" style={{ backgroundColor: '#ffffff' }}>
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#2563eb', color: '#ffffff' }}>
              <CheckCircle2 size={32} />
            </div>
            <h1 className="text-3xl font-black tracking-normal" style={{ color: '#000000', margin: '0', lineHeight: '1.2' }}>
              {tuitionName || `${teacherName}'s Tuition`}
            </h1>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">
                Official Receipt
              </span>
              {tuitionName && (
                <span className="text-xs font-medium text-slate-500">
                  by {teacherName}
                </span>
              )}
            </div>
            <p className="text-xs mt-2" style={{ color: '#64748b' }}>Generated on {format(new Date(), 'dd MMM yyyy')}</p>
          </div>

          <div className="rounded-2xl p-6 space-y-4 border" style={{ backgroundColor: '#f8fafc', borderColor: '#f1f5f9' }}>
            <div className="flex justify-between items-center pb-4 border-b" style={{ borderColor: '#e2e8f0' }}>
              <span className="font-medium" style={{ color: '#64748b' }}>Receipt No.</span>
              <span className="font-bold" style={{ color: '#0f172a' }}>#{payment.id.slice(-6).toUpperCase()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: '#64748b' }}>Student Name</span>
              <span className="font-bold" style={{ color: '#0f172a' }}>{student.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: '#64748b' }}>Parent Name</span>
              <span className="font-bold" style={{ color: '#0f172a' }}>{student.parentName || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: '#64748b' }}>For Month</span>
              <span className="font-bold" style={{ color: '#0f172a' }}>{format(new Date(payment.month + '-01'), 'MMMM yyyy')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: '#64748b' }}>Payment Mode</span>
              <span className="font-bold" style={{ color: '#0f172a' }}>{payment.method}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: '#64748b' }}>Paid Date</span>
              <span className="font-bold" style={{ color: '#0f172a' }}>
                {payment.paidAt ? format(new Date(payment.paidAt), 'dd MMM yyyy, hh:mm a') : 'N/A'}
              </span>
            </div>
          </div>

          <div className="text-center py-6 border-y-2 border-dashed" style={{ borderColor: '#f1f5f9' }}>
            <p className="text-sm font-medium uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Amount Paid</p>
            <h2 className="text-4xl font-black tracking-tight" style={{ color: '#0f172a' }}>₹{payment.amount}</h2>
          </div>

          <div className="text-center space-y-1">
            <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{teacherName}</p>
            <p className="text-xs" style={{ color: '#94a3b8' }}>Thank you for your payment!</p>
          </div>
        </div>

        <div className="p-6 bg-[#f8fafc] border-t border-[#f1f5f9] flex items-center justify-center gap-3 print:hidden">
          <button 
            onClick={handleWhatsAppShare}
            className="flex items-center gap-2 px-6 py-3 bg-[#059669] text-[#ffffff] font-bold rounded-2xl hover:bg-[#047857] transition-all shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-[#064e3b]/10"
          >
            <MessageCircle size={18} />
            <span>WhatsApp Share</span>
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-[#2563eb] text-[#ffffff] font-bold rounded-2xl hover:bg-[#1d4ed8] transition-all shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-[#1e3a8a]/10 disabled:opacity-50"
          >
            <Download size={18} />
            <span>{isGenerating ? 'Generating...' : 'Download Receipt'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const AnnualReportModal = ({ 
  isOpen, 
  onClose, 
  student,
  teacherName,
  tuitionName
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  student: Student;
  teacherName: string;
  tuitionName?: string;
}) => {
  const [studentPayments, setStudentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && student) {
      const fetchPayments = async () => {
        setLoading(true);
        try {
          const q = query(
            collection(db, 'payments'),
            where('teacherId', '==', student.teacherId),
            where('studentId', '==', student.id),
            orderBy('month', 'desc')
          );
          const snapshot = await getDocs(q);
          setStudentPayments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Payment)));
        } catch (err) {
          console.error("Error fetching annual report:", err);
        } finally {
          setLoading(false);
        }
      };
      fetchPayments();
    }
  }, [isOpen, student]);

  if (!isOpen || !student) return null;

  const totalPaid = studentPayments.reduce((acc, p) => acc + (p.amount || 0), 0);

  const handleDownloadPDF = async () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
        onclone: (clonedDoc) => {
          const el = clonedDoc.getElementById('report-content');
          if (el) {
            el.style.backgroundColor = '#ffffff';
            el.style.height = 'auto';
            el.style.maxHeight = 'none';
            el.style.overflow = 'visible';
          }
          // Also fix parent container in clone
          const parent = el?.parentElement;
          if (parent) {
            parent.style.height = 'auto';
            parent.style.maxHeight = 'none';
            parent.style.overflow = 'visible';
          }
          // Fix oklch parsing error in html2canvas by replacing oklch with hex fallback in cloned styles
          const styles = clonedDoc.querySelectorAll('style');
          styles.forEach(style => {
            if (style.innerHTML.includes('oklch')) {
              style.innerHTML = style.innerHTML.replace(/oklch\([^)]+\)/g, '#64748b');
            }
          });
        }
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      // Handle multi-page if necessary
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`Annual_Report_${student.name.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error("Error generating PDF:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleWhatsAppShare = () => {
    const paymentHistoryText = studentPayments
      .map(p => `• ${format(new Date(p.month + '-01'), 'MMM yyyy')}: ₹${p.amount} (${p.method})`)
      .join('\n');

    const message = `*Annual Payment Report*\n\n` +
      `*Student:* ${student.name}\n` +
      `*Standard:* ${student.standard}\n` +
      `*Total Paid:* ₹${totalPaid}\n\n` +
      `*Payment History:*\n${paymentHistoryText}\n\n` +
      `Generated by TutorFlow on ${format(new Date(), 'dd MMM yyyy')}`;

    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${student.mobile?.replace(/\D/g, '')}?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          #report-content, #report-content * { visibility: visible; }
          #report-content { position: absolute; left: 0; top: 0; width: 100%; }
        }
      `}} />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-3xl bg-[#ffffff] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-[#f1f5f9] flex items-center justify-between bg-[#ffffff] sticky top-0 z-10 print:hidden">
          <div className="flex items-center gap-3">
            <div className="bg-[#4f46e5] p-2 rounded-xl text-[#ffffff]">
              <FileText size={20} />
            </div>
            <h2 className="text-xl font-bold text-[#0f172a]">Annual Payment Report</h2>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint} 
              className="p-2 hover:bg-[#f1f5f9] rounded-xl transition-colors text-[#64748b]"
              title="Print Report"
            >
              <Printer size={20} />
            </button>
            <button 
              onClick={handleDownloadPDF} 
              disabled={isGenerating}
              className="p-2 hover:bg-[#f1f5f9] rounded-xl transition-colors text-[#2563eb] disabled:opacity-50"
              title="Download PDF"
            >
              <Download size={20} />
            </button>
            <button onClick={onClose} className="p-2 hover:bg-[#f1f5f9] rounded-xl transition-colors">
              <X size={20} className="text-[#94a3b8]" />
            </button>
          </div>
        </div>

        <div className="p-10 space-y-8 overflow-y-auto flex-1" id="report-content" style={{ backgroundColor: '#ffffff' }}>
          <div className="text-center border-b pb-8 mb-8" style={{ borderColor: '#e2e8f0' }}>
            <h1 className="text-4xl font-black tracking-normal" style={{ color: '#000000', margin: '0', lineHeight: '1.2' }}>
              {tuitionName || `${teacherName}'s Tuition`}
            </h1>
            <div className="flex items-center justify-center gap-3 mt-3">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full">
                Annual Payment Report
              </span>
              {tuitionName && (
                <span className="text-sm font-medium text-slate-500">
                  Managed by {teacherName}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 border-b pb-6" style={{ borderColor: '#e2e8f0' }}>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold" style={{ backgroundColor: '#f1f5f9', color: '#1e293b' }}>
                  {student.name[0]}
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: '#0f172a' }}>{student.name}</h1>
                  <p className="text-sm font-medium" style={{ color: '#64748b' }}>{student.standard} • {student.board}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
                <div className="flex items-center gap-1.5" style={{ color: '#64748b' }}>
                  <User size={14} />
                  <span>Parent: <span className="font-semibold" style={{ color: '#334155' }}>{student.parentName || 'N/A'}</span></span>
                </div>
                <div className="flex items-center gap-1.5" style={{ color: '#64748b' }}>
                  <Calendar size={14} />
                  <span>Joined: <span className="font-semibold" style={{ color: '#334155' }}>{student.joiningDate ? format(new Date(student.joiningDate), 'dd MMM yyyy') : 'N/A'}</span></span>
                </div>
              </div>
            </div>
            <div className="p-4 rounded-xl border text-right min-w-[180px]" style={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0' }}>
              <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: '#64748b' }}>Total Fees Paid</p>
              <h2 className="text-2xl font-bold" style={{ color: '#0f172a' }}>₹{totalPaid}</h2>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-base font-bold" style={{ color: '#0f172a' }}>Payment History</h3>
            <div className="overflow-hidden border" style={{ borderColor: '#e2e8f0', borderRadius: '8px' }}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Month</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Date</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider" style={{ color: '#64748b' }}>Mode</th>
                    <th className="px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-right" style={{ color: '#64748b' }}>Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: '#f1f5f9' }}>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center">
                        <div className="w-6 h-6 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: '#4f46e5', borderTopColor: '#4f46e5' }} />
                      </td>
                    </tr>
                  ) : studentPayments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-sm font-medium" style={{ color: '#94a3b8' }}>No payments recorded yet.</td>
                    </tr>
                  ) : (
                    studentPayments.map((p) => (
                      <tr key={p.id} className="transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold" style={{ color: '#1e293b' }}>
                          {format(new Date(p.month + '-01'), 'MMMM yyyy')}
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#64748b' }}>
                          {p.paidAt ? format(new Date(p.paidAt), 'dd MMM yyyy') : 'N/A'}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold uppercase" style={{ color: '#475569' }}>
                            {p.method}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: '#0f172a' }}>₹{p.amount}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                {!loading && studentPayments.length > 0 && (
                  <tfoot>
                    <tr style={{ backgroundColor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-right" style={{ color: '#0f172a' }}>Total Amount Paid:</td>
                      <td className="px-4 py-3 text-right text-base font-black" style={{ color: '#2563eb' }}>₹{totalPaid}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="pt-8 border-t flex justify-between items-center" style={{ borderColor: '#f1f5f9' }}>
            <div className="space-y-1">
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{teacherName}</p>
              <p className="text-xs" style={{ color: '#94a3b8' }}>TutorFlow Tuition Management</p>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: '#94a3b8' }}>Generated on</p>
              <p className="text-sm font-bold" style={{ color: '#0f172a' }}>{format(new Date(), 'dd MMM yyyy')}</p>
            </div>
          </div>
        </div>

        <div className="p-6 bg-[#f8fafc] border-t border-[#f1f5f9] flex flex-wrap items-center justify-end gap-3 print:hidden">
          <button 
            onClick={onClose}
            className="px-6 py-3 text-[#475569] font-bold hover:bg-[#f1f5f9] rounded-2xl transition-colors"
          >
            Close
          </button>
          <button 
            onClick={handleWhatsAppShare}
            className="flex items-center gap-2 px-6 py-3 bg-[#059669] text-[#ffffff] font-bold rounded-2xl hover:bg-[#047857] transition-all shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-[#064e3b]/10"
          >
            <MessageCircle size={18} />
            <span>WhatsApp Share</span>
          </button>
          <button 
            onClick={handleDownloadPDF}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-3 bg-[#4f46e5] text-[#ffffff] font-bold rounded-2xl hover:bg-[#4338ca] transition-all shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-[#312e81]/10 disabled:opacity-50"
          >
            <Download size={18} />
            <span>{isGenerating ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export const DeleteConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  studentName,
  month 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void;
  studentName: string;
  month: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#0f172a]/60 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-sm bg-[#ffffff] rounded-3xl shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] overflow-hidden p-8 text-center space-y-6"
      >
        <div className="w-16 h-16 bg-[#ffe4e6] text-[#e11d48] rounded-2xl flex items-center justify-center mx-auto">
          <Trash2 size={32} />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-[#0f172a]">Delete Payment?</h2>
          <p className="text-[#64748b] text-sm">
            Are you sure you want to delete the payment record for <span className="font-bold text-[#0f172a]">{studentName}</span> for <span className="font-bold text-[#0f172a]">{format(new Date(month + '-01'), 'MMMM yyyy')}</span>?
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="w-full py-3 bg-[#e11d48] text-[#ffffff] font-bold rounded-2xl hover:bg-[#be123c] transition-all shadow-[0_10px_15px_-3px_rgba(0,0,0,0.1),0_4px_6px_-4px_rgba(0,0,0,0.1)] shadow-[#881337]/10"
          >
            Yes, Delete Record
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#f1f5f9] text-[#475569] font-bold rounded-2xl hover:bg-[#e2e8f0] transition-all"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
};
