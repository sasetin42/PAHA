"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';

interface RejectedApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  rejectionReason: string;
}

const RejectedApplicationModal: React.FC<RejectedApplicationModalProps> = ({
  isOpen,
  onClose,
  rejectionReason,
}) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleResubmit = () => {
    onClose();
    navigate('/membership-application');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Membership Application Rejected
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="text-sm text-slate-600 dark:text-slate-300 mb-6">
          <p>
            Your membership application was <span className="font-semibold text-rose-600">rejected</span>.
          </p>
          <p className="mt-2">
            <strong>Reason:</strong> {rejectionReason || 'Not specified.'}
          </p>
          <p className="mt-4 font-medium">
            Please correct the issues and resubmit for review.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleResubmit}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
          >
            Resubmit Application
          </button>
        </div>
      </div>
    </div>
  );
};

export default RejectedApplicationModal;