import React from 'react';
import { SupabaseSettings } from './SupabaseSettings';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 md:p-6 animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] bg-[#FCFBF9] rounded-3xl shadow-2xl overflow-y-auto border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <SupabaseSettings onClose={onClose} />
      </div>
    </div>
  );
};
