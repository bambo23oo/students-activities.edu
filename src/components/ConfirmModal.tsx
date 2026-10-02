import React from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

type ConfirmModalProps = {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'success' | 'warning' | 'info';
};

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'warning'
}) => {
  if (!isOpen) return null;

  // Visuals based on variant
  const getIcon = () => {
    switch (variant) {
      case 'danger': return <XCircle className="w-6 h-6 text-red-600" />;
      case 'success': return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      default: return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    }
  };

  const getButtonClass = () => {
    switch (variant) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 focus:ring-red-500';
      case 'success': return 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500';
      default: return 'bg-amber-700 hover:bg-blue-700 focus:ring-amber-500';
    }
  };

  const getIconBg = () => {
    switch (variant) {
      case 'danger': return 'bg-red-100';
      case 'success': return 'bg-emerald-100';
      default: return 'bg-amber-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onCancel}
        aria-hidden="true"
      />
      
      {/* Modal panel */}
      <div className="relative w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all animate-in zoom-in-95 duration-200">
        <div className="flex items-start gap-4">
          <div className={`flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full ${getIconBg()}`}>
            {getIcon()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold leading-6 text-slate-900">
              {title}
            </h3>
            <div className="mt-2 text-sm text-slate-500">
              {message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            className="inline-flex justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 transition-colors"
            onClick={onCancel}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={`inline-flex justify-center rounded-lg border border-transparent px-4 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors ${getButtonClass()}`}
            onClick={() => {
              onConfirm();
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
