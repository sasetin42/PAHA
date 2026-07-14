import React, { useState } from 'react';
import type { CategoryStatus, FileMetadata } from '../types/accreditation';

interface DocumentUploadCardProps {
  categoryId: string;
  title: string;
  description?: string;
  adminStatus?: CategoryStatus;
  adminRemarks?: string;
  selfAssessmentScore?: number;
  requiredScore?: number;
  files: FileMetadata[];
  onFileUpload: (categoryId: string, files: FileList | null) => void;
  onFileRemove: (categoryId: string, index: number) => void;
  readOnly?: boolean;
}

const STATUS_CONFIG: Record<CategoryStatus, { color: string; bg: string; icon: string; label: string }> = {
  pending: {
    color: 'text-slate-500',
    bg: 'bg-slate-100 dark:bg-slate-800',
    icon: 'schedule',
    label: 'Pending Review'
  },
  complied: {
    color: 'text-emerald-600',
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: 'check_circle',
    label: 'Complied'
  },
  non_complied: {
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: 'warning',
    label: 'Non-Complied'
  },
  visual_required: {
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: 'visibility',
    label: 'Visual Required'
  }
};

const DocumentUploadCard: React.FC<DocumentUploadCardProps> = ({
  categoryId,
  title,
  description,
  adminStatus,
  adminRemarks,
  selfAssessmentScore,
  requiredScore = 100,
  files,
  onFileUpload,
  onFileRemove,
  readOnly = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const status = adminStatus || 'pending';
  const config = STATUS_CONFIG[status];
  const scorePercent = selfAssessmentScore !== undefined ? Math.round(selfAssessmentScore) : null;
  const isBelowRequired = scorePercent !== null && scorePercent < requiredScore;

  return (
    <div className={`
      bg-white dark:bg-slate-800 rounded-3xl border overflow-hidden transition-all
      ${status === 'non_complied' ? 'border-red-300 dark:border-red-800' : 'border-slate-200 dark:border-slate-700'}
      ${status === 'complied' ? 'border-emerald-200 dark:border-emerald-800' : ''}
    `}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-[#1E3A8A] dark:text-white">{title}</h3>
            {adminStatus && (
              <span className={`
                flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase
                ${config.color} ${config.bg}
              `}>
                <span className="material-symbols-outlined text-sm">{config.icon}</span>
                {config.label}
              </span>
            )}
          </div>
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
          )}
          {adminRemarks && status === 'non_complied' && (
            <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
              <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">Remarks</p>
              <p className="text-sm text-red-700 dark:text-red-300">{adminRemarks}</p>
            </div>
          )}
          {status === 'visual_required' && (
            <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
                Requires physical inspection by PAHA during site visit.
              </p>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 ml-4">
          {scorePercent !== null && (
            <div className="text-right">
              <div className={`text-lg font-bold ${isBelowRequired ? 'text-red-500' : 'text-emerald-500'}`}>
                {scorePercent}%
              </div>
              <div className="text-xs text-slate-400">Score</div>
            </div>
          )}
          <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="p-6 pt-0 border-t border-slate-100 dark:border-slate-700">
          {!readOnly && (
            <div className="relative group mb-4">
              <input
                type="file"
                multiple
                onChange={(e) => onFileUpload(categoryId, e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                disabled={readOnly}
              />
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center group-hover:border-[#2563EB] group-hover:bg-blue-50/50 dark:group-hover:bg-blue-900/10 transition-all">
                <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-[#2563EB] mb-2 block">
                  cloud_upload
                </span>
                <p className="font-bold text-slate-700 dark:text-slate-300">Click to upload or drag & drop</p>
                <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG — Max 10MB per file</p>
              </div>
            </div>
          )}

          {files.length > 0 ? (
            <div className="space-y-2">
              {files.map((file, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="material-symbols-outlined text-blue-500 shrink-0">description</span>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {file.url ? 'Uploaded' : `${(file.size / (1024 * 1024)).toFixed(2)} MB`}
                      </span>
                    </div>
                  </div>
                  {!readOnly && (
                    <button
                      onClick={() => onFileRemove(categoryId, idx)}
                      className="size-8 rounded-full hover:bg-red-100 hover:text-red-600 transition-colors flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                  )}
                  {file.url && (
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="size-8 rounded-full hover:bg-blue-100 hover:text-blue-600 transition-colors flex items-center justify-center shrink-0"
                    >
                      <span className="material-symbols-outlined text-lg">open_in_new</span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-slate-400">
              <span className="material-symbols-outlined text-3xl mb-2 block">folder_open</span>
              <p className="text-sm">No files uploaded yet</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentUploadCard;