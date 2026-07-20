import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StageTracker from '../components/StageTracker';
import AccreditationChecklist from '../components/AccreditationChecklist';
import {
  doc, updateDoc, collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDocs, where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import {
  type AccreditationApplication,
  type LOIData,
  type SelfAssessmentData,
  type PaymentData,
  type UploadedFile,
  type AccreditationStage,
} from '../types/accreditation';
import { ASSESSMENT_CATEGORIES, getCategoryStats } from '../data/assessmentCategories';
import { STANDARD_2026 } from '../data/accreditationStandard2026';
import { sectionTotalPoints, computeGapSummary } from '../utils/evaluationScoring';
import FileViewerModal, { type ViewerFile } from '../components/FileViewerModal';
import { cleanPhone } from '../utils/phone';
import CalendarPicker from '../components/CalendarPicker';


// Required membership / business documents (relocated from the membership application form).
// Full set across all business structures (Sole Proprietorship, Partnership, Corporation, VTH).
const MEMBERSHIP_DOCUMENTS: { id: string; label: string; note?: string; type?: 'file' | 'video' }[] = [
  { id: 'sec_articles', label: 'SEC Articles of Incorporation and By-Laws', note: 'For Partnership / Corporation / VTH — Representative must be at least 50% shareholder' },
  { id: 'old_dti', label: 'Old DTI Permit (2021 or older)', note: 'For Sole Proprietorship' },
  { id: 'current_dti', label: 'Current DTI Permit', note: 'For Sole Proprietorship' },
  { id: 'business_permit', label: "Current Business Permit / Mayor's Permit" },
  { id: 'bai_cert', label: 'BAI Certificate of Registration', note: 'Classification must be Veterinary Clinic (Surgical) or Veterinary Hospital' },
  { id: 'bir_2303', label: 'BIR COR 2303' },
  { id: 'ptr_rep', label: 'Current PTR of Representative' },
  { id: 'prc_id', label: 'Updated PRC License ID of Representative' },
  { id: 'board_res', label: 'Board Resolution', note: 'For Partnership / Corporation — Appointing the shareholder as company representative' },
  { id: 'dean_letter', label: 'Endorsement Letter from the Dean', note: 'For Veterinary Teaching Hospital' },
  { id: 'walkthrough_video', label: 'Clinic Walkthrough Video (max 1 min)', note: 'From facade going inside, covering all rooms. Max 100MB (MP4).', type: 'video' },
];

// Document ids required per business structure — mirrors the requirement
// lists used during Membership onboarding (Member Dashboard > Membership tab),
// so Stage 4 shows exactly the documents that applied to this clinic.
const REQS_BY_BUSINESS_TYPE: Record<string, string[]> = {
  sole_proprietorship: ['old_dti', 'current_dti', 'business_permit', 'bai_cert', 'bir_2303', 'ptr_rep', 'prc_id', 'walkthrough_video'],
  partnership_corporation: ['sec_articles', 'business_permit', 'bai_cert', 'bir_2303', 'ptr_rep', 'prc_id', 'board_res'],
  teaching_hospital: ['dean_letter'],
};

const AccreditationPipeline: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const [application, setApplication] = useState<AccreditationApplication | null>(null);
  const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const refMatch = successMessage.match(/Reference:\s*(\S+)/i);
  const refId = refMatch ? refMatch[1] : '';
  const isLoi = successMessage.toLowerCase().includes('letter of intent');
  const isSelf = successMessage.toLowerCase().includes('self-assessment');
  const isDocs = successMessage.toLowerCase().includes('documents');
  const isPayment = successMessage.toLowerCase().includes('payment');

  // Sourced solely from Firestore (application.selfAssessmentData) below — no
  // localStorage cache, since a single shared browser key was leaking one
  // account's checked items into every other account signed in on the same device.
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  const [loiForm, setLoiForm] = useState<LOIData>({
    representativeName: profile?.fullName || '',
    representativeTitle: profile?.title || '',
    prcLicenseNo: profile?.prcLicense || '',
    clinicName: profile?.clinicName || '',
    clinicAddress: profile?.clinicAddress || profile?.address || '',
    email: profile?.email || user?.email || '',
    phone: profile?.phone || '',
    preferredVisitDates: [],
    declarationChecked: false,
    loiRef: '',
  });

  const [visitDates, setVisitDates] = useState(['', '', '']);
  const [visitDateErrors, setVisitDateErrors] = useState(['', '', '']);
  // Local YYYY-MM-DD for today, used to reject past dates.
  const todayStr = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  // A site visit can never be scheduled for today — earliest selectable date
  // is tomorrow, used as the `min` bound on every visit-date picker.
  const minVisitDateStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }, []);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [paymentPreview, setPaymentPreview] = useState<string | null>(null);
  const [loiPdfFile, setLoiPdfFile] = useState<File | null>(null);
