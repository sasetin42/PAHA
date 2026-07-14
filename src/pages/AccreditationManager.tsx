import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import StageTracker from '../components/StageTracker';
import {
  doc, updateDoc, addDoc, collection, serverTimestamp, onSnapshot, query, orderBy
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notifyAdmin, notifyMember } from '../utils/notify';
import {
  type AccreditationApplication,
  type WorkflowStatus,
  type CategoryStatus,
  type CategoryCompliance,
  type VisitData,
  type PaymentData,
  ACCREDITATION_FEE,
  PROCESSING_FEE,
  TOTAL_FEE,
  WORKFLOW_STATUS_LABELS,
} from '../types/accreditation';
import { ASSESSMENT_CATEGORIES } from '../data/assessmentCategories';
import { getEmbeddableUrl } from '../utils/portalUrl';

const STATUS_FILTER_OPTIONS: { value: WorkflowStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All Applications' },
  { value: 'intent_submitted', label: 'Intent Submitted' },
  { value: 'self_assessment_completed', label: 'Self-Assessment Completed' },
  { value: 'for_site_visit', label: 'For Site Visit' },
  { value: 'inspection_completed', label: 'Inspection Completed' },
  { value: 'for_compliance_submission', label: 'For Compliance Submission' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'needs_compliance', label: 'Needs Compliance' },
  { value: 'approved', label: 'Approved' },
  { value: 'for_payment', label: 'For Payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'accredited', label: 'Accredited' },
];

const AccreditationManager: React.FC = () => {
  const navigate = useNavigate();
  const { isAdmin, profile, adminRole } = useAuth();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const [applications, setApplications] = useState<AccreditationApplication[]>([]);
  const [selectedApp, setSelectedApp] = useState<AccreditationApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'all'>('all');

  const [visitForm, setVisitForm] = useState({
    date: '',
    time: '',
    inspectorName: '',
    notes: '',
  });

  const [categoryReviews, setCategoryReviews] = useState<Record<string, { status: CategoryStatus; remarks: string }>>({});
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [pdfViewerUrl, setPdfViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/admin/login');
      return;
    }

    const q = query(collection(db, 'accreditation_applications'), orderBy('submittedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const apps = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccreditationApplication));
      setApplications(apps);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isAdmin, navigate]);

  useEffect(() => {
    if (selectedApp) {
      const initial: Record<string, { status: CategoryStatus; remarks: string }> = {};
      ASSESSMENT_CATEGORIES.forEach(cat => {
        const compliance = selectedApp.complianceData?.categories?.[cat.id];
        initial[cat.id] = {
          status: compliance?.status || 'pending',
          remarks: compliance?.adminRemarks || '',
        };
      });
      setCategoryReviews(initial);
    }
  }, [selectedApp]);

  const filteredApps = useMemo(() => {
    if (statusFilter === 'all') return applications;
    return applications.filter(app => app.status === statusFilter);
  }, [applications, statusFilter]);

  const handleScheduleVisit = async () => {
    if (!selectedApp || !visitForm.date || !visitForm.time || !visitForm.inspectorName) {
      alert('Please fill in all required fields');
      return;
    }

    const visitData: VisitData = {
      scheduledDate: visitForm.date,
      scheduledTime: visitForm.time,
      inspectorName: visitForm.inspectorName,
      notes: visitForm.notes,
      confirmedAt: new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, 'accreditation_applications', selectedApp.id), {
        stage: 3,
        status: 'for_site_visit',
        visitData,
        updatedAt: serverTimestamp(),
      });

      setSelectedApp(prev => prev ? { ...prev, stage: 3, status: 'for_site_visit', visitData } : null);
      alert('Site visit scheduled successfully!');

      setVisitForm({ date: '', time: '', inspectorName: '', notes: '' });
    } catch (error) {
      console.error('Error scheduling visit:', error);
      alert('Failed to schedule visit');
    }
  };

  const handleCompleteInspection = async () => {
    if (!selectedApp) return;

    try {
      await updateDoc(doc(db, 'accreditation_applications', selectedApp.id), {
        'visitData.completedAt': new Date().toISOString(),
        stage: 4,
        status: 'for_compliance_submission',
        updatedAt: serverTimestamp(),
      });

      setSelectedApp(prev => prev ? {
        ...prev,
        stage: 4,
        status: 'for_compliance_submission',
        visitData: { ...prev.visitData!, completedAt: new Date().toISOString() }
      } : null);

      alert('Inspection marked as complete! Clinic can now submit compliance documents.');
    } catch (error) {
      console.error('Error completing inspection:', error);
      alert('Failed to complete inspection');
    }
  };

  const handleSaveCategoryReviews = async () => {
    if (!selectedApp) return;

    const categories: Record<string, CategoryCompliance> = {};
    let hasNonComplied = false;

    Object.entries(categoryReviews).forEach(([catId, review]) => {
      const existing = selectedApp.complianceData?.categories?.[catId];
      categories[catId] = {
        status: review.status,
        uploadedFiles: existing?.uploadedFiles || [],
        adminRemarks: review.remarks,
        reviewedAt: new Date().toISOString(),
        resubmitCount: existing?.resubmitCount || 0,
        lastResubmitAt: existing?.lastResubmitAt,
      };
      if (review.status === 'non_complied') hasNonComplied = true;
    });

    const complianceData = {
      categories,
      submittedAt: selectedApp.complianceData?.submittedAt || new Date().toISOString(),
    };

    try {
      await updateDoc(doc(db, 'accreditation_applications', selectedApp.id), {
        complianceData,
        status: hasNonComplied ? 'needs_compliance' : 'approved',
        updatedAt: serverTimestamp(),
      });

      setSelectedApp(prev => prev ? {
        ...prev,
        complianceData,
        status: hasNonComplied ? 'needs_compliance' : 'approved'
      } : null);

      alert(hasNonComplied
        ? 'Review saved. Clinic has been notified to fix non-compliant categories.'
        : 'Review saved. All categories approved!'
      );
    } catch (error) {
      console.error('Error saving reviews:', error);
      alert('Failed to save reviews');
    }
  };

  const handleTriggerPayment = async () => {
    if (!selectedApp) return;

    const paymentData: PaymentData = {
      triggeredAt: new Date().toISOString(),
      amount: TOTAL_FEE,
      statementOfAccount: `Accreditation Fee: ₱${ACCREDITATION_FEE.toLocaleString()}\nProcessing Fee: ₱${PROCESSING_FEE.toLocaleString()}\nTotal: ₱${TOTAL_FEE.toLocaleString()}`,
    };

    try {
      await updateDoc(doc(db, 'accreditation_applications', selectedApp.id), {
        stage: 6,
        status: 'for_payment',
        paymentData,
        updatedAt: serverTimestamp(),
      });

      setSelectedApp(prev => prev ? { ...prev, stage: 6, status: 'for_payment', paymentData } : null);
      
      if (selectedApp.clinicId) {
        await notifyMember(selectedApp.clinicId, {
          type: 'accreditation_for_payment',
          title: 'Payment Required',
          body: `Your accreditation application for ${selectedApp.clinicName} is ready for payment. Total: ₱${TOTAL_FEE.toLocaleString()}.`,
          link: 'accreditation',
        });
      }
      await notifyAdmin({
        type: 'accreditation',
        title: 'Payment Triggered',
        body: `Accreditation payment triggered for ${selectedApp.clinicName}.`,
        link: 'accreditation',
      });
      
      alert('Payment triggered! Clinic has been notified.');
    } catch (error) {
      console.error('Error triggering payment:', error);
      alert('Failed to trigger payment');
    }
  };

  const handleConfirmPayment = async () => {
    if (!selectedApp) return;

    const year = new Date().getFullYear();
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const accreditationNo = `PAHA-ACC-${year}-${randomDigits}`;
    const validUntil = new Date();
    validUntil.setFullYear(validUntil.getFullYear() + 1);

    const paymentData: PaymentData = {
      ...selectedApp.paymentData!,
      confirmedAt: new Date().toISOString(),
      accreditationNo,
      validUntil: validUntil.toISOString(),
    };

    try {
      await updateDoc(doc(db, 'accreditation_applications', selectedApp.id), {
        stage: 8,
        status: 'accredited',
        paymentData,
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      setSelectedApp(prev => prev ? { ...prev, stage: 8, status: 'accredited', paymentData } : null);
      
      if (selectedApp.clinicId) {
        await notifyMember(selectedApp.clinicId, {
          type: 'accreditation_approved',
          title: 'Accreditation Approved!',
          body: `Congratulations! ${selectedApp.clinicName} is now PAHA-accredited. Accreditation No: ${accreditationNo}. Valid until ${validUntil.toLocaleDateString()}.`,
          link: 'accreditation',
        });
      }
      await notifyAdmin({
        type: 'accreditation',
        title: 'Accreditation Confirmed',
        body: `${selectedApp.clinicName} accredited. No: ${accreditationNo}.`,
        link: 'accreditation',
      });
      
      alert(`Payment confirmed! Accreditation No: ${accreditationNo}`);
    } catch (error) {
      console.error('Error confirming payment:', error);
      alert('Failed to confirm payment');
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedApp) return;
    const reason = prompt('Enter reason for rejection:');
    if (!reason) return;

    try {
      await updateDoc(doc(db, 'accreditation_applications', selectedApp.id), {
        'paymentData.rejectedAt': new Date().toISOString(),
        'paymentData.rejectionReason': reason,
        status: 'needs_compliance',
        updatedAt: serverTimestamp(),
      });

      setSelectedApp(prev => prev ? {
        ...prev,
        status: 'needs_compliance',
        paymentData: {
          ...prev.paymentData!,
          rejectedAt: new Date().toISOString(),
          rejectionReason: reason,
        }
      } : null);
      
      if (selectedApp.clinicId) {
        await notifyMember(selectedApp.clinicId, {
          type: 'accreditation_needs_compliance',
          title: 'Payment Rejected',
          body: `Your payment for ${selectedApp.clinicName} was rejected. Reason: ${reason}. Please resubmit.`,
          link: 'accreditation',
        });
      }
      await notifyAdmin({
        type: 'accreditation',
        title: 'Payment Rejected',
        body: `Payment for ${selectedApp.clinicName} rejected. Reason: ${reason}.`,
        link: 'accreditation',
      });
      
      alert('Payment rejected. Clinic has been notified.');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment');
    }
  };

  const handleRejectLOI = async () => {
    if (!selectedApp || !rejectReason.trim()) return;
    try {
      await updateDoc(doc(db, 'accreditation_applications', selectedApp.id), {
        status: 'rejected',
        rejectionReason: rejectReason,
        updatedAt: serverTimestamp(),
      });
      // Notify the member
      await addDoc(collection(db, 'member_notifications'), {
        clinicId: selectedApp.clinicId,
        type: 'accreditation_rejected',
        title: 'Accreditation Application Not Passed',
        body: `Your accreditation application for ${selectedApp.clinicName} was not approved. Reason: ${rejectReason}`,
        read: false,
        createdAt: serverTimestamp(),
      });
      // Notify admin log
      await addDoc(collection(db, 'admin_notifications'), {
        type: 'accreditation',
        title: 'Application Rejected',
        body: `${selectedApp.clinicName} accreditation application was rejected.`,
        link: 'accreditation',
        read: false,
        createdAt: serverTimestamp(),
      });
      setSelectedApp(prev => prev ? { ...prev, status: 'rejected', rejectionReason: rejectReason } : null);
      setShowRejectDialog(false);
      setRejectReason('');
      alert('Application rejected. Member has been notified.');
    } catch (error) {
      console.error(error);
      alert('Failed to reject application.');
    }
  };

  const getStatusBadge = (status: WorkflowStatus) => {
    const colors: Record<WorkflowStatus, { bg: string; text: string }> = {
      not_started: { bg: 'bg-slate-100', text: 'text-slate-700' },
      intent_submitted: { bg: 'bg-blue-100', text: 'text-blue-700' },
      intent_resubmitted: { bg: 'bg-amber-100', text: 'text-amber-700' },
      loi_approved: { bg: 'bg-blue-100', text: 'text-blue-700' },
      self_assessment_completed: { bg: 'bg-blue-100', text: 'text-blue-700' },
      for_site_visit: { bg: 'bg-amber-100', text: 'text-amber-700' },
      inspection_completed: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      vef_failed: { bg: 'bg-red-100', text: 'text-red-700' },
      revisit_requested: { bg: 'bg-amber-100', text: 'text-amber-700' },
      accreditation_banned: { bg: 'bg-red-100', text: 'text-red-700' },
      for_compliance_submission: { bg: 'bg-amber-100', text: 'text-amber-700' },
      under_review: { bg: 'bg-purple-100', text: 'text-purple-700' },
      needs_compliance: { bg: 'bg-red-100', text: 'text-red-700' },
      approved: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      for_payment: { bg: 'bg-blue-100', text: 'text-blue-700' },
      paid: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      accredited: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
      rejected: { bg: 'bg-red-100', text: 'text-red-700' },
    };
    const c = colors[status];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${c.bg} ${c.text}`}>
        {WORKFLOW_STATUS_LABELS[status]}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <span className="animate-spin border-4 border-[#2563EB]/30 border-t-[#2563EB] rounded-full w-12 h-12 block mx-auto mb-4"></span>
          <p className="text-slate-500 font-medium">Loading applications...</p>
        </div>
      </div>
    );
  }

  const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900">
      <header className="h-24 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[100] px-4 md:px-10 flex items-center justify-between">
        <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/admin')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
              <span className="material-symbols-outlined text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">arrow_back</span>
            </button>
            <div>
              <h1 className="text-xl font-bold uppercase text-slate-900 dark:text-white tracking-tighter">Accreditation Manager</h1>
              <p className="text-xs text-slate-500 font-medium">{filteredApps.length} application(s)</p>
            </div>
          </div>

          {/* Live Clock Widget */}
          <div className="hidden lg:flex items-center gap-3 px-4 py-2 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 rounded-2xl shadow-sm hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-lg animate-pulse">schedule</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[13px] font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight leading-none mb-1">
                {formattedTime}
              </span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                {formattedDate}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/accreditation')}
              className="px-4 py-2 bg-[#2563EB] text-white rounded-xl font-bold text-sm hover:bg-[#1E3A8A] transition-colors"
            >
              View Clinic View
            </button>

            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>
            
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-900 dark:text-white uppercase leading-none mb-1 tracking-tight">
                  {profile?.displayName || 'Master Admin'}
                </p>
                <div className="flex items-center justify-end gap-1.5">
                  <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    adminRole === 'super_admin' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                    adminRole === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                  }`}>
                    {adminRole?.replace('_', ' ') || 'Admin'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden sticky top-24">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h2 className="font-bold text-slate-800 dark:text-white">Applications</h2>
                <label htmlFor="ac-statusFilter" className="sr-only">Filter by status</label>
                <select
                  id="ac-statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as WorkflowStatus | 'all')}
                  className="mt-2 w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm"
                >
                  {STATUS_FILTER_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="max-h-[calc(100vh-250px)] overflow-y-auto">
                {filteredApps.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
                    <p className="text-sm">No applications found</p>
                  </div>
                ) : (
                  filteredApps.map(app => (
                    <button
                      key={app.id}
                      onClick={() => setSelectedApp(app)}
                      className={`w-full p-4 text-left border-b border-slate-100 dark:border-slate-700 transition-colors ${
                        selectedApp?.id === app.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-[#2563EB]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="font-bold text-slate-800 dark:text-white text-sm truncate">{app.clinicName}</span>
                      </div>
                      <div className="mb-2">{getStatusBadge(app.status)}</div>
                      <div className="text-xs text-slate-500">
                        Stage {app.stage} • {app.loiData?.representativeName || 'N/A'}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(app.submittedAt).toLocaleDateString()}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!selectedApp ? (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-12 text-center">
                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">touch_app</span>
                <h3 className="text-lg font-bold text-slate-600 dark:text-slate-400 mb-2">Select an Application</h3>
                <p className="text-sm text-slate-400">Choose an application from the list to view details</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800 dark:text-white">{selectedApp.clinicName}</h2>
                      <p className="text-sm text-slate-500">ID: {selectedApp.id}</p>
                    </div>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                  <StageTracker
                    currentStage={selectedApp.stage as any}
                    currentStatus={selectedApp.status}
                    showAdminView
                  />
                </div>

                {selectedApp.status === 'intent_submitted' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2563EB]">description</span>
                      Letter of Intent
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Representative</label>
                        <p className="font-semibold text-slate-800 dark:text-white">{selectedApp.loiData?.representativeName}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Title</label>
                        <p className="font-semibold text-slate-800 dark:text-white">{selectedApp.loiData?.representativeTitle}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">PRC License</label>
                        <p className="font-semibold text-slate-800 dark:text-white">{selectedApp.loiData?.prcLicenseNo}</p>
                      </div>
                      <div>
                        <label className="text-xs font-bold text-slate-500 uppercase">Contact</label>
                        <p className="font-semibold text-slate-800 dark:text-white">{selectedApp.loiData?.phone}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="text-xs font-bold text-slate-500 uppercase">Preferred Visit Dates</label>
                      <div className="flex gap-2 mt-1">
                        {selectedApp.loiData?.preferredVisitDates.map((date, i) => (
                          <span key={i} className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-lg text-sm font-semibold">
                            {new Date(date).toLocaleDateString()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                      <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-3">Schedule Site Visit</h4>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label htmlFor="ac-visitDate" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Date *</label>
                          <input
                            id="ac-visitDate"
                            type="date"
                            value={visitForm.date}
                            onChange={(e) => setVisitForm(prev => ({ ...prev, date: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="ac-visitTime" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Time *</label>
                          <input
                            id="ac-visitTime"
                            type="time"
                            value={visitForm.time}
                            onChange={(e) => setVisitForm(prev => ({ ...prev, time: e.target.value }))}
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="ac-inspectorName" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Inspector Name *</label>
                          <input
                            id="ac-inspectorName"
                            type="text"
                            value={visitForm.inspectorName}
                            onChange={(e) => setVisitForm(prev => ({ ...prev, inspectorName: e.target.value }))}
                            placeholder="Dr. Name"
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                          />
                        </div>
                        <div>
                          <label htmlFor="ac-visitNotes" className="text-xs font-bold text-slate-500 uppercase mb-1 block">Notes</label>
                          <input
                            id="ac-visitNotes"
                            type="text"
                            value={visitForm.notes}
                            onChange={(e) => setVisitForm(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Additional notes..."
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 focus:ring-2 focus:ring-[#2563EB] outline-none"
                          />
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={handleScheduleVisit}
                          className="flex-1 py-3 bg-[#2563EB] text-white rounded-xl font-bold hover:bg-[#1E3A8A] transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Pass – Schedule Visit
                        </button>
                        <button
                          onClick={() => setShowRejectDialog(true)}
                          className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">cancel</span>
                          Fail Application
                        </button>
                      </div>
                      {selectedApp.loiPdfUrl && (
                        <div className="mt-4">
                          <button
                            onClick={() => setPdfViewerUrl(selectedApp.loiPdfUrl!)}
                            className="w-full py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 text-amber-700 dark:text-amber-400 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-amber-100 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                            View Uploaded LOI Document
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {(selectedApp.status === 'for_site_visit' || selectedApp.status === 'self_assessment_completed') && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2563EB]">event</span>
                      Site Visit Scheduled
                    </h3>
                    {selectedApp.visitData && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Date</label>
                            <p className="font-bold text-slate-800 dark:text-white text-lg">
                              {new Date(selectedApp.visitData.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Time</label>
                            <p className="font-bold text-slate-800 dark:text-white text-lg">
                              {(() => {
                                const t = selectedApp.visitData!.scheduledTime;
                                if (!t) return 'Expect site visit from 9:00 AM - 3:00 PM';
                                const parsed = new Date(`2000-01-01T${t}`);
                                return isNaN(parsed.getTime())
                                  ? 'Expect site visit from 9:00 AM - 3:00 PM'
                                  : parsed.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                              })()}
                            </p>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Inspector</label>
                            <p className="font-bold text-slate-800 dark:text-white">{selectedApp.visitData.inspectorName}</p>
                          </div>
                          <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
                            <p className="font-bold text-emerald-600">Confirmed</p>
                          </div>
                        </div>
                        {selectedApp.visitData.notes && (
                          <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                            <label className="text-xs font-bold text-slate-500 uppercase">Notes</label>
                            <p className="text-slate-700 dark:text-slate-300 mt-1">{selectedApp.visitData.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                    <p className="mt-4 text-sm text-slate-500">
                      Awaiting site visit completion. Once completed, the clinic can proceed to compliance submission.
                    </p>
                    <button
                      onClick={handleCompleteInspection}
                      className="mt-4 w-full px-6 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                    >
                      Mark Inspection Complete
                    </button>
                  </div>
                )}

                {(selectedApp.status === 'for_compliance_submission' || selectedApp.status === 'needs_compliance') && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2563EB]">folder_open</span>
                      Compliance Review
                    </h3>
                    <p className="text-sm text-slate-500 mb-4">
                      Review uploaded documents and mark each category's compliance status.
                    </p>

                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {ASSESSMENT_CATEGORIES.map(cat => {
                        const compliance = selectedApp.complianceData?.categories?.[cat.id];
                        const review = categoryReviews[cat.id] || { status: 'pending' as CategoryStatus, remarks: '' };

                        return (
                          <div key={cat.id} className={`p-4 rounded-xl border ${
                            review.status === 'complied' ? 'border-emerald-300 bg-emerald-50/50' :
                            review.status === 'non_complied' ? 'border-red-300 bg-red-50/50' :
                            review.status === 'visual_required' ? 'border-amber-300 bg-amber-50/50' :
                            'border-slate-200 bg-slate-50/50'
                          }`}>
                            <h4 className="font-bold text-slate-800 dark:text-white mb-3">{cat.title}</h4>

                            {compliance?.uploadedFiles && compliance.uploadedFiles.length > 0 && (
                              <div className="mb-3">
                                <p className="text-xs font-bold text-slate-500 uppercase mb-2">Uploaded Files</p>
                                <div className="space-y-1">
                                  {compliance.uploadedFiles.map((file, idx) => (
                                    <a
                                      key={idx}
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
                                    >
                                      <span className="material-symbols-outlined text-sm">description</span>
                                      {file.name}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            )}

                            <div className="grid grid-cols-3 gap-2 mb-2">
                              {(['pending', 'complied', 'non_complied', 'visual_required'] as CategoryStatus[]).map(status => (
                                <button
                                  key={status}
                                  onClick={() => setCategoryReviews(prev => ({
                                    ...prev,
                                    [cat.id]: { ...prev[cat.id], status }
                                  }))}
                                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-colors ${
                                    review.status === status
                                      ? status === 'complied' ? 'bg-emerald-500 text-white' :
                                        status === 'non_complied' ? 'bg-red-500 text-white' :
                                        status === 'visual_required' ? 'bg-amber-500 text-white' :
                                        'bg-slate-500 text-white'
                                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                  }`}
                                >
                                  {status.replace('_', ' ')}
                                </button>
                              ))}
                            </div>

                            <label htmlFor={`ac-remarks-${cat.id}`} className="sr-only">Remarks for {cat.title}</label>
                            <textarea
                              id={`ac-remarks-${cat.id}`}
                              value={review.remarks}
                              onChange={(e) => setCategoryReviews(prev => ({
                                ...prev,
                                [cat.id]: { ...prev[cat.id], remarks: e.target.value }
                              }))}
                              placeholder="Add remarks for this category..."
                              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-sm mt-2"
                              rows={2}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <button
                      onClick={handleSaveCategoryReviews}
                      className="mt-4 w-full py-3 bg-[#2563EB] text-white rounded-xl font-bold hover:bg-[#1E3A8A] transition-colors"
                    >
                      Save Category Reviews
                    </button>
                  </div>
                )}

                {selectedApp.status === 'under_review' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 text-center">
                    <span className="material-symbols-outlined text-5xl text-purple-500 mb-4 block">hourglass_empty</span>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Under Review</h3>
                    <p className="text-sm text-slate-500">Review the compliance documents and mark each category's status.</p>
                  </div>
                )}

                {selectedApp.status === 'approved' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <div className="text-center mb-6">
                      <span className="material-symbols-outlined text-5xl text-emerald-500 mb-4 block">verified</span>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">All Categories Approved</h3>
                      <p className="text-sm text-slate-500">Ready to trigger payment for this application.</p>
                    </div>
                    <button
                      onClick={handleTriggerPayment}
                      className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined">payments</span>
                      Trigger Payment (SOA)
                    </button>
                  </div>
                )}

                {selectedApp.status === 'for_payment' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#2563EB]">payments</span>
                      Payment
                    </h3>
                    {selectedApp.paymentData?.submittedAt && !selectedApp.paymentData?.confirmedAt && !selectedApp.paymentData?.rejectedAt ? (
                      <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-200 dark:border-amber-800">
                        <h4 className="font-bold text-amber-800 dark:text-amber-200 mb-3">Payment Submitted</h4>
                        <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
                          Submitted: {new Date(selectedApp.paymentData.submittedAt).toLocaleString()}
                        </p>
                        {selectedApp.paymentData.proofOfPaymentUrl && (
                          <a
                            href={selectedApp.paymentData.proofOfPaymentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-lg text-sm font-bold hover:bg-amber-300 dark:hover:bg-amber-700 transition-colors mb-4"
                          >
                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                            View Proof of Payment
                          </a>
                        )}
                        <div className="flex gap-3 mt-4">
                          <button
                            onClick={handleConfirmPayment}
                            className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-colors"
                          >
                            Confirm Payment
                          </button>
                          <button
                            onClick={handleRejectPayment}
                            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-colors"
                          >
                            Reject Payment
                          </button>
                        </div>
                      </div>
                    ) : selectedApp.paymentData?.rejectedAt ? (
                      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 border border-red-200 dark:border-red-800">
                        <h4 className="font-bold text-red-800 dark:text-red-200 mb-3">Payment Rejected</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                          Reason: {selectedApp.paymentData.rejectionReason}
                        </p>
                        <p className="text-xs text-red-500">
                          Rejected at: {new Date(selectedApp.paymentData.rejectedAt).toLocaleString()}
                        </p>
                      </div>
                    ) : selectedApp.paymentData?.confirmedAt ? (
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800">
                        <h4 className="font-bold text-emerald-800 dark:text-emerald-200 mb-3 flex items-center gap-2">
                          <span className="material-symbols-outlined">check_circle</span>
                          Payment Confirmed
                        </h4>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                          Accreditation No: <span className="font-bold">{selectedApp.paymentData.accreditationNo}</span>
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          Valid Until: <span className="font-bold">{new Date(selectedApp.paymentData.validUntil!).toLocaleDateString()}</span>
                        </p>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 block">schedule</span>
                        <h4 className="font-bold text-slate-600 dark:text-slate-400 mb-2">Awaiting Payment</h4>
                        <p className="text-sm text-slate-400">
                          Payment has been triggered. Clinic has been notified to submit proof of payment.
                        </p>
                        <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mt-4">
                          Amount Due: ₱{selectedApp.paymentData?.amount?.toLocaleString() || TOTAL_FEE.toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {selectedApp.status === 'rejected' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-800 p-6">
                    <div className="text-center py-6">
                      <span className="material-symbols-outlined text-5xl text-red-500 mb-3 block">cancel</span>
                      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Application Rejected</h3>
                      {selectedApp.rejectionReason && (
                        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-800 text-left">
                          <p className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Rejection Reason</p>
                          <p className="text-sm text-slate-700 dark:text-slate-300">{selectedApp.rejectionReason}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedApp.status === 'accredited' && (
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800 p-6">
                    <div className="text-center py-8">
                      <div className="size-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-4xl text-emerald-600">workspace_premium</span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Accreditation Complete</h3>
                      <p className="text-slate-500 mb-4">This clinic is now PAHA Accredited</p>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-6 border border-emerald-200 dark:border-emerald-800 inline-block">
                        <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-2">
                          Accreditation No: <span className="font-bold text-lg">{selectedApp.paymentData?.accreditationNo}</span>
                        </p>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">
                          Valid Until: <span className="font-bold">{selectedApp.paymentData?.validUntil ? new Date(selectedApp.paymentData.validUntil).toLocaleDateString() : 'N/A'}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Reject Application Dialog */}
      {showRejectDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRejectDialog(false)} />
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md relative z-10 shadow-2xl p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Fail Application</h3>
            <p className="text-sm text-slate-500 mb-4">Provide a reason for rejecting this accreditation application. The member will be notified.</p>
            <label htmlFor="ac-rejectReason" className="sr-only">Rejection reason</label>
            <textarea
              id="ac-rejectReason"
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={4}
              className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectDialog(false)} className="flex-1 py-3 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 rounded-xl font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleRejectLOI}
                disabled={!rejectReason.trim()}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Viewer Modal */}
      {pdfViewerUrl && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPdfViewerUrl(null)} />
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-4xl h-[85vh] relative z-10 shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-900 dark:text-white">Document Viewer</h3>
              <div className="flex items-center gap-2">
                <a
                  href={pdfViewerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary dark:text-sky-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700"
                >
                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                  Open in new tab
                </a>
                <button onClick={() => setPdfViewerUrl(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-slate-500">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
            </div>
            <iframe src={getEmbeddableUrl(pdfViewerUrl)} className="flex-1 w-full" title="PDF Viewer" />
          </div>
        </div>
      )}
    </div>
  );
};

export default AccreditationManager;