// Required Membership onboarding documents, per business structure.
// Single source of truth — shared between the member-facing onboarding
// checklist (MemberDashboard) and the admin application review gate
// (AdminDashboard), so the two can never drift out of sync.
export interface MembershipDocReq {
  id: string;
  label: string;
  desc: string;
  icon: string;
  maxSize: number;
}

export const SOLE_PROPRIETORSHIP_REQS: MembershipDocReq[] = [
  { id: 'old_dti', label: 'Old DTI Permit', desc: 'Must indicate that the clinic is established at least 5 years (2021 or older)', icon: 'history', maxSize: 5 },
  { id: 'current_dti', label: 'Current DTI Permit', desc: 'Latest active DTI registration permit document', icon: 'description', maxSize: 5 },
  { id: 'business_permit', label: "Current Business or Mayor's Permit", desc: 'Valid permit for the current year', icon: 'workspace_premium', maxSize: 5 },
  { id: 'bai_cert', label: 'BAI Certificate of Registration', desc: 'Classification must be Veterinary Clinic (Surgical) or Veterinary Hospital', icon: 'verified', maxSize: 5 },
  { id: 'bir_2303', label: 'BIR COR 2303', desc: 'Certificate of Registration from BIR', icon: 'receipt_long', maxSize: 5 },
  { id: 'ptr_rep', label: 'Current PTR of Representative', desc: 'Professional Tax Receipt for the current year', icon: 'badge', maxSize: 5 },
  { id: 'prc_id', label: 'Updated PRC License ID', desc: 'Valid PRC License of the representative', icon: 'credit_card', maxSize: 5 },
  { id: 'walkthrough_video', label: 'Clinic Walkthrough Video', desc: 'Short video from facade going inside all rooms (max 1 min, up to 25MB)', icon: 'videocam', maxSize: 25 },
];

export const PARTNERSHIP_CORP_REQS: MembershipDocReq[] = [
  { id: 'sec_articles', label: 'SEC Articles of Incorporation & By-Laws', desc: 'Representative must be at least 50% shareholder', icon: 'business', maxSize: 5 },
  { id: 'business_permit', label: "Current Business or Mayor's Permit", desc: 'Valid permit for the current year', icon: 'workspace_premium', maxSize: 5 },
  { id: 'bai_cert', label: 'BAI Certificate of Registration', desc: 'Classification must be Veterinary Clinic (Surgical) or Veterinary Hospital', icon: 'verified', maxSize: 5 },
  { id: 'bir_2303', label: 'BIR COR 2303', desc: 'Certificate of Registration from BIR', icon: 'receipt_long', maxSize: 5 },
  { id: 'ptr_rep', label: 'Current PTR of Representative', desc: 'Professional Tax Receipt for the current year', icon: 'badge', maxSize: 5 },
  { id: 'prc_id', label: 'Updated PRC License ID', desc: 'Valid PRC License of the representative', icon: 'credit_card', maxSize: 5 },
  { id: 'board_res', label: 'Board Resolution', desc: 'Resolution appointing the shareholder as company representative', icon: 'assignment', maxSize: 5 },
  { id: 'walkthrough_video', label: 'Clinic Walkthrough Video', desc: 'Short video from facade going inside all rooms (max 1 min, up to 25MB)', icon: 'videocam', maxSize: 25 },
];

export const TEACHING_HOSPITAL_REQS: MembershipDocReq[] = [
  { id: 'dean_letter', label: 'Endorsement Letter from the Dean', desc: 'Appointing the individual as representative of the university hospital', icon: 'school', maxSize: 5 },
];

export const MEMBERSHIP_REQS_BY_BUSINESS_TYPE: Record<string, MembershipDocReq[]> = {
  sole_proprietorship: SOLE_PROPRIETORSHIP_REQS,
  partnership_corporation: PARTNERSHIP_CORP_REQS,
  teaching_hospital: TEACHING_HOSPITAL_REQS,
};

export function getMembershipDocsStatus(
  businessType: string | undefined,
  membershipDocuments: Record<string, any[]> | undefined
): { totalReqs: number; uploadedCount: number; complete: boolean } {
  const reqs = MEMBERSHIP_REQS_BY_BUSINESS_TYPE[businessType || ''] || [];
  const docs = membershipDocuments || {};
  const uploadedCount = reqs.filter(r => (docs[r.id]?.length ?? 0) > 0).length;
  return {
    totalReqs: reqs.length,
    uploadedCount,
    complete: reqs.length > 0 && uploadedCount === reqs.length,
  };
}
