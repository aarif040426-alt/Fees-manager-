import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  MoreVertical, 
  Edit2, 
  Trash2, 
  UserPlus, 
  GraduationCap,
  Calendar,
  Phone,
  BookOpen,
  X,
  Check,
  AlertCircle,
  Camera,
  Upload
} from 'lucide-react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { Student, Board } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { PLAN_LIMITS } from '../constants';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { AlertModal, ConfirmModal } from '../components/UIModals';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const StudentModal = ({ 
  isOpen, 
  onClose, 
  student, 
  teacherId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  student?: Student | null;
  teacherId: string;
}) => {
  const [formData, setFormData] = useState({
    name: '',
    parentName: '',
    mobile: '',
    board: 'SSC' as Board,
    standard: '',
    feeAmount: 0,
    joiningDate: format(new Date(), 'yyyy-MM-dd'),
    photoUrl: ''
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (student) {
      setFormData({
        name: student.name,
        parentName: student.parentName || '',
        mobile: student.mobile || '',
        board: student.board,
        standard: student.standard || '',
        feeAmount: student.feeAmount,
        joiningDate: student.joiningDate || format(new Date(), 'yyyy-MM-dd'),
        photoUrl: student.photoUrl || ''
      });
      setPhotoPreview(student.photoUrl || null);
    } else {
      setFormData({
        name: '',
        parentName: '',
        mobile: '',
        board: 'SSC',
        standard: '',
        feeAmount: 0,
        joiningDate: format(new Date(), 'yyyy-MM-dd'),
        photoUrl: ''
      });
      setPhotoPreview(null);
    }
    setPhotoFile(null);
  }, [student, isOpen]);

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

  const uploadPhoto = async (file: File, studentId: string): Promise<string> => {
    const storageRef = ref(storage, `students/${studentId}/${file.name}`);
    await uploadBytes(storageRef, file);
    return await getDownloadURL(storageRef);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      let currentPhotoUrl = formData.photoUrl;

      if (student) {
        if (photoFile) {
          currentPhotoUrl = await uploadPhoto(photoFile, student.id);
        }
        await updateDoc(doc(db, 'students', student.id), {
          ...formData,
          photoUrl: currentPhotoUrl,
          updatedAt: serverTimestamp()
        });
      } else {
        const docRef = await addDoc(collection(db, 'students'), {
          ...formData,
          teacherId,
          createdAt: serverTimestamp()
        });
        
        if (photoFile) {
          const uploadedUrl = await uploadPhoto(photoFile, docRef.id);
          await updateDoc(docRef, { photoUrl: uploadedUrl });
        }
      }
      onClose();
    } catch (err) {
      handleFirestoreError(err, student ? OperationType.UPDATE : OperationType.CREATE, 'students');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-xl text-white">
              <UserPlus size={20} />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {student ? 'Edit Student' : 'Add New Student'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Photo Upload Section */}
          <div className="flex flex-col items-center justify-center space-y-4 pb-4 border-b border-slate-100">
            <div className="relative group">
              <div className="w-32 h-32 rounded-3xl bg-slate-100 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center transition-all group-hover:border-blue-400 group-hover:bg-blue-50">
                {photoPreview ? (
                  <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="flex flex-col items-center text-slate-400 group-hover:text-blue-500">
                    <Camera size={32} strokeWidth={1.5} />
                    <span className="text-xs font-bold mt-2">Add Photo</span>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              {photoPreview && (
                <div className="absolute -bottom-2 -right-2 bg-blue-600 text-white p-2 rounded-xl shadow-lg border-2 border-white">
                  <Upload size={16} />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-500 font-medium italic">Click to upload student profile picture</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Student Name*</label>
              <input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="Full Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Parent Name</label>
              <input
                value={formData.parentName}
                onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="Parent/Guardian Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Mobile Number (WhatsApp)</label>
              <input
                type="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="+91 00000 00000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Board*</label>
              <select
                required
                value={formData.board}
                onChange={(e) => setFormData({ ...formData, board: e.target.value as Board })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"
              >
                <option value="SSC">SSC</option>
                <option value="ICSE">ICSE</option>
                <option value="CBSE">CBSE</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Standard/Grade</label>
              <input
                value={formData.standard}
                onChange={(e) => setFormData({ ...formData, standard: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                placeholder="e.g. 10th Grade"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Monthly Fee Amount*</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  required
                  value={formData.feeAmount}
                  onChange={(e) => setFormData({ ...formData, feeAmount: Number(e.target.value) })}
                  className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Joining Date</label>
              <input
                type="date"
                value={formData.joiningDate}
                onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={20} />}
              {student ? 'Update Student' : 'Save Student'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default function Students() {
  const { teacher, user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'warning' | 'error' }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info'
  });
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'students'),
      where('teacherId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setStudents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Student)));
      setLoading(false);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'students'));

    return () => unsubscribe();
  }, [user]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.standard?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [students, searchQuery]);

  const planLimit = teacher ? PLAN_LIMITS[teacher.plan] : PLAN_LIMITS.Free;
  const isLimitReached = students.length >= planLimit.maxStudents;

  const handleDelete = async (id: string) => {
    setConfirmData({
      isOpen: true,
      title: 'Delete Student?',
      message: 'Are you sure you want to delete this student? All payment records will remain but the student will be removed.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'students', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'students');
        }
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 tracking-tight">Students</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1">Manage your student directory and their details.</p>
        </div>

        <button
          onClick={() => {
            if (isLimitReached) {
              setAlertData({
                isOpen: true,
                title: 'Student Limit Reached',
                message: `You have reached the limit of ${planLimit.maxStudents} students for your ${teacher?.plan} plan. Please upgrade to add more students.`,
                type: 'warning'
              });
              return;
            }
            setEditingStudent(null);
            setIsModalOpen(true);
          }}
          className={cn(
            "w-full md:w-auto flex items-center justify-center gap-2 text-white font-bold py-3 px-6 rounded-2xl shadow-lg transition-all group",
            isLimitReached ? "bg-slate-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
          )}
        >
          <Plus size={20} className={cn(!isLimitReached && "group-hover:rotate-90 transition-transform duration-300")} />
          <span>Add Student</span>
        </button>
      </div>

      {isLimitReached && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-800">
          <AlertCircle size={20} className="text-amber-600 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Student Limit Reached</p>
            <p>You've used all {planLimit.maxStudents} student slots in your {teacher?.plan} plan. <span className="font-bold underline cursor-pointer">Upgrade now</span> to add more.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-6 border-b border-slate-100">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name or standard..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">
          <AnimatePresence mode="popLayout">
            {filteredStudents.map((student) => (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                key={student.id}
                className="bg-white border border-slate-200 rounded-3xl p-6 hover:shadow-lg hover:shadow-blue-50 hover:border-blue-100 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-slate-100 overflow-hidden flex items-center justify-center text-blue-600 text-xl font-bold shadow-inner">
                      {student.photoUrl ? (
                        <img src={student.photoUrl} alt={student.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        student.name[0]
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{student.name}</h3>
                      <p className="text-sm text-slate-500 font-medium">{student.parentName || 'No Parent Name'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => {
                        setEditingStudent(student);
                        setIsModalOpen(true);
                      }}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(student.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <BookOpen size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Board</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{student.board}</p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400 mb-1">
                      <GraduationCap size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-wider">Standard</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">{student.standard || 'N/A'}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <span className="text-sm font-bold">₹</span>
                    </div>
                    <span className="text-sm font-bold">₹{student.feeAmount} / month</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                      <Phone size={16} />
                    </div>
                    <span className="text-sm font-medium">{student.mobile || 'No Mobile'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
                      <Calendar size={16} />
                    </div>
                    <span className="text-sm font-medium">Joined {student.joiningDate ? format(new Date(student.joiningDate), 'MMM yyyy') : 'N/A'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filteredStudents.length === 0 && !loading && (
          <div className="px-6 py-20 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-blue-50 p-6 rounded-full text-blue-600">
                <UserPlus size={48} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Start your student list</h3>
                <p className="text-slate-500 max-w-xs mx-auto mt-2">Add your first student to begin tracking their payments and progress.</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="mt-4 bg-blue-600 text-white font-bold py-3 px-8 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
              >
                Add Your First Student
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <StudentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            student={editingStudent}
            teacherId={teacher?.uid || user?.uid || ''}
          />
        )}
      </AnimatePresence>

      <AlertModal
        isOpen={alertData.isOpen}
        onClose={() => setAlertData({ ...alertData, isOpen: false })}
        title={alertData.title}
        message={alertData.message}
        type={alertData.type}
      />

      <ConfirmModal
        isOpen={confirmData.isOpen}
        onClose={() => setConfirmData({ ...confirmData, isOpen: false })}
        onConfirm={confirmData.onConfirm}
        title={confirmData.title}
        message={confirmData.message}
        isDestructive
        confirmLabel="Yes, Delete Student"
      />
    </div>
  );
}
