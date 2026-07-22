export type UserRole = "clinic" | "admin";

export interface User {
  id: string;
  role: UserRole;
  clinicName: string;
  membershipId: string;
  representativeStatus: "active" | "inactive";
}

export type AccreditationStage =
  | 1  // Intent Submission
  | 2  // Self-Assessment
  | 3  // Site Visit Scheduled
  | 4  // Site Visit Completed / For Compliance
  | 5  // Under Admin Review
  | 6  // Approved / For Payment
  | 7  // Paid
  | 8; // Accredited

export type WorkflowStatus =
  | 'not_started'
  | 'intent_submitted'
  | 'intent_resubmitted'
  | 'loi_approved'
  | 'self_assessment_completed'
  | 'for_site_visit'
  | 'inspection_completed'
  | 'vef_failed'
  | 'revisit_requested'
  | 'for_compliance_submission'
  | 'under_review'
  | 'needs_compliance'
  | 'approved'
  | 'for_payment'
  | 'payment_submitted'
  | 'paid'
  | 'accredited'
  | 'rejected'
  | 'accreditation_banned'
  | 'visit_date_proposed'
  | 'revisit_approved';

export const WORKFLOW_STATUS_LABELS: Record<WorkflowStatus, string> = {
  not_started: 'Intent Letter Submission',
  intent_submitted: 'Intent Submitted',
  intent_resubmitted: 'Intent Resubmitted',
  loi_approved: 'LOI Approved — Self-Assessment',
  self_assessment_completed: 'Self-Assessment Completed',
  for_site_visit: 'Wait for Visitation',
  inspection_completed: 'Inspection Completed',
  vef_failed: 'Site Visit Not Passed — Revisit Needed',
  revisit_requested: 'Requesting for Visitation',
  visit_date_proposed: 'Visit Date Proposed — Awaiting Your Response',
  revisit_approved: 'Revisitation Approved',
  for_compliance_submission: 'For Compliance Submission',
  under_review: 'Under Review',
  needs_compliance: 'Needs Compliance',
  approved: 'Approved',
  for_payment: 'For Payment',
  payment_submitted: 'Payment Submitted',
  paid: 'Paid',
  accredited: 'Accredited',
  rejected: 'Rejected',
  accreditation_banned: 'Banned — 3 Failed Site Visits',
};

export interface LOIData {
  representativeName: string;
  representativeTitle: string;
  prcLicenseNo: string;
  clinicName: string;
  clinicAddress: string;
  email: string;
  phone: string;
  preferredVisitDates: string[];
  declarationChecked: boolean;
  loiRef: string;
}

export interface VisitData {
  scheduledDate: string;
  scheduledTime: string;
  inspectorName: string;
  notes: string;
  confirmedAt?: string | null;
  completedAt?: string;
  completedBy?: string;
  /** Member-proposed revisit dates (3 options), awaiting admin approval of one. */
  preferredRevisitDates?: string[];
  /** Admin-proposed alternate date when none of the member's preferred dates work — awaiting member's response. */
  adminProposedDate?: string;
  /** Whether the pending admin-proposed date belongs to a revisit round (resolves to 'revisit_approved') or the initial round (resolves to 'for_site_visit') once the member accepts it. */
  proposedForRevisit?: boolean;
  /** Set when the member flags the admin-proposed date doesn't work for them — surfaces a "propose a new date directly" panel on the admin side instead of silently waiting for a response. */
  proposalDeclinedAt?: string;
}

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: string;
}

export type CategoryStatus = "pending" | "complied" | "non_complied" | "visual_required";

export interface CategoryCompliance {
  status: CategoryStatus;
  uploadedFiles: UploadedFile[];
  adminRemarks: string;
  reviewedAt?: string;
  reviewedBy?: string;
  resubmitCount: number;
  lastResubmitAt?: string;
}

export interface ComplianceData {
  categories: Record<string, CategoryCompliance>;
  submittedAt?: string;
  resubmitAt?: string;
}

export interface SelfAssessmentCategory {
  id: string;
  title: string;
  score: number;
  passed: boolean;
  allCompulsoryMet: boolean;
  checkedItems: Record<string, boolean>;
}

