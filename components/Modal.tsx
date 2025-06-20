
import React, { ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full';
  footer?: ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md', footer }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full h-full',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900 bg-opacity-70 backdrop-blur-sm p-4 transition-opacity duration-300 ease-in-out">
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`bg-white rounded-xl shadow-xl w-full ${sizeClasses[size]} flex flex-col max-h-[90vh] overflow-hidden transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow`}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <h3 id="modal-title" className="text-xl font-bold text-brand-primary">{title}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-grow scrollbar-sleek">
          {children}
        </div>
        {footer && (
          <div className="p-5 border-t border-slate-200 bg-slate-50 rounded-b-xl flex justify-end space-x-3 [&>button]:min-w-[100px]">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalShow {
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-modalShow {
          animation: modalShow 0.3s forwards;
        }
      `}</style>
    </div>
  );
};