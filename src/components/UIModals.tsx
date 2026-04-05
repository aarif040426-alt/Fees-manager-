import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, Check, X, Info } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export const AlertModal = ({ isOpen, onClose, title, message, type = 'info' }: ModalProps) => {
  if (!isOpen) return null;

  const icons = {
    info: <Info className="text-blue-600" size={32} />,
    success: <Check className="text-emerald-600" size={32} />,
    warning: <AlertCircle className="text-amber-600" size={32} />,
    error: <X className="text-red-600" size={32} />,
  };

  const colors = {
    info: 'bg-blue-50',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    error: 'bg-red-50',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center space-y-6"
      >
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto", colors[type])}>
          {icons[type]}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm">{message}</p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all"
        >
          Got it
        </button>
      </motion.div>
    </div>
  );
};

interface ConfirmModalProps extends ModalProps {
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  type = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDestructive = false
}: ConfirmModalProps) => {
  if (!isOpen) return null;

  const icons = {
    info: <Info className="text-blue-600" size={32} />,
    success: <Check className="text-emerald-600" size={32} />,
    warning: <AlertCircle className="text-amber-600" size={32} />,
    error: <X className="text-red-600" size={32} />,
  };

  const colors = {
    info: 'bg-blue-50',
    success: 'bg-emerald-50',
    warning: 'bg-amber-50',
    error: 'bg-red-50',
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
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
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden p-8 text-center space-y-6"
      >
        <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mx-auto", colors[type])}>
          {icons[type]}
        </div>
        
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-slate-500 text-sm">{message}</p>
        </div>

        <div className="flex flex-col gap-3">
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={cn(
              "w-full py-3 text-white font-bold rounded-2xl transition-all shadow-lg",
              isDestructive ? "bg-red-600 hover:bg-red-700 shadow-red-100" : "bg-blue-600 hover:bg-blue-700 shadow-blue-100"
            )}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 bg-slate-100 text-slate-600 font-bold rounded-2xl hover:bg-slate-200 transition-all"
          >
            {cancelLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