const [loiPdfUploading, setLoiPdfUploading] = useState(false);
  const [showRevisitDateInput, setShowRevisitDateInput] = useState(false);
  const [revisitDates, setRevisitDates] = useState(['', '', '']);
  const [showDateProposalDeclined, setShowDateProposalDeclined] = useState(false);
  const [revisitDateErrors, setRevisitDateErrors] = useState(['', '', '']);
  const [viewingStage, setViewingStage] = useState<number | null>(null);
  // Lets a member re-open and resubmit an already-submitted self-assessment —
  // only meaningful before a site visit has been scheduled/completed, since
  // the physical inspection becomes the authoritative record after that.
  const [retakingAssessment, setRetakingAssessment] = useState(false);
  // Snap back to the live/current stage whenever the application's workflow
  // status actually advances (e.g. admin approves/schedules something while
  // the member is sitting on a different tab) — otherwise the member gets
  // stuck "viewing" a stage that no longer matches reality, showing blank content.
  const prevAccredStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (application && prevAccredStatusRef.current !== undefined && prevAccredStatusRef.current !== application.status) {
      setViewingStage(null);
    }
    prevAccredStatusRef.current = application?.status;
  }, [application?.status]);

  const [reps, setReps] = useState<any[]>([]);

  // Dynamic Accreditation settings state
  const [liveAccreditationFee, setLiveAccreditationFee] = useState(15000);
  const [liveAccreditationProcessingFee, setLiveAccreditationProcessingFee] = useState(2500);
  const [liveAccreditationValidityYears, setLiveAccreditationValidityYears] = useState(3);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    // Realtime listener for clinic representatives
    const unsubReps = onSnapshot(collection(db, 'users', user.uid, 'representatives'), (snap) => {
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReps(list);
    }, (err) => {
      console.error('[AccreditationPipeline] Reps fetch error:', err);
    });

    const q = query(collection(db, 'accreditation_applications'), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as AccreditationApplication))
        .filter(app => app.clinicId === user.uid);

      if (apps.length > 0) {
        setApplication(apps[0]);
        if (apps[0].selfAssessmentData?.checkedItems) {
          setCheckedItems(apps[0].selfAssessmentData.checkedItems);
        }
      }
      setLoading(false);
    });

    const unsubAccSettings = onSnapshot(doc(db, 'systemSettings', 'accreditation'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLiveAccreditationFee(data.baseFee || 15000);
        const feeEnabled = data.enableProcessingFee !== undefined ? data.enableProcessingFee : true;
        setLiveAccreditationProcessingFee(feeEnabled ? (data.processingFee !== undefined ? data.processingFee : 2500) : 0);
        setLiveAccreditationValidityYears(data.validityYears || 3);
      }
    });

    return () => {
      unsubscribe();
      unsubAccSettings();
      unsubReps();
    };
  }, [user]);

  // Auto-refresh: the onSnapshot listeners above are already realtime, but a
  // stale tab (e.g. left open overnight, or a flaky connection that silently
  // dropped the socket) can fall behind — so we also do a one-time re-fetch on
  // an interval, plus expose a manual "Refresh" button in the header.
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const refreshApplicationData = React.useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      const q = query(collection(db, 'accreditation_applications'), where('clinicId', '==', user.uid));
      const snap = await getDocs(q);
      const apps = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as AccreditationApplication))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      if (apps.length > 0) {
        setApplication(apps[0]);
        if (apps[0].selfAssessmentData?.checkedItems) {
          setCheckedItems(apps[0].selfAssessmentData.checkedItems);
        }
      }
    } catch (err) {
      console.error('[AccreditationPipeline] Manual refresh failed:', err);
    } finally {
      setLastRefreshedAt(new Date());
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => { refreshApplicationData(); }, 60000);
    return () => clearInterval(interval);
  }, [user, refreshApplicationData]);

  const categoryStats = useMemo(() => {
    const stats: Record<string, { score: number; passed: boolean; allCompulsoryMet: boolean }> = {};
    ASSESSMENT_CATEGORIES.forEach(cat => {
      if (cat.subCategories) {
        cat.subCategories.forEach(sub => {
          const subCat = { ...cat, id: sub.id, title: sub.title, passingScore: sub.passingScore, items: sub.items };
          stats[sub.id] = getCategoryStats(subCat, checkedItems);
        });
      } else {
        stats[cat.id] = getCategoryStats(cat, checkedItems);
      }
    });
    return stats;
  }, [checkedItems]);

  const selfAssessmentScores = useMemo(() => {
    const scores: Record<string, number> = {};
    Object.entries(categoryStats).forEach(([id, stat]) => {
      scores[id] = stat.score;
    });
    return scores;
  }, [categoryStats]);

  // Latest Visiting Evaluation Form (site-visit inspection result) submitted by the admin.
  const latestVef = useMemo(() => {
    const forms = application?.visitingEvaluationForms || [];
    if (forms.length === 0) return null;
    return [...forms].sort((a, b) => b.version - a.version)[0];
  }, [application]);

  const canSubmitLOI = useMemo(() => {
    return (
      loiForm.representativeName &&
      loiForm.representativeTitle &&
      loiForm.prcLicenseNo &&
      loiForm.clinicName &&
      loiForm.clinicAddress &&
      loiForm.email &&
      loiForm.phone &&
      loiForm.declarationChecked
    );
  }, [loiForm]);

  // Every date ever offered by the member (initial round + all revisit
  // rounds) — a date must never be selectable again once it's been used.
  // Unioned with the actual submitted date fields (not just the tracking
  // array) so this self-heals for applications whose original 3 dates were
  // saved before `usedVisitDates` existed and would otherwise sit at [].
  const usedVisitDates = Array.from(new Set([
    ...(application?.usedVisitDates || []),
    ...(application?.loiData?.preferredVisitDates || []),
    ...(application?.visitData?.preferredRevisitDates || []),
  ]));

  const canSubmitVisitDates = useMemo(() => {
    return visitDates.filter(d => d).length === 3;
  }, [visitDates]);

  const handleSubmitVisitDates = async () => {
    if (!application || !user || !canSubmitVisitDates) return;
    setSubmitting(true);

    const chosenDates = visitDates.filter(d => d);
    try {
      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        'loiData.preferredVisitDates': chosenDates,
        usedVisitDates: [...usedVisitDates, ...chosenDates],
        updatedAt: serverTimestamp(),
      });
      setApplication(prev => prev ? {
        ...prev,
        loiData: prev.loiData ? { ...prev.loiData, preferredVisitDates: chosenDates } : prev.loiData,
        usedVisitDates: [...usedVisitDates, ...chosenDates],
      } : null);
      setVisitDates(['', '', '']);
      setSuccessMessage('Preferred site visit dates submitted!');
      setShowSuccessModal(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Preferred Site Visit Dates Submitted',
        body: `${application.clinicName} submitted their preferred site visit dates: ${chosenDates.map(d => new Date(d).toLocaleDateString()).join(', ')}.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error submitting visit dates:', error);
      alert('Failed to submit preferred visit dates');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitSelfAssessment = async () => {
    if (!application || !user) return;

    setSubmitting(true);
    try {
      const selfAssessmentData: SelfAssessmentData = {
        checkedItems,
        categoryScores: selfAssessmentScores,
        submittedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        selfAssessmentData,
        status: 'self_assessment_completed',
        updatedAt: serverTimestamp(),
      });

      setApplication(prev => prev ? { ...prev, selfAssessmentData, status: 'self_assessment_completed' } : null);
      setRetakingAssessment(false);
      setSuccessMessage('Self-assessment submitted successfully!');
      setShowSuccessModal(true);

      // Notify admin
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Self-Assessment Completed',
        body: `${application.clinicName} has completed the self-assessment form.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });

      // Member-only reminder of what's still missing before the site visit —
      // never sent to admin, since it's just guidance for the clinic itself.
      const gaps = computeGapSummary(STANDARD_2026, checkedItems);
      if (gaps.length > 0) {
        const missingList = gaps
          .slice(0, 5)
          .map(g => g.missingCompulsory.length > 0
            ? `${g.sectionId} (${g.missingCompulsory.length} item${g.missingCompulsory.length !== 1 ? 's' : ''} missing)`
            : `${g.sectionId} (below passing score)`)
          .join(', ');
        const more = gaps.length > 5 ? ` and ${gaps.length - 5} more section(s)` : '';
        await addDoc(collection(db, 'member_notifications'), {
          uid: user.uid,
          clinicId: user.uid,
          type: 'self_assessment_gaps',
          title: 'Requirements Still Missing',
          body: `Your self-assessment found gaps in: ${missingList}${more}. Review the "What's missing" panel in Accreditation before your site visit.`,
          link: 'accreditation',
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error submitting self-assessment:', error);
      alert('Failed to submit self-assessment');
    } finally {
      setSubmitting(false);
    }
  };

  // Reopening and resubmitting an ALREADY-submitted self-assessment (the
  // "Retake" flow) — unlike the first-time submit above, this must NOT touch
  // `status`/`stage`. The application may already be scheduled for (or even
  // past) its site visit; forcibly resetting status back to
  // 'self_assessment_completed' would wrongly unwind that progress. Only the
  // stored checklist data is updated.
  const handleResubmitSelfAssessment = async () => {
    if (!application || !user) return;

    setSubmitting(true);
    try {
      const selfAssessmentData: SelfAssessmentData = {
        checkedItems,
        categoryScores: selfAssessmentScores,
        submittedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        selfAssessmentData,
        updatedAt: serverTimestamp(),
      });

      setApplication(prev => prev ? { ...prev, selfAssessmentData } : null);
      setRetakingAssessment(false);
      setSuccessMessage('Self-assessment updated!');
      setShowSuccessModal(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Self-Assessment Updated',
        body: `${application.clinicName} retook and updated their self-assessment.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });

      // Member-only reminder of what's still missing before the site visit —
      // never sent to admin, since it's just guidance for the clinic itself.
      const gaps = computeGapSummary(STANDARD_2026, checkedItems);
      if (gaps.length > 0) {
        const missingList = gaps
          .slice(0, 5)
          .map(g => g.missingCompulsory.length > 0
            ? `${g.sectionId} (${g.missingCompulsory.length} item${g.missingCompulsory.length !== 1 ? 's' : ''} missing)`
            : `${g.sectionId} (below passing score)`)
          .join(', ');
        const more = gaps.length > 5 ? ` and ${gaps.length - 5} more section(s)` : '';
        await addDoc(collection(db, 'member_notifications'), {
          uid: user.uid,
          clinicId: user.uid,
          type: 'self_assessment_gaps',
          title: 'Requirements Still Missing',
          body: `Your self-assessment found gaps in: ${missingList}${more}. Review the "What's missing" panel in Accreditation before your site visit.`,
          link: 'accreditation',
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('Error submitting self-assessment:', error);
      alert('Failed to submit self-assessment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitLOI = async () => {
    if (!user || !canSubmitLOI) return;

    setSubmitting(true);

    const loiRef = `PAHA-LOI-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`;
    // Normalize first — loiForm.phone may already carry a +63/63/0 prefix if the
    // applicant never touched the field (pre-filled straight from their profile),
    // so blindly prepending +63 here would double it up.
    const rawPhone = loiForm.phone
      ? (loiForm.phone.startsWith('+63') ? loiForm.phone.slice(3)
        : loiForm.phone.startsWith('63') && loiForm.phone.length === 12 ? loiForm.phone.slice(2)
        : loiForm.phone.startsWith('0') && loiForm.phone.length === 11 ? loiForm.phone.slice(1)
        : loiForm.phone)
      : '';
    const loiData: LOIData = {
      ...loiForm,
      phone: rawPhone ? `+63${rawPhone}` : '',
      preferredVisitDates: [],
      loiRef,
    };

    // Upload LOI PDF if provided
    let loiPdfUrl = '';
    let loiPdfName = '';
    if (loiPdfFile) {
      setLoiPdfUploading(true);
      try {
        const pdfRef = ref(storage, `accreditation/loi/${user.uid}/${Date.now()}_${loiPdfFile.name}`);
        const snap = await uploadBytes(pdfRef, loiPdfFile);
        loiPdfUrl = await getDownloadURL(snap.ref);
        loiPdfName = loiPdfFile.name;
      } catch (e) {
        console.error('PDF upload failed:', e);
      } finally {
        setLoiPdfUploading(false);
      }
    }

    try {
      const docRef = await addDoc(collection(db, 'accreditation_applications'), {
        clinicId: user.uid,
        clinicName: loiForm.clinicName,
        membershipId: profile?.membershipId || '',
        stage: 2 as AccreditationStage,
        status: 'intent_submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loiData,
        loiPdfUrl: loiPdfUrl || null,
        loiPdfName: loiPdfName || null,
        selfAssessmentData: null,
        visitData: null,
        complianceData: null,
        assessmentResultData: null,
        paymentData: null,
      });

      const newApp: AccreditationApplication = {
        id: docRef.id,
        clinicId: user.uid,
        clinicName: loiForm.clinicName,
        membershipId: profile?.membershipId || '',
        stage: 2,
        status: 'intent_submitted',
        submittedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        loiData,
        loiPdfUrl: loiPdfUrl || undefined,
        loiPdfName: loiPdfName || undefined,
        selfAssessmentData: null,
        visitData: null,
        complianceData: null,
        assessmentResultData: null,
        paymentData: null,
      };

      setApplication(newApp);
      setLoiPdfFile(null);
      setSuccessMessage(`Letter of Intent submitted! Reference: ${loiRef}`);
      setShowSuccessModal(true);

      // Notify admin
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'New Accreditation LOI Submitted',
        body: `${loiForm.clinicName} submitted a Letter of Intent. Ref: ${loiRef}`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error submitting LOI:', error);
      alert('Failed to submit Letter of Intent');
    } finally {
      setSubmitting(false);
    }
  };

  // Resubmitting after a rejection reuses the SAME application document instead
  // of creating a new one — only the status/stage/PDF are updated. This keeps
  // the applicant's history (and every prior stage's data) intact across
  // however many reject → resubmit cycles the admin puts them through.
  const handleResubmitLOI = async () => {
    if (!application || !user) return;

    setSubmitting(true);
    try {
      let loiPdfUrl = application.loiPdfUrl || null;
      let loiPdfName = application.loiPdfName || null;
      if (loiPdfFile) {
        setLoiPdfUploading(true);
        try {
          const pdfRef = ref(storage, `accreditation/loi/${user.uid}/${Date.now()}_${loiPdfFile.name}`);
          const snap = await uploadBytes(pdfRef, loiPdfFile);
          loiPdfUrl = await getDownloadURL(snap.ref);
          loiPdfName = loiPdfFile.name;
        } finally {
          setLoiPdfUploading(false);
        }
      }

      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        status: 'intent_resubmitted',
        stage: 2,
        rejectionReason: '',
        loiPdfUrl,
        loiPdfName,
        resubmittedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setApplication(prev => prev ? {
        ...prev,
        status: 'intent_resubmitted',
        stage: 2,
        rejectionReason: '',
        loiPdfUrl: loiPdfUrl || undefined,
        loiPdfName: loiPdfName || undefined,
      } : null);
      setLoiPdfFile(null);
      setSuccessMessage('Letter of Intent resubmitted for review!');
      setShowSuccessModal(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Letter of Intent Resubmitted',
        body: `${application.clinicName} resubmitted their Letter of Intent for review. Ref: ${application.loiData?.loiRef || application.id}`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error resubmitting LOI:', error);
      alert('Failed to resubmit Letter of Intent');
    } finally {
      setSubmitting(false);
    }
  };

  // Member-initiated, mirroring the original LOI preferred-visit-date flow
  // (3 proposed dates) — sets status to "revisit_requested" so admin has to
  // explicitly approve one before it's confirmed, rather than jumping
  // straight to a scheduled visit.
  const handleRequestRevisit = async () => {
    const chosenDates = revisitDates.filter(d => d);
    if (!application || chosenDates.length !== 3) return;
    setSubmitting(true);
    try {
      const newVisitData = {
        ...(application.visitData || { scheduledDate: '', scheduledTime: '', inspectorName: '', notes: '' }),
        preferredRevisitDates: chosenDates,
      };
      const newUsedDates = [...usedVisitDates, ...chosenDates];
      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        status: 'revisit_requested',
        stage: 3,
        visitData: newVisitData,
        usedVisitDates: newUsedDates,
        updatedAt: serverTimestamp(),
      });
      setApplication(prev => prev ? { ...prev, status: 'revisit_requested', stage: 3, visitData: newVisitData, usedVisitDates: newUsedDates } : null);
      setShowRevisitDateInput(false);
      setRevisitDates(['', '', '']);
      setRevisitDateErrors(['', '', '']);
      setSuccessMessage('Revisit requested! PAHA will confirm a date shortly.');
      setShowSuccessModal(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Revisit Requested',
        body: `${application.clinicName} requested a revisit after their failed site visit. Preferred dates: ${chosenDates.map(d => new Date(d).toLocaleDateString()).join(', ')}.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error requesting revisit:', error);
      alert('Failed to request revisit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Member accepts the alternate date the admin proposed (used when none of
  // the member's 3 preferred dates worked for the inspector) — resolves to
  // the correct next status depending on whether this was the initial visit
  // or a revisit round.
  const handleAcceptProposedDate = async () => {
    const proposedDate = application?.visitData?.adminProposedDate;
    if (!application || !proposedDate) return;
    setSubmitting(true);
    try {
      const nextStatus = application.visitData?.proposedForRevisit ? 'revisit_approved' : 'for_site_visit';
      const { adminProposedDate, proposedForRevisit, ...restVisitData } = application.visitData || { scheduledDate: '', scheduledTime: '', inspectorName: '', notes: '' };
      const newVisitData = {
        ...restVisitData,
        scheduledDate: proposedDate,
        confirmedAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        status: nextStatus,
        stage: 3,
        visitData: newVisitData,
        updatedAt: serverTimestamp(),
      });
      setApplication(prev => prev ? { ...prev, status: nextStatus, stage: 3, visitData: newVisitData } : null);
      setShowDateProposalDeclined(false);
      setSuccessMessage('Visit date confirmed!');
      setShowSuccessModal(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Proposed Visit Date Accepted',
        body: `${application.clinicName} accepted the proposed site visit date: ${new Date(proposedDate).toLocaleDateString()}.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error accepting proposed date:', error);
      alert('Failed to accept the proposed date. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Member flags that the admin-proposed date doesn't work for them — this
  // used to be a purely local UI message telling them to go chat, with no
  // signal reaching the admin side at all. Now it also notifies the admin
  // and flags the application so the admin dashboard shows a "propose a new
  // date directly" panel instead of endlessly waiting for a response.
  const handleDeclineProposedDate = async () => {
    if (!application?.visitData?.adminProposedDate) return;
    setSubmitting(true);
    try {
      const proposalDeclinedAt = new Date().toISOString();
      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        'visitData.proposalDeclinedAt': proposalDeclinedAt,
        updatedAt: serverTimestamp(),
      });
      setApplication(prev => prev ? {
        ...prev,
        visitData: prev.visitData ? { ...prev.visitData, proposalDeclinedAt } : prev.visitData,
      } : null);
      setShowDateProposalDeclined(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Member Unavailable for Proposed Visit Date',
        body: `${application.clinicName} can't make the proposed site visit date (${new Date(application.visitData.adminProposedDate).toLocaleDateString()}). Coordinate a new date via chat, then set it directly in Accreditation.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error declining proposed date:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleProceedToReview = async () => {
    if (!application) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        status: 'under_review',
        updatedAt: serverTimestamp(),
      });
      setApplication(prev => prev ? { ...prev, status: 'under_review' } : null);
      setSuccessMessage('Moved to admin review!');
      setShowSuccessModal(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Ready for Final Review',
        body: `${application.clinicName} has reviewed their site visit result and is ready for final review.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      }).catch(() => {});
    } catch (error) {
      console.error('Error proceeding to review:', error);
      alert('Failed to proceed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Member-initiated: after the Final Review (post-visit compliance check) is
  // declined, this puts the SAME application back in the review queue once
  // they've fixed whatever the remarks flagged — no new entry created.
  const handleResubmitFinalReview = async () => {
    if (!application) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        status: 'under_review',
        updatedAt: serverTimestamp(),
      });
      setApplication(prev => prev ? { ...prev, status: 'under_review' } : null);
      setSuccessMessage('Application resubmitted for review!');
      setShowSuccessModal(true);

      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Application Resubmitted — Final Review',
        body: `${application.clinicName} resubmitted their application after addressing the final review feedback.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error resubmitting application:', error);
      alert('Failed to resubmit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentProofUpload = (file: File) => {
    setPaymentProof(file);
    const reader = new FileReader();
    reader.onload = (e) => setPaymentPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmitPayment = async () => {
    if (!application || !paymentProof) return;

    const totalAmount = liveAccreditationFee + liveAccreditationProcessingFee;
    const statementOfAccount = `Accreditation Fee: ₱${liveAccreditationFee.toLocaleString()}\nProcessing Fee: ₱${liveAccreditationProcessingFee.toLocaleString()}\nTotal: ₱${totalAmount.toLocaleString()}`;

    setSubmitting(true);
    try {
      const fileRef = ref(storage, `accreditation/${application.id}/payment/${paymentProof.name}`);
      const snapshot = await uploadBytes(fileRef, paymentProof);
      const proofUrl = await getDownloadURL(snapshot.ref);

      const paymentData: PaymentData = {
        triggeredAt: application.paymentData?.triggeredAt ?? new Date().toISOString(),
        amount: totalAmount,
        statementOfAccount: statementOfAccount,
        proofOfPaymentUrl: proofUrl,
        submittedAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'accreditation_applications', application.id), {
        paymentData,
        status: 'paid',
        updatedAt: serverTimestamp(),
      });

      // Notify admin of the payment proof submission
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Accreditation Payment Submitted',
        body: `${application.clinicName} submitted proof of payment (₱${totalAmount.toLocaleString()}).`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      }).catch(() => {});

      // Update user's profile with the (only) membership type
      if (user) {
        await updateDoc(doc(db, 'users', user.uid), {
          membershipType: 'Institutional',
          updatedAt: serverTimestamp(),
        });
      }

      setApplication(prev => prev ? { ...prev, paymentData, status: 'paid' } : null);
      setSuccessMessage('Payment proof submitted!');
      setShowSuccessModal(true);
      setPaymentProof(null);
      setPaymentPreview(null);
    } catch (error) {
      console.error('Error submitting payment:', error);
      alert('Failed to submit payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={embedded ? 'flex items-center justify-center py-20' : 'min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center'}>
        <div className="text-center">
          <span className="animate-spin border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full w-12 h-12 block mx-auto mb-4"></span>
          <p className="text-slate-500 font-medium">Loading accreditation...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/login');
    return null;
  }

  // Visit is done once THIS round's visitData has been marked complete.
  // Deliberately NOT based on `visitingEvaluationForms.length > 0` — that
  // array keeps every past (e.g. failed) VEF, so it would stay truthy
  // forever and wrongly mark a freshly-scheduled revisit as "already
  // visited" before the revisit has actually happened.
  const hasVisited = application?.status === 'inspection_completed'
    || !!application?.visitData?.completedAt;
  const currentStatus = application?.status || 'not_started';
  // A rejected LOI must not carry the applicant further down the pipeline —
  // force them back to Stage 1 (resubmit) regardless of any stale `stage`
  // value left over from before the rejection.
  const isRejected = currentStatus === 'rejected';
  // A failed VEF (or a revisit the member has requested but admin hasn't yet
  // approved) needs an actual revisit — hasVisited would otherwise force the
  // stage forward to Compliance (4). Trust the stored `stage` here instead:
  // the 1st failure is saved at stage 3 (Site Visit), a 2nd failure escalates
  // to stage 4 (per the 3-strike policy), so don't override it with a fixed 3.
  const isVefFailed = currentStatus === 'vef_failed' || currentStatus === 'revisit_requested';
  const isBanned = currentStatus === 'accreditation_banned';
  
  // Map workflow status to StageTracker stage (1-8, stage 6 retired — merged into stage 7)
  // StageTracker stages: 1=Intent, 2=Self-Assessment, 3=Site Visit, 4=Compliance, 5=Admin Review, 7=Approved. For Payment, 8=Accredited
  const getTrackerStage = (): number => {
    if (isRejected || isBanned) return 1;
    if (isVefFailed) return Math.min(application?.stage as number || 3, 4);

    // Site visit phase — submitting/awaiting preferred dates, awaiting member
    // response to an admin-proposed date, or a confirmed visit (initial or
    // revisit round)
    if (currentStatus === 'self_assessment_completed' || currentStatus === 'visit_date_proposed' || currentStatus === 'for_site_visit' || currentStatus === 'revisit_approved') return 3;

    // Admin review phase — Stage 5
    if (currentStatus === 'under_review') return 5;

    // Final review outcomes
    if (currentStatus === 'needs_compliance') return 5; // Rejected at final review — show on Stage 5
    if (currentStatus === 'approved' || currentStatus === 'for_payment') return 7; // Approved -> Stage 7 (Approved. For Payment)
    if (currentStatus === 'paid') return 7;
    if (application?.paymentData?.confirmedAt) return 8;
    
    // Standard pipeline progression
    return Math.max(application?.stage || 1, hasVisited ? 4 : 0) as AccreditationStage;
  };

  const currentStage = getTrackerStage();
  const displayStage = currentStage;

  return (
    <div className={embedded ? 'pb-8' : 'min-h-screen bg-slate-100 dark:bg-slate-900 pt-28 pb-20 px-4'}>
      <div className={embedded ? '' : 'max-w-5xl mx-auto'}>
        {!embedded && (
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-[#1E3A8A] dark:text-white mb-2">
              Clinic Accreditation <span className="text-[#2563EB]">Pipeline</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 font-medium">
              {application
                ? `Track your accreditation progress for ${application.clinicName}`
                : 'Complete the accreditation stages to become a PAHA-accredited clinic'
              }
            </p>
          </div>
        )}

        {/* Auto-refresh control — data is realtime via onSnapshot, but this
            covers stale/dropped connections and gives the applicant visible
            confirmation their view is current. */}
        {application && (
          <div className="flex items-center justify-end gap-2 mb-3 text-[11px] text-slate-400">
            <span>Last synced {lastRefreshedAt.toLocaleTimeString()}</span>
            <button
              onClick={() => refreshApplicationData()}
              disabled={refreshing}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              title="Refresh now"
            >
              <span className={`material-symbols-outlined text-sm ${refreshing ? 'animate-spin' : ''}`}>refresh</span>
              Refresh
            </button>
          </div>
        )}

        {currentStage && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 mb-4">
            <StageTracker currentStage={displayStage as AccreditationStage} currentStatus={hasVisited && currentStatus === 'for_site_visit' ? 'inspection_completed' : currentStatus} />
          </div>
        )}

        {/* Pipeline Stage Navigation — review any completed stage */}
        {application && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm mb-6 overflow-x-auto">
            <div className="flex min-w-max p-2 gap-1">
              {[
                { stage: 1, label: 'Letter of Intent', icon: 'edit_document', available: true },
                { stage: 2, label: 'Self-Assessment', icon: 'checklist', available: !isRejected && !!application.loiData },
                { stage: 3, label: 'Site Visit', icon: 'event', available: !isRejected && (!!application.visitData || currentStage >= 3) },
                { stage: 4, label: 'Compliance Docs', icon: 'folder_open', available: !isRejected && currentStage >= 4 },
                { stage: 5, label: 'Admin Review', icon: 'rate_review', available: !isRejected && currentStage >= 5 },
                { stage: 6, label: 'Payment', icon: 'payments', available: !isRejected && !!application.paymentData },
              ].map(({ stage, label, icon, available }) => {
                const isActive = (viewingStage ?? displayStage) === stage;
                return (
                  <button
                    key={stage}
                    onClick={() => available && setViewingStage(stage === displayStage ? null : stage)}
                    disabled={!available}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-md shadow-blue-500/20'
                        : available
                          ? 'hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300'
                          : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">{icon}</span>
                    {label}
                  </button>
                );
              })}
              {viewingStage !== null && (
                <button
                  onClick={() => setViewingStage(null)}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-all whitespace-nowrap"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                  Back to Current
                </button>
              )}
            </div>
          </div>
        )}

        {/* Stage 1 Review — LOI details */}
        {viewingStage === 1 && application?.loiData && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">
            <h2 className="text-xl font-bold text-[#1E3A8A] dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563EB]">edit_document</span>
              Letter of Intent — Submitted
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Representative Name', value: application.loiData.representativeName },
                { label: 'Title', value: application.loiData.representativeTitle },
                { label: 'PRC License No.', value: application.loiData.prcLicenseNo },
                { label: 'Clinic Name', value: application.loiData.clinicName },
                { label: 'Email', value: application.loiData.email },
                { label: 'Phone', value: cleanPhone(application.loiData.phone) },
                { label: 'Reference No.', value: application.loiData.loiRef },
              ].map((f, i) => (
                <div key={i} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{f.value || '—'}</p>
                </div>
              ))}
              <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Clinic Address</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{application.loiData.clinicAddress}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Preferred Visit Dates</p>
              {application.loiData.preferredVisitDates.length ? (
                <div className="flex flex-wrap gap-3">
                  {application.loiData.preferredVisitDates.map((d, i) => (
                    <div key={i} className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-xl">
                      <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Option {i + 1}</p>
                      <p className="text-sm font-bold text-blue-700 dark:text-blue-300">{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 italic">Not submitted yet — you'll be asked for these once your self-assessment is complete.</p>
              )}
            </div>
            {application.loiPdfUrl && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Uploaded LOI Document</p>
                <a href={application.loiPdfUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300 rounded-xl font-bold text-sm hover:bg-blue-100 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  View LOI PDF
                </a>
              </div>
            )}
          </div>
        )}

        {/* Stage 2 Review — Self-Assessment summary */}
        {viewingStage === 2 && application && !application.selfAssessmentData && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-3 block">checklist</span>
            <p className="font-bold text-slate-700 dark:text-slate-200 text-sm">No self-assessment on record for this application.</p>
            <p className="text-slate-400 text-xs mt-1">This stage was passed without a submitted checklist.</p>
          </div>
        )}
        {viewingStage === 2 && application?.selfAssessmentData && (() => {
          // Retake happens right here, inline — no separate screen to navigate
          // to. Available any time up until the site visit has actually taken
          // place (a scheduled-but-not-yet-visited date doesn't lock it) —
          // only the physical inspection itself becomes the record of truth.
          const canRetake = !hasVisited;
          const editing = retakingAssessment && canRetake;
          const allItems = ASSESSMENT_CATEGORIES.flatMap(cat =>
            cat.items ? cat.items : cat.subCategories?.flatMap(s => s.items) ?? []
          );
          const totalItems = allItems.length;
          const checkedCount = editing ? allItems.filter(i => checkedItems[i.id]).length : allItems.filter(i => application.selfAssessmentData!.checkedItems[i.id]).length;
          const overallPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

          return (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-[#1E3A8A] dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563EB]">checklist</span>
                  {editing ? 'Self-Assessment — Retaking' : `Self-Assessment — Submitted ${new Date(application.selfAssessmentData.submittedAt).toLocaleDateString()}`}
                </h2>
                {canRetake && (
                  editing ? (
                    <button
                      onClick={() => { setRetakingAssessment(false); setCheckedItems(application.selfAssessmentData!.checkedItems); }}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 font-bold text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                    >
                      Cancel
                    </button>
                  ) : (
                    <button
                      onClick={() => setRetakingAssessment(true)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-[#2563EB] dark:text-blue-400 border border-blue-200 dark:border-blue-700 font-bold text-xs uppercase tracking-wider hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                      Retake Self-Assessment
                    </button>
                  )
                )}
              </div>

              {editing && (
                <div className="bg-[#1E3A8A] dark:bg-[#1e3a8a] rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-bold text-sm">Overall Completion</span>
                    <div className="flex items-center gap-4">
                      <span className="text-blue-200 text-xs">{checkedCount} / {totalItems} items</span>
                      <span className="text-white font-black text-lg">{overallPct}%</span>
                    </div>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                </div>
              )}

              <AccreditationChecklist
                standard={STANDARD_2026}
                mode="self-assessment"
                value={editing ? checkedItems : application.selfAssessmentData.checkedItems}
                onChange={(next: Record<string, boolean>) => { if (editing) setCheckedItems(next); }}
                readOnly={!editing}
                showGapSummary
              />

              {editing && (
                <div className="flex items-center justify-end gap-3">
                  <button
                    onClick={handleResubmitSelfAssessment}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50"
                  >
                    {submitting ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">send</span>}
                    {submitting ? 'Submitting...' : 'Resubmit Assessment'}
                  </button>
                </div>
              )}
            </div>
          );
        })()}

        {/* Stage 3 Review — Site Visit schedule + outcome */}
        {viewingStage === 3 && application?.visitData && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">
            <h2 className="text-xl font-bold text-[#1E3A8A] dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563EB]">event</span>
              Site Visit
            </h2>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Scheduled Date</p>
                  <p className="font-bold text-slate-800 dark:text-white text-lg">
                    {new Date(application.visitData.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Time Window</p>
                  <p className="font-bold text-slate-800 dark:text-white text-lg">
                    {(() => {
                      const t = application.visitData!.scheduledTime;
                      if (!t) return 'Expect site visit from 9:00 AM - 3:00 PM';
                      const parsed = new Date(`2000-01-01T${t}`);
                      return isNaN(parsed.getTime())
                        ? 'Expect site visit from 9:00 AM - 3:00 PM'
                        : parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    })()}
                  </p>
                </div>
                {application.visitData.inspectorName && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">PAHA Inspector</p>
                    <p className="font-bold text-slate-800 dark:text-white">{application.visitData.inspectorName}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Status</p>
                  <p className={`font-bold ${application.visitData.completedAt || hasVisited ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {application.visitData.completedAt || hasVisited ? 'Completed' : 'Confirmed — Upcoming'}
                  </p>
                </div>
              </div>

              {application.visitData.notes && (
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Notes from PAHA</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{application.visitData.notes}</p>
                </div>
              )}
            </div>

            {/* What to prepare — useful guidance while the visit is upcoming */}
            {!application.visitData.completedAt && !hasVisited && (
              <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-5">
                <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm">checklist</span>
                  What to Prepare for the Visit
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700 dark:text-slate-300">
                  <li>Have a representative or licensed veterinarian available on-site for the entire visit window.</li>
                  <li>Ensure all posted permits, licenses, and certificates from Section I are visible and up to date.</li>
                  <li>Keep the clinic in its normal operating condition — the inspector evaluates real day-to-day practice.</li>
                  <li>Have your medical records, pharmacy logs, and equipment ready for inspection.</li>
                  <li>Your self-assessment results (Stage 2) are a good preview of what the inspector will check.</li>
                </ul>
              </div>
            )}

            {/* Pointer to results once the visit is done */}
            {(application.visitData.completedAt || hasVisited) && (
              <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/10 p-5 flex items-center justify-between gap-3 flex-wrap">
                <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">task_alt</span>
                  Your site visit is complete. View the inspector's evaluation result in Stage 4.
                </p>
                <button
                  onClick={() => setViewingStage(null)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-emerald-700 transition-all"
                >
                  Go to Stage 4
                </button>
              </div>
            )}
          </div>
        )}

        {/* Banned — 3 failed site visits. Blocks everything until the 3-month
            ban lifts; once expired, falls through to the same resubmit-LOI
            panel used for a rejected LOI so they can start fresh. */}
        {viewingStage === null && currentStatus === 'accreditation_banned' && (() => {
          const bannedUntilDate = application?.bannedUntil ? new Date(application.bannedUntil) : null;
          const stillBanned = bannedUntilDate ? Date.now() < bannedUntilDate.getTime() : true;
          if (!stillBanned) return null;
          return (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-red-300 dark:border-red-700 space-y-4">
              <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 flex items-start gap-3">
                <span className="material-symbols-outlined text-3xl text-red-500 shrink-0">block</span>
                <div>
                  <h2 className="text-lg font-bold text-red-700 dark:text-red-300">Accreditation Application Banned</h2>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    Your clinic has failed 3 site visits. You are banned from applying for accreditation until{' '}
                    <strong>{bannedUntilDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>.
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Rejected LOI — resubmit in place on the SAME application document
            (no new entry created). Stage goes back to 2 with the checklist
            still locked once resubmitted; repeats every time the admin rejects. */}
        {viewingStage === null && (application?.status === 'rejected' || (currentStatus === 'accreditation_banned' && application?.bannedUntil && Date.now() >= new Date(application.bannedUntil).getTime())) && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-6">
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700">
              <p className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <span className="material-symbols-outlined text-base">cancel</span>
                Your Letter of Intent was not approved.
              </p>
              {application.rejectionReason && (
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Reason: {application.rejectionReason}</p>
              )}
              <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">Review the details below, replace the PDF if needed, then resubmit for another review.</p>
            </div>

            <h2 className="text-xl font-bold text-[#1E3A8A] dark:text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563EB]">edit_document</span>
              Letter of Intent — Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Representative Name', value: application.loiData?.representativeName },
                { label: 'Title', value: application.loiData?.representativeTitle },
                { label: 'PRC License No.', value: application.loiData?.prcLicenseNo },
                { label: 'Clinic Name', value: application.loiData?.clinicName },
                { label: 'Email', value: application.loiData?.email },
                { label: 'Phone', value: cleanPhone(application.loiData?.phone) },
                { label: 'Reference No.', value: application.loiData?.loiRef },
              ].map((f, i) => (
                <div key={i} className="p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white">{f.value || '—'}</p>
                </div>
              ))}
              <div className="md:col-span-2 p-4 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1">Clinic Address</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">{application.loiData?.clinicAddress || '—'}</p>
              </div>
            </div>

            {/* Replace LOI PDF (optional) */}
            <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB] text-sm">upload_file</span>
                Replace LOI PDF <span className="text-xs font-normal text-slate-400 ml-1">— Optional, only if the document needs fixing</span>
              </label>
              {loiPdfFile ? (
                <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                  <span className="material-symbols-outlined text-[#2563EB]">picture_as_pdf</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{loiPdfFile.name}</p>
                    <p className="text-xs text-slate-500">{(loiPdfFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button type="button" onClick={() => setLoiPdfFile(null)} className="text-red-500 hover:text-red-700 transition-colors">
                    <span className="material-symbols-outlined text-sm">delete</span>
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-3 cursor-pointer px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <span className="material-symbols-outlined text-slate-400">description</span>
                  <span className="text-sm text-slate-500">{application.loiPdfUrl ? 'Click to replace the existing PDF' : 'Click to select PDF file'}</span>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => { if (e.target.files?.[0]) setLoiPdfFile(e.target.files[0]); }}
                  />
                </label>
              )}
            </div>

            <button
              onClick={handleResubmitLOI}
              disabled={submitting || loiPdfUploading}
              className="w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 bg-[#2563EB] text-white shadow-xl shadow-blue-500/30 hover:bg-[#1E3A8A] disabled:opacity-50"
            >
              {(submitting || loiPdfUploading) ? (
                <>
                  <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4"></span>
                  {loiPdfUploading ? 'Uploading PDF...' : 'Resubmitting...'}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">refresh</span>
                  Resubmit Letter of Intent
                </>
              )}
            </button>
          </div>
        )}

        {/* Show active stage content only when not reviewing a past stage. */}
        {viewingStage === null && !application && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700">
            <h2 className="text-2xl font-bold text-[#1E3A8A] dark:text-white mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-[#2563EB]">edit_document</span>
              Stage 1: Submit Letter of Intent
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Initiate your PAHA accreditation process by submitting a Letter of Intent.
            </p>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="pipeline-repName" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Representative Name *</label>
                  {reps.length > 0 ? (
                    <select
                      id="pipeline-repName"
                      value={reps.find(r => r.name === loiForm.representativeName)?.id || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === 'custom') {
                          setLoiForm(prev => ({
                            ...prev,
                            representativeName: '',
                            representativeTitle: '',
                            prcLicenseNo: '',
                          }));
                        } else {
                          const selectedRep = reps.find(r => r.id === val);
                          if (selectedRep) {
                            setLoiForm(prev => ({
                              ...prev,
                              representativeName: selectedRep.name,
                              representativeTitle: selectedRep.designation,
                              prcLicenseNo: selectedRep.prc || '',
                            }));
                          }
                        }
                      }}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                    >
                      <option value="">-- Select Representative --</option>
                      {reps.map(rep => (
                        <option key={rep.id} value={rep.id}>{rep.name} ({rep.isPrimary ? 'Primary' : 'Rep'})</option>
                      ))}
                      <option value="custom">-- Custom Representative (Type below) --</option>
                    </select>
                  ) : (
                    <input
                      id="pipeline-repName"
                      type="text"
                      value={loiForm.representativeName}
                      onChange={(e) => setLoiForm(prev => ({ ...prev, representativeName: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                      placeholder="Type Representative Name"
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="pipeline-repTitle" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Representative Title *</label>
                  {reps.length > 0 && reps.find(r => r.name === loiForm.representativeName) ? (
                    <select
                      id="pipeline-repTitle"
                      value={loiForm.representativeTitle}
                      onChange={(e) => setLoiForm(prev => ({ ...prev, representativeTitle: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                    >
                      <option value={loiForm.representativeTitle}>{loiForm.representativeTitle}</option>
                      {Array.from(new Set(reps.map(r => r.designation))).filter(d => d !== loiForm.representativeTitle).map((desc, idx) => (
                        <option key={idx} value={desc}>{desc}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="pipeline-repTitle"
                      type="text"
                      value={loiForm.representativeTitle}
                      onChange={(e) => setLoiForm(prev => ({ ...prev, representativeTitle: e.target.value }))}
                      className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                      placeholder="Type Representative Title"
                    />
                  )}
                </div>
                <div>
                  <label htmlFor="pipeline-prcLicense" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">PRC License No. *</label>
                  <input
                    type="text"
                    id="pipeline-prcLicense"
                    required
                    value={loiForm.prcLicenseNo}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setLoiForm(prev => ({ ...prev, prcLicenseNo: cleaned }));
                    }}
                    onBlur={() => {
                      if (loiForm.prcLicenseNo && loiForm.prcLicenseNo.length < 6) {
                        setLoiForm(prev => ({
                          ...prev,
                          prcLicenseNo: prev.prcLicenseNo.padStart(6, '0')
                        }));
                      }
                    }}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 text-sm font-medium"
                    placeholder="PRC License No."
                  />
                </div>
                <div>
                  <label htmlFor="pipeline-clinicName" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Clinic Name *</label>
                  <input
                    id="pipeline-clinicName"
                    type="text"
                    value={loiForm.clinicName}
                    onChange={(e) => setLoiForm(prev => ({ ...prev, clinicName: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label htmlFor="pipeline-clinicAddress" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block flex items-center gap-2">
                    Clinic Address *
                    <span className="text-[9px] font-semibold text-slate-400 normal-case tracking-normal bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">Auto-filled from profile</span>
                  </label>
                  <input
                    id="pipeline-clinicAddress"
                    type="text"
                    value={loiForm.clinicAddress}
                    readOnly
                    disabled
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 cursor-not-allowed outline-none"
                  />
                  {!loiForm.clinicAddress && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">warning</span>
                      No clinic address found. Please update your profile first.
                    </p>
                  )}
                </div>
                <div>
                  <label htmlFor="pipeline-email" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Email *</label>
                  <input
                    id="pipeline-email"
                    type="email"
                    value={loiForm.email}
                    onChange={(e) => setLoiForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="pipeline-phone" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1 block">Phone *</label>
                  <div className="relative flex items-center w-full">
                    <div className="absolute left-3 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400 select-none pointer-events-none">
                      <svg viewBox="0 0 30 20" className="w-5 h-3.5 rounded-sm shadow-sm shrink-0 border border-slate-200/20" aria-hidden="true">
                          <rect width="30" height="20" fill="#f5f5f5"/>
                          <rect width="30" height="10" fill="#0038A8"/>
                          <rect y="10" width="30" height="10" fill="#CE1126"/>
                          <path d="M0,0 L17.32,10 L0,20 Z" fill="#FFFFFF"/>
                          <circle cx="5.77" cy="10" r="2" fill="#FCD116"/>
                          <polygon points="5.77,8.2 6.1,8.9 6.8,8.9 6.3,9.3 6.5,10 6,9.6 5.5,10 5.7,9.3 5.2,8.9 5.9,8.9" fill="#FCD116"/>
                          <polygon points="1.5,4.5 1.7,5.0 2.2,5.0 1.8,5.3 1.9,5.8 1.5,5.5 1.1,5.8 1.2,5.3 0.8,5.0 1.3,5.0" fill="#FCD116"/>
                          <polygon points="1.5,15.5 1.7,16.0 2.2,16.0 1.8,16.3 1.9,16.8 1.5,16.5 1.1,16.8 1.2,16.3 0.8,16.0 1.3,16.0" fill="#FCD116"/>
                      </svg>
                      <span className="font-semibold">+63</span>
                    </div>
                    <input
                      id="pipeline-phone"
                      type="tel"
                      value={loiForm.phone ? (loiForm.phone.startsWith('+63') ? loiForm.phone.slice(3) : loiForm.phone.startsWith('63') && loiForm.phone.length === 12 ? loiForm.phone.slice(2) : loiForm.phone.startsWith('0') && loiForm.phone.length === 11 ? loiForm.phone.slice(1) : loiForm.phone) : ''}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                        setLoiForm(prev => ({ ...prev, phone: cleaned }));
                      }}
                      className="w-full pl-16 pr-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* LOI PDF Upload */}
              <div className="p-4 border-2 border-dashed border-slate-200 dark:border-slate-600 rounded-xl">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563EB] text-sm">upload_file</span>
                  Upload Letter of Intent (PDF) <span className="text-xs font-normal text-slate-400 ml-1">— Optional but recommended</span>
                </label>
                {loiPdfFile ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700">
                    <span className="material-symbols-outlined text-[#2563EB]">picture_as_pdf</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">{loiPdfFile.name}</p>
                      <p className="text-xs text-slate-500">{(loiPdfFile.size / 1024).toFixed(1)} KB</p>
                    </div>
                    <button type="button" onClick={() => setLoiPdfFile(null)} className="text-red-500 hover:text-red-700 transition-colors">
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                ) : (
                  <label className="flex items-center gap-3 cursor-pointer px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                    <span className="material-symbols-outlined text-slate-400">description</span>
                    <span className="text-sm text-slate-500">Click to select PDF file</span>
                    <input
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={(e) => { if (e.target.files?.[0]) setLoiPdfFile(e.target.files[0]); }}
                    />
                  </label>
                )}
              </div>

              <div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={loiForm.declarationChecked}
                    onChange={(e) => setLoiForm(prev => ({ ...prev, declarationChecked: e.target.checked }))}
                    className="size-5 rounded border-slate-300 text-[#2563EB] mt-0.5"
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    I certify that our clinic has completed the self-assessment and is ready for PAHA accreditation inspection.
                    All information provided is true and accurate.
                  </span>
                </label>
              </div>

              <button
                onClick={handleSubmitLOI}
                disabled={!canSubmitLOI || submitting || loiPdfUploading}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  canSubmitLOI && !submitting && !loiPdfUploading
                    ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-500/30 hover:bg-[#1E3A8A]'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {(submitting || loiPdfUploading) ? (
                  <>
                    <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4"></span>
                    {loiPdfUploading ? 'Uploading PDF...' : 'Submitting...'}
                  </>
                ) : (
                  <>Submit Letter of Intent</>
                )}
              </button>
            </div>
          </div>
        )}

        {viewingStage === null && application?.stage === 2 && currentStatus === 'intent_submitted' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-3xl p-4 md:p-5 flex items-start gap-4">
            <span className="material-symbols-outlined text-2xl text-amber-500 shrink-0 mt-0.5">schedule</span>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">LOI Submitted — Awaiting Admin Review</p>
              <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                Reference: <span className="font-mono font-bold">{application.loiData?.loiRef}</span>
                &nbsp;· The self-assessment checklist unlocks once PAHA approves your Letter of Intent.
              </p>
            </div>
          </div>
        )}

        {viewingStage === null && application?.stage === 2 && currentStatus === 'intent_resubmitted' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-3xl p-4 md:p-5 flex items-start gap-4">
            <span className="material-symbols-outlined text-2xl text-amber-500 shrink-0 mt-0.5">schedule</span>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">LOI Resubmitted — Awaiting Admin Review</p>
              <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                Reference: <span className="font-mono font-bold">{application.loiData?.loiRef}</span>
                &nbsp;· The self-assessment checklist unlocks once PAHA approves your Letter of Intent.
              </p>
            </div>
          </div>
        )}

        {viewingStage === null && application?.stage === 2 && currentStatus === 'loi_approved' && (
          <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-3xl p-4 md:p-5 flex items-start gap-4">
            <span className="material-symbols-outlined text-2xl text-emerald-500 shrink-0 mt-0.5">check_circle</span>
            <div>
              <p className="font-bold text-emerald-800 dark:text-emerald-300 text-sm">Letter of Intent Approved</p>
              <p className="text-emerald-700 dark:text-emerald-400 text-xs mt-0.5">
                Please complete the self-assessment checklist below to proceed.
              </p>
            </div>
          </div>
        )}

        {viewingStage === null && application?.stage === 2 && currentStatus === 'self_assessment_completed' && !retakingAssessment && !application.visitData && !application.loiData?.preferredVisitDates?.length && (
          <div className="space-y-6">
            {(() => {
              const gaps = computeGapSummary(STANDARD_2026, checkedItems);
              if (gaps.length === 0) return null;
              return (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-2xl text-amber-500 shrink-0">warning</span>
                    <div>
                      <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Self-Assessment Still Has Gaps</p>
                      <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
                        {gaps.length} section{gaps.length !== 1 ? 's' : ''} still need attention. You can proceed as-is, or retake the self-assessment before scheduling your site visit.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => { setRetakingAssessment(true); setViewingStage(2); }}
                    className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider transition-all"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    Retake Self-Assessment
                  </button>
                </div>
              );
            })()}
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">event</span>
                Submit Preferred Site Visit Dates
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
                Self-assessment complete. Give PAHA 3 preferred dates for your site visit — an admin will confirm one of them (or propose an alternate if none work).
              </p>

              <div>
                <label className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3 block">
                  Preferred Site Visit Dates (3 dates required) *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visitDates.map((date, idx) => (
                    <div key={idx}>
                      <label htmlFor={`pipeline-visitDate-${idx}`} className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date {idx + 1}</label>
                      <CalendarPicker
                        id={`pipeline-visitDate-${idx}`}
                        value={date}
                        onChange={(val) => {
                          const newErrors = [...visitDateErrors];

                          if (val && val <= todayStr) {
                            // Past date or today — reject, keep the field as-is
                            newErrors[idx] = 'Today or past dates cannot be selected.';
                            setVisitDateErrors(newErrors);
                            return;
                          }

                          if (val && visitDates.some((d, i) => i !== idx && d === val)) {
                            newErrors[idx] = 'This date is already selected for another slot.';
                            setVisitDateErrors(newErrors);
                            return;
                          }

                          if (val && usedVisitDates.includes(val)) {
                            newErrors[idx] = 'This date was already offered before — please pick a different one.';
                            setVisitDateErrors(newErrors);
                            return;
                          }

                          newErrors[idx] = '';
                          setVisitDateErrors(newErrors);
                          const newDates = [...visitDates];
                          newDates[idx] = val;
                          setVisitDates(newDates);
                        }}
                      />
                      {visitDateErrors[idx] && (
                        <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">error</span>
                          {visitDateErrors[idx]}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSubmitVisitDates}
                disabled={!canSubmitVisitDates || submitting}
                className={`w-full mt-6 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  canSubmitVisitDates && !submitting
                    ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-500/30 hover:bg-[#1E3A8A]'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4"></span>
                    Submitting...
                  </>
                ) : (
                  <>Submit Preferred Dates</>
                )}
              </button>
            </div>
          </div>
        )}

        {viewingStage === null && application?.stage === 2 && currentStatus === 'self_assessment_completed' && !application.visitData && !!application.loiData?.preferredVisitDates?.length && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
            <div className="size-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-amber-500">schedule</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Awaiting Site Visit Schedule</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              PAHA is reviewing your preferred dates. You will be notified once a site visit schedule has been confirmed.
            </p>
          </div>
        )}

        {viewingStage === null && currentStatus === 'visit_date_proposed' && application?.visitData?.adminProposedDate && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-amber-200 dark:border-amber-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500">event</span>
                New Site Visit Date Proposed
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-4 text-sm">
                None of your preferred dates worked for the PAHA inspector. Please review and respond to the date below.
              </p>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-6 border border-amber-200 dark:border-amber-800 text-center mb-6">
                <p className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-1">Proposed Date</p>
                <p className="text-2xl font-bold text-slate-800 dark:text-white">
                  {new Date(application.visitData.adminProposedDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>
              {!(showDateProposalDeclined || application.visitData?.proposalDeclinedAt) ? (
                <div className="flex gap-3">
                  <button
                    onClick={handleAcceptProposedDate}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">check_circle</span>
                    Accept This Date
                  </button>
                  <button
                    onClick={handleDeclineProposedDate}
                    disabled={submitting}
                    className="flex-1 py-3 rounded-xl border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-300 font-bold text-sm hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors disabled:opacity-50"
                  >
                    I'm Unavailable
                  </button>
                </div>
              ) : (
                <div className="p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl flex items-start gap-3">
                  <span className="material-symbols-outlined text-rose-500 shrink-0">chat</span>
                  <p className="text-sm text-rose-700 dark:text-rose-300 font-semibold">
                    Message the Admin via Chatbox for rescheduling the visitation — use the chat button in the bottom-right corner to coordinate a new date directly with PAHA.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewingStage === null && application?.visitData?.scheduledDate && !application.visitData.completedAt && !hasVisited && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">event_available</span>
                Site Visit Scheduled
              </h2>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                    <p className="font-bold text-slate-800 dark:text-white text-lg">
                      {new Date(application.visitData.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                    <p className="font-bold text-slate-800 dark:text-white text-lg">
                      {(() => {
                        const t = application.visitData!.scheduledTime;
                        if (!t) return 'Expect site visit from 9:00 AM - 3:00 PM';
                        const parsed = new Date(`2000-01-01T${t}`);
                        return isNaN(parsed.getTime())
                          ? 'Expect site visit from 9:00 AM - 3:00 PM'
                          : parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">PAHA Inspector</label>
                    <p className="font-bold text-slate-800 dark:text-white">{application.visitData.inspectorName}</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                    <p className="font-bold text-emerald-600">Confirmed</p>
                  </div>
                </div>
                {application.visitData.notes && (
                  <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Notes</label>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{application.visitData.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Site visit did not pass — show the remarks + exactly which standard
            sections/items still need to comply, plus a member-initiated
            "Request Revisit" action once they're ready (mirrors the LOI's
            preferred-date flow); status flips back to "for_site_visit". */}
        {viewingStage === null && currentStatus === 'vef_failed' && (() => {
          const forms = application?.visitingEvaluationForms || [];
          const latestVefFail = [...forms].sort((a, b) => b.version - a.version)[0];
          const failGaps = latestVefFail?.checkedItems ? computeGapSummary(STANDARD_2026, latestVefFail.checkedItems) : [];
          return (
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-5">
              {/* Request for Revisit — top of the card, large and prominent */}
              {!showRevisitDateInput ? (
                <button
                  onClick={() => setShowRevisitDateInput(true)}
                  className="w-full inline-flex items-center justify-center gap-3 px-6 py-5 rounded-2xl bg-rose-600 text-white text-base font-bold uppercase tracking-wider hover:bg-rose-700 transition-all shadow-lg shadow-rose-600/20"
                >
                  <span className="material-symbols-outlined text-2xl">event_repeat</span>
                  Request for Revisit
                </button>
              ) : (
                <div className="rounded-2xl border-2 border-rose-300 dark:border-rose-700 bg-rose-50/50 dark:bg-rose-900/10 p-5 space-y-4">
                  <p className="text-sm font-bold text-rose-700 dark:text-rose-300">Preferred Revisit Dates (3 required)</p>
                  <p className="text-[11px] text-rose-500 dark:text-rose-400">Dates already offered in a previous round can't be reused — pick 3 fresh dates.</p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {revisitDates.map((date, idx) => {
                      const errorMsg = revisitDateErrors[idx];
                      return (
                        <div key={idx}>
                          <label htmlFor={`pipeline-revisit-date-${idx}`} className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-widest block mb-1">Date {idx + 1}</label>
                          <CalendarPicker
                            id={`pipeline-revisit-date-${idx}`}
                            value={date}
                            onChange={val => {
                              const newErrors = [...revisitDateErrors];
                              if (val && val <= todayStr) {
                                newErrors[idx] = 'Today or past dates cannot be selected.';
                                setRevisitDateErrors(newErrors);
                                return;
                              }
                              if (val && usedVisitDates.includes(val)) {
                                newErrors[idx] = 'Already used in a previous round — pick a different date.';
                                setRevisitDateErrors(newErrors);
                                return;
                              }
                              if (val && revisitDates.some((d, i) => i !== idx && d === val)) {
                                newErrors[idx] = 'Already picked for another slot.';
                                setRevisitDateErrors(newErrors);
                                return;
                              }
                              newErrors[idx] = '';
                              setRevisitDateErrors(newErrors);
                              const next = [...revisitDates];
                              next[idx] = val;
                              setRevisitDates(next);
                            }}
                          />
                          {errorMsg && (
                            <p className="text-[11px] text-red-500 font-semibold mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-xs">error</span>
                              {errorMsg}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setShowRevisitDateInput(false); setRevisitDates(['', '', '']); setRevisitDateErrors(['', '', '']); }} className="flex-1 py-3 text-xs font-bold rounded-xl border border-rose-200 dark:border-rose-700 text-rose-600 dark:text-rose-300 hover:bg-rose-100/50 dark:hover:bg-rose-900/20 transition-colors">Cancel</button>
                    <button
                      onClick={handleRequestRevisit}
                      disabled={
                        revisitDates.filter(d => d).length !== 3 ||
                        submitting ||
                        revisitDates.some(d => d && usedVisitDates.includes(d)) ||
                        new Set(revisitDates.filter(d => d)).size !== revisitDates.filter(d => d).length
                      }
                      className="flex-1 py-3 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors disabled:opacity-40"
                    >
                      {submitting ? 'Submitting...' : 'Confirm Request'}
                    </button>
                  </div>
                </div>
              )}

              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-700">
                <p className="text-sm font-bold text-rose-700 dark:text-rose-300 flex items-center gap-2">
                  <span className="material-symbols-outlined text-base">cancel</span>
                  Your site visit did not pass.
                </p>
                {latestVefFail?.failRemarks && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2 whitespace-pre-wrap">{latestVefFail.failRemarks}</p>
                )}
                <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                  Once you've addressed the items below, request a revisit and PAHA will confirm the schedule.
                </p>
              </div>

              {failGaps.length > 0 && (
                <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">checklist</span>
                    What You Need to Comply Before the Revisit ({failGaps.length} section{failGaps.length !== 1 ? 's' : ''})
                  </p>
                  <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                    {failGaps.map(g => (
                      <li key={g.sectionId} className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-amber-500 text-base shrink-0">chevron_right</span>
                        <span>
                          <strong>{g.sectionId}</strong>
                          {g.missingCompulsory.length > 0 && <> — missing: {g.missingCompulsory.join(', ')}</>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {application?.visitData?.scheduledDate && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Original Visit Date</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">
                    {new Date(application.visitData.scheduledDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Revisit requested — waiting for admin to approve one of the
            proposed dates. */}
        {viewingStage === null && currentStatus === 'revisit_requested' && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 space-y-5">
            <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700 flex items-start gap-3">
              <span className="material-symbols-outlined text-2xl text-amber-500 shrink-0">schedule</span>
              <div>
                <p className="font-bold text-amber-800 dark:text-amber-300 text-sm">Revisit Requested — Awaiting Approval</p>
                <p className="text-amber-700 dark:text-amber-400 text-xs mt-1">PAHA is reviewing your preferred dates and will confirm the schedule shortly.</p>
              </div>
            </div>
            {application?.visitData?.preferredRevisitDates && application.visitData.preferredRevisitDates.length > 0 && (
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Your Preferred Dates</p>
                <div className="flex flex-wrap gap-3">
                  {application.visitData.preferredRevisitDates.map((d, i) => (
                    <div key={i} className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
                      <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">Option {i + 1}</p>
                      <p className="text-sm font-bold text-amber-700 dark:text-amber-300">{new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {viewingStage === null && application?.stage === 2 && (currentStatus === 'intent_submitted' || currentStatus === 'intent_resubmitted' || currentStatus === 'loi_approved') && !application.visitData && (() => {
          // Compute overall progress
          const allItems = ASSESSMENT_CATEGORIES.flatMap(cat =>
            cat.items ? cat.items : cat.subCategories?.flatMap(s => s.items) ?? []
          );
          const totalItems = allItems.length;
          const checkedCount = allItems.filter(i => checkedItems[i.id]).length;
          const overallPct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;
          const passedCategories = Object.values(categoryStats).filter(s => s.passed).length;
          const totalCategories = Object.keys(categoryStats).length;
          // Locked until admin approves the Letter of Intent — checking items
          // before that point isn't meaningful since the application hasn't
          // even been accepted for a site visit yet. This block only ever
          // renders pre-submission — retaking an already-submitted self-assessment
          // happens inline in the Stage 2 review panel instead (viewingStage === 2).
          const isLocked = currentStatus === 'intent_submitted' || currentStatus === 'intent_resubmitted';
          const isReadOnly = isLocked;

          return (
            <div className="space-y-4">

            {/* ── CONTENT CARD ── */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              {/* Header */}
              <div className="bg-[#1E3A8A] dark:bg-[#1e3a8a] px-8 py-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">Stage 2</p>
                    <h2 className="text-2xl font-bold text-white">Self-Assessment Checklist</h2>
                    <p className="text-blue-200 text-sm mt-1">
                      Check all items your clinic currently meets. Required items are marked <span className="text-red-300 font-bold">*</span>.
                    </p>
                  </div>
                  {isLocked && (
                    <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/30 text-amber-300 px-4 py-2 rounded-xl text-sm font-bold">
                      <span className="material-symbols-outlined text-base">lock</span>
                      Locked
                    </div>
                  )}
                </div>
                {isLocked && (
                  <div className="mt-4 bg-amber-500/10 border border-amber-400/20 rounded-xl px-4 py-3 flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-300 text-lg shrink-0">info</span>
                    <p className="text-amber-100 text-xs leading-relaxed">
                      This checklist is locked until PAHA approves your Letter of Intent. You can preview the requirements below, but items can't be checked yet.
                    </p>
                  </div>
                )}

                {/* Overall Progress */}
                <div className="bg-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-bold text-sm">Overall Completion</span>
                    <div className="flex items-center gap-4">
                      <span className="text-blue-200 text-xs">{checkedCount} / {totalItems} items</span>
                      <span className="text-white font-black text-lg">{overallPct}%</span>
                    </div>
                  </div>
                  <div className="h-3 bg-white/20 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-400 to-emerald-400 rounded-full transition-all duration-500"
                      style={{ width: `${overallPct}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-3 text-xs text-blue-200">
                    <span>{passedCategories} of {totalCategories} sections passing</span>
                    <span className={overallPct === 100 ? 'text-emerald-300 font-bold' : ''}>
                      {overallPct === 100 ? '✓ All items checked' : `${totalItems - checkedCount} remaining`}
                    </span>
                  </div>
                </div>
              </div>

              {/* 2026 Standard — shared accordion checklist + gap summary */}
              <div className="p-6 md:p-8">
                <AccreditationChecklist
                  standard={STANDARD_2026}
                  mode="self-assessment"
                  value={checkedItems}
                  onChange={(next: Record<string, boolean>) => { if (!isReadOnly) setCheckedItems(next); }}
                  readOnly={isReadOnly}
                  showGapSummary
                />
              </div>

            </div>{/* end content card */}

            {/* ── Submit ── */}
            <div className="flex items-center justify-end gap-3 px-1">
              {!isReadOnly ? (
                <button onClick={handleSubmitSelfAssessment} disabled={submitting}
                  className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-all shadow-lg disabled:opacity-50"
                >
                  {submitting ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">send</span>}
                  {submitting ? 'Submitting...' : 'Submit Assessment'}
                </button>
              ) : isLocked ? (
                <div className="flex items-center gap-2 px-5 py-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-200 dark:border-amber-700 rounded-xl font-bold text-sm">
                  <span className="material-symbols-outlined text-base">lock</span>Locked — awaiting LOI approval
                </div>
              ) : (
                <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-200 dark:border-emerald-700 rounded-xl font-bold text-sm">
                  <span className="material-symbols-outlined text-base">check_circle</span>Submitted
                </div>
              )}
            </div>

            </div>
          );
        })()}


        {(viewingStage === 4 || (viewingStage === null && (currentStatus === 'for_compliance_submission' || (hasVisited && (currentStatus === 'for_site_visit' || currentStatus === 'inspection_completed'))))) && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700">
              <h2 className="text-2xl font-bold text-[#1E3A8A] dark:text-white mb-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#2563EB]">folder_open</span>
                Stage 4: Compliance Submission
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Upload your required business documents and the documents per category. Admin will review your submission.
              </p>

              {/* ── Section: Business Documents (uploaded during Membership onboarding) ── */}
              <div className="mb-8">
                <div className="flex items-center gap-2 mb-1">
                  <span className="size-7 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">3</span>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-white uppercase tracking-wider">Business Documents</h3>
                </div>
                <p className="text-xs text-slate-400 mb-5 ml-9">
                  These were already uploaded in your Membership onboarding. To add or replace a file, go to <strong>Membership</strong> in the sidebar.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MEMBERSHIP_DOCUMENTS
                    .filter(mdoc => (REQS_BY_BUSINESS_TYPE[(profile as any)?.businessType] || []).includes(mdoc.id))
                    .map(mdoc => {
                    // Check the current onboarding-doc location first, then fall back to the
                    // legacy application-side field in case an older upload was written there
                    // before that path was retired — otherwise a genuinely uploaded file (e.g.
                    // the walkthrough video) can falsely show as "Missing".
                    const uploaded: UploadedFile[] = (profile as any)?.membershipDocuments?.[mdoc.id]?.length
                      ? (profile as any).membershipDocuments[mdoc.id]
                      : ((application as any)?.membershipDocuments?.[mdoc.id] || []);
                    const done = uploaded.length > 0;
                    return (
                      <div key={mdoc.id} className={`rounded-2xl border p-4 flex flex-col ${done ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/40 dark:bg-emerald-900/10' : 'border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-900/10'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-snug">
                            {mdoc.label}
                          </p>
                          <span className={`shrink-0 text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'}`}>
                            {done ? 'Uploaded' : 'Missing'}
                          </span>
                        </div>
                        {mdoc.note && <p className="text-[11px] text-[#2563EB] italic mt-0.5 mb-2 leading-snug">Note: {mdoc.note}</p>}

                        {done ? (
                          <div className="space-y-1.5 my-2">
                            {uploaded.map((file, idx) => (
                              <button key={idx} onClick={() => setViewerFile({ url: file.url, name: file.name })} className="w-full flex items-center gap-2 p-2 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 dark:border-emerald-800 hover:border-[#2563EB] transition-colors text-left">
                                <span className="material-symbols-outlined text-emerald-500 text-sm shrink-0">check_circle</span>
                                <span className="text-xs font-medium truncate text-slate-700 dark:text-slate-200 flex-1">{file.name}</span>
                                <span className="material-symbols-outlined text-slate-400 text-sm shrink-0">visibility</span>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-1">
                            Not yet uploaded — go to Membership to complete this requirement.
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Section: Site Visit Evaluation Result (from the PAHA inspector's VEF) ── */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="size-7 rounded-full bg-[#2563EB] text-white text-xs flex items-center justify-center font-bold flex-shrink-0">4</span>
                  <h3 className="text-sm font-bold text-slate-700 dark:text-white uppercase tracking-wider">Site Visit Evaluation Result</h3>
                </div>
                <p className="text-xs text-slate-400 mb-5 ml-9">
                  Scored directly by the PAHA inspector during your site visit against the 2026 Accreditation Standard — no further action needed from you here.
                </p>

                {!latestVef ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
                    <span className="material-symbols-outlined text-3xl text-slate-300 dark:text-slate-600 mb-2 block">hourglass_empty</span>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Awaiting the inspector's evaluation result.</p>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <div className={`px-5 py-4 flex flex-wrap items-center justify-between gap-3 ${latestVef.verdict === 'passed' || latestVef.result === 'Passed' ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                      <div>
                        <p className={`text-xs font-black uppercase tracking-widest ${latestVef.verdict === 'passed' || latestVef.result === 'Passed' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}`}>
                          Overall Result: {(latestVef.verdict || latestVef.result).toString().toUpperCase()}
                          {latestVef.adminOverride && <span className="ml-2 font-semibold normal-case">(Overridden — {latestVef.adminOverride.remarks})</span>}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Visited {new Date(latestVef.dateVisited + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                      </div>
                      <a
                        href={latestVef.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563EB] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#1E3A8A] transition-all shadow-md shadow-blue-500/20"
                      >
                        <span className="material-symbols-outlined text-base">download</span>
                        Download PDF Result
                      </a>
                    </div>

                    {latestVef.sections && latestVef.sections.length > 0 && (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {latestVef.sections.map(sr => {
                          const section = STANDARD_2026.find(s => s.id === sr.sectionId);
                          if (!section) return null;
                          const total = sectionTotalPoints(section);
                          return (
                            <div key={sr.sectionId} className="px-5 py-3 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <span className={`size-2.5 rounded-full shrink-0 ${sr.passed ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">{section.id}. {section.title}</span>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                {section.scored && total > 0 && (
                                  <span className="text-xs font-bold text-slate-400">{Math.round(sr.earnedPoints)}/{Math.round(total)}</span>
                                )}
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${sr.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'}`}>
                                  {sr.passed ? 'Pass' : 'Fail'}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {latestVef && currentStatus !== 'under_review' && currentStatus !== 'needs_compliance' && (() => {
                // A failed site visit must never proceed forward — only a
                // PASSED result unlocks moving on to admin review.
                const vefPassed = latestVef.verdict ? latestVef.verdict === 'passed' : latestVef.result === 'Passed';
                return (
                  <>
                    <button
                      onClick={handleProceedToReview}
                      disabled={submitting || !vefPassed}
                      title={!vefPassed ? 'Your site visit did not pass — request a revisit before proceeding.' : undefined}
                      className="w-full mt-6 py-4 rounded-xl font-bold bg-[#2563EB] text-white shadow-xl shadow-blue-500/30 hover:bg-[#1E3A8A] transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {submitting ? (
                        <>
                          <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4"></span>
                          Proceeding...
                        </>
                      ) : (
                        <>
                          Next
                          <span className="material-symbols-outlined text-base">arrow_forward</span>
                        </>
                      )}
                    </button>
                    {!vefPassed && (
                      <p className="text-xs text-red-600 dark:text-red-400 font-semibold text-center mt-2">
                        Your site visit did not pass — go to Stage 3 to request a revisit before proceeding.
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

        {(viewingStage === 5 || (viewingStage === null && (currentStatus === 'under_review' || currentStatus === 'needs_compliance'))) && (
          <div className="space-y-6">
            {currentStatus === 'needs_compliance' ? (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-2xl font-bold text-[#1E3A8A] dark:text-white mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#2563EB]">rate_review</span>
                  Stage 5: Admin Review
                </h2>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800 space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-xl text-red-500 shrink-0">error</span>
                    <div>
                      <p className="font-bold text-red-700 dark:text-red-300 text-sm">Application Declined</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        {(application as any)?.complianceRejectionReason || 'Please contact PAHA for details on next steps.'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleResubmitFinalReview}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700 transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-base">refresh</span>
                    {submitting ? 'Resubmitting...' : 'Resubmit Application'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
                <div className="size-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-purple-500">hourglass_empty</span>
                </div>
                <h2 className="text-2xl font-bold text-[#1E3A8A] dark:text-white mb-2">Stage 5: Admin Review</h2>
                <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  PAHA is finalizing your accreditation review. You will be notified once a decision has been made — no further action is needed from you here.
                </p>
              </div>
            )}
          </div>
        )}

        {viewingStage === null && currentStatus === 'approved' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-emerald-200 dark:border-emerald-800 text-center">
              <div className="size-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-3xl text-emerald-500">verified</span>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Application Approved!</h2>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                Congratulations! All categories have been approved. PAHA will now generate your Statement of Account.
              </p>
            </div>
          </div>
        )}

        {viewingStage === null && currentStatus === 'for_payment' && application && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700">
              <div className="text-center mb-8">
                <div className="size-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-3xl text-emerald-500">celebration</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Payment Required</h2>
                <p className="text-slate-500 dark:text-slate-400">
                  Your clinic has passed all accreditation requirements. Please complete payment to receive your PAHA Accreditation Certificate (valid for {liveAccreditationValidityYears} {liveAccreditationValidityYears === 1 ? 'year' : 'years'}).
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-4">Statement of Account</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Accreditation Fee:</span>
                    <span className="font-bold text-slate-800 dark:text-white">₱{liveAccreditationFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Processing Fee:</span>
                    <span className="font-bold text-slate-800 dark:text-white">₱{liveAccreditationProcessingFee.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                    <span className="font-bold text-slate-800 dark:text-white">Total Due:</span>
                    <span className="font-bold text-lg text-[#2563EB]">
                      ₱{(liveAccreditationFee + liveAccreditationProcessingFee).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="font-bold text-slate-800 dark:text-white mb-3">Payment Methods</h3>
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <p>GCash: 0917-123-4567 (PAHA)</p>
                  <p>Bank Transfer: BDO Account 1234-5678-90</p>
                  <p>Over-the-counter at PAHA Office</p>
                </div>
              </div>

              <div className="mb-6">
                <label htmlFor="pipeline-paymentProof" className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 block">
                  Upload Proof of Payment *
                </label>
                <div className="relative">
                  <input
                    id="pipeline-paymentProof"
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => e.target.files?.[0] && handlePaymentProofUpload(e.target.files[0])}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center group-hover:border-[#2563EB] group-hover:bg-blue-50/50 transition-all">
                    <span className="material-symbols-outlined text-4xl text-slate-300 group-hover:text-[#2563EB] mb-2 block">
                      cloud_upload
                    </span>
                    <p className="font-bold text-slate-700 dark:text-slate-300">Click to upload or drag & drop</p>
                    <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG — Max 10MB</p>
                  </div>
                </div>
                {paymentPreview && (
                  <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl">
                    <img src={paymentPreview} alt="Payment proof preview" className="max-h-40 mx-auto rounded-lg" />
                    <p className="text-sm text-center text-slate-500 mt-2">{paymentProof?.name}</p>
                  </div>
                )}
              </div>

              <button
                onClick={handleSubmitPayment}
                disabled={!paymentProof || submitting}
                className={`w-full py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  paymentProof && !submitting
                    ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-500/30 hover:bg-[#1E3A8A]'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                }`}
              >
                {submitting ? (
                  <>
                    <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4"></span>
                    Submitting...
                  </>
                ) : (
                  <>Submit Payment</>
                )}
              </button>

              {/* Pay Online via PayCools */}
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-3 font-medium">— or pay securely online —</p>
                <button
                  id="pipeline-pay-online-btn"
                  type="button"
                  onClick={() => {
                    const appId = application?.id || '';
                    window.location.href = `/membership/payment?type=accreditation&appId=${appId}&membershipType=None`;
                  }}
                  className="w-full py-4 rounded-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/30 hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>credit_card</span>
                  Pay Online via PayCools
                </button>
                <p className="text-[11px] text-slate-400 text-center mt-2">GCash · Maya · BPI · Visa · Mastercard</p>
              </div>
            </div>
          </div>
        )}

        {viewingStage === null && currentStatus === 'paid' && application && !application.paymentData?.confirmedAt && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-slate-200 dark:border-slate-700 text-center">
            <div className="size-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-3xl text-amber-500">schedule</span>
            </div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Payment Submitted</h2>
            <p className="text-slate-500 dark:text-slate-400">
              PAHA is verifying your payment. You will be notified once confirmed.
            </p>
          </div>
        )}

        {application?.paymentData?.confirmedAt && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-8 shadow-lg border border-emerald-200 dark:border-emerald-800 text-center">
            <div className="size-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl text-emerald-500">workspace_premium</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-2">Accreditation Complete!</h2>
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              Your PAHA Accreditation Certificate will be issued within 7 business days.
            </p>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800 inline-block">
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                Accreditation No: <span className="font-bold text-lg">{application.paymentData.accreditationNo}</span>
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300">
                Valid Until: <span className="font-bold">{application.paymentData.validUntil ? new Date(application.paymentData.validUntil).toLocaleDateString() : 'N/A'}</span>
              </p>
            </div>
          </div>
        )}

        {showSuccessModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSuccessModal(false)}></div>
            <div className="relative bg-white dark:bg-slate-800 rounded-[32px] p-8 max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-300 text-center border border-slate-200 dark:border-white/10">
              
              {/* Glowing Success Checkmark */}
              <div className="relative size-20 mx-auto mb-6">
                <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping opacity-75"></div>
                <div className="relative size-20 bg-emerald-50 dark:bg-emerald-950/30 rounded-full flex items-center justify-center border-2 border-emerald-500/20">
                  <span className="material-symbols-outlined text-4xl text-emerald-500 font-bold">check_circle</span>
                </div>
              </div>

              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Submission Successful!</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 px-4">
                {refId ? successMessage.split('Reference:')[0].trim() : successMessage}
              </p>

              {/* Reference ID copy card */}
              {refId && (
                <div className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-white/[0.02] border border-slate-150 dark:border-white/5 flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">Reference Number</span>
                  <div className="flex items-center justify-center gap-2">
                    <code className="text-sm font-mono font-bold text-slate-800 dark:text-white select-all">{refId}</code>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(refId);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/5 text-slate-400 hover:text-primary transition-all flex items-center justify-center relative group/copy"
                      title="Copy Reference"
                    >
                      <span className="material-symbols-outlined text-base">{copied ? 'check' : 'content_copy'}</span>
                      {copied && (
                        <span className="absolute bottom-full mb-1 text-[9px] font-bold uppercase tracking-wider bg-slate-900 text-white px-2 py-0.5 rounded-md shadow-md animate-bounce">Copied</span>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Dynamic Next Steps guides */}
              <div className="mb-8 p-4 rounded-2xl bg-primary/5 dark:bg-primary/10 border border-primary/10 text-left flex gap-3">
                <div className="size-8 rounded-xl bg-primary/10 dark:bg-primary/20 shrink-0 flex items-center justify-center text-primary">
                  <span className="material-symbols-outlined text-base">info</span>
                </div>
                <div>
                  <h5 className="text-xs font-bold text-primary uppercase tracking-wider mb-1">What's Next?</h5>
                  <p className="text-[11px] text-slate-650 dark:text-slate-350 leading-relaxed font-medium">
                    {isLoi && "Your Letter of Intent has been recorded. Please close this modal and proceed to Stage 2: Self-Assessment."}
                    {isSelf && "Your assessment checklist has been submitted. Prepare for the facility visit and inspect your medical equipment."}
                    {isDocs && "Documents are under evaluation. Next, upload your Payment Proof in Stage 4 to complete the process."}
                    {isPayment && "Our administrators will verify your payment details and issue your Accreditation Certificate shortly."}
                    {!isLoi && !isSelf && !isDocs && !isPayment && "Please monitor your email for updates regarding your submission status."}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowSuccessModal(false)}
                className="w-full py-4 bg-primary hover:bg-primary/95 text-white rounded-2xl font-bold uppercase tracking-wider text-xs shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
      <FileViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />
    </div>
  );
};

export default AccreditationPipeline;