export interface SelfAssessmentData {
  checkedItems: Record<string, boolean>;
  categoryScores: Record<string, number>;
  /** 2026 standard — computed per-section results snapshot */
  sections?: import('./evaluation').SectionResult[];
  submittedAt: string;
}

export interface AssessmentResultData {
  summaryRows: AssessmentResultRow[];
  overallStatus: 'complied' | 'non_complied';
  assessedAt: string;
  assessedBy: string;
}

export interface AssessmentResultRow {
  sectionId: string;
  sectionTitle: string;
  percentNeededToPass: number;
  clinicPercent: number | null;
  status: CategoryStatus;
  remarks: string;
}

export interface PaymentData {
  triggeredAt?: string;
  amount: number;
  statementOfAccount: string;
  proofOfPaymentUrl?: string;
  paymentProofUrl?: string;
  paymentOption?: string;
  paymentMethod?: string;
  submittedAt?: string;
  confirmedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  accreditationNo?: string;
  validUntil?: string;
}

export interface AccreditationApplication {
  id: string;
  clinicId: string;
  clinicName: string;
  membershipId: string;
  stage: AccreditationStage;
  status: WorkflowStatus;
  submittedAt: string;
  updatedAt: string;
  completedAt?: string;
  rejectionReason?: string;
  /** Every site-visit date ever offered by the member (initial + all revisit rounds) — once used, a date must never be offered again. */
  usedVisitDates?: string[];
  /** Reason recorded when the final review (post-site-visit) is declined. */
  complianceRejectionReason?: string;
  loiPdfUrl?: string;
  loiPdfName?: string;
  loiData: LOIData | null;
  selfAssessmentData: SelfAssessmentData | null;
  visitData: VisitData | null;
  complianceData: ComplianceData | null;
  assessmentResultData: AssessmentResultData | null;
  paymentData: PaymentData | null;
  visitingEvaluationForms?: VisitingEvaluationForm[];
  /** Count of failed site visits (VEF result = 'Fail') — 3 triggers a 3-month ban. */
  failedVisitCount?: number;
  bannedAt?: string;
  bannedUntil?: string;
}

/** @deprecated Legacy 5-point scale — only present on evaluation forms saved
 *  before the 2026 standard migration. New forms are checkbox/point-based. */
export type VEFRating = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Very Poor';

export interface VisitingEvaluationForm {
  version: number;
  /** Only set once an admin explicitly clicks "Download as PDF" — the form is
   *  no longer auto-exported to PDF on every save, so these are absent until
   *  someone actually generates one for this version. */
  filename?: string;
  url?: string;
  result: 'Passed' | 'Fail';
  clinicName: string;
  dateVisited: string;
  /** @deprecated legacy pre-2026 forms only */
  ratings?: Record<string, VEFRating>;
  /** 2026 standard — raw item checks (single source for recomputation) */
  checkedItems?: Record<string, boolean>;
  /** 2026 standard — computed per-section results snapshot */
  sections?: import('./evaluation').SectionResult[];
  verdict?: 'passed' | 'failed';
  adminOverride?: { verdict: 'passed' | 'failed'; remarks: string; by: string; at: string };
  /** Required whenever verdict is 'failed' — the single consolidated reason
   *  shown to the member explaining why the visit didn't pass and what to fix. */
  failRemarks?: string;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  label: string;
  points: number;
  isCompulsory?: boolean;
  requiresVisualVerification?: boolean;
}

export interface Category {
  id: string;
  title: string;
  description?: string;
  passingScore: number;
  items?: CategoryItem[];
  subCategories?: {
    id: string;
    title: string;
    items: CategoryItem[];
    passingScore: number;
  }[];
}

export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface ClinicRepresentative {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  deactivatedAt?: string;
  deactivatedBy?: string;
}

export const ACCREDITATION_FEE = 15000;
export const PROCESSING_FEE = 2500;
export const TOTAL_FEE = ACCREDITATION_FEE + PROCESSING_FEE;

export type OldWorkflowStatus = 'pending' | 'in_progress' | 'action_required' | 'completed';

export interface AccreditationSummaryRow {
  sectionId: string;
  sectionTitle: string;
  percentNeededToPass: number;
  clinicPercent: number | null;
  status: CategoryStatus;
  remarks: string;
}

export type AssessmentData = AssessmentResultData;