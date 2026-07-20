import React from 'react';
import type { AccreditationStage, WorkflowStatus } from '../types/accreditation';
import { WORKFLOW_STATUS_LABELS } from '../types/accreditation';

interface StageTrackerProps {
  currentStage: AccreditationStage;
  currentStatus?: WorkflowStatus;
  onStageClick?: (stage: number) => void;
  showAdminView?: boolean;
}

const STAGES = [
  { number: 1 as const, label: 'Intent', icon: 'edit_document' },
  { number: 2 as const, label: 'Self-Assessment', icon: 'checklist' },
  { number: 3 as const, label: 'Site Visit', icon: 'event' },
  { number: 4 as const, label: 'Compliance', icon: 'folder_open' },
  { number: 5 as const, label: 'Admin Review', icon: 'rate_review' },
  { number: 7 as const, label: 'Approved. For Payment', icon: 'payments' },
  { number: 8 as const, label: 'Accredited', icon: 'workspace_premium' },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  not_started: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  intent_submitted: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  intent_resubmitted: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  loi_approved: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  self_assessment_completed: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  for_site_visit: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  inspection_completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  vef_failed: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  revisit_requested: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  visit_date_proposed: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  revisit_approved: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  accreditation_banned: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  for_compliance_submission: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  under_review: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  needs_compliance: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  approved: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  for_payment: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  paid: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  accredited: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  pending: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
  action_required: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  completed: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
};

const StageTracker: React.FC<StageTrackerProps> = ({
  currentStage,
  currentStatus,
  showAdminView = false,
}) => {
  const getStageStatus = (stageNum: number): 'completed' | 'active' | 'pending' => {
    if (stageNum < currentStage) return 'completed';
    if (stageNum === currentStage) return 'active';
    return 'pending';
  };

  const getStageIcon = (stageNum: number, status: string) => {
    if (status === 'completed') return 'check_circle';
    if (status === 'active') return STAGES.find(s => s.number === stageNum)?.icon || 'circle';
    return 'lock';
  };

  const statusColors = (currentStatus && STATUS_COLORS[currentStatus]) || STATUS_COLORS.pending;

  return (
    <div className="w-full overflow-x-auto pb-2">
      <div className="flex items-center justify-between min-w-[600px]">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.number);

          return (
            <React.Fragment key={stage.number}>
              <div className="flex flex-col items-center">
                <div
                  className={`
                    relative flex items-center justify-center
                    w-12 h-12 rounded-full border-3 transition-all duration-300
                    ${status === 'completed'
                      ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                      : status === 'active'
                        ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-lg shadow-[#2563EB]/30'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                    }
                  `}
                >
                  <span className="material-symbols-outlined text-xl">
                    {getStageIcon(stage.number, status)}
                  </span>
                  {status === 'active' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-pulse"></span>
                  )}
                </div>
                <div className="mt-3 text-center hidden md:block">
                  <div className={`
                    text-[10px] font-bold uppercase tracking-wider
                    ${status === 'completed' ? 'text-emerald-500' : ''}
                    ${status === 'active' ? 'text-[#2563EB]' : ''}
                    ${status === 'pending' ? 'text-slate-400' : ''}
                  `}>
                    Stage {stage.number}
                  </div>
                  <div className={`
                    text-xs font-semibold mt-0.5
                    ${status === 'completed' ? 'text-emerald-600 dark:text-emerald-400' : ''}
                    ${status === 'active' ? 'text-slate-900 dark:text-white' : ''}
                    ${status === 'pending' ? 'text-slate-500' : ''}
                  `}>
                    {stage.label}
                  </div>
                </div>
              </div>

              {index < STAGES.length - 1 && (
                <div className="flex-1 mx-1 mt-[-1.5rem]">
                  <div className={`
                    h-1 rounded-full transition-all duration-500
                    ${status === 'completed'
                      ? 'bg-emerald-500'
                      : status === 'active'
                        ? 'bg-gradient-to-r from-[#2563EB] to-slate-200 dark:to-slate-700'
                        : 'bg-slate-200 dark:bg-slate-700'
                    }
                  `}>
                    {status === 'active' && (
                      <div className="h-full bg-[#2563EB] rounded-full animate-pulse" style={{ width: '50%' }}></div>
                    )}
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {!showAdminView && currentStatus && (
        <div className="flex justify-center mt-6">
          <div className={`
            px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider border
            ${statusColors.bg} ${statusColors.text} ${statusColors.border}
          `}>
            {currentStatus === 'inspection_completed'
              ? 'Visited'
              : currentStatus === 'needs_compliance'
                ? 'Failed'
                : WORKFLOW_STATUS_LABELS[currentStatus as WorkflowStatus]
                  || currentStatus.split('_').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
          </div>
        </div>
      )}
    </div>
  );
};

export default StageTracker;