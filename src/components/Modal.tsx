import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  return (
    <div style={{ display: isOpen ? 'flex' : 'none' }} className="fixed inset-0 z-[100] items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/60" 
        onClick={onClose}
      />
      <div className="relative z-[101] w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>
        <h3 className="text-xl font-bold mb-6 pr-8">{title}</h3>
        {children}
      </div>
    </div>
  );
};
