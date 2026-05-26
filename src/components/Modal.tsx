import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { BrutalCard } from './BrutalUI';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal = ({ isOpen, onClose, title, children }: ModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[101] pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-full max-w-lg pointer-events-auto"
            >
              <BrutalCard className="p-8 border-2 border-brutal-red relative">
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 text-brutal-text-sec hover:text-white transition-colors"
                >
                  <X />
                </button>
                <h3 className="text-3xl font-black uppercase mb-8 tracking-tighter">{title}</h3>
                {children}
              </BrutalCard>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
