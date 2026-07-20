import React, { useState, useEffect } from 'react';
import { doc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { notifyAdmin, notifyMember } from '../utils/notify';
import type { AccreditationApplication, VisitingEvaluationForm } from '../types/accreditation';
import { ACCREDITATION_FEE, PROCESSING_FEE, TOTAL_FEE } from '../types/accreditation';
import { ASSESSMENT_CATEGORIES } from '../data/assessmentCategories';
import { STANDARD_2026 } from '../data/accreditationStandard2026';
import { sectionTotalPoints, computeGapSummary } from '../utils/evaluationScoring';
import { getEmbeddableUrl } from '../utils/portalUrl';
import { cleanPhone } from '../utils/phone';
import VisitingEvaluationModal from './VisitingEvaluationModal';
import FileViewerModal, { type ViewerFile } from './FileViewerModal';
import CalendarPicker from './CalendarPicker';


const MEMBERSHIP_DOC_LABELS: Record<string, string> = {
    sec_articles: 'SEC Articles of Incorporation and By-Laws',
    old_dti: 'Old DTI Permit (2021 or older)',
    current_dti: 'Current DTI Permit',
    business_permit: "Current Business Permit / Mayor's Permit",
    bai_cert: 'BAI Certificate of Registration',
    bir_2303: 'BIR COR 2303',
    ptr_rep: 'Current PTR of Representative',
    prc_id: 'Updated PRC License ID of Representative',
    board_res: 'Board Resolution',
    dean_letter: 'Endorsement Letter from the Dean',
    walkthrough_video: 'Clinic Walkthrough Video',
};

function showToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    toast.className = `fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-2xl text-sm font-bold text-white transition-all animate-fade-in ${type === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3200);
}

interface Props {
    appId: string;
    adminRole?: string;
    onClose: () => void;
}

const InspectApplicationModal: React.FC<Props> = ({ appId, adminRole = 'editor', onClose }) => {
    const [app, setApp] = useState<AccreditationApplication | null>(null);
    const [loading, setLoading] = useState(true);

    const [failReason, setFailReason] = useState('');
    const [showFailInput, setShowFailInput] = useState(false);
    const [accredActionLoading, setAccredActionLoading] = useState(false);
    const [selectedVisitDate, setSelectedVisitDate] = useState('');
    const [selectedRevisitDate, setSelectedRevisitDate] = useState('');
    const [vefModal, setVefModal] = useState<{ open: boolean; existing: VisitingEvaluationForm | null }>({ open: false, existing: null });
    const [clinicDeactivated, setClinicDeactivated] = useState(false);
    const [clinicProfile, setClinicProfile] = useState<any | null>(null);
    const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null);
    const [showDeclineInput, setShowDeclineInput] = useState(false);
    const [declineReason, setDeclineReason] = useState('');
    const [isEditingDate, setIsEditingDate] = useState(false);
    const [showProposeDate, setShowProposeDate] = useState(false);
    const [proposeDate, setProposeDate] = useState('');
    // After a member flags they can't make an admin-proposed date, the admin
    // coordinates a new one directly with them via chat, then types it here —
    // this sets the visit date immediately, no member re-acceptance needed.
    const [resendDate, setResendDate] = useState('');

    // Live-sync the application document
    useEffect(() => {
        setLoading(true);
        const unsub = onSnapshot(doc(db, 'accreditation_applications', appId), (snap) => {
            if (snap.exists()) {
                const data = { id: snap.id, ...snap.data() } as AccreditationApplication;
                setApp(data);
                setSelectedVisitDate(prev => prev || data.loiData?.preferredVisitDates?.[0] || '');
            }
            setLoading(false);
        });
        return () => unsub();
    }, [appId]);

    // Close on Escape key
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Track the linked account's active/deactivated status + profile (for its
    // Membership-onboarding business documents, stored on the user doc).
    useEffect(() => {
        if (!app?.clinicId) return;
        const unsub = onSnapshot(doc(db, 'users', app.clinicId), (snap) => {
            const data = snap.data();
            setClinicDeactivated(data?.accountStatus === 'deactivated');
            setClinicProfile(data || null);
        });
        return () => unsub();
    }, [app?.clinicId]);

    const handleToggleDeactivate = async () => {
        if (!app?.clinicId) return;
        const deactivating = !clinicDeactivated;
        const msg = deactivating
            ? 'Deactivate this member? They will be unable to log in or access the member dashboard until reactivated.'
            : 'Reactivate this member? They will regain access to the member dashboard.';
        if (!confirm(msg)) return;
        try {
            await updateDoc(doc(db, 'users', app.clinicId), { accountStatus: deactivating ? 'deactivated' : 'active' });
            showToast(deactivating ? 'Member deactivated.' : 'Member reactivated.', 'success');

            if (app.clinicId) {
                await notifyMember(app.clinicId, {
                    type: deactivating ? 'membership_deactivated' : 'membership_reactivated',
                    title: deactivating ? 'Account Deactivated' : 'Account Reactivated',
                    body: `Your PAHA clinic account has been ${deactivating ? 'deactivated' : 'reactivated'}. Please contact PAHA for details.`,
                    link: 'dashboard',
                });
            }
            await notifyAdmin({
                type: 'member_update',
                title: deactivating ? 'Member Deactivated' : 'Member Reactivated',
                body: `${app.clinicName || 'A clinic'} ${deactivating ? 'deactivated' : 'reactivated'} by admin.`,
                link: 'accreditation',
            });
        } catch {
            showToast('Failed to update account status.', 'error');
        }
    };

    // Prevent body scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = ''; };
    }, []);

    if (loading || !app) {
        return (
            <div className="fixed inset-0 z-[900] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-4">
                    <span className="animate-spin border-4 border-white/20 border-t-white rounded-full size-10" />
                    <p className="text-white font-semibold">Loading application…</p>
                </div>
            </div>
        );
    }

    const saData = app.selfAssessmentData;
    // A site visit can never be scheduled for today — earliest proposable date is tomorrow.
    const minVisitDateStr = (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    })();
    // Per-round signal — NOT based on visitingEvaluationForms.length, since that
    // array keeps every past (e.g. failed) VEF and would stay truthy forever,
    // wrongly marking a freshly-scheduled revisit as "already visited". Kept
    // "raw" (not round-scoped) because it's also used to show the PREVIOUS
    // round's completed-visit/VEF history, which should stay visible for
    // context while a revisit is being requested.
    const hasVisited = app.status === 'inspection_completed' || !!app.visitData?.completedAt;
    // Round-scoped: a pending revisit request/proposal must NOT inherit
    // "visited" from the previous (failed) round — that would lock the new 3
    // date options and hide date-picking actions before the admin ever picks one.
    const roundVisited = hasVisited && app.status !== 'revisit_requested' && app.status !== 'visit_date_proposed';
    const revisitDates = app.visitData?.preferredRevisitDates;
    const isRevisit = !!revisitDates?.length;
    // A date is "committed" once it's been scheduled/approved (or the visit
    // already happened) — at that point the other two options lock, with an
    // Edit button to reopen the picker if the schedule needs to change.
    const isCommitted = app.status === 'for_site_visit' || app.status === 'revisit_approved' || roundVisited;

    // Step 1 of the decision: approving the LOI only unlocks Self-Assessment for
    // the applicant — it must NOT jump straight to scheduling a site visit.
    const handleApproveLOI = async () => {
        setAccredActionLoading(true);
        try {
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'loi_approved',
                stage: 2,
                updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_approved',
                title: 'Letter of Intent Approved',
                body: `Your Letter of Intent for ${app.clinicName} has been approved. Please complete your Self-Assessment next.`,
                read: false, createdAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'admin_notifications'), {
                type: 'accreditation', title: 'Letter of Intent Approved',
                body: `${app.clinicName}'s LOI approved — awaiting self-assessment.`,
                link: 'accreditation',
                read: false, createdAt: serverTimestamp(),
            });
            showToast('LOI approved. Applicant can now complete Self-Assessment.', 'success');
        } catch { showToast('Failed to approve.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    // Undo an in-progress site-visit scheduling — sends the application back
    // to Self-Assessment (stage 2) and re-locks Stage 3, for cases where the
    // applicant isn't actually done yet (e.g. still revising their checklist).
    const handleRevertToSelfAssessment = async () => {
        if (!window.confirm('Revert this application back to Self-Assessment? The scheduled site visit will be cleared.')) return;
        setAccredActionLoading(true);
        try {
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'self_assessment_completed',
                stage: 2,
                visitData: null,
                updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_reverted',
                title: 'Reverted to Self-Assessment',
                body: `Your accreditation application for ${app.clinicName} was reverted back to Self-Assessment. The scheduled site visit was cleared.`,
                read: false, createdAt: serverTimestamp(),
            });
            showToast('Reverted to Self-Assessment. Site visit cleared.', 'success');
        } catch { showToast('Failed to revert.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    // Step 2 of the decision: only once self-assessment is submitted does
    // admin pick a visit date and actually schedule the site visit.
    const handleScheduleSiteVisit = async () => {
        if (!selectedVisitDate) { showToast('Please select a visit date first.', 'error'); return; }
        setAccredActionLoading(true);
        try {
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'for_site_visit',
                stage: 3,
                visitData: { scheduledDate: selectedVisitDate, scheduledTime: '', inspectorName: '', notes: '', confirmedAt: new Date().toISOString() },
                updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_approved',
                title: 'Site Visit Scheduled',
                body: `Your accreditation application for ${app.clinicName} has been approved. Site visit: ${new Date(selectedVisitDate).toLocaleDateString()}.`,
                read: false, createdAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'admin_notifications'), {
                type: 'accreditation', title: 'Site Visit Scheduled',
                body: `${app.clinicName} site visit scheduled: ${new Date(selectedVisitDate).toLocaleDateString()}.`,
                link: 'accreditation',
                read: false, createdAt: serverTimestamp(),
            });
            showToast('Site visit scheduled!', 'success');
            setIsEditingDate(false);
        } catch { showToast('Failed to schedule visit.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    // Admin approves one of the member's proposed revisit dates.
    const handleApproveRevisit = async () => {
        if (!selectedRevisitDate) { showToast('Please select a date first.', 'error'); return; }
        setAccredActionLoading(true);
        try {
            // Keep preferredRevisitDates — wiping it here made the panel fall
            // back to the ORIGINAL loiData dates (and lose which of the 3
            // revisit options was actually chosen) the moment the second
            // visit's VEF was submitted. Drop completedAt explicitly (not just
            // `undefined`, which Firestore rejects) so this fresh round isn't
            // marked visited before it's actually happened.
            const { completedAt, ...restVisitData } = app.visitData || {};
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'revisit_approved',
                stage: 3,
                visitData: { ...restVisitData, scheduledDate: selectedRevisitDate, scheduledTime: '', inspectorName: '', notes: '', confirmedAt: new Date().toISOString() },
                updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_approved',
                title: 'Revisit Approved',
                body: `Your revisit for ${app.clinicName} has been confirmed: ${new Date(selectedRevisitDate).toLocaleDateString()}.`,
                read: false, createdAt: serverTimestamp(),
            });
            showToast('Revisit approved. Member notified.', 'success');
            setIsEditingDate(false);
        } catch { showToast('Failed to approve revisit.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    // Escape hatch: none of the member's 3 preferred/revisit dates work for the
    // inspector (e.g. representative unavailable) — propose a different date
    // and let the member accept it or flag they're unavailable via chat.
    const handleProposeAlternateDate = async () => {
        if (!proposeDate) { showToast('Please pick a date to propose.', 'error'); return; }
        setAccredActionLoading(true);
        try {
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'visit_date_proposed',
                stage: 3,
                visitData: {
                    ...(app.visitData || { scheduledDate: '', scheduledTime: '', inspectorName: '', notes: '' }),
                    scheduledDate: '',
                    adminProposedDate: proposeDate,
                    proposedForRevisit: isRevisit,
                },
                updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_visit_proposed',
                title: 'New Site Visit Date Proposed',
                body: `None of your preferred dates worked for the PAHA inspector. A new date was proposed for ${app.clinicName}: ${new Date(proposeDate).toLocaleDateString()}. Please review and respond.`,
                read: false, createdAt: serverTimestamp(),
            });
            showToast('Alternate date proposed. Member notified.', 'success');
            setShowProposeDate(false);
            setProposeDate('');
            setIsEditingDate(false);
        } catch { showToast('Failed to propose date.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    // Member flagged the proposed date doesn't work for them — once the admin
    // has coordinated a replacement with them via chat, this sets it directly
    // as the confirmed schedule. No second member-acceptance round; the chat
    // conversation already served as the agreement.
    const handleSendRescheduledDate = async () => {
        if (!resendDate) { showToast('Please pick a date first.', 'error'); return; }
        setAccredActionLoading(true);
        try {
            const nextStatus = app.visitData?.proposedForRevisit ? 'revisit_approved' : 'for_site_visit';
            const { adminProposedDate, proposedForRevisit, proposalDeclinedAt, ...restVisitData } = app.visitData || { scheduledDate: '', scheduledTime: '', inspectorName: '', notes: '' };
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: nextStatus,
                stage: 3,
                visitData: { ...restVisitData, scheduledDate: resendDate, confirmedAt: new Date().toISOString() },
                updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_visit_scheduled',
                title: 'Site Visit Date Confirmed',
                body: `Following your chat with PAHA, your site visit for ${app.clinicName} is now scheduled: ${new Date(resendDate).toLocaleDateString()}.`,
                read: false, createdAt: serverTimestamp(),
            });
            showToast('New date sent to member.', 'success');
            setResendDate('');
        } catch { showToast('Failed to send new date.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    const handleFail = async () => {
        if (!failReason.trim()) { showToast('Please enter a reason.', 'error'); return; }
        setAccredActionLoading(true);
        try {
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'rejected', stage: 1, rejectionReason: failReason, updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_rejected',
                title: 'Accreditation Application Not Passed',
                body: `Your application for ${app.clinicName} was not approved. Reason: ${failReason}`,
                read: false, createdAt: serverTimestamp(),
            });
            showToast('Application rejected. Member notified.', 'success');
            setShowFailInput(false);
        } catch { showToast('Failed to reject.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    const handleApproveCompliance = async () => {
        setAccredActionLoading(true);
        try {
            const paymentData = {
                triggeredAt: new Date().toISOString(),
                amount: TOTAL_FEE,
                statementOfAccount: `Accreditation Fee: ₱${ACCREDITATION_FEE.toLocaleString()}\nProcessing Fee: ₱${PROCESSING_FEE.toLocaleString()}\nTotal: ₱${TOTAL_FEE.toLocaleString()}`,
            };
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'for_payment', stage: 6, paymentData, updatedAt: serverTimestamp(),
            });
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_for_payment',
                title: 'Approved — Proceed to Payment',
                body: `Your accreditation review for ${app.clinicName} was approved. Total due: ₱${TOTAL_FEE.toLocaleString()}. Please proceed to payment.`,
                read: false, createdAt: serverTimestamp(),
            });
            await notifyAdmin({
                type: 'accreditation',
                title: 'Application Approved — Final Review',
                body: `${app.clinicName} approved in final review and moved to payment.`,
                link: 'accreditation',
            });
            showToast('Approved. Moved to Payment.', 'success');
        } catch { showToast('Failed to approve.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    const handleDeclineCompliance = async () => {
        if (!declineReason.trim()) { showToast('Please enter a reason.', 'error'); return; }
        setAccredActionLoading(true);
        try {
            // Nothing in the workflow is irrevocable — even a finalized (paid/accredited)
            // application can be disapproved, reopening it for compliance resubmission
            // and clearing any prior payment/accreditation confirmation.
            const wasFinalized = app.status === 'for_payment' || app.status === 'paid' || app.status === 'accredited';
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'needs_compliance',
                complianceRejectionReason: declineReason.trim(),
                ...(wasFinalized ? { paymentData: null } : {}),
                updatedAt: serverTimestamp(),
            });
            if (wasFinalized && app.clinicId) {
                // Clear the accredited flag anywhere it was mirrored, so the member's
                // profile status correctly falls back once revoked.
                await updateDoc(doc(db, 'users', app.clinicId), { isAccredited: false }).catch(() => {});
                const memberDocs = await getDocs(query(collection(db, 'members'), where('email', '==', app.loiData?.email || '')));
                await Promise.all(memberDocs.docs.map(d => updateDoc(doc(db, 'members', d.id), { isAccredited: false })));
            }
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_needs_compliance',
                title: wasFinalized ? 'Accreditation Revoked' : 'Final Review Declined',
                body: `${wasFinalized ? 'Your accreditation for' : 'Your accreditation review for'} ${app.clinicName} was ${wasFinalized ? 'revoked' : 'declined'}. Reason: ${declineReason.trim()}`,
                read: false, createdAt: serverTimestamp(),
            });
            await notifyAdmin({
                type: 'accreditation',
                title: wasFinalized ? 'Accreditation Revoked — Final Review' : 'Application Declined — Final Review',
                body: `${app.clinicName} ${wasFinalized ? 'revoked' : 'declined'} in final review. Reason: ${declineReason.trim()}`,
                link: 'accreditation',
            });
            showToast(wasFinalized ? 'Accreditation revoked. Member notified with reason.' : 'Declined. Member notified with reason.', 'success');
            setShowDeclineInput(false);
            setDeclineReason('');
        } catch { showToast('Failed to decline.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    // Final step of the pipeline — confirms the member's submitted payment and
    // formally issues accreditation (accreditation number + 1-year validity),
    // also flipping the "isAccredited" flag wherever the member's profile lives.
    const handleConfirmAccreditation = async () => {
        setAccredActionLoading(true);
        try {
            const year = new Date().getFullYear();
            const accreditationNo = `PAHA-ACC-${year}-${Math.floor(10000 + Math.random() * 90000)}`;
            const validUntil = new Date();
            validUntil.setFullYear(validUntil.getFullYear() + 1);
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'accredited',
                stage: 8,
                'paymentData.confirmedAt': new Date().toISOString(),
                'paymentData.accreditationNo': accreditationNo,
                'paymentData.validUntil': validUntil.toISOString(),
                completedAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });
            if (app.clinicId) {
                await updateDoc(doc(db, 'users', app.clinicId), { isAccredited: true }).catch(() => {});
                const memberDocs = await getDocs(query(collection(db, 'members'), where('email', '==', app.loiData?.email || '')));
                await Promise.all(memberDocs.docs.map(d => updateDoc(doc(db, 'members', d.id), { isAccredited: true })));
            }
            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId, type: 'accreditation_approved',
                title: 'Accreditation Approved!',
                body: `Congratulations! ${app.clinicName} is now PAHA-accredited. Accreditation No: ${accreditationNo}. Valid until ${validUntil.toLocaleDateString()}.`,
                read: false, createdAt: serverTimestamp(),
            });
            await notifyAdmin({
                type: 'accreditation',
                title: 'Accreditation Confirmed',
                body: `${app.clinicName} accredited. No: ${accreditationNo}.`,
                link: 'accreditation',
            });
            showToast(`Accredited! No: ${accreditationNo}`, 'success');
        } catch { showToast('Failed to confirm accreditation.', 'error'); }
        finally { setAccredActionLoading(false); }
    };

    const statusBadge = () => {
        if (app.status === 'rejected') return <span className="px-4 py-1.5 rounded-full bg-red-100 text-red-700 font-bold text-xs uppercase">Rejected</span>;
        if (app.status === 'accredited') return <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs uppercase">Accredited</span>;
        if (app.status === 'paid') return <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs uppercase">Paid</span>;
        if (app.status === 'for_payment') return <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs uppercase">For Payment</span>;
        if (app.status === 'needs_compliance') return <span className="px-4 py-1.5 rounded-full bg-red-100 text-red-700 font-bold text-xs uppercase">Failed</span>;
        if (app.status === 'under_review') return <span className="px-4 py-1.5 rounded-full bg-purple-100 text-purple-700 font-bold text-xs uppercase">Under Review</span>;
        if (app.status === 'vef_failed') return <span className="px-4 py-1.5 rounded-full bg-red-100 text-red-700 font-bold text-xs uppercase">Site Visit Not Passed</span>;
        if (app.status === 'revisit_requested') return <span className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs uppercase">Requesting for Visitation</span>;
        if (app.status === 'visit_date_proposed' && app.visitData?.proposalDeclinedAt) return <span className="px-4 py-1.5 rounded-full bg-rose-100 text-rose-700 font-bold text-xs uppercase">Member Unavailable</span>;
        if (app.status === 'visit_date_proposed') return <span className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs uppercase">Awaiting Member Response</span>;
        if (app.status === 'revisit_approved') return <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs uppercase">Revisitation Approved</span>;
        if (app.status === 'accreditation_banned') return <span className="px-4 py-1.5 rounded-full bg-red-100 text-red-700 font-bold text-xs uppercase">Banned</span>;
        if (hasVisited) return <span className="px-4 py-1.5 rounded-full bg-teal-100 text-teal-700 font-bold text-xs uppercase">Visited</span>;
        if (app.status === 'for_site_visit') return <span className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs uppercase">Wait for Visitation</span>;
        if (app.status === 'self_assessment_completed') return <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs uppercase">Self-Assessment Done</span>;
        if (app.status === 'loi_approved') return <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 font-bold text-xs uppercase">LOI Approved</span>;
        if (app.status === 'intent_resubmitted') return <span className="px-4 py-1.5 rounded-full bg-amber-100 text-amber-700 font-bold text-xs uppercase">Intent Resubmitted</span>;
        return null;
    };

    // Business documents live on the clinic's own user profile (uploaded during
    // Membership onboarding), not on the accreditation application doc.
    const memberDocs = Object.entries((clinicProfile?.membershipDocuments || {}) as Record<string, any[]>).filter(([, files]) => files?.length);
    const catDocs = ASSESSMENT_CATEGORIES
        .map(cat => ({ title: cat.title, files: app.complianceData?.categories?.[cat.id]?.uploadedFiles || [] }))
        .filter(c => c.files.length > 0);

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[850] bg-slate-900/70 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Panel */}
            <div className="fixed inset-0 z-[900] flex flex-col bg-[#F8FAFC] dark:bg-[#0F172A] overflow-hidden animate-slide-in-right">
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-white/10 shrink-0">
              <button
                onClick={onClose}
                className="p-2 rounded-[10px] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 transition-colors z-10"
                title="Back"
              >
                        <span className="material-symbols-outlined">arrow_back</span>
                    </button>
                    <div>
                        <h2 className="text-2xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white">Inspect Application</h2>
                        <p className="text-sm text-slate-500 font-mono">{app.loiData?.loiRef || app.id}</p>
                    </div>
                    <div className="ml-auto flex items-center gap-3">
                        {statusBadge()}
                        {app.clinicId && (
                            <button
                                onClick={handleToggleDeactivate}
                                className={`px-3 py-2 rounded-[10px] text-[11px] font-bold flex items-center gap-1.5 transition-colors ${clinicDeactivated ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20' : 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20'}`}
                            >
                                <span className="material-symbols-outlined text-sm">{clinicDeactivated ? 'toggle_on' : 'block'}</span>
                                {clinicDeactivated ? 'Reactivate Member' : 'Deactivate Member'}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="size-9 rounded-[10px] flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-3 gap-4">
                        {/* Left column */}
                        <div className="xl:col-span-2 space-y-4">

                            {/* Clinic Info */}
                            <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 p-4">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Clinic Information</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Clinic Name', value: app.clinicName },
                                        { label: 'Representative', value: app.loiData?.representativeName },
                                        { label: 'Title', value: app.loiData?.representativeTitle },
                                        { label: 'PRC License', value: app.loiData?.prcLicenseNo },
                                        { label: 'Email', value: app.loiData?.email },
                                        { label: 'Phone', value: cleanPhone(app.loiData?.phone) },
                                    ].map((f, i) => (
                                        <div key={i}>
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{f.label}</p>
                                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{f.value || '—'}</p>
                                        </div>
                                    ))}
                                    <div className="col-span-2">
                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">Clinic Address</p>
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{app.loiData?.clinicAddress || '—'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* LOI PDF Viewer */}
                            {app.loiPdfUrl ? (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary">picture_as_pdf</span>
                                            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-white">Letter of Intent — Document</h3>
                                        </div>
                                        <a href={app.loiPdfUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:underline">
                                            <span className="material-symbols-outlined text-sm">open_in_new</span>Open in new tab
                                        </a>
                                    </div>
                                    <iframe src={getEmbeddableUrl(app.loiPdfUrl)} className="w-full h-[500px]" title="LOI Document" />
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-dashed border-slate-200 dark:border-white/10 p-5 text-center">
                                    <span className="material-symbols-outlined text-3xl text-slate-300 mb-2 block">description</span>
                                    <p className="text-sm text-slate-400 font-medium">No LOI PDF document uploaded by the applicant.</p>
                                </div>
                            )}

                            {/* Missing Requirements note — from the applicant's self-assessment gaps */}
                            {saData ? (() => {
                                const gaps = computeGapSummary(STANDARD_2026, saData.checkedItems || {});
                                if (gaps.length === 0) return (
                                    <div className="rounded-[10px] border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-4 flex items-center gap-2.5">
                                        <span className="material-symbols-outlined text-emerald-500 text-lg shrink-0">verified</span>
                                        <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">Self-assessment shows no missing requirements — submitted {new Date(saData.submittedAt).toLocaleDateString()}.</p>
                                    </div>
                                );
                                return (
                                    <div className="rounded-[10px] border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
                                        <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-1.5 flex items-center gap-1.5">
                                            <span className="material-symbols-outlined text-sm">warning</span>
                                            Missing Requirements ({gaps.length} section{gaps.length !== 1 ? 's' : ''})
                                        </p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400/90">
                                            Applicant's self-assessment (submitted {new Date(saData.submittedAt).toLocaleDateString()}) flagged: {gaps.map(g => g.sectionId).join(', ')}.
                                        </p>
                                    </div>
                                );
                            })() : (
                                <div className="rounded-[10px] border border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/40 p-4">
                                    <p className="text-xs text-slate-400 italic">Self-assessment not yet submitted by the applicant.</p>
                                </div>
                            )}
                        </div>

                        {/* Right column — actions */}
                        <div className="space-y-4">
                            {/* Preferred Visit Dates — overridden by the member's proposed REVISIT
                                dates once a revisit has been requested (the old initial-round dates
                                are dropped from view entirely once revisit dates exist). */}
                            {app.status !== 'visit_date_proposed' && (() => {
                                const dates = isRevisit ? revisitDates! : (app.loiData?.preferredVisitDates || []);
                                const locked = isCommitted && !isEditingDate;
                                // Once locked, show the ACTUAL scheduled date (source of truth in
                                // Firestore) — not the local radio state, which defaults to the
                                // first option on load and drifts from whatever was really picked.
                                const selected = locked ? (app.visitData?.scheduledDate || '') : (isRevisit ? selectedRevisitDate : selectedVisitDate);
                                const setSelected = isRevisit ? setSelectedRevisitDate : setSelectedVisitDate;
                                // isEditingDate is an explicit admin override, so it's allowed
                                // even after the round is "visited" (e.g. correcting a mistaken
                                // schedule after a failed VEF).
                                const canAct = adminRole !== 'viewer' && (isEditingDate || (!roundVisited && !isCommitted));
                                const onConfirm = isRevisit ? handleApproveRevisit : handleScheduleSiteVisit;
                                return (
                                    <div className={`bg-white dark:bg-slate-800/40 rounded-[10px] border p-4 ${isRevisit ? 'border-amber-200 dark:border-amber-500/20' : 'border-slate-200 dark:border-white/5'}`}>
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className={`text-xs font-bold uppercase tracking-widest ${isRevisit ? 'text-amber-600' : 'text-slate-400'}`}>{isRevisit ? 'Preferred Revisit Dates' : 'Preferred Visit Dates'}</h3>
                                            {isCommitted && !isEditingDate && adminRole !== 'viewer' && (
                                                <button
                                                    onClick={() => setIsEditingDate(true)}
                                                    className="text-[10px] font-bold text-primary uppercase tracking-widest flex items-center gap-1 hover:underline"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>Edit
                                                </button>
                                            )}
                                        </div>
                                        {dates.length ? (
                                            <div className="space-y-2">
                                                {dates.map((date, i) => (
                                                    <label key={i} htmlFor={`iap-visit-${i}`} className={`flex items-center gap-3 p-3 rounded-[10px] border-2 transition-all ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                                                        selected === date
                                                            ? 'border-primary bg-primary/5'
                                                            : 'border-slate-100 dark:border-white/5 hover:border-slate-200'
                                                    }`}>
                                                        <input id={`iap-visit-${i}`} type="radio" name="iapVisitDate" value={date} checked={selected === date} onChange={() => setSelected(date)} disabled={locked} className="accent-primary disabled:cursor-not-allowed" />
                                                        <div className="flex-1">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Option {i + 1}</p>
                                                            <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                        </div>
                                                        {locked && selected === date && (
                                                            <span className="material-symbols-outlined text-primary text-lg">lock</span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-sm text-slate-400 italic">No preferred dates submitted.</p>
                                        )}
                                        {canAct && (isRevisit || isEditingDate) && (
                                            <button
                                                onClick={onConfirm}
                                                disabled={accredActionLoading || !selected}
                                                className="w-full mt-4 py-3 rounded-[10px] font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                            >
                                                {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">event_available</span>}
                                                {isEditingDate ? 'Save New Date' : 'Approve Revisit'}
                                            </button>
                                        )}

                                        {/* Escape hatch — none of the 3 dates work (e.g. inspector/rep unavailable) */}
                                        {dates.length > 0 && !roundVisited && adminRole !== 'viewer' && (
                                            !showProposeDate ? (
                                                <button
                                                    onClick={() => setShowProposeDate(true)}
                                                    className="w-full mt-3 py-2.5 rounded-[10px] font-bold text-[11px] uppercase tracking-wider text-slate-500 hover:text-primary hover:bg-primary/5 transition-all border border-dashed border-slate-200 dark:border-white/10"
                                                >
                                                    None of these dates work — propose a different date
                                                </button>
                                            ) : (
                                                <div className="mt-3 p-3 rounded-[10px] border border-slate-200 dark:border-white/10 space-y-2">
                                                    <label htmlFor="iap-propose-date" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Propose Alternate Date</label>
                                                    <CalendarPicker
                                                         id="iap-propose-date"
                                                         value={proposeDate}
                                                         onChange={setProposeDate}
                                                         minYear={new Date().getFullYear()}
                                                         maxYear={new Date().getFullYear() + 2}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => { setShowProposeDate(false); setProposeDate(''); }} className="flex-1 py-2 text-xs font-bold rounded-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                                        <button onClick={handleProposeAlternateDate} disabled={accredActionLoading || !proposeDate} className="flex-1 py-2 text-xs font-bold rounded-[10px] bg-amber-500 text-white hover:bg-amber-600 transition-colors disabled:opacity-40">
                                                            Send to Member
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                );
                            })()}

                            {/* Awaiting member response to a proposed alternate date */}
                            {app.status === 'visit_date_proposed' && app.visitData?.adminProposedDate && !app.visitData?.proposalDeclinedAt && (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-amber-200 dark:border-amber-500/20 p-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-2">Awaiting Member Response</h3>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {new Date(app.visitData.adminProposedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Proposed to the member — waiting for them to accept or flag unavailability via chat.</p>
                                </div>
                            )}

                            {/* Member flagged the proposed date doesn't work — coordinate a
                                replacement via chat, then set it directly here (no second
                                member-acceptance round needed). */}
                            {app.status === 'visit_date_proposed' && app.visitData?.proposalDeclinedAt && (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-rose-200 dark:border-rose-500/20 p-4 space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-rose-600 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm">event_busy</span>
                                        Member Unavailable — Reschedule Needed
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {app.clinicName} flagged that {app.visitData.adminProposedDate ? new Date(app.visitData.adminProposedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : 'the proposed date'} doesn't work for them. Coordinate a new date via the chat, then send it below — it's set immediately, no further confirmation needed.
                                    </p>
                                    {adminRole !== 'viewer' && (
                                        <div className="space-y-2">
                                            <label htmlFor="iap-resend-date" className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">New Site Visit Date</label>
                                            <CalendarPicker
                                                 id="iap-resend-date"
                                                 value={resendDate}
                                                 onChange={setResendDate}
                                                 minYear={new Date().getFullYear()}
                                                 maxYear={new Date().getFullYear() + 2}
                                            />
                                            <button
                                                onClick={handleSendRescheduledDate}
                                                disabled={accredActionLoading || !resendDate}
                                                className="w-full py-2.5 text-xs font-bold rounded-[10px] bg-rose-500 text-white hover:bg-rose-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                                            >
                                                {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">send</span>}
                                                Send New Date to Member
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Waiting note — LOI approved, applicant still working on self-assessment */}
                            {app.status === 'loi_approved' && (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 p-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Decision</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">LOI approved. Waiting for the applicant to submit their self-assessment before you can schedule the site visit.</p>
                                </div>
                            )}

                            {/* Decision Buttons */}
                            {(app.status === 'intent_submitted' || app.status === 'intent_resubmitted' || app.status === 'self_assessment_completed') && adminRole !== 'viewer' && (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 p-4 space-y-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Decision</h3>

                                    {(app.status === 'intent_submitted' || app.status === 'intent_resubmitted') ? (
                                        <button
                                            onClick={handleApproveLOI}
                                            disabled={accredActionLoading}
                                            className="w-full py-4 rounded-[10px] font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">check_circle</span>}
                                            Approve Letter of Intent
                                        </button>
                                    ) : (
                                        <button
                                            onClick={handleScheduleSiteVisit}
                                            disabled={accredActionLoading || !selectedVisitDate}
                                            className="w-full py-4 rounded-[10px] font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">event_available</span>}
                                            Approved — Schedule Visit
                                        </button>
                                    )}

                                    {/* Reject-back-to-Stage-1 only makes sense while reviewing the LOI
                                        itself — it must NOT show once the LOI is already approved and
                                        the applicant is past self-assessment, or clicking it wrongly
                                        wipes an already-approved application back to "LOI Rejected". */}
                                    {(app.status === 'intent_submitted' || app.status === 'intent_resubmitted') && (
                                        !showFailInput ? (
                                            <button
                                                onClick={() => setShowFailInput(true)}
                                                className="w-full py-4 rounded-[10px] font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
                                            >
                                                <span className="material-symbols-outlined text-sm">cancel</span>
                                                Failed — Reject Application
                                            </button>
                                        ) : (
                                            <div className="space-y-3">
                                                <textarea
                                                    id="iap-fail-reason"
                                                    value={failReason}
                                                    onChange={e => setFailReason(e.target.value)}
                                                    placeholder="Enter reason for rejection..."
                                                    rows={3}
                                                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-white/10 rounded-[10px] bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setShowFailInput(false)} className="flex-1 py-2 text-xs font-bold rounded-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                                    <button onClick={handleFail} disabled={accredActionLoading || !failReason.trim()} className="flex-1 py-2 text-xs font-bold rounded-[10px] bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40">
                                                        Confirm Rejection
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    )}
                                    {app.status === 'self_assessment_completed' && !selectedVisitDate && <p className="text-[10px] text-amber-600 font-semibold text-center">Select a visit date above before scheduling</p>}
                                </div>
                            )}

                            {/* Rejection reason */}
                            {app.status === 'rejected' && app.rejectionReason && (
                                <div className="bg-red-50 dark:bg-red-900/10 rounded-[10px] border border-red-200 dark:border-red-500/20 p-5">
                                    <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Rejection Reason</p>
                                    <p className="text-sm text-slate-700 dark:text-slate-300">{app.rejectionReason}</p>
                                </div>
                            )}

                            {/* Visit scheduled notice + VEF */}
                            {(app.status === 'for_site_visit' || app.status === 'revisit_approved' || hasVisited) && app.visitData?.scheduledDate && (
                                <div className={`rounded-[10px] border p-5 ${app.status === 'vef_failed' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/20'}`}>
                                    <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${app.status === 'vef_failed' ? 'text-red-600' : 'text-amber-600'}`}>
                                        {app.status === 'vef_failed' ? 'Site Visit Not Passed' : hasVisited ? 'Site Visit Completed' : app.status === 'revisit_approved' ? 'Revisitation Approved' : 'Wait for Visitation'}
                                    </p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white mb-4">
                                        {new Date(app.visitData.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>

                                    {adminRole !== 'viewer' && (
                                        <button
                                            onClick={() => setVefModal({ open: true, existing: null })}
                                            className="w-full py-3 rounded-[10px] font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-base">assignment</span>
                                            VEF — Visiting Evaluation Form
                                        </button>
                                    )}

                                    {adminRole !== 'viewer' && app.status === 'for_site_visit' && !hasVisited && (
                                        <button
                                            onClick={handleRevertToSelfAssessment}
                                            disabled={accredActionLoading}
                                            className="w-full mt-2 py-2.5 rounded-[10px] font-bold text-xs uppercase tracking-wider bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/40 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                                        >
                                            <span className="material-symbols-outlined text-sm">undo</span>
                                            Revert to Self-Assessment
                                        </button>
                                    )}

                                    {app.visitingEvaluationForms && app.visitingEvaluationForms.length > 0 && (() => {
                                        const sorted = [...app.visitingEvaluationForms].sort((a, b) => b.version - a.version);
                                        const latest = sorted[0];
                                        return (
                                            <div className="mt-4 space-y-2">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Evaluation Forms</p>
                                                {sorted.map(form => (
                                                    <div key={form.version} className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-[10px] border border-slate-100 dark:border-white/5">
                                                        <span className={`material-symbols-outlined text-lg ${form.result === 'Passed' ? 'text-emerald-500' : 'text-red-500'}`}>picture_as_pdf</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[11px] font-bold text-slate-700 dark:text-white truncate">{form.filename}</p>
                                                            <p className={`text-[10px] font-bold uppercase ${form.result === 'Passed' ? 'text-emerald-600' : 'text-red-600'}`}>{form.result}</p>
                                                        </div>
                                                        {form.url && (
                                                            <a href={form.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-[10px]" title="Download">
                                                                <span className="material-symbols-outlined text-sm text-primary">download</span>
                                                            </a>
                                                        )}
                                                        {adminRole !== 'viewer' && (
                                                            <button onClick={() => setVefModal({ open: true, existing: form })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[10px]" title="Edit">
                                                                <span className="material-symbols-outlined text-sm text-slate-500">edit</span>
                                                            </button>
                                                        )}
                                                    </div>
                                                ))}

                                                {/* Failure remarks — the same text shown to the member */}
                                                {latest.result === 'Fail' && latest.failRemarks && (
                                                    <div className="rounded-[10px] border border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 p-3">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Remarks — Why It Failed</p>
                                                        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{latest.failRemarks}</p>
                                                    </div>
                                                )}

                                                {/* Section-by-section breakdown of the latest evaluation */}
                                                {latest.sections && latest.sections.length > 0 && (
                                                    <div className="mt-3 rounded-[10px] border border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5 overflow-hidden">
                                                        {latest.sections.map(sr => {
                                                            const section = STANDARD_2026.find(s => s.id === sr.sectionId);
                                                            if (!section) return null;
                                                            const total = sectionTotalPoints(section);
                                                            return (
                                                                <div key={sr.sectionId} className="px-3 py-2 flex items-center justify-between gap-2 bg-white dark:bg-slate-800">
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <span className={`size-2 rounded-full shrink-0 ${sr.passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                                                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate">{section.id}. {section.title}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 shrink-0">
                                                                        {section.scored && total > 0 && (
                                                                            <span className="text-[10px] font-bold text-slate-400">{Math.round(sr.earnedPoints)}/{Math.round(total)}</span>
                                                                        )}
                                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase ${sr.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                                                            {sr.passed ? 'Pass' : 'Fail'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}

                                    {/* Revisit is requested by the MEMBER — admin just waits here. */}
                                    {app.status === 'vef_failed' && (
                                        <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-500/20">
                                            <p className="text-xs text-red-600 dark:text-red-400 italic">Waiting for the member to request a revisit after addressing the remarks above.</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Uploaded compliance files (business documents from onboarding) */}
                            {(memberDocs.length > 0 || catDocs.length > 0) && (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 p-4">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Uploaded Files</h3>
                                    <div className="space-y-4">
                                        {memberDocs.map(([docId, files]) => (
                                            <div key={docId}>
                                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">{MEMBERSHIP_DOC_LABELS[docId] || docId}</p>
                                                <div className="space-y-1.5">
                                                    {files.map((file: any, idx: number) => (
                                                        <button key={idx} onClick={() => setViewerFile({ url: file.url, name: file.name })} className="w-full flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-[10px] border border-slate-100 dark:border-white/5 hover:border-primary/40 transition-colors group text-left">
                                                            <span className="material-symbols-outlined text-primary text-sm">description</span>
                                                            <span className="flex-1 min-w-0 text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                                                            <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-primary">visibility</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                        {catDocs.map((c, i) => (
                                            <div key={`cat-${i}`}>
                                                <p className="text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5">{c.title}</p>
                                                <div className="space-y-1.5">
                                                    {c.files.map((file: any, idx: number) => (
                                                        <button key={idx} onClick={() => setViewerFile({ url: file.url, name: file.name })} className="w-full flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-[10px] border border-slate-100 dark:border-white/5 hover:border-primary/40 transition-colors group text-left">
                                                            <span className="material-symbols-outlined text-primary text-sm">description</span>
                                                            <span className="flex-1 min-w-0 text-xs font-medium text-slate-700 dark:text-slate-200 truncate">{file.name}</span>
                                                            <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-primary">visibility</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Final Review decision — visible for any status once the site visit/VEF has
                                happened, independent of uploaded files. Nothing here is irrevocable: even
                                a finalized (for_payment/paid/accredited) application can still be disapproved. */}
                            {adminRole !== 'viewer' && roundVisited && app.status !== 'rejected' && app.status !== 'vef_failed' && (() => {
                                const isFinalized = app.status === 'for_payment' || app.status === 'paid' || app.status === 'accredited';
                                return (
                                <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 p-4 space-y-3">
                                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Final Review Decision</h3>
                                    {app.status === 'needs_compliance' && (
                                        <div className="px-3 py-2 rounded-[10px] bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20">
                                            <p className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">error</span>
                                                Declined{app.complianceRejectionReason ? `: ${app.complianceRejectionReason}` : ''}
                                            </p>
                                        </div>
                                    )}
                                    {isFinalized && (
                                        <div className="px-3 py-2 rounded-[10px] bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-500/20">
                                            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-sm">verified</span>
                                                Already approved — you may still disapprove/revoke below if needed.
                                            </p>
                                        </div>
                                    )}
                                    {app.status === 'paid' && (
                                        <button
                                            onClick={handleConfirmAccreditation}
                                            disabled={accredActionLoading}
                                            className="w-full py-3.5 rounded-[10px] font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                        >
                                            {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">workspace_premium</span>}
                                            Confirm Payment — Issue Accreditation
                                        </button>
                                    )}
                                    {!isFinalized && (
                                        <button
                                            onClick={handleApproveCompliance}
                                            disabled={accredActionLoading}
                                            className="w-full py-3.5 rounded-[10px] font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                        >
                                            {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">check_circle</span>}
                                            Approved — Proceed to Payment
                                        </button>
                                    )}
                                    {app.status !== 'needs_compliance' && (
                                        !showDeclineInput ? (
                                            <button
                                                onClick={() => setShowDeclineInput(true)}
                                                disabled={accredActionLoading}
                                                className="w-full py-3.5 rounded-[10px] font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                            >
                                                <span className="material-symbols-outlined text-sm">cancel</span>
                                                {isFinalized ? 'Disapprove / Revoke Accreditation' : 'Decline'}
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <textarea
                                                    id="iap-decline-reason"
                                                    value={declineReason}
                                                    onChange={e => setDeclineReason(e.target.value)}
                                                    placeholder="Enter reason for declining (required)..."
                                                    rows={3}
                                                    className="w-full px-4 py-3 text-sm border border-slate-200 dark:border-white/10 rounded-[10px] bg-white dark:bg-slate-900 focus:ring-2 focus:ring-red-500 outline-none resize-none"
                                                />
                                                <div className="flex gap-2">
                                                    <button onClick={() => { setShowDeclineInput(false); setDeclineReason(''); }} className="flex-1 py-2 text-xs font-bold rounded-[10px] border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">Cancel</button>
                                                    <button onClick={handleDeclineCompliance} disabled={accredActionLoading || !declineReason.trim()} className="flex-1 py-2 text-xs font-bold rounded-[10px] bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-40">
                                                        {isFinalized ? 'Confirm Revoke' : 'Confirm Decline'}
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    )}
                                </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>

            {/* VEF Modal */}
            {vefModal.open && (
                <VisitingEvaluationModal
                    isOpen={vefModal.open}
                    onClose={() => setVefModal({ open: false, existing: null })}
                    app={app}
                    existingForm={vefModal.existing}
                    onSaved={() => showToast('Evaluation sent to member and saved.', 'success')}
                />
            )}
            <FileViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />
        </>
    );
};

export default InspectApplicationModal;
