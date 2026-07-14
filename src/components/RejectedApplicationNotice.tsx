"use client";

import React from 'react';
import { Link } from 'react-router-dom';

interface RejectedApplicationNoticeProps {
  rejectionReason: string;
  onDismiss?: () => void;
}

const RejectedApplicationNotice: React.FC<RejectedApplicationNoticeProps> = ({
  rejectionReason,
  onDismiss,
}) => {
  return (
    <div className="bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 p-4 mb-6">
      <div className="max-w-7xl mx-auto px-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-rose-500 mt-1">
          error
        </span>
        <div className="flex-1">
          <h3 className="font-bold text-sm text-rose-800 dark:text-rose-200 uppercase tracking-wider">
            Membership Application Not Approved
          </h3>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            <strong>Reason:</strong> {rejectionReason || 'Insufficient documents'}
          </p>
          <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
            Fix the issue above — e.g., re-upload a corrected document below — then{' '}
            <Link
              to="/membership-application"
              className="font-semibold text-primary hover:underline"
            >
              resubmit your application
            </Link>{' '}
            for another review.
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-slate-400 hover:text-rose-500"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        )}
      </div>
    </div>
  );
};

export default RejectedApplicationNotice;