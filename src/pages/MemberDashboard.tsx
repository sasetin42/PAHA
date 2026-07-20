import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAdmin } from '../context/AdminContext';
import AccreditationPipeline from './AccreditationPipeline';
import { doc, updateDoc, collection, addDoc, onSnapshot, deleteDoc, serverTimestamp, query, orderBy, where, limit } from 'firebase/firestore';
import type { AccreditationApplication } from '../types/accreditation';
import { WORKFLOW_STATUS_LABELS } from '../types/accreditation';
import { db, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useAppearance } from '../hooks/useAppearance';
import ChatWidget from '../components/ChatWidget';
import Inbox from './Inbox';
import { notifyAdmin } from '../utils/notify';
import { STANDARD_2026 } from '../data/accreditationStandard2026';
import { computeGapSummary } from '../utils/evaluationScoring';
import { SOLE_PROPRIETORSHIP_REQS, PARTNERSHIP_CORP_REQS, TEACHING_HOSPITAL_REQS } from '../data/membershipRequirements';

type Tab = 'overview' | 'membership' | 'accreditation' | 'events' | 'notifications' | 'profile' | 'inbox';

// Every WorkflowStatus mapped to its 1-8 pipeline stage — mirrors the stage
// numbering used by StageTracker/AccreditationPipeline (stage 6 retired,
// merged into 7). Used to compute an accurate "Accreditation" progress
// percentage on the dashboard overview card; the previous version only knew
// about 9 of the 20 possible statuses and silently showed 0% for the rest
// (e.g. loi_approved, visit_date_proposed, revisit_approved, vef_failed).
const ACCRED_STAGE_ORDER: Record<string, number> = {
    not_started: 1,
    intent_submitted: 1,
    intent_resubmitted: 1,
    rejected: 1,
    accreditation_banned: 1,
    loi_approved: 2,
    self_assessment_completed: 3,
    visit_date_proposed: 3,
    for_site_visit: 3,
    revisit_requested: 3,
    revisit_approved: 3,
    vef_failed: 4,
    inspection_completed: 4,
    for_compliance_submission: 4,
    under_review: 5,
    needs_compliance: 5,
    approved: 7,
    for_payment: 7,
    paid: 7,
    accredited: 8,
};

interface ClinicRep {
    id: string;
    name: string;
    designation: string;
    prc: string;
    contact: string;
    email: string;
    isPrimary: boolean;
    status: 'active' | 'inactive';
    image?: string;
}

const parseDate = (val: any): Date | null => {
    if (!val) return null;
    if (val?.toDate) return val.toDate();
    if (val?.seconds) return new Date(val.seconds * 1000);
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
};

const formatAnnDate = (val: any): string => {
    const d = parseDate(val);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const navStyles: Record<string, { activeBg: string; activeText: string; hoverBg: string; dot: string; iconBg: string }> = {
    overview: {
        activeBg: 'bg-blue-50/80 border-blue-100 text-blue-700 font-bold',
        activeText: 'text-blue-700',
        hoverBg: 'hover:bg-blue-50/50 hover:text-blue-600',
        dot: 'bg-blue-500',
        iconBg: 'bg-blue-50 border-blue-100 text-blue-500'
    },
    membership: {
        activeBg: 'bg-emerald-50/80 border-emerald-100 text-emerald-700 font-bold',
        activeText: 'text-emerald-700',
        hoverBg: 'hover:bg-emerald-50/50 hover:text-emerald-600',
        dot: 'bg-emerald-500',
        iconBg: 'bg-emerald-50 border-emerald-100 text-emerald-500'
    },
    accreditation: {
        activeBg: 'bg-violet-50/80 border-violet-100 text-violet-700 font-bold',
        activeText: 'text-violet-700',
        hoverBg: 'hover:bg-violet-50/50 hover:text-violet-600',
        dot: 'bg-violet-500',
        iconBg: 'bg-violet-50 border-violet-100 text-violet-500'
    },
    events: {
        activeBg: 'bg-rose-50/80 border-rose-100 text-rose-700 font-bold',
        activeText: 'text-rose-700',
        hoverBg: 'hover:bg-rose-50/50 hover:text-rose-600',
        dot: 'bg-rose-500',
        iconBg: 'bg-rose-50 border-rose-100 text-rose-500'
    },
    inbox: {
        activeBg: 'bg-amber-50/80 border-amber-100 text-amber-700 font-bold',
        activeText: 'text-amber-700',
        hoverBg: 'hover:bg-amber-50/50 hover:text-amber-600',
        dot: 'bg-amber-500',
        iconBg: 'bg-amber-50 border-amber-100 text-amber-500'
    },
    notifications: {
        activeBg: 'bg-cyan-50/80 border-cyan-100 text-cyan-700 font-bold',
        activeText: 'text-cyan-700',
        hoverBg: 'hover:bg-cyan-50/50 hover:text-cyan-600',
        dot: 'bg-cyan-500',
        iconBg: 'bg-cyan-50 border-cyan-100 text-cyan-500'
    },
    profile: {
        activeBg: 'bg-indigo-50/80 border-indigo-100 text-indigo-700 font-bold',
        activeText: 'text-indigo-700',
        hoverBg: 'hover:bg-indigo-50/50 hover:text-indigo-600',
        dot: 'bg-indigo-500',
        iconBg: 'bg-indigo-50 border-indigo-100 text-indigo-500'
    }
};

const MemberDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth();
    useAppearance();
    const { events, announcements, registrations } = useAdmin();
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    useEffect(() => {
        if (activeTab === 'accreditation' && profile && profile.hasPaid !== true) {
            setActiveTab('overview');
        }
    }, [activeTab, profile]);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [notifTab, setNotifTab] = useState<'all' | 'unread'>('all');
    const [profileEditing, setProfileEditing] = useState(false);
    const [profileSaving, setProfileSaving] = useState(false);
    const [profileForm, setProfileForm] = useState({ displayName: '', clinicName: '', phone: '', clinicAddress: '', specialization: '', representativeName: '' });
    const [profileImageUploading, setProfileImageUploading] = useState(false);
    const profileFileInputRef = useRef<HTMLInputElement>(null);

    // Clinic Representatives
    const [reps, setReps] = useState<ClinicRep[]>([]);
    const [showAddRep, setShowAddRep] = useState(false);
    const [editingRepId, setEditingRepId] = useState<string | null>(null);
    const [repSaving, setRepSaving] = useState(false);
    const [uploadingRepImage, setUploadingRepImage] = useState(false);
    const [repForm, setRepForm] = useState({ name: '', designation: '', prc: '', contact: '', email: '', isPrimary: false, image: '' });
    const [repDropdown, setRepDropdown] = useState<string | null>(null);
    const [accredApp, setAccredApp] = useState<AccreditationApplication | null>(null);

    // Business structure is chosen freely (draft) and only persisted when the
    // member clicks Save — previously each click wrote straight to Firestore,
    // which immediately disabled the other options before the member could
    // change their mind.
    const [selectedBusinessType, setSelectedBusinessType] = useState<'' | 'sole_proprietorship' | 'partnership_corporation' | 'teaching_hospital'>('');
    const [businessTypeSaving, setBusinessTypeSaving] = useState(false);

    // Customizable Card Design State
    const [cardDesign, setCardDesign] = useState<any>({
        backgroundType: 'gradient',
        solidColor: '#0d2257',
        gradientStart: '#0d2257',
        gradientVia: '#2563eb',
        gradientEnd: '#3b82f6',
        gradientDirection: 'to-br',
        textColor: 'light',
        icon: 'pets',
        customIconUrl: '',
        backgroundImageUrl: '',
        showPatternOverlay: true,
        cardTitle: 'MEMBERSHIP CARD'
    });

    const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
const [myApplications, setMyApplications] = useState<any[]>([]);
const [uploadingDocs, setUploadingDocs] = useState<Record<string, boolean>>({});

    // Load Customizable Card Design Settings
    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'systemSettings', 'membershipCard'), (snap) => {
            if (snap.exists()) {
                setCardDesign(snap.data());
            }
        });
        return () => unsub();
    }, []);

    // Load membership plans
    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'membership_plans'), (snap) => {
            setMembershipPlans(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsub();
    }, []);

    // Load user applications. Historically an application's `email` field was
    // saved straight from the signup form (un-trimmed, original casing) while
    // Firebase auth stores a normalized email — so matching on email alone
    // silently missed applications for some accounts, which hid the rejection
    // banner / reapply button. Every application also stores the owner's `uid`,
    // so we subscribe by BOTH email and uid and merge (deduped by doc id) to
    // reliably find the member's application on every account.
  useEffect(() => {
    if (!user?.uid && !user?.email) return;
    const byEmail: Record<string, any> = {};
    const byUid: Record<string, any> = {};
    const emit = () => {
      const merged: Record<string, any> = { ...byEmail, ...byUid };
      setMyApplications(Object.values(merged));
    };
    const unsubs: (() => void)[] = [];
    if (user?.email) {
      const qEmail = query(collection(db, 'membership_applications'), where('email', '==', user.email));
      unsubs.push(onSnapshot(qEmail, (snap) => {
        Object.keys(byEmail).forEach(k => delete byEmail[k]);
        snap.docs.forEach(d => { byEmail[d.id] = { id: d.id, ...d.data() }; });
        emit();
      }));
    }
    if (user?.uid) {
      const qUid = query(collection(db, 'membership_applications'), where('uid', '==', user.uid));
      unsubs.push(onSnapshot(qUid, (snap) => {
        Object.keys(byUid).forEach(k => delete byUid[k]);
        snap.docs.forEach(d => { byUid[d.id] = { id: d.id, ...d.data() }; });
        emit();
      }));
    }
    return () => unsubs.forEach(u => u());
  }, [user?.uid, user?.email]);

    // Load personal notifications. Historically these docs were written with
    // either a `uid` field or a `clinicId` field depending on the flow, so we
    // subscribe to BOTH and merge — querying only one silently hid the rest.
    const [personalNotifications, setPersonalNotifications] = useState<any[]>([]);
 const [notifPopups, setNotifPopups] = useState<{ id: string; title: string; body: string; type?: string; link?: string }[]>([]);
 const seenNotifIds = React.useRef<Set<string> | null>(null);
 const [unreadThreads, setUnreadThreads] = useState(0);

 // Track unread chat threads
 useEffect(() => {
   if (!user?.uid) return;
   const q = query(
     collection(db, 'chats'),
     where('uid', '==', user.uid),
     where('unreadByMember', '==', true)
   );
   const unsubscribe = onSnapshot(q, (snap) => {
     setUnreadThreads(snap.size);
   });
   return () => unsubscribe();
 }, [user?.uid]);
    useEffect(() => {
        if (!user?.uid) return;
        const byId = new Map<string, any>();
        const publish = (snap: any) => {
            snap.docs.forEach((d: any) => byId.set(d.id, { id: d.id, ...d.data() }));
            const items = Array.from(byId.values());
            items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
            setPersonalNotifications(items);

            // Popup toast for genuinely NEW notifications (skip the initial load)
            if (seenNotifIds.current === null) {
                seenNotifIds.current = new Set(items.map(i => i.id));
            } else {
                const fresh = items.filter(i => !seenNotifIds.current!.has(i.id) && !i.read);
                fresh.forEach(i => seenNotifIds.current!.add(i.id));
                if (fresh.length > 0) {
                    setNotifPopups(prev => [...prev, ...fresh.map(i => ({ id: i.id, title: i.title, body: i.body, type: i.type, link: i.link }))].slice(-3));
                    fresh.forEach(i => {
                        setTimeout(() => setNotifPopups(prev => prev.filter(p => p.id !== i.id)), 8000);
                    });
                }
            }
        };
        const unsub1 = onSnapshot(query(collection(db, 'member_notifications'), where('uid', '==', user.uid)), publish);
        const unsub2 = onSnapshot(query(collection(db, 'member_notifications'), where('clinicId', '==', user.uid)), publish);
        return () => { unsub1(); unsub2(); seenNotifIds.current = null; };
    }, [user?.uid]);

    // Where a notification should take the member when clicked
    const notifTargetTab = (n: { type?: string; link?: string }): Tab => {
        if (n.link && ['overview', 'membership', 'accreditation', 'events', 'notifications', 'profile', 'inbox'].includes(n.link)) return n.link as Tab;
        const t = n.type || '';
        if (t.startsWith('accreditation') || t === 'site_visit_completed') return 'accreditation';
        if (t.startsWith('membership')) return 'membership';
        if (t === 'admin_message') return 'inbox';
        return 'notifications';
    };
    const openNotification = (n: any) => {
        // Synthetic client-side reminders (e.g. gap-reminder-*) have no Firestore doc to update.
        if (n.id && !n.read && !String(n.id).startsWith('gap-reminder-')) {
            updateDoc(doc(db, 'member_notifications', n.id), { read: true }).catch(() => {});
        }
        let target = notifTargetTab(n);
        // Accreditation tab is locked until membership is approved
        if (target === 'accreditation' && profile?.hasPaid !== true) target = 'notifications';
        setActiveTab(target);
        setNotifPopups(prev => prev.filter(p => p.id !== n.id));
    };

    // Recurring reminder popup — every 5 minutes, while the member still has
    // missing self-assessment requirements. Client-side only (no Firestore
    // doc per tick) so it doesn't spam the notification bell/history.
    useEffect(() => {
        const REMIND_INTERVAL_MS = 5 * 60 * 1000;
        const checkAndRemind = () => {
            if (!accredApp?.selfAssessmentData) return;
            const gaps = computeGapSummary(STANDARD_2026, accredApp.selfAssessmentData.checkedItems || {});
            if (gaps.length === 0) return;
            const missingList = gaps.slice(0, 3).map(g => g.sectionId).join(', ');
            const more = gaps.length > 3 ? ` +${gaps.length - 3} more` : '';
            const popupId = `gap-reminder-${Date.now()}`;
            setNotifPopups(prev => [...prev, {
                id: popupId,
                title: 'Requirements Still Missing',
                body: `Still incomplete: ${missingList}${more}. Please complete these before your site visit.`,
                type: 'self_assessment_gaps',
                link: 'accreditation',
            }].slice(-3));
            setTimeout(() => setNotifPopups(prev => prev.filter(p => p.id !== popupId)), 10000);
        };
        const timer = setInterval(checkAndRemind, REMIND_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [accredApp]);

    const memberName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Member';
const formattedCardName = profile?.ownerName
        ? profile.ownerName
        : (profile?.firstName
            ? `${profile.firstName}${profile.middleName ? ' ' + profile.middleName.trim().charAt(0).toUpperCase() + '.' : ''} ${profile.lastName || ''}${profile.suffix && profile.suffix !== 'None' ? ' ' + profile.suffix : ''}`.trim()
            : memberName);
    const memberEmail = user?.email || '';
    const clinicName = profile?.clinicName || 'My Veterinary Clinic';

    // ── Membership dates from Firestore (paidAt or fallback approved application date) ──
    const myApp = myApplications.find(a => a.status === 'approved');
    const approvedDate = profile?.paidAt || myApp?.updatedAt || myApp?.date;
    const paidAtDate = parseDate(approvedDate);
    const memberSinceStr = paidAtDate
        ? paidAtDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';
    const expiryDate = paidAtDate ? new Date(paidAtDate.getFullYear() + 1, paidAtDate.getMonth(), paidAtDate.getDate()) : null;
    const expiryDateStr = expiryDate
        ? expiryDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : '—';
    const expiryDateShortStr = expiryDate
        ? expiryDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—';

    // Calculate annual dues string dynamically from Firestore membership plans
    const userPlan = membershipPlans.find(p => p.type === profile?.membershipType || p.id === profile?.membershipType || p.type === profile?.type || p.id === profile?.type);
    const hasPaidBefore = profile?.hasPaid === true || !!profile?.memberId;
    const currentDuesFee = userPlan
        ? Number(hasPaidBefore ? (userPlan.recurringFee ?? userPlan.fee) : (userPlan.firstPaymentFee ?? userPlan.fee))
        // First payment is ₱5,000; renewals after that are ₱2,000
        : (profile?.membershipType === 'Associate' ? 3500 : (hasPaidBefore ? 2000 : 5000));
    const annualDuesStr = `₱${currentDuesFee.toLocaleString()} / year`;

    // ── Payment lock (Overridden to allow dashboard access) ──────────────────
    const needsPayment = false; 
    const isUnpaid = profile !== null && profile?.hasPaid === false;
    const [isPaymentVerificationPending, setIsPaymentVerificationPending] = useState(false);

    useEffect(() => {
        if (!user) return;
        const q = query(
            collection(db, 'membership_applications'),
            where('uid', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(1)
        );
        const unsub = onSnapshot(q, (snap) => {
            if (!snap.empty) {
                const appData = snap.docs[0].data();
                if (appData.paymentStatus === 'pending_manual' || appData.status === 'pending_manual') {
                    setIsPaymentVerificationPending(true);
                } else {
                    setIsPaymentVerificationPending(false);
                }
            }
        });
        return () => unsub();
    }, [user]);

    const upcomingEvents = events.filter(e => e.status === 'upcoming' || e.status === 'ongoing')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const myRegistrations = registrations.filter(r => r.attendeeEmail === user?.email);
    const latestAnnouncements = announcements.slice(0, 5);
 const unreadPersonalCount = personalNotifications.filter(n => !n.read).length;
 const unreadCount = unreadPersonalCount + (unreadThreads > 0 ? 1 : 0);

    useEffect(() => {
        if (!user) navigate('/login');
        document.title = 'Member Portal | PAHA Philippines';
    }, [user, navigate]);

    useEffect(() => {
        if (profile) {
            setProfileForm({
                displayName: profile.displayName || user?.displayName || '',
                clinicName: profile.clinicName || '',
                phone: profile.phone || '',
                clinicAddress: profile.clinicAddress || '',
                specialization: profile.specialization || '',
                representativeName: (profile as any).representativeName || '',
            });
        }
    }, [profile, user]);

    useEffect(() => {
        setSelectedBusinessType((profile?.businessType as any) || '');
    }, [profile?.businessType]);

    // Load accreditation application
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'accreditation_applications'), orderBy('submittedAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            const apps = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as AccreditationApplication))
                .filter(a => a.clinicId === user.uid);
            setAccredApp(apps[0] || null);
        });
        return () => unsub();
    }, [user]);

    // Load reps from Firestore
    useEffect(() => {
        if (!user) return;
        const q = collection(db, 'users', user.uid, 'representatives');
        const unsub = onSnapshot(q, snap => {
            setReps(snap.docs.map(d => ({ id: d.id, ...d.data() } as ClinicRep)));
        });
        return () => unsub();
    }, [user]);

    const handleAddRep = async () => {
        if (!user || !repForm.name || !repForm.designation || !repForm.prc) return;
        setRepSaving(true);
        try {
            // Normalize first — repForm.contact may already carry a +63/63/0 prefix
            // (e.g. editing an existing rep without touching the phone field), so
            // blindly prepending +63 would double it up.
            const rawContact = repForm.contact
                ? (repForm.contact.startsWith('+63') ? repForm.contact.slice(3)
                    : repForm.contact.startsWith('63') && repForm.contact.length === 12 ? repForm.contact.slice(2)
                    : repForm.contact.startsWith('0') && repForm.contact.length === 11 ? repForm.contact.slice(1)
                    : repForm.contact)
                : '';
            const contact = rawContact ? `+63${rawContact}` : '';

            if (editingRepId) {
                if (repForm.isPrimary) {
                    for (const r of reps) {
                        if (r.id !== editingRepId) {
                            await updateDoc(doc(db, 'users', user.uid, 'representatives', r.id), { isPrimary: false });
                        }
                    }
                }
                await updateDoc(doc(db, 'users', user.uid, 'representatives', editingRepId), {
                    ...repForm,
                    contact,
                    updatedAt: serverTimestamp()
                });
            } else {
                if (repForm.isPrimary) {
                    for (const r of reps) {
                        await updateDoc(doc(db, 'users', user.uid, 'representatives', r.id), { isPrimary: false });
                    }
                }
                await addDoc(collection(db, 'users', user.uid, 'representatives'), {
                    ...repForm,
                    contact,
                    status: 'active',
                    createdAt: serverTimestamp(),
                });
            }
            setRepForm({ name: '', designation: '', prc: '', contact: '', email: '', isPrimary: false, image: '' });
            setEditingRepId(null);
            setShowAddRep(false);
        } catch (e) { console.error(e); }
        finally { setRepSaving(false); }
    };

    const handleSetPrimaryRep = async (repId: string) => {
        if (!user) return;
        setRepDropdown(null);
        try {
            for (const r of reps) {
                await updateDoc(doc(db, 'users', user.uid, 'representatives', r.id), {
                    isPrimary: r.id === repId
                });
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleRepImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingRepImage(true);
        try {
            const fileRef = ref(storage, `users/${user?.uid}/reps/avatar_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setRepForm(prev => ({ ...prev, image: downloadUrl }));
        } catch (err: any) {
            console.error('Rep Image upload error:', err);
            alert('Failed to upload representative profile picture.');
        } finally {
            setUploadingRepImage(false);
        }
    };

    const handleDeleteRep = async (repId: string) => {
        if (!user || !confirm('Remove this representative?')) return;
        setRepDropdown(null);
        await deleteDoc(doc(db, 'users', user.uid, 'representatives', repId));
    };

    const handleToggleRepStatus = async (repId: string, newStatus: 'active' | 'inactive') => {
        if (!user) return;
        setRepDropdown(null);
        await updateDoc(doc(db, 'users', user.uid, 'representatives', repId), { status: newStatus });
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setProfileSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: profileForm.displayName,
                clinicName: profileForm.clinicName,
                phone: profileForm.phone,
                clinicAddress: profileForm.clinicAddress,
                specialization: profileForm.specialization,
                representativeName: profileForm.representativeName,
            });
            setProfileEditing(false);
            notifyAdmin({
                type: 'member_update',
                title: 'Member Profile Updated',
                body: `${profileForm.clinicName || memberName} updated their clinic profile details.`,
                link: 'members',
            });
        } catch (e) {
            console.error(e);
            alert('Failed to save profile.');
        } finally {
            setProfileSaving(false);
        }
    };

    const handleUploadProfileImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        setProfileImageUploading(true);
        try {
            const fileRef = ref(storage, `users/${user.uid}/profile_${Date.now()}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            await updateDoc(doc(db, 'users', user.uid), { photoUrl: downloadUrl });
            
            notifyAdmin({
                type: 'member_update',
                title: 'Member Profile Picture Updated',
                body: `${profileForm.clinicName || memberName} updated their profile picture.`,
                link: 'members',
            });
        } catch (err) {
            console.error('Error uploading profile picture:', err);
            alert('Failed to upload profile picture. Please try again.');
        } finally {
            setProfileImageUploading(false);
        }
    };

    const handleSetBusinessType = async (type: 'sole_proprietorship' | 'partnership_corporation' | 'teaching_hospital') => {
        if (!user) return;

        const currentDocs = profile?.membershipDocuments || {};
        const currentType = profile?.businessType || '';
        const currentReqs = currentType === 'sole_proprietorship' ? SOLE_PROPRIETORSHIP_REQS
            : currentType === 'teaching_hospital' ? TEACHING_HOSPITAL_REQS
            : currentType === 'partnership_corporation' ? PARTNERSHIP_CORP_REQS
            : [];
        const hasUploadedDoc = currentReqs.some(r => (currentDocs[r.id]?.length || 0) > 0);
        if (hasUploadedDoc && type !== currentType) {
            return;
        }

        setBusinessTypeSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                businessType: type
            });

            const pendingApp = myApplications.find(a => a.status === 'pending' || a.status === 'resend_requested' || a.status === 'pending_manual') || myApplications[0];
            if (pendingApp) {
                await updateDoc(doc(db, 'membership_applications', pendingApp.id), {
                    businessType: type
                });
            }
        } catch (err) {
            console.error('Error setting business type:', err);
            alert('Failed to save business structure. Please try again.');
        } finally {
            setBusinessTypeSaving(false);
        }
    };

    // Once a document has been uploaded for the chosen business structure, the
    // member can no longer switch it themselves — they have to ask an admin,
    // who can unlock the choices again. This replaces the old self-service
    // "delete all your documents to switch" workaround.
    const handleRequestBusinessTypeChange = async () => {
        if (!user) return;
        if (!window.confirm('Request PAHA to unlock your business structure selection? An admin will need to approve this before you can pick a different one.')) return;
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                businessTypeChangeRequested: true,
            });
            await notifyAdmin({
                type: 'membership',
                title: 'Business Structure Change Requested',
                body: `${profile?.clinicName || profile?.displayName || user.email} requested to change their membership business structure (currently: ${profile?.businessType || 'none'}).`,
                link: 'applications',
            });
            alert('Request sent. PAHA will review and unlock your business structure choices if approved.');
        } catch (err) {
            console.error('Error requesting business type change:', err);
            alert('Failed to send the request. Please try again.');
        }
    };

    const handleDocUpload = async (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        const reqs = profile?.businessType === 'sole_proprietorship' ? SOLE_PROPRIETORSHIP_REQS
            : profile?.businessType === 'teaching_hospital' ? TEACHING_HOSPITAL_REQS
            : PARTNERSHIP_CORP_REQS;
        
        const reqItem = reqs.find(r => r.id === docType);
        const maxSizeMB = reqItem ? reqItem.maxSize : 5;
        const maxSizeBytes = maxSizeMB * 1024 * 1024;

        if (file.size > maxSizeBytes) {
            alert(`File is too large. Maximum size allowed for this requirement is ${maxSizeMB}MB.`);
            return;
        }

        setUploadingDocs(prev => ({ ...prev, [docType]: true }));
        try {
            const fileRef = ref(storage, `users/${user.uid}/documents/${docType}_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);

            const newDoc = {
                name: file.name,
                url: downloadUrl,
                uploadedAt: new Date().toISOString()
            };

            const currentDocs = profile?.membershipDocuments || {};
            const updatedDocs = {
                ...currentDocs,
                [docType]: [newDoc]
            };

            await updateDoc(doc(db, 'users', user.uid), {
                membershipDocuments: updatedDocs
            });

            const pendingApp = myApplications.find(a => a.status === 'pending' || a.status === 'resend_requested' || a.status === 'pending_manual') || myApplications[0];
            if (pendingApp) {
                await updateDoc(doc(db, 'membership_applications', pendingApp.id), {
                    membershipDocuments: updatedDocs
                });
            }

            notifyAdmin({
                type: 'application',
                title: 'Membership Document Uploaded',
                body: `${clinicName} uploaded "${reqItem?.label || docType}" (${file.name}).`,
                link: 'applications',
            });
        } catch (err) {
            console.error('Error uploading document:', err);
            alert('Failed to upload document.');
        } finally {
            setUploadingDocs(prev => ({ ...prev, [docType]: false }));
        }
    };

    const handleDocDelete = async (docType: string) => {
        if (!user) return;
        if (!window.confirm('Are you sure you want to remove this document?')) return;

        try {
            const currentDocs = { ...(profile?.membershipDocuments || {}) };
            delete currentDocs[docType];

            await updateDoc(doc(db, 'users', user.uid), {
                membershipDocuments: currentDocs
            });

            const pendingApp = myApplications.find(a => a.status === 'pending' || a.status === 'resend_requested' || a.status === 'pending_manual') || myApplications[0];
            if (pendingApp) {
                await updateDoc(doc(db, 'membership_applications', pendingApp.id), {
                    membershipDocuments: currentDocs
                });
            }

        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Failed to remove document.');
        }
    };

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    // Most recent rejected membership application, if any — used to show the
    // rejection reason and let the member resubmit after fixing whatever was
    // flagged (e.g. re-uploading a corrected document above).
    const latestRejectedApp = myApplications
        .filter(a => a.status === 'rejected')
        .sort((a, b) => (b.rejectedAt?.toMillis?.() || 0) - (a.rejectedAt?.toMillis?.() || 0))[0] || null;

    const handleResubmitApplication = async () => {
        if (!latestRejectedApp) return;

        // Re-check the same gates the button's `disabled` state uses — a guard
        // against stale UI state, not just decoration.
        const membershipDocs = profile?.membershipDocuments || {};
        const memberBusinessType = profile?.businessType || '';
        const memberActiveReqs = memberBusinessType === 'sole_proprietorship' ? SOLE_PROPRIETORSHIP_REQS
            : memberBusinessType === 'teaching_hospital' ? TEACHING_HOSPITAL_REQS
            : memberBusinessType === 'partnership_corporation' ? PARTNERSHIP_CORP_REQS
            : [];
        const docsComplete = memberActiveReqs.length > 0 && memberActiveReqs.every(r => membershipDocs[r.id]?.length > 0);
        const paymentProofOk = !!latestRejectedApp.paymentReference && latestRejectedApp.paymentStatus !== 'unpaid';
        if (!docsComplete) {
            alert('Please complete the Required Documents Checklist before reapplying.');
            return;
        }
        if (!paymentProofOk) {
            alert('Please re-upload your proof of payment before reapplying.');
            return;
        }

        if (!window.confirm('Resubmit your membership application for review? Make sure you\'ve fixed the issue mentioned in the rejection reason.')) return;
        try {
            await updateDoc(doc(db, 'membership_applications', latestRejectedApp.id), {
                status: 'pending',
                rejectionReason: '',
                resubmittedAt: serverTimestamp(),
            });
            await notifyAdmin({
                type: 'application',
                title: 'Membership Application Resubmitted',
                body: `${profile?.clinicName || profile?.fullName || user?.email || 'A clinic'} resubmitted their membership application for review.`,
                link: 'applications',
            });
            alert('Application resubmitted! Our team will review it again shortly.');
        } catch (err) {
            console.error('Error resubmitting application:', err);
            alert('Failed to resubmit application. Please try again.');
        }
    };

    // Accreditation is only accessible to approved (paid/active) members —
    // pending/rejected applicants have no active membership to accredit yet.
    const isApprovedMember = profile?.hasPaid === true;

    const NAV: { id: Tab; icon: string; label: string; badge?: number; disabled?: boolean }[] = [
        { id: 'overview', icon: 'grid_view', label: 'Dashboard' },
        { id: 'membership', icon: 'card_membership', label: 'Membership' },
        { id: 'accreditation', icon: 'verified_user', label: 'Accreditation', disabled: !isApprovedMember },
        { id: 'events', icon: 'event', label: 'Events Hub', badge: upcomingEvents.length },
  { id: 'inbox', icon: 'forum', label: 'Inbox', badge: unreadThreads },
  { id: 'notifications', icon: 'notifications', label: 'Broadcasts', badge: unreadCount },
  { id: 'profile', icon: 'manage_accounts', label: 'My Profile' },
    ];

    return (
        <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#0A0F1A] font-display flex overflow-hidden">

            {/* ── PAYMENT LOCK OVERLAY ── */}
            {needsPayment && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Blurred backdrop */}
                    <div className="absolute inset-0 bg-[#0A0F1A]/80 backdrop-blur-sm" />

                    {/* Payment card */}
                    <div className="relative w-full max-w-md bg-white dark:bg-[#111827] rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">

                        {/* Top accent bar */}
                        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-blue-400 to-primary" />

                        {isPaymentVerificationPending ? (
                            <div className="p-8 text-center">
                                {/* Icon + heading */}
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl text-emerald-500 animate-pulse" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Account Under Verification</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                                        We have received your membership application and payment proof. Our administrators are currently verifying your payment. Your account will be activated once verification is complete.
                                    </p>
                                </div>

                                {/* Account info */}
                                <div className="flex items-center justify-center gap-2 mb-5 px-1">
                                    <span className="material-symbols-outlined text-slate-400 text-base">person</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</span>
                                </div>

                                {/* Verification Status */}
                                <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 mb-5 border border-amber-200 dark:border-amber-500/25 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5">info</span>
                                    <div className="text-left">
                                        <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wider">Verification in Progress</p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-350 mt-1 leading-relaxed">Please wait for 1-2 business days for validation. You will be notified via email once approved.</p>
                                    </div>
                                </div>

                                {/* Buttons */}
                                <div className="space-y-3">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full py-4 bg-[#232323] hover:bg-[#1a1a1a] text-white rounded-2xl font-bold uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">logout</span>
                                        Back to Login
                                    </button>
                                    <button
                                        onClick={() => navigate('/')}
                                        className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-2xl font-bold uppercase tracking-widest active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-lg">home</span>
                                        Return Home
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8">
                                {/* Icon + heading */}
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                                        <span className="material-symbols-outlined text-3xl text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                                    </div>
                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Complete Your Membership</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Your account is verified. Pay your membership fee to unlock full access to your dashboard.
                                    </p>
                                </div>

                                {/* Account info */}
                                <div className="flex items-center gap-2 mb-5 px-1">
                                    <span className="material-symbols-outlined text-slate-400 text-base">person</span>
                                    <span className="text-xs text-slate-500 dark:text-slate-400 truncate">{user?.email}</span>
                                </div>

                                {/* What you'll get */}
                                <div className="bg-slate-50 dark:bg-white/[0.04] rounded-2xl p-4 mb-5 border border-slate-200 dark:border-white/5 space-y-2">
                                    {[
                                        'Priority seminar access with discounted rates',
                                        'Free legal advice and consultation',
                                        'Official PAHA badge and accreditation',
                                    ].map((f, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                                            <span className="material-symbols-outlined text-emerald-500 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                            {f}
                                        </div>
                                    ))}
                                </div>

                                {/* Pay button */}
                                <button
                                    onClick={() => navigate('/membership/payment')}
                                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-primary/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">payments</span>
                                    Proceed to Payment
                                </button>

                                {/* Sign out link */}
                                <p className="text-center text-xs text-slate-400 mt-4">
                                    Wrong account?{' '}
                                    <button onClick={signOut} className="text-primary font-semibold hover:underline">Sign out</button>
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── SIDEBAR ── */}
            <aside className={`
                ${sidebarCollapsed ? 'w-[72px]' : 'w-[260px]'}
                ${mobileOpen ? 'flex' : 'hidden lg:flex'}
                fixed inset-y-0 left-0 bg-white dark:bg-white border-r border-slate-200/60 dark:border-slate-200/60 flex-col h-screen z-40 transition-all duration-300
            `}>
                {/* Logo */}
                <div className={`flex items-center h-16 border-b border-slate-100 dark:border-slate-100 px-4 ${sidebarCollapsed ? 'justify-center' : 'gap-3 px-5'}`}>
                    <div className="size-9 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-white text-lg">pets</span>
                    </div>
                    {!sidebarCollapsed && (
                        <div className="flex-1 min-w-0">
                            <div className="text-slate-800 dark:text-slate-800 font-black text-sm tracking-tight leading-none">PAHA</div>
                            <div className="text-primary dark:text-primary text-[10px] font-black uppercase tracking-[0.2em] leading-none mt-0.5">MEMBER PORTAL</div>
                        </div>
                    )}
                    {!sidebarCollapsed && (
                        <button onClick={() => setSidebarCollapsed(true)} className="hidden lg:flex text-slate-400 hover:text-slate-600 transition-colors">
                            <span className="material-symbols-outlined text-lg">menu_open</span>
                        </button>
                    )}
                    {sidebarCollapsed && (
                        <button onClick={() => setSidebarCollapsed(false)} className="hidden lg:flex text-slate-400 hover:text-slate-600 transition-colors absolute right-2 top-4">
                            <span className="material-symbols-outlined text-lg">menu</span>
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
                    {!sidebarCollapsed && (
                        <div className="px-4 mb-3">
                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-[0.3em]">Main Menu</span>
                        </div>
                    )}
                    <div className="px-3 space-y-0.5">
                        {NAV.map(item => {
                            const isSelected = activeTab === item.id;
                            const style = navStyles[item.id] || navStyles.overview;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => { if (item.disabled) return; setActiveTab(item.id); setMobileOpen(false); }}
                                    disabled={item.disabled}
                                    title={item.disabled ? 'Available once your membership is approved' : (sidebarCollapsed ? item.label : undefined)}
                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition-all group relative border border-transparent
                                        ${item.disabled
                                            ? 'opacity-50 cursor-not-allowed text-slate-300 dark:text-slate-300'
                                            : isSelected
                                                ? style.activeBg
                                                : `text-slate-600 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-50/50 hover:text-slate-800 dark:hover:text-slate-800`
                                        }
                                        ${sidebarCollapsed ? 'justify-center' : ''}
                                    `}
                                >
                                    <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors shrink-0
                                        ${item.disabled
                                            ? 'bg-slate-50 dark:bg-slate-50 border-slate-100 dark:border-slate-100 text-slate-300 dark:text-slate-300'
                                            : isSelected
                                                ? style.iconBg
                                                : 'bg-slate-50 dark:bg-slate-50 border-slate-100 dark:border-slate-100 text-slate-400 dark:text-slate-400 group-hover:bg-slate-100 dark:group-hover:bg-slate-100 group-hover:text-slate-600 dark:group-hover:text-slate-600 group-hover:border-slate-200 dark:group-hover:border-slate-200'
                                        }
                                    `}>
                                        <span className="material-symbols-outlined text-[18px]">
                                            {item.disabled ? 'lock' : item.icon}
                                        </span>
                                    </div>
                                    {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                                    {!sidebarCollapsed && !!item.badge && !item.disabled && (
                                        <span className={`ml-auto text-[10px] font-black px-2 py-0.5 rounded-full min-w-[20px] text-center
                                            ${isSelected ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-100 text-slate-600 dark:text-slate-600'}
                                        `}>{item.badge}</span>
                                    )}
                                    {sidebarCollapsed && !!item.badge && !item.disabled && (
                                        <span className={`absolute top-1.5 right-1.5 size-2 rounded-full ${style.dot}`}></span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                </nav>

                {/* Profile + Logout */}
                <div className="border-t border-slate-100 dark:border-slate-100">
                    {!sidebarCollapsed && (
                        <div className="px-4 py-4 flex items-center gap-3">
                            <div className="size-9 rounded-xl bg-primary/10 dark:bg-primary/10 border border-primary/20 dark:border-primary/20 flex items-center justify-center text-primary dark:text-primary font-black text-sm shrink-0">
                                {memberName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-slate-800 dark:text-slate-800 font-bold text-sm truncate leading-tight">{memberName}</div>
                                <div className="text-slate-400 dark:text-slate-400 text-[10px] uppercase tracking-wider truncate">{memberEmail}</div>
                            </div>
                        </div>
                    )}
                    <div className={`px-3 pb-4 ${sidebarCollapsed ? 'flex justify-center pt-4' : ''}`}>
                        <button
                            onClick={handleLogout}
                            title="Sign Out"
                            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-50/50 transition-all font-semibold text-sm group ${sidebarCollapsed ? 'justify-center w-full' : 'w-full'}`}
                        >
                            <div className="w-8 h-8 rounded-xl bg-red-50 dark:bg-red-50 border border-red-100/50 dark:border-red-100/50 flex items-center justify-center text-red-500 group-hover:bg-red-100 shrink-0 transition-colors">
                                <span className="material-symbols-outlined text-xl shrink-0 group-hover:scale-110 transition-transform duration-200">logout</span>
                            </div>
                            {!sidebarCollapsed && 'System Logout'}
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile overlay */}
            {mobileOpen && <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />}

            {/* ── MAIN ── */}
            <div className={`flex-1 flex flex-col min-h-screen overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}`}>

                {/* Header */}
                <header className="h-16 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5 flex items-center justify-between px-5 md:px-8 sticky top-0 z-30 shrink-0">
                    <div className="flex items-center gap-4">
                        <button className="lg:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white" onClick={() => setMobileOpen(v => !v)}>
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.25em]">Session Active</span>
                            </div>
                            <span className="text-slate-900 dark:text-white font-black text-base uppercase tracking-tight leading-none">
                                {NAV.find(n => n.id === activeTab)?.label || 'Dashboard'}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button className="size-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-xl">search</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className="size-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 dark:text-white/40 hover:text-slate-900 dark:hover:text-white transition-colors relative"
                        >
                            <span className="material-symbols-outlined text-xl">notifications</span>
                            {unreadCount > 0 && (
                                <span className="absolute top-1 right-1 size-2 rounded-full bg-primary"></span>
                            )}
                        </button>
                        <div className="hidden md:flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <span className="text-[9px] font-black text-slate-500 dark:text-white/40 uppercase tracking-wider">CLIENT PORTAL</span>
                            <span className="text-[9px] font-black text-slate-400 dark:text-white/20">V1.0</span>
                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10"></div>
                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Secured Sync</span>
                        </div>
                        <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/30 cursor-pointer" onClick={() => setActiveTab('profile')}>
                            {memberName.charAt(0).toUpperCase()}
        </div>
      </div>
  </header>


      {/* Content */}
      <main className="flex-1 overflow-y-auto p-5 md:p-8">
                    <div className="max-w-[1400px] mx-auto">

                        {/* Unpaid / Inactive / Rejected Banner */}
                        {latestRejectedApp && !isApprovedMember ? (
                            <div className="mb-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-800 dark:text-red-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-red-500 flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider">Membership Application Not Approved</p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                            {latestRejectedApp.rejectionReason || 'No specific reason was provided.'} Go to the Membership tab to fix the issue and resubmit.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setActiveTab('membership')}
                                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">refresh</span>
                                    Reapply Application
                                </button>
                            </div>
                        ) : isUnpaid && (
                            <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-amber-500 flex-shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>info</span>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider">Account Inactive (Membership Dues Pending)</p>
                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                                            Your PAHA membership application has been approved, but your account is currently set to inactive because the annual dues have not yet been settled. You may still update your profile details below.
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate('/membership/payment')}
                                    className="flex-shrink-0 inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[11px] font-bold uppercase tracking-wider transition-colors shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-sm">payments</span>
                                    Pay Annual Dues
                                </button>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════
                             TAB: OVERVIEW / DASHBOARD
                        ══════════════════════════════════════════════ */}
                        {activeTab === 'overview' && (
                            <div className="space-y-6">
                                {/* Stats row */}
                                <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
                                    {[
                                        {
                                            label: 'Membership Status',
                                            sub: 'Active Directory',
                                            value: profile?.hasPaid ? 'Active' : 'Inactive',
                                            trend: profile?.hasPaid ? `Valid until ${expiryDateShortStr}` : 'Dues Pending',
                                            icon: profile?.hasPaid ? 'verified' : 'pending',
                                            iconBg: profile?.hasPaid ? 'bg-primary' : 'bg-amber-500',
                                            trendColor: profile?.hasPaid ? 'text-emerald-500' : 'text-amber-500',
                                        },
                                        {
                                            label: 'Pending Actions',
                                            sub: 'Approval Queue',
                                            value: '0',
                                            trend: 'All Clear',
                                            icon: 'pending_actions',
                                            iconBg: 'bg-orange-500',
                                            trendColor: 'text-emerald-500',
                                        },
                                        {
                                            label: 'Broadcasts',
                                            sub: 'Communication Hub',
                                            value: String(announcements.length),
                                            trend: 'Live',
                                            icon: 'campaign',
                                            iconBg: 'bg-violet-500',
                                            trendColor: 'text-emerald-500',
                                        },
                                        {
                                            label: 'My Registrations',
                                            sub: 'Events Hub',
                                            value: String(myRegistrations.length),
                                            trend: `${upcomingEvents.length} upcoming`,
                                            icon: 'event_available',
                                            iconBg: 'bg-teal-500',
                                            trendColor: 'text-teal-500',
                                        },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-white dark:bg-[#0F172A] rounded-xl sm:rounded-2xl border border-slate-200 dark:border-white/5 p-3.5 sm:p-5 shadow-sm hover:shadow-md transition-shadow group">
                                            <div className="flex items-start gap-2.5 sm:gap-4">
                                                <div className={`size-8 sm:size-12 ${s.iconBg} rounded-lg sm:rounded-2xl flex items-center justify-center text-white shadow-md sm:shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                                                    <span className="material-symbols-outlined text-base sm:text-xl">{s.icon}</span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-[7.5px] sm:text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] sm:tracking-[0.25em] leading-none mb-0.5 truncate">{s.sub}</div>
                                                    <div className={`text-[8.5px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-widest mb-1 truncate ${s.trendColor}`}>{s.trend}</div>
                                                </div>
                                            </div>
                                            <div className="mt-3 sm:mt-4">
                                                <div className="text-xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">{s.value}</div>
                                                <div className="text-[8.5px] sm:text-[10px] font-black text-slate-400 dark:text-white/30 uppercase tracking-wider sm:tracking-widest truncate">{s.label}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Accreditation Application Status */}
                                {(() => {
                                    if (!accredApp) {
                                        return (
                                            <div
                                                onClick={() => setActiveTab('accreditation')}
                                                className="bg-white dark:bg-[#0F172A] rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-5 shadow-sm flex items-center gap-5 cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-all group"
                                            >
                                                <div className="size-12 bg-slate-100 dark:bg-white/5 rounded-2xl flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                                                    <span className="material-symbols-outlined text-xl text-slate-400 group-hover:text-primary transition-colors">verified_user</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Accreditation</p>
                                                    <p className="font-black text-slate-700 dark:text-white text-sm">No application yet — Start your accreditation</p>
                                                    <p className="text-xs text-slate-400 mt-0.5">Click to begin the accreditation pipeline</p>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">arrow_forward</span>
                                            </div>
                                        );
                                    }

                                    const stages: { key: AccreditationApplication['status']; label: string }[] = [
                                        { key: 'intent_submitted', label: 'LOI' },
                                        { key: 'self_assessment_completed', label: 'Assessment' },
                                        { key: 'for_site_visit', label: 'Site Visit' },
                                        { key: 'under_review', label: 'Review' },
                                        { key: 'approved', label: 'Approved' },
                                        { key: 'for_payment', label: 'Payment' },
                                        { key: 'accredited', label: 'Accredited' },
                                    ];
                                    const stageOrder = stages.map(s => s.key);
                                    // Visit is done once a Visiting Evaluation Form exists (or status reflects it)
                                    const visited = accredApp.status === 'inspection_completed' || !!accredApp.visitData?.completedAt || ((accredApp.visitingEvaluationForms?.length ?? 0) > 0);
                                    const vefFailed = accredApp.status === 'vef_failed';
                                    let currentIdx = stageOrder.indexOf(accredApp.status);
                                    // Once visited, the Site Visit stage is complete — advance one step forward.
                                    // A FAILED visit stays pinned at Site Visit (revisit needed), not advanced.
                                    if (visited && !vefFailed) currentIdx = Math.max(currentIdx, stageOrder.indexOf('for_site_visit') + 1);
                                    else if (vefFailed) currentIdx = stageOrder.indexOf('for_site_visit');
                                    const progressPct = currentIdx >= 0 ? Math.round(((currentIdx + 1) / stageOrder.length) * 100) : 0;

                                    const statusColors: Record<string, { bg: string; text: string; dot: string }> = {
                                        intent_submitted:          { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-300',    dot: 'bg-blue-500' },
                                        intent_resubmitted:        { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500' },
                                        self_assessment_completed: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', dot: 'bg-purple-500' },
                                        for_site_visit:            { bg: 'bg-amber-100 dark:bg-amber-900/30',  text: 'text-amber-700 dark:text-amber-300',   dot: 'bg-amber-500' },
                                        inspection_completed:      { bg: 'bg-teal-100 dark:bg-teal-900/30',    text: 'text-teal-700 dark:text-teal-300',     dot: 'bg-teal-500' },
                                        under_review:              { bg: 'bg-violet-100 dark:bg-violet-900/30',text: 'text-violet-700 dark:text-violet-300',  dot: 'bg-violet-500' },
                                        needs_compliance:          { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500' },
                                        approved:                  { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
                                        for_payment:               { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-300',     dot: 'bg-blue-500' },
                                        paid:                      { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
                                        accredited:                { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
                                        rejected:                  { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500' },
                                        vef_failed:                { bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-700 dark:text-red-300',       dot: 'bg-red-500' },
                                    };
                                    const statusLabel = accredApp.status === 'needs_compliance' ? 'Failed'
                                        : vefFailed ? 'Site Visit Failed'
                                        : (visited && !['under_review', 'approved', 'for_payment', 'paid', 'accredited', 'needs_compliance'].includes(accredApp.status)) ? 'Visited'
                                        : (WORKFLOW_STATUS_LABELS[accredApp.status] || accredApp.status);
                                    const sc = (statusLabel === 'Visited' ? statusColors['inspection_completed'] : statusColors[accredApp.status]) || { bg: 'bg-slate-100', text: 'text-slate-700', dot: 'bg-slate-500' };

                                    return (
                                        <div
                                            onClick={() => setActiveTab('accreditation')}
                                            className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all group"
                                        >
                                            <div className="flex items-start justify-between gap-4 mb-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                                                        <span className="material-symbols-outlined text-lg text-primary">verified_user</span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Accreditation Application</p>
                                                        <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 mt-0.5">{accredApp.loiData?.loiRef || accredApp.id.slice(0,12)}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${sc.bg} ${sc.text}`}>
                                                        <span className={`size-1.5 rounded-full ${sc.dot} ${accredApp.status !== 'accredited' && accredApp.status !== 'rejected' ? 'animate-pulse' : ''}`}></span>
                                                        {statusLabel}
                                                    </span>
                                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg">arrow_forward</span>
                                                </div>
                                            </div>

                                            {/* Stage progress bar */}
                                            <div>
                                                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
                                                    <span>{accredApp.clinicName}</span>
                                                    <span>{progressPct}% complete</span>
                                                </div>
                                                <div className="h-2 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ${accredApp.status === 'rejected' ? 'bg-red-500' : accredApp.status === 'accredited' ? 'bg-emerald-500' : 'bg-primary'}`}
                                                        style={{ width: `${progressPct}%` }}
                                                    />
                                                </div>
                                                <div className="flex justify-between mt-2">
                                                    {stages.map((s, i) => (
                                                        <div key={s.key} className="flex flex-col items-center gap-0.5">
                                                            <div className={`size-2 rounded-full ${i <= currentIdx ? (accredApp.status === 'rejected' && i === currentIdx ? 'bg-red-500' : 'bg-primary') : 'bg-slate-200 dark:bg-white/10'}`} />
                                                            <span className="text-[8px] text-slate-300 dark:text-white/20 hidden sm:block">{s.label}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Rejection reason */}
                                            {accredApp.status === 'rejected' && accredApp.rejectionReason && (
                                                <div className="mt-3 px-3 py-2 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-500/20">
                                                    <p className="text-[10px] font-bold text-red-600 dark:text-red-400">Rejection reason: {accredApp.rejectionReason}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                {/* Activity + Right panel */}
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                                    {/* Activity Stream */}
                                    <div className="xl:col-span-2 bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                        <div className="flex items-start justify-between p-6 pb-4 border-b border-slate-100 dark:border-white/5">
                                            <div>
                                                <h2 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Activity Stream</h2>
                                                <p className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.25em] mt-0.5">Operational Chronology</p>
                                            </div>
                                            <div className="flex gap-1.5">
                                                {['Live', 'Events', 'Audit'].map(t => (
                                                    <button key={t} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-colors ${t === 'Live' ? 'border-slate-900 dark:border-white/30 text-slate-900 dark:text-white' : 'border-slate-200 dark:border-white/5 text-slate-400 dark:text-white/20 hover:border-slate-400'}`}>{t}</button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                                            {/* Real registrations */}
                                            {myRegistrations.slice(0, 2).map((reg) => {
                                                const ev = events.find(e => e.id === reg.eventId);
                                                return (
                                                    <div key={reg.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                        <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-primary text-lg">event_available</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Event Registration</div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                                                                {ev ? `Registered for ${ev.title}` : 'Event registration confirmed'}
                                                            </div>
                                                        </div>
                                                        <div className="text-[10px] font-bold text-slate-400 shrink-0">
                                                            {reg.registrationDate ? new Date(reg.registrationDate).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) : '—'}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {/* Announcements as activity */}
                                            {latestAnnouncements.slice(0, 3).map((ann: any, i) => (
                                                <div key={ann.id} className="flex items-start gap-4 p-5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                                                    <div className={`size-10 rounded-2xl flex items-center justify-center shrink-0 ${i === 0 ? 'bg-orange-500/10' : i === 1 ? 'bg-emerald-500/10' : 'bg-violet-500/10'}`}>
                                                        <span className={`material-symbols-outlined text-lg ${i === 0 ? 'text-orange-500' : i === 1 ? 'text-emerald-500' : 'text-violet-500'}`}>
                                                            {i === 0 ? 'campaign' : i === 1 ? 'event_available' : 'notifications'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">New Broadcast</div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{ann.title}</div>
                                                    </div>
                                                    <div className="text-[10px] font-bold text-slate-400 shrink-0">
                                                        {formatAnnDate(ann.date) || <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/20 text-[9px] font-black uppercase tracking-wider">Finished</span>}
                                                    </div>
                                                </div>
                                            ))}
                                            {myRegistrations.length === 0 && announcements.length === 0 && (
                                                <div className="p-8 text-center text-slate-400 dark:text-white/20 text-sm font-bold">No recent activity</div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Membership card + Quick Actions */}
                                    <div className="space-y-5 flex flex-col items-center xl:items-stretch">
                                        {/* Membership Card Widget */}
                                        <div 
                                            style={{
                                                background: cardDesign.backgroundType === 'solid' 
                                                    ? cardDesign.solidColor 
                                                    : cardDesign.backgroundType === 'image' 
                                                        ? `url(${cardDesign.backgroundImageUrl}) center/cover no-repeat` 
                                                        : `linear-gradient(${
                                                            cardDesign.gradientDirection === 'to-r' ? '90deg' 
                                                            : cardDesign.gradientDirection === 'to-b' ? '180deg' 
                                                            : cardDesign.gradientDirection === 'to-tr' ? '45deg' 
                                                            : '135deg'
                                                        }, ${cardDesign.gradientStart}, ${cardDesign.gradientVia}, ${cardDesign.gradientEnd})`,
                                                color: cardDesign.textColor === 'light' ? '#FFFFFF' : '#0F172A'
                                            }}
                                            className="relative w-full max-w-[380px] sm:max-w-full xl:max-w-[380px] aspect-[1.586/1] rounded-2xl p-5 shadow-2xl overflow-hidden flex flex-col justify-between"
                                        >
                                            {cardDesign.showPatternOverlay && (
                                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                                    <div className="absolute top-2 right-2 size-32 rounded-full border-4 border-current"></div>
                                                    <div className="absolute top-10 right-10 size-32 rounded-full border-4 border-current"></div>
                                                </div>
                                            )}

                                            <div className="relative z-10 h-full flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-[7px] font-black uppercase tracking-[0.3em] opacity-60 mb-0.5">Philippine Animal Hospital Association</div>
                                                        <div className="text-xs font-black tracking-tight">{cardDesign.cardTitle || 'MEMBERSHIP CARD'}</div>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        {cardDesign.icon === 'custom' && cardDesign.customIconUrl ? (
                                                            <img src={cardDesign.customIconUrl} alt="Logo" className="h-10 w-auto object-contain" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl">{cardDesign.icon === 'custom' ? 'pets' : cardDesign.icon}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3.5 my-auto">
                                                    <div className="size-16 rounded-xl border border-current/25 bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                        {profile?.photoUrl ? (
                                                            <img src={profile.photoUrl} alt="Profile" className="size-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl opacity-75">account_circle</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div>
                                                            <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Member Name</div>
                                                            <div className="text-xs font-black tracking-wide leading-tight truncate">{formattedCardName}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Facility</div>
                                                            <div className="font-bold text-[10px] leading-tight truncate">{clinicName}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-end pt-2 border-t border-current/10">
                                                    <div>
                                                        <div className="text-[7px] opacity-60 uppercase tracking-widest mb-0.5">Valid Until</div>
                                                        <div className="font-bold text-[10px]">{expiryDateShortStr}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Secured Environment */}
                                        <div className="bg-[#0A0F1A] rounded-2xl border border-white/5 p-5 text-white w-full max-w-[380px] sm:max-w-full xl:max-w-[380px]">
                                            <div className="text-[9px] font-black text-white/30 uppercase tracking-[0.3em] mb-4">System Monitor</div>
                                            {[
                                                { label: 'Membership Status', value: 'Active', pct: 100, color: 'bg-primary' },
                                                { label: 'Accreditation', value: accredApp ? (WORKFLOW_STATUS_LABELS[accredApp.status] || accredApp.status) : 'Not Started', pct: accredApp ? Math.round(((ACCRED_STAGE_ORDER[accredApp.status] ?? 1) / 8) * 100) : 0, color: accredApp?.status === 'accredited' ? 'bg-emerald-500' : accredApp?.status === 'rejected' ? 'bg-red-500' : 'bg-amber-500' },
                                                { label: 'Events Registered', value: `${myRegistrations.length} / ${upcomingEvents.length || '—'}`, pct: upcomingEvents.length ? Math.round((myRegistrations.length / upcomingEvents.length) * 100) : 0, color: 'bg-teal-500' },
                                            ].map((item, i) => (
                                                <div key={i} className="mb-4 last:mb-0">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">{item.label}</span>
                                                        <span className="text-[10px] font-black text-white/70">{item.value}</span>
                                                    </div>
                                                    <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.pct}%` }}></div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between">
                                                <div className="text-center">
                                                    <span className="material-symbols-outlined text-white/20 text-2xl block mb-1">lock</span>
                                                    <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">Secured Environment</div>
                                                    <div className="text-[8px] text-white/20 uppercase tracking-widest">TLS 1.3 / AES-256</div>
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Nodes Synchronized</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════
                             TAB: MEMBERSHIP
                        ══════════════════════════════════════════════ */}
                        {activeTab === 'membership' && (() => {
                            // Required Documents Checklist must be 100% complete before the
                            // member is allowed to (re)apply — an admin rejection for a
                            // documents issue wipes the flagged files, so this naturally
                            // re-locks the button until they're re-uploaded.
                            const membershipDocs = profile?.membershipDocuments || {};
                            const memberBusinessType = profile?.businessType || '';
                            const memberActiveReqs = memberBusinessType === 'sole_proprietorship' ? SOLE_PROPRIETORSHIP_REQS
                                : memberBusinessType === 'teaching_hospital' ? TEACHING_HOSPITAL_REQS
                                : memberBusinessType === 'partnership_corporation' ? PARTNERSHIP_CORP_REQS
                                : [];
                            const docsComplete = memberActiveReqs.length > 0 && memberActiveReqs.every(r => membershipDocs[r.id]?.length > 0);

                            // If the admin rejected for a payment issue, the proof of payment
                            // was wiped (paymentStatus reset to 'unpaid', paymentReference
                            // cleared) — the member must re-submit proof before they can
                            // reapply, same gate as the documents checklist above.
                            const paymentProofOk = !latestRejectedApp
                                || (!!latestRejectedApp.paymentReference && latestRejectedApp.paymentStatus !== 'unpaid');
                            const canReapply = docsComplete && paymentProofOk;

                            return (
                            <div className="space-y-6">
                                {/* Rejected Application Banner — lets the member fix the issue and resend */}
                                {latestRejectedApp && !isApprovedMember && (
                                    <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20 rounded-2xl p-6 space-y-3">
                                        <div className="flex items-start gap-3">
                                            <span className="material-symbols-outlined text-red-500 text-2xl shrink-0">error</span>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-black uppercase tracking-wider text-red-700 dark:text-red-400">Membership Application Not Approved</h3>
                                                <p className="text-xs text-red-600 dark:text-red-400/90 mt-1.5">
                                                    {latestRejectedApp.rejectionReason || 'No specific reason was provided.'}
                                                </p>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 pl-9">
                                            Fix the issue above — e.g. re-upload a corrected document below — then resubmit your application for another review.
                                        </p>
                                        <div className="pl-9 space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <button
                                                    onClick={handleResubmitApplication}
                                                    disabled={!canReapply}
                                                    title={!canReapply ? 'Complete the Required Documents Checklist and re-upload your proof of payment before reapplying.' : undefined}
                                                    className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600"
                                                >
                                                    <span className="material-symbols-outlined text-base">refresh</span>
                                                    Reapply Application
                                                </button>
                                                {!paymentProofOk && (
                                                    <button
                                                        onClick={() => navigate('/membership/payment')}
                                                        className="px-5 py-2.5 bg-white dark:bg-white/5 border border-red-300 dark:border-red-500/30 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 hover:bg-red-50 dark:hover:bg-red-500/10"
                                                    >
                                                        <span className="material-symbols-outlined text-base">upload</span>
                                                        Re-upload Payment Proof
                                                    </button>
                                                )}
                                            </div>
                                            {!docsComplete && (
                                                <p className="text-[10px] text-red-500 font-semibold">Complete the Required Documents Checklist below to unlock this button.</p>
                                            )}
                                            {!paymentProofOk && (
                                                <p className="text-[10px] text-red-500 font-semibold">Your proof of payment was flagged and removed — re-upload it before reapplying.</p>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Onboarding & Document Verification Banner */}
                                {(() => {
                                    const currentDocs = profile?.membershipDocuments || {};
                                    const businessType = profile?.businessType || '';
                                    const activeReqs = businessType === 'sole_proprietorship' ? SOLE_PROPRIETORSHIP_REQS
                                        : businessType === 'teaching_hospital' ? TEACHING_HOSPITAL_REQS
                                        : businessType === 'partnership_corporation' ? PARTNERSHIP_CORP_REQS
                                        : [];
                                    const totalReqs = activeReqs.length;
                                    const uploadedCount = activeReqs.filter(r => currentDocs[r.id]?.length > 0).length;
                                    const percentComplete = totalReqs > 0 ? Math.round((uploadedCount / totalReqs) * 100) : 0;

                                    return (
                                        <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm space-y-6">
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-white/5 pb-5">
                                                <div>
                                                    <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary">verified_user</span>
                                                        PAHA Membership Onboarding & Document Verification
                                                    </h2>
                                                    <p className="text-[11px] text-slate-400 mt-1">Please select your business structure and upload all required documents to complete your application.</p>
                                                </div>
                                                <div className="flex items-center gap-3 shrink-0">
                                                    <span className={`px-2.5 py-1 rounded-[10px] text-[9px] font-black uppercase tracking-widest ${percentComplete === 100 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400 animate-pulse'}`}>
                                                        {percentComplete === 100 ? 'Complete' : 'Incomplete Profile'}
                                                    </span>
                                                    <div className="w-24 bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                                                        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percentComplete}%` }}></div>
                                                    </div>
                                                    <span className="text-xs font-black text-slate-700 dark:text-white">{percentComplete}%</span>
                                                </div>
                                            </div>

                                            {/* Selection for Business Type */}
                                            <div className="space-y-3">
                                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Business Structure *</label>
                                                {uploadedCount > 0 && (
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs">lock</span>
                                                            Business structure locked once documents are uploaded — the other options are unavailable.
                                                        </p>
                                                        {(profile as any)?.businessTypeChangeRequested ? (
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                                                <span className="material-symbols-outlined text-xs animate-pulse">hourglass_empty</span>
                                                                Change request pending admin approval
                                                            </span>
                                                        ) : (
                                                            <button
                                                                type="button"
                                                                onClick={handleRequestBusinessTypeChange}
                                                                className="text-[10px] font-black uppercase tracking-wider text-primary hover:underline flex items-center gap-1"
                                                            >
                                                                <span className="material-symbols-outlined text-xs">sync_alt</span>
                                                                Request Business Structure Change
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    {[
                                                        { id: 'sole_proprietorship', label: 'Sole Proprietorship', icon: 'person', desc: 'Individually owned veterinary clinic' },
                                                        { id: 'partnership_corporation', label: 'Partnership / Corporation', icon: 'corporate_fare', desc: 'Co-owned or incorporated business' },
                                                        { id: 'teaching_hospital', label: 'Veterinary Teaching Hospital', icon: 'school', desc: 'University-affiliated teaching hospital' }
                                                    ].map(type => {
                                                        const isActive = selectedBusinessType === type.id;
                                                        const isLocked = uploadedCount > 0 && type.id !== businessType;
                                                        return (
                                                            <button
                                                                key={type.id}
                                                                onClick={() => !isLocked && setSelectedBusinessType(type.id as any)}
                                                                disabled={isLocked}
                                                                title={isLocked ? 'Documents already uploaded for your current business structure. Request a change to switch.' : undefined}
                                                                className={`relative p-4 rounded-xl border text-left transition-all flex items-start gap-3.5 ${
                                                                    isActive
                                                                        ? 'border-primary bg-primary/[0.03] shadow-md shadow-primary/5 dark:bg-primary/5'
                                                                        : isLocked
                                                                            ? 'border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] opacity-50 cursor-not-allowed'
                                                                            : 'border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/10 bg-slate-50/50 dark:bg-transparent'
                                                                }`}
                                                            >
                                                                {isLocked && (
                                                                    <span className="material-symbols-outlined absolute top-2 right-2 text-slate-400 text-sm">lock</span>
                                                                )}
                                                                <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                                    isActive ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                                                                }`}>
                                                                    <span className="material-symbols-outlined text-xl">{type.icon}</span>
                                                                </div>
                                                                <div>
                                                                    <div className="font-black text-xs text-slate-800 dark:text-white">{type.label}</div>
                                                                    <div className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{type.desc}</div>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                                {selectedBusinessType !== '' && selectedBusinessType !== businessType && (
                                                    <div className="flex items-center gap-3">
                                                        <button
                                                            type="button"
                                                            disabled={businessTypeSaving}
                                                            onClick={() => handleSetBusinessType(selectedBusinessType as any)}
                                                            className="px-4 py-2 rounded-xl bg-primary text-white font-black text-[10px] uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {businessTypeSaving ? 'Saving…' : 'Save Business Structure'}
                                                        </button>
                                                        <span className="text-[10px] text-slate-400">You can keep changing your selection until you save.</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Requirements Checklist & Uploads */}
                                            {businessType && activeReqs.length > 0 ? (
                                                <div className="space-y-4">
                                                    <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/5 pt-4">
                                                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Required Documents Checklist ({uploadedCount} of {totalReqs})</label>
                                                        <span className="text-[9px] text-slate-400 dark:text-white/30 uppercase font-black">Formats: PDF, JPG, PNG (Max 5MB / Video 25MB)</span>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        {activeReqs.map(req => {
                                                            const files = currentDocs[req.id] || [];
                                                            const isUploaded = files.length > 0;
                                                            const isUploading = uploadingDocs[req.id];

                                                            return (
                                                                <div key={req.id} className="p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/[0.15] dark:bg-white/[0.01] flex items-center justify-between gap-4">
                                                                    <div className="flex items-start gap-3 min-w-0">
                                                                        <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${
                                                                            isUploaded ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-500/10 dark:text-amber-400'
                                                                        }`}>
                                                                            <span className="material-symbols-outlined text-base">{isUploaded ? 'check_circle' : req.icon}</span>
                                                                        </div>
                                                                        <div className="min-w-0">
                                                                            <div className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                                                                                {req.label}
                                                                                {isUploaded && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded font-black uppercase tracking-wider">Uploaded</span>}
                                                                            </div>
                                                                            <div className="text-[9px] text-slate-400 mt-0.5 leading-relaxed truncate" title={req.desc}>{req.desc}</div>
                                                                            {isUploaded && (
                                                                                <div className="mt-1.5 flex items-center gap-2">
                                                                                    <a href={files[0].url} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5">
                                                                                        <span className="material-symbols-outlined text-xs">visibility</span>View File
                                                                                    </a>
                                                                                    <span className="text-slate-300 dark:text-white/10">|</span>
                                                                                    <button onClick={() => handleDocDelete(req.id)} className="text-[10px] font-bold text-red-500 hover:underline flex items-center gap-0.5">
                                                                                        <span className="material-symbols-outlined text-xs">delete</span>Delete
                                                                                    </button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                    {!isUploaded && (
                                                                        <label className={`px-3 py-1.5 rounded-[10px] font-black text-[10px] uppercase tracking-widest flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
                                                                            isUploading ? 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-white/20' : 'bg-primary text-white hover:bg-primary/90'
                                                                        }`}>
                                                                            <span className="material-symbols-outlined text-xs">{isUploading ? 'sync' : 'upload'}</span>
                                                                            {isUploading ? 'Uploading...' : 'Upload'}
                                                                            <input
                                                                                type="file"
                                                                                accept={req.id === 'walkthrough_video' ? 'video/*' : 'image/*,application/pdf'}
                                                                                onChange={e => handleDocUpload(req.id, e)}
                                                                                className="hidden"
                                                                                disabled={isUploading}
                                                                            />
                                                                        </label>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="p-8 text-center border border-dashed border-slate-200 dark:border-white/5 rounded-xl">
                                                    <span className="material-symbols-outlined text-slate-300 dark:text-white/10 text-4xl block mb-2">assignment_late</span>
                                                    <div className="font-bold text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider">Please Select a Business Structure Above</div>
                                                    <p className="text-[10px] text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">This determines which documents you are required to submit for your membership verification.</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}

                                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
                                    {/* Column 1: Virtual Card + Membership Info */}
                                    <div className="lg:col-span-2 space-y-4 max-w-md">
                                        <div 
                                            style={{
                                                background: cardDesign.backgroundType === 'solid' 
                                                    ? cardDesign.solidColor 
                                                    : cardDesign.backgroundType === 'image' 
                                                        ? `url(${cardDesign.backgroundImageUrl}) center/cover no-repeat` 
                                                        : `linear-gradient(${
                                                            cardDesign.gradientDirection === 'to-r' ? '90deg' 
                                                            : cardDesign.gradientDirection === 'to-b' ? '180deg' 
                                                            : cardDesign.gradientDirection === 'to-tr' ? '45deg' 
                                                            : '135deg'
                                                        }, ${cardDesign.gradientStart}, ${cardDesign.gradientVia}, ${cardDesign.gradientEnd})`,
                                                color: cardDesign.textColor === 'light' ? '#FFFFFF' : '#0F172A'
                                            }}
                                            className="relative w-full aspect-[1.586/1] rounded-[10px] p-5 shadow-xl overflow-hidden select-none border border-white/10 flex flex-col justify-between"
                                        >
                                            {cardDesign.showPatternOverlay && (
                                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                                    <div className="absolute top-2 right-2 size-36 rounded-full border-2 border-current"></div>
                                                    <div className="absolute top-10 right-10 size-36 rounded-full border-2 border-current"></div>
                                                    <div className="absolute -bottom-6 -left-6 size-36 rounded-full border-2 border-current"></div>
                                                </div>
                                            )}

                                            <div className="relative z-10 h-full flex flex-col justify-between">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <div className="text-[7px] font-bold uppercase tracking-[0.2em] opacity-80">Philippine Animal Hospital Association</div>
                                                        <div className="text-xs font-black tracking-tight leading-none mt-0.5">{cardDesign.cardTitle || 'MEMBERSHIP CARD'}</div>
                                                    </div>
                                                    <div className="flex-shrink-0">
                                                        {cardDesign.icon === 'custom' && cardDesign.customIconUrl ? (
                                                            <img src={cardDesign.customIconUrl} alt="Logo" className="h-10 w-auto object-contain" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl">{cardDesign.icon === 'custom' ? 'pets' : cardDesign.icon}</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3.5 my-auto">
                                                    <div className="size-16 rounded-xl border border-current/25 bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                                        {profile?.photoUrl ? (
                                                            <img src={profile.photoUrl} alt="Profile" className="size-full object-cover" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-3xl opacity-75">account_circle</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 space-y-1">
                                                        <div>
                                                            <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Member Name</div>
                                                            <div className="text-xs font-black tracking-wide leading-tight truncate">{formattedCardName}</div>
                                                        </div>
                                                        <div>
                                                            <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Facility</div>
                                                            <div className="font-bold text-[10px] leading-tight truncate">{clinicName}</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex justify-between items-end pt-2 border-t border-current/10">
                                                    <div>
                                                        <div className="text-[7px] opacity-60 uppercase tracking-wider mb-0.5">Valid Until</div>
                                                        <div className="font-bold text-xs leading-none">{expiryDateShortStr}</div>
                                                    </div>
                                                    <div className="px-2 py-0.5 rounded bg-white/20 text-[8px] font-black uppercase tracking-wider">
                                                        {profile?.ownerName || profile?.representativeName || '—'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <button className="w-full py-2.5 rounded-[10px] bg-primary text-white font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-primary/90 transition-all shadow-md shadow-primary/20">
                                            <span className="material-symbols-outlined text-base">download</span>Download Certificate
                                        </button>

                                        
                                        {isApprovedMember && (
                                            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-500/20 rounded-[10px] p-4 flex gap-3">
                                                <span className="material-symbols-outlined text-amber-500 shrink-0">schedule</span>
                                                <div>
                                                    <div className="font-black text-amber-800 dark:text-amber-400 text-sm">Renewal Reminder</div>
                                                    <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 leading-relaxed">Membership due for renewal on <strong>{expiryDateStr}</strong>. Renewal fee: <strong>₱2,000.00</strong>.</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="lg:col-span-3 space-y-4">
                                        <div className="bg-white dark:bg-[#0F172A] rounded-[10px] border border-slate-200 dark:border-white/5 shadow-sm overflow-visible">
                                            {(() => {
                                                const isAccredited = profile?.isAccredited === true;
                                                const repLimit = isAccredited ? 5 : 2;
                                                const activeReps = reps.filter(r => (r.status ?? 'active') === 'active');
                                                const atLimit = activeReps.length >= repLimit;
                                                return (
                                                    <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5">
                                                        <div>
                                                            <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-tight">Clinic Representatives</h3>
                                                            <p className="text-[10px] text-slate-400 mt-0.5">{activeReps.length} active of {repLimit} slots</p>
                                                        </div>
                                                        <button
                                                            onClick={() => !atLimit && setShowAddRep(true)}
                                                            disabled={atLimit}
                                                            title={atLimit ? `Maximum ${repLimit} active representatives for ${isAccredited ? 'accredited' : 'regular'} members` : 'Add representative'}
                                                            className={`px-3 py-1.5 rounded-[10px] font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 transition-all ${
                                                                atLimit
                                                                    ? 'bg-slate-100 dark:bg-white/5 text-slate-400 cursor-not-allowed'
                                                                    : 'bg-primary text-white hover:bg-primary/90 shadow-md shadow-primary/20'
                                                            }`}
                                                        >
                                                            <span className="material-symbols-outlined text-xs">person_add</span>Add
                                                        </button>
                                                    </div>
                                                );
                                            })()}
                                            {(() => {
                                                const isAccredited = profile?.isAccredited === true;
                                                const repLimit = isAccredited ? 5 : 2;
                                                const activeReps = reps.filter(r => (r.status ?? 'active') === 'active');
                                                const atLimit = activeReps.length >= repLimit;
                                                return (
                                                    <>
                                                        <div className="divide-y divide-slate-50 dark:divide-white/5">
                                                            {reps.length === 0 ? (
                                                                <div className="p-6 text-center text-slate-400 text-xs">
                                                                    No representatives added yet.
                                                                </div>
                                                            ) : reps.map(rep => {
                                                                const isActive = (rep.status ?? 'active') === 'active';
                                                                return (
                                                                    <div key={rep.id} className={`flex items-center gap-3 p-3.5 transition-colors ${isActive ? 'hover:bg-slate-50 dark:hover:bg-white/[0.02]' : 'bg-slate-50/60 dark:bg-white/[0.01] opacity-60'}`}>
                                                                        {rep.image ? (
                                                                            <img src={rep.image} className="size-8 rounded-[10px] object-cover shrink-0" alt={rep.name} />
                                                                        ) : (
                                                                            <div className={`size-8 rounded-[10px] flex items-center justify-center text-white font-black text-xs shrink-0 ${rep.isPrimary && isActive ? 'bg-primary shadow-md shadow-primary/20' : 'bg-slate-400'}`}>
                                                                                {rep.name.charAt(0)}
                                                                            </div>
                                                                        )}
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-bold text-slate-900 dark:text-white text-xs truncate">{rep.name}</div>
                                                                            <div className="text-[10px] text-slate-400 dark:text-white/30 truncate">{rep.designation} · PRC {rep.prc}</div>
                                                                            <div className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1 ${isActive ? 'text-primary/70' : 'text-slate-400'}`}>
                                                                                <span className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                                                {rep.isPrimary ? 'Primary' : 'Rep'} — {isActive ? 'Active' : 'Inactive'}
                                                                            </div>
                                                                        </div>
                                                                        <div className="relative">
                                                                            <button
                                                                                onClick={() => setRepDropdown(repDropdown === rep.id ? null : rep.id)}
                                                                                className="p-1.5 rounded-[10px] hover:bg-slate-100 dark:hover:bg-white/10 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-all"
                                                                            >
                                                                                <span className="material-symbols-outlined text-base">more_vert</span>
                                                                            </button>
                                                                            {repDropdown === rep.id && (
                                                                                <>
                                                                                    <div className="fixed inset-0 z-10" onClick={() => setRepDropdown(null)} />
                                                                                    <div className="absolute right-0 top-8 z-20 bg-white dark:bg-[#1E293B] rounded-[10px] shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden w-36 animate-fade-in text-xs">
                                                                                        {isActive ? (
                                                                                            <button
                                                                                                onClick={() => handleToggleRepStatus(rep.id, 'inactive')}
                                                                                                className="w-full flex items-center gap-2 px-3.5 py-2.5 font-semibold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-left"
                                                                                            >
                                                                                                <span className="material-symbols-outlined text-sm">person_off</span>
                                                                                                Deactivate
                                                                                            </button>
                                                                                        ) : (
                                                                                            <button
                                                                                                onClick={() => handleToggleRepStatus(rep.id, 'active')}
                                                                                                className="w-full flex items-center gap-2 px-3.5 py-2.5 font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors text-left"
                                                                                            >
                                                                                                <span className="material-symbols-outlined text-sm">person_check</span>
                                                                                                Activate
                                                                                            </button>
                                                                                        )}
                                                                                        <div className="border-t border-slate-100 dark:border-white/5" />
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setRepForm({
                                                                                                    name: rep.name,
                                                                                                    designation: rep.designation,
                                                                                                    prc: rep.prc,
                                                                                                    contact: rep.contact || '',
                                                                                                    email: rep.email || '',
                                                                                                    isPrimary: rep.isPrimary || false,
                                                                                                    image: rep.image || ''
                                                                                                });
                                                                                                setEditingRepId(rep.id);
                                                                                                setShowAddRep(true);
                                                                                                setRepDropdown(null);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2 px-3.5 py-2.5 font-semibold text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-colors text-left"
                                                                                        >
                                                                                            <span className="material-symbols-outlined text-sm">edit</span>
                                                                                            Edit Details
                                                                                        </button>
                                                                                        {isActive && !rep.isPrimary && (
                                                                                            <button
                                                                                                onClick={() => handleSetPrimaryRep(rep.id)}
                                                                                                className="w-full flex items-center gap-2 px-3.5 py-2.5 font-semibold text-primary hover:bg-primary/5 transition-colors text-left"
                                                                                            >
                                                                                                <span className="material-symbols-outlined text-sm">star</span>
                                                                                                Make Primary
                                                                                            </button>
                                                                                        )}
                                                                                        <div className="border-t border-slate-100 dark:border-white/5" />
                                                                                        <button
                                                                                            onClick={() => handleDeleteRep(rep.id)}
                                                                                            className="w-full flex items-center gap-2 px-3.5 py-2.5 font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                                                                                        >
                                                                                            <span className="material-symbols-outlined text-sm">delete</span>
                                                                                            Delete Rep
                                                                                        </button>
                                                                                    </div>
                                                                                </>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="px-4 py-2.5 bg-slate-50 dark:bg-white/[0.02] border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                                                {activeReps.length} active / {repLimit} limit
                                                            </p>
                                                            {atLimit && (
                                                                <p className="text-[9px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-0.5">
                                                                    <span className="material-symbols-outlined text-xs">warning</span>
                                                                    Full
                                                                </p>
                                                            )}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                        {/* Membership Info */}
                                        <div className="bg-white dark:bg-[#0F172A] rounded-[10px] border border-slate-200 dark:border-white/5 p-5 shadow-sm">
                                            <div className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-white/30 mb-4">Membership Information</div>
                                            <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                                                {[
                                                    { label: 'Membership Type', value: `${profile?.membershipType || profile?.type || 'Regular'} Member`, icon: 'badge' },
                                                    { label: 'Member Since', value: memberSinceStr, icon: 'calendar_today' },
                                                    { label: 'Expiry Date', value: expiryDateStr, icon: 'event_busy' },
                                                    { label: 'Chapter', value: profile?.clinicAddress?.includes('Manila') ? 'Metro Manila' : 'Regional Chapter', icon: 'location_city' },
                                                    { label: 'Annual Dues', value: annualDuesStr, icon: 'payments' },
                                                    { label: 'Payment Status', value: profile?.hasPaid ? 'Paid (Active)' : 'Unpaid (Inactive)', icon: 'check_circle' },
                                                ].map((item, i) => (
                                                    <div key={i} className="flex items-center gap-2">
                                                        <div className="size-7 rounded-[8px] bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                                            <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-white/30">{item.icon}</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="text-[8px] font-black text-slate-400 dark:text-white/30 uppercase tracking-wider">{item.label}</div>
                                                            <div className={`text-xs font-bold leading-tight ${item.label === 'Payment Status' ? (profile?.hasPaid ? 'text-emerald-500' : 'text-amber-500') : 'text-slate-800 dark:text-white'}`}>{item.value}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>


                                {/* Qualifications & Benefits of Membership */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    {/* Qualifications */}
                                    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                            <span className="material-symbols-outlined text-primary text-base">verified</span>
                                            <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">Qualifications of Membership</h3>
                                        </div>
                                        <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                            <p className="font-bold">To be qualified as a member of the association, an applicant must be:</p>
                                            <ul className="list-decimal pl-4 space-y-2">
                                                <li>
                                                    A bona fide institution represented by a licensed veterinarian. Membership is non-transferable:
                                                    <ul className="list-disc pl-4 mt-1 space-y-1 text-[11px]">
                                                        <li><strong>Single Proprietorship:</strong> The sole proprietor automatically represents the establishment provided they are a licensed veterinarian.</li>
                                                        <li><strong>Partnerships:</strong> Certificate of agreement among partners indicating representative is required.</li>
                                                        <li><strong>Corporation & Teaching Hospital:</strong> A board resolution appointing the individual as representative must be submitted.</li>
                                                    </ul>
                                                </li>
                                                <li><strong>Attendance Policy:</strong> Delisting warning applies if a member fails to attend meetings for each year for the immediately preceding two (2) years.</li>
                                                <li>Should be an ethical practitioner.</li>
                                                <li><strong>Basic Clinic Set-up:</strong> Enclosed air-conditioned surgery room, well ventilated clinic area, autoclave/sterilizer, microscope.</li>
                                            </ul>
                                        </div>
                                    </div>

                                    {/* Benefits */}
                                    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm space-y-4">
                                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                            <span className="material-symbols-outlined text-emerald-500 text-base">card_membership</span>
                                            <h3 className="font-black text-slate-900 dark:text-white text-xs uppercase tracking-wider">Benefits to be a Member</h3>
                                        </div>
                                        <div className="space-y-3.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                                            <ul className="list-disc pl-4 space-y-1.5">
                                                <li>Discounted rates in hotel and accommodation.</li>
                                                <li>Free lectures during membership meetings.</li>
                                                <li>Discounted rates for all trainings, workshops, seminars, and conventions.</li>
                                                <li>Priority registration for workshops, trainings, seminars, and conventions.</li>
                                                <li>Free round-table discussions with the speakers at every workshop and convention.</li>
                                                <li>Official PAHA badge.</li>
                                                <li>Discounted rates for official vaccination cards.</li>
                                                <li>Free legal advice/assistance related to the practice of veterinary medicine.</li>
                                                <li>Listing on the official PAHA Facebook company page.</li>
                                            </ul>

                                            <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/10 rounded-xl p-4 mt-2">
                                                <div className="font-black text-blue-900 dark:text-blue-400 text-[10px] uppercase tracking-wider flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-xs">payments</span>Application Fee
                                                </div>
                                                <p className="text-[11px] text-blue-700 dark:text-blue-500 mt-1 leading-normal font-bold">
                                                    Pay the application fee of Php 5,000 upon approval of the application.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Note Section */}
                                <div className="bg-slate-50 dark:bg-white/[0.01] rounded-2xl border border-slate-200/60 dark:border-white/5 p-5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-6">
                                    <p><strong>Note:</strong> Associate members or branches of good standing of a member-institution shall not be considered as a separate institution and shall have the rights of a member; except the right to vote on all matters relating to the affairs of the association and be voted for any elective or appointive office. Each member-institution is entitled to two (2) associates; but the Board of Trustees may increase such number of associates upon a duly approved resolution with 2/3 votes of its members.</p>
                                </div>

                                {/* Add Representative Modal */}
                                {showAddRep && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setShowAddRep(false); setEditingRepId(null); setRepForm({ name: '', designation: '', prc: '', contact: '', email: '', isPrimary: false, image: '' }); }} />
                                        <div className="bg-white dark:bg-[#1E293B] rounded-[10px] w-full max-w-lg max-h-[90vh] flex flex-col relative z-10 shadow-2xl overflow-hidden text-xs">
                                            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-white/5 flex-shrink-0">
                                                <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">{editingRepId ? 'Edit Clinic Representative' : 'Add Clinic Representative'}</h3>
                                                <button onClick={() => { setShowAddRep(false); setEditingRepId(null); setRepForm({ name: '', designation: '', prc: '', contact: '', email: '', isPrimary: false, image: '' }); }} className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-all">
                                                    <span className="material-symbols-outlined text-base">close</span>
                                                </button>
                                            </div>
                                            
                                            <div className="p-4 space-y-3.5 overflow-y-auto flex-1 custom-scrollbar">
                                                {/* Image Profile Upload */}
                                                <div className="flex items-center gap-4 bg-slate-50 dark:bg-white/[0.02] p-3 rounded-[10px] border border-slate-100 dark:border-white/5">
                                                    {repForm.image ? (
                                                        <div className="w-14 h-14 rounded-[10px] overflow-hidden border border-slate-200 dark:border-white/10 shrink-0">
                                                            <img src={repForm.image} className="w-full h-full object-cover" alt="Preview" />
                                                        </div>
                                                    ) : (
                                                        <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-[10px] flex items-center justify-center text-slate-400 dark:text-slate-600 shrink-0 border border-slate-200 dark:border-white/10">
                                                            <span className="material-symbols-outlined text-2xl">account_circle</span>
                                                        </div>
                                                    )}
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-white">Profile Photo</p>
                                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold cursor-pointer transition-colors text-[9px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                                            <span className="material-symbols-outlined text-xs text-blue-500">upload</span>
                                                            {uploadingRepImage ? 'Uploading...' : 'Upload Image'}
                                                            <input type="file" accept="image/*" onChange={handleRepImageUpload} className="hidden" />
                                                        </label>
                                                    </div>
                                                </div>

                                                {/* Full Name */}
                                                <div className="space-y-1">
                                                    <label htmlFor="rep-name" className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs text-blue-500">person</span>
                                                        Full Name *
                                                    </label>
                                                    <input
                                                        id="rep-name"
                                                        type="text"
                                                        value={repForm.name}
                                                        onChange={e => setRepForm(prev => ({ ...prev, name: e.target.value }))}
                                                        placeholder="Dr. Juan Dela Cruz"
                                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                    />
                                                </div>

                                                {/* Designation & PRC (Inline 2 Column) */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label htmlFor="rep-designation" className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs text-purple-500">work</span>
                                                            Designation *
                                                        </label>
                                                        <select
                                                            id="rep-designation"
                                                            value={repForm.designation}
                                                            onChange={e => setRepForm(prev => ({ ...prev, designation: e.target.value }))}
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                        >
                                                            <option value="" disabled>Select position</option>
                                                            <option value="Owner">Owner</option>
                                                            <option value="Associate">Associate</option>
                                                            <option value="Co-owner">Co-owner</option>
                                                            <option value="Employee">Employee</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="rep-prc" className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs text-emerald-500">verified</span>
                                                            PRC License No. *
                                                        </label>
                                                        <input
                                                            id="rep-prc"
                                                            type="text"
                                                            value={repForm.prc}
                                                            onChange={e => {
                                                                const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                                setRepForm(prev => ({ ...prev, prc: cleaned }));
                                                            }}
                                                            onBlur={() => {
                                                                if (repForm.prc && repForm.prc.length < 6) {
                                                                    setRepForm(prev => ({
                                                                        ...prev,
                                                                        prc: prev.prc.padStart(6, '0')
                                                                    }));
                                                                }
                                                            }}
                                                            placeholder="0012345"
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Contact Number & Email Address (Inline 2 Column) */}
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="space-y-1">
                                                        <label htmlFor="rep-contact" className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs text-teal-500">call</span>
                                                            Contact Number
                                                        </label>
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
                                                                id="rep-contact"
                                                                type="text"
                                                                value={repForm.contact ? (repForm.contact.startsWith('+63') ? repForm.contact.slice(3) : repForm.contact.startsWith('63') && repForm.contact.length === 12 ? repForm.contact.slice(2) : repForm.contact.startsWith('0') && repForm.contact.length === 11 ? repForm.contact.slice(1) : repForm.contact) : ''}
                                                                onChange={e => {
                                                                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                                    setRepForm(prev => ({ ...prev, contact: cleaned }));
                                                                }}
                                                                placeholder="9XX XXX XXXX"
                                                                className="w-full pl-16 pr-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="rep-email" className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                            <span className="material-symbols-outlined text-xs text-indigo-500">mail</span>
                                                            Email Address
                                                        </label>
                                                        <input
                                                            id="rep-email"
                                                            type="text"
                                                            value={repForm.email}
                                                            onChange={e => setRepForm(prev => ({ ...prev, email: e.target.value }))}
                                                            placeholder="dr.juan@clinic.com"
                                                            className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs font-semibold text-slate-900 dark:text-white outline-none focus:border-primary transition-all"
                                                        />
                                                    </div>
                                                </div>

                                                {/* Role Selection */}
                                                <div className="space-y-2">
                                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-xs text-amber-500">shield</span>
                                                        Representative Role *
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <label className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-[10px] border transition-all ${!repForm.isPrimary ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                                            <input type="radio" id="rep-role-rep" name="repRole" checked={!repForm.isPrimary} onChange={() => setRepForm(prev => ({ ...prev, isPrimary: false }))} className="accent-primary size-3.5" />
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-white text-[11px] leading-tight">Representative</p>
                                                                <p className="text-[9px] text-slate-400 leading-none mt-0.5">Standard representative</p>
                                                            </div>
                                                        </label>
                                                        <label className={`flex items-center gap-2 cursor-pointer p-2.5 rounded-[10px] border transition-all ${repForm.isPrimary ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                                                            <input type="radio" id="rep-role-primary" name="repRole" checked={repForm.isPrimary} onChange={() => setRepForm(prev => ({ ...prev, isPrimary: true }))} className="accent-primary size-3.5" />
                                                            <div>
                                                                <p className="font-bold text-slate-800 dark:text-white text-[11px] leading-tight">Primary Rep</p>
                                                                <p className="text-[9px] text-slate-400 leading-none mt-0.5">Main contact person</p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="px-4 py-3 border-t border-slate-100 dark:border-white/5 flex gap-2.5 flex-shrink-0">
                                                <button onClick={() => { setShowAddRep(false); setEditingRepId(null); setRepForm({ name: '', designation: '', prc: '', contact: '', email: '', isPrimary: false, image: '' }); }} className="flex-1 py-2 rounded-[10px] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px] hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={handleAddRep}
                                                    disabled={repSaving || uploadingRepImage || !repForm.name || !repForm.designation || !repForm.prc}
                                                    className="flex-1 py-2 rounded-[10px] bg-primary text-white font-bold uppercase tracking-wider text-[10px] hover:bg-primary/95 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                                                >
                                                    {repSaving ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-3" /> : <span className="material-symbols-outlined text-sm">{editingRepId ? 'save' : 'person_add'}</span>}
                                                    {repSaving ? 'Saving...' : (editingRepId ? 'Save Changes' : 'Add Representative')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            );
                        })()}

                        {/* ══════════════════════════════════════════════
                             TAB: ACCREDITATION PIPELINE
                        ══════════════════════════════════════════════ */}
                        {activeTab === 'accreditation' && (
                            <div className="space-y-4">
                                <div>
                                    <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Accreditation <span className="text-primary">Pipeline</span></h1>
                                    <p className="text-slate-400 text-sm font-medium mt-1">Complete the accreditation stages to become a PAHA-accredited clinic.</p>
                                </div>
                                <AccreditationPipeline embedded />
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════
                             TAB: EVENTS HUB
                        ══════════════════════════════════════════════ */}
                        {activeTab === 'events' && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Events <span className="text-primary">Hub</span></h1>
                                        <p className="text-slate-400 text-sm font-medium mt-1">Upcoming PAHA events and your registrations.</p>
                                    </div>
                                    <button onClick={() => navigate('/events')} className="px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/30 self-start">
                                        <span className="material-symbols-outlined text-base">open_in_new</span>Browse All Events
                                    </button>
                                </div>

                                {/* Stats strip */}
                                <div className="bg-[#0A0F1A] rounded-2xl p-5 text-white flex items-center justify-between flex-wrap gap-4">
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/30 mb-0.5">My Registrations</div>
                                        <div className="text-4xl font-black">{myRegistrations.length} <span className="text-lg font-bold text-white/40">events</span></div>
                                    </div>
                                    <div className="flex gap-8">
                                        {[
                                            { label: 'Registered', value: myRegistrations.length },
                                            { label: 'Upcoming', value: upcomingEvents.length },
                                            { label: 'Completed', value: events.filter(e => e.status === 'completed').length },
                                        ].map((s, i) => (
                                            <div key={i} className="text-center">
                                                <div className="text-2xl font-black">{s.value}</div>
                                                <div className="text-[9px] font-black text-white/30 uppercase tracking-wider">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Event list - real data */}
                                {upcomingEvents.length === 0 ? (
                                    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-12 text-center shadow-sm">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-white/10 block mb-3">event_busy</span>
                                        <div className="font-black text-slate-500 dark:text-white/30 text-sm uppercase tracking-widest">No Upcoming Events</div>
                                        <button onClick={() => navigate('/events')} className="mt-4 px-5 py-2.5 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/30">
                                            Browse Past Events
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {upcomingEvents.map(ev => {
                                            const isRegistered = myRegistrations.some(r => r.eventId === ev.id);
                                            const slotPct = ev.capacity ? Math.round(((ev.registeredCount || 0) / ev.capacity) * 100) : 0;
                                            return (
                                                <div key={ev.id} className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm flex flex-col md:flex-row md:items-center gap-5 hover:shadow-md transition-shadow">
                                                    <div className={`size-12 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0 ${ev.status === 'ongoing' ? 'bg-emerald-500 shadow-emerald-500/30' : 'bg-primary shadow-primary/30'}`}>
                                                        <span className="material-symbols-outlined">{ev.status === 'ongoing' ? 'radio_button_checked' : 'event'}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                                            <h3 className="font-black text-slate-900 dark:text-white text-sm">{ev.title}</h3>
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg ${ev.status === 'ongoing' ? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' : 'bg-primary/10 text-primary'}`}>
                                                                {ev.category || ev.status}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">calendar_today</span>{new Date(ev.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            <span className="flex items-center gap-1"><span className="material-symbols-outlined text-sm">location_on</span>{ev.location}</span>
                                                        </div>
                                                        {ev.capacity && (
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex-1 h-1 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden max-w-[120px]">
                                                                    <div className={`h-full rounded-full ${slotPct > 80 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: `${slotPct}%` }}></div>
                                                                </div>
                                                                <span className="text-[9px] font-black text-slate-400 dark:text-white/30">{ev.registeredCount || 0}/{ev.capacity} slots</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="shrink-0">
                                                        {isRegistered ? (
                                                            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-black border border-emerald-500/20">
                                                                <span className="material-symbols-outlined text-sm">check_circle</span>Registered
                                                            </div>
                                                        ) : (
                                                            <button className="px-5 py-2 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                                                                Register
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════
                             TAB: BROADCASTS / NOTIFICATIONS
                        ══════════════════════════════════════════════ */}
                        {activeTab === 'inbox' && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Inbox</h1>
              <p className="text-slate-400 text-sm font-medium mt-1">Your conversations with PAHA support.</p>
            </div>
            <div className="h-[calc(100vh-240px)]">
              <Inbox />
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Broadcasts <span className="text-primary">&amp; Notices</span></h1>
                                        <p className="text-slate-400 text-sm font-medium mt-1">Official announcements from PAHA.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        {(['all', 'unread'] as const).map(t => (
                                            <button key={t} onClick={() => setNotifTab(t)} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-colors ${notifTab === t ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/30 hover:border-slate-400'}`}>
                                                {t}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {personalNotifications.filter(n => notifTab === 'all' || !n.read).length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Personal Notices</h3>
                                        {personalNotifications.filter(n => notifTab === 'all' || !n.read).map((n) => (
                                            <div
                                                key={n.id}
                                                onClick={() => openNotification(n)}
                                                title="Open related page"
                                                className={`rounded-2xl border p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4 cursor-pointer ${n.read ? 'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-white/5' : 'bg-rose-50 dark:bg-rose-500/5 border-rose-200 dark:border-rose-500/20'}`}
                                            >
                                                <div className="size-11 rounded-2xl flex items-center justify-center shrink-0 bg-rose-500/10">
                                                    <span className="material-symbols-outlined text-xl text-rose-500">
                                                        {n.type?.includes('rejected') ? 'report' : 'notifications'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                                                        <h4 className="font-black text-slate-900 dark:text-white text-sm">{n.title}</h4>
                                                        {!n.read && <span className="size-2 rounded-full bg-rose-500 shrink-0 mt-1"></span>}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{n.body}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {latestAnnouncements.length === 0 ? (
                                    <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-12 text-center shadow-sm">
                                        <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-white/10 block mb-3">notifications_off</span>
                                        <div className="font-black text-slate-500 dark:text-white/30 text-sm uppercase tracking-widest">No Announcements</div>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {latestAnnouncements.map((ann: any, i) => (
                                            <div key={ann.id} className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-5 shadow-sm hover:shadow-md transition-shadow flex gap-4">
                                                <div className={`size-11 rounded-2xl flex items-center justify-center shrink-0 ${i % 3 === 0 ? 'bg-primary/10' : i % 3 === 1 ? 'bg-amber-500/10' : 'bg-emerald-500/10'}`}>
                                                    <span className={`material-symbols-outlined text-xl ${i % 3 === 0 ? 'text-primary' : i % 3 === 1 ? 'text-amber-500' : 'text-emerald-500'}`}>
                                                        {i % 3 === 0 ? 'campaign' : i % 3 === 1 ? 'notifications' : 'event_available'}
                                                    </span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap justify-between items-start gap-2 mb-1">
                                                        <h4 className="font-black text-slate-900 dark:text-white text-sm">{ann.title}</h4>
                                                        {(() => {
                                                            const d = parseDate(ann.date);
                                                            if (!d || d < new Date()) return (
                                                                <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-white/30 shrink-0">Finished</span>
                                                            );
                                                            return (
                                                                <span className="text-[10px] font-bold text-slate-400 dark:text-white/30 shrink-0">{d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                            );
                                                        })()}
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ann.body || ann.content || ann.description}</p>
                                                    {ann.category && (
                                                        <span className="mt-2 inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg bg-primary/10 text-primary">{ann.category}</span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════
                             TAB: MY PROFILE
                        ══════════════════════════════════════════════ */}
                        {activeTab === 'profile' && (
                            <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
                            <div className="xl:col-span-3 space-y-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">My <span className="text-primary">Profile</span></h1>
                                        <p className="text-slate-400 text-sm font-medium mt-1">Your account information and clinic details.</p>
                                    </div>
                                    {!profileEditing ? (
                                        <button
                                            onClick={() => setProfileEditing(true)}
                                            className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                            Edit Profile
                                        </button>
                                    ) : (
                                        <div className="flex gap-2">
                                            <button onClick={() => setProfileEditing(false)} className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-white/10 transition-all">
                                                Cancel
                                            </button>
                                            <button onClick={handleSaveProfile} disabled={profileSaving} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50">
                                                {profileSaving ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-3" /> : <span className="material-symbols-outlined text-sm">save</span>}
                                                Save
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Avatar card */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 p-6 shadow-sm flex items-center gap-5">
                                    <div className="relative group/avatar cursor-pointer size-20 shrink-0 rounded-2xl overflow-hidden shadow-xl shadow-primary/30 border border-slate-200 dark:border-white/10"
                                         onClick={() => profileFileInputRef.current?.click()}
                                         title="Change profile picture"
                                    >
                                        {profile?.photoUrl ? (
                                            <img 
                                                src={profile.photoUrl} 
                                                className="size-full object-cover" 
                                                alt={memberName} 
                                            />
                                        ) : (
                                            <div className="size-full bg-primary flex items-center justify-center text-white font-black text-3xl">
                                                {memberName.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        
                                        {/* Hover Overlay */}
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/avatar:opacity-100 flex flex-col items-center justify-center text-white transition-opacity duration-200">
                                            <span className="material-symbols-outlined text-xl">photo_camera</span>
                                            <span className="text-[9px] font-black uppercase tracking-wider mt-0.5">Upload</span>
                                        </div>

                                        {/* Loading state */}
                                        {profileImageUploading && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white">
                                                <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-5" />
                                            </div>
                                        )}
                                    </div>
                                    
                                    <input 
                                        type="file" 
                                        ref={profileFileInputRef} 
                                        onChange={handleUploadProfileImage} 
                                        accept="image/*" 
                                        className="hidden" 
                                    />
                                    
                                    <div>
                                        <div className="text-xl font-black text-slate-900 dark:text-white">{memberName}</div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">{memberEmail}</div>
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="size-1.5 rounded-full bg-emerald-500"></span>
                                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Regular Member</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Editable fields */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
                                        <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Clinic & Contact Details</h3>
                                    </div>
                                    <div className="p-6 space-y-4">
                                        {[
                                            { label: 'Full Name', key: 'displayName' as const, icon: 'person', placeholder: 'Your full name' },
                                            { label: 'Representative Name', key: 'representativeName' as const, icon: 'badge', placeholder: 'Name of the clinic representative' },
                                            { label: 'Clinic / Facility Name', key: 'clinicName' as const, icon: 'local_hospital', placeholder: 'e.g. Metro Vet Hospital' },
                                            { label: 'Phone Number', key: 'phone' as const, icon: 'call', placeholder: '+63 9XX XXX XXXX' },
                                            { label: 'Clinic Address', key: 'clinicAddress' as const, icon: 'location_on', placeholder: 'Full address of your clinic' },
                                            { label: 'Specialization', key: 'specialization' as const, icon: 'medical_services', placeholder: 'e.g. Small Animal Medicine' },
                                        ].map(field => (
                                            <div key={field.key}>
                                                <label className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-widest mb-1 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">{field.icon}</span>
                                                    {field.label}
                                                </label>
                                                {profileEditing ? (
                                                    <input
                                                        type="text"
                                                        value={profileForm[field.key]}
                                                        onChange={e => setProfileForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                                                        placeholder={field.placeholder}
                                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary outline-none transition-all"
                                                    />
                                                ) : (
                                                    <p className="px-4 py-3 bg-slate-50 dark:bg-white/5 rounded-xl text-sm font-semibold text-slate-800 dark:text-white border border-transparent">
                                                        {profileForm[field.key] || <span className="text-slate-400 italic">Not set</span>}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                            </div>{/* end left col */}

                            {/* ── RIGHT COLUMN — Uploaded Documents ── */}
                            <div className="xl:col-span-2 space-y-4">
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
                                        <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-lg">folder_open</span>
                                            Uploaded Documents
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-0.5">All files submitted during your accreditation process.</p>
                                    </div>

                                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                                        {/* LOI PDF */}
                                        {accredApp?.loiPdfUrl ? (
                                            <a
                                                href={accredApp.loiPdfUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                                            >
                                                <div className="size-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-red-500 text-lg">picture_as_pdf</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">
                                                        {accredApp.loiPdfName || 'Letter of Intent.pdf'}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">LOI Document · PDF</p>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg">open_in_new</span>
                                            </a>
                                        ) : null}

                                        {/* Compliance documents per category */}
                                        {accredApp?.complianceData?.categories &&
                                            Object.entries(accredApp.complianceData.categories).map(([catId, cat]) =>
                                                cat.uploadedFiles?.length > 0 ? (
                                                    cat.uploadedFiles.map((file, i) => (
                                                        <a
                                                            key={`${catId}-${i}`}
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                                                        >
                                                            <div className="size-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                                                <span className="material-symbols-outlined text-blue-500 text-lg">description</span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">{file.name}</p>
                                                                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                                                                    {catId} · {(file.size / 1024).toFixed(0)} KB
                                                                </p>
                                                            </div>
                                                            <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg">open_in_new</span>
                                                        </a>
                                                    ))
                                                ) : null
                                            )
                                        }

                                        {/* Payment proof */}
                                        {accredApp?.paymentData?.proofOfPaymentUrl && (
                                            <a
                                                href={accredApp.paymentData.proofOfPaymentUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group"
                                            >
                                                <div className="size-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-emerald-500 text-lg">receipt</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">Proof of Payment</p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                                                        Payment · {accredApp.paymentData.submittedAt ? new Date(accredApp.paymentData.submittedAt).toLocaleDateString() : ''}
                                                    </p>
                                                </div>
                                                <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg">open_in_new</span>
                                            </a>
                                        )}

                                        {/* Membership Onboarding Checklist Documents */}
                                        {(profile as any)?.membershipDocuments && Object.entries((profile as any).membershipDocuments).map(([reqId, files]) => {
                                            if (!Array.isArray(files) || files.length === 0) return null;
                                            const allReqs = [...SOLE_PROPRIETORSHIP_REQS, ...PARTNERSHIP_CORP_REQS, ...TEACHING_HOSPITAL_REQS];
                                            const req = allReqs.find(r => r.id === reqId);
                                            const label = req ? req.label : reqId.replace(/_/g, ' ');
                                            
                                            return files.map((file, idx) => (
                                                <a
                                                    key={`${reqId}-${idx}`}
                                                    href={file.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors group border-t border-slate-100 dark:border-white/5"
                                                >
                                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
                                                        <span className="material-symbols-outlined text-lg">
                                                            {reqId.includes('video') ? 'movie' : 'description'}
                                                        </span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-bold text-slate-800 dark:text-white truncate group-hover:text-primary transition-colors">{file.name}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold mt-0.5">
                                                            Onboarding · {label}
                                                        </p>
                                                    </div>
                                                    <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors text-lg">open_in_new</span>
                                                </a>
                                            ));
                                        })}

                                        {/* Empty state */}
                                        {!accredApp?.loiPdfUrl &&
                                         !accredApp?.paymentData?.proofOfPaymentUrl &&
                                         (!accredApp?.complianceData?.categories || Object.values(accredApp.complianceData.categories).every(c => !c.uploadedFiles?.length)) &&
                                         (!(profile as any)?.membershipDocuments || Object.values((profile as any).membershipDocuments).every((files: any) => !files?.length)) && (
                                            <div className="px-5 py-10 text-center">
                                                <span className="material-symbols-outlined text-3xl text-slate-200 dark:text-white/10 mb-2 block">folder_off</span>
                                                <p className="text-sm text-slate-400 font-semibold">No documents uploaded yet.</p>
                                                <p className="text-xs text-slate-300 dark:text-white/20 mt-1">Documents will appear here as you progress through onboarding & accreditation.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Read-only account info — placed below Uploaded Documents */}
                                <div className="bg-white dark:bg-[#0F172A] rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5">
                                        <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Account Info</h3>
                                    </div>
                                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                                        {[
                                            { label: 'Email Address', value: memberEmail, icon: 'mail' },
                                            { label: 'Member Role', value: profile?.role || 'Regular Member', icon: 'badge' },
                                            { label: 'Account ID', value: user?.uid?.slice(0, 20) + '...', icon: 'fingerprint' },
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-4 px-6 py-4">
                                                <div className="size-9 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center shrink-0">
                                                    <span className="material-symbols-outlined text-[16px] text-slate-400 dark:text-white/30">{item.icon}</span>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[9px] font-black text-slate-400 dark:text-white/30 uppercase tracking-wider">{item.label}</div>
                                                    <div className="text-sm font-bold text-slate-800 dark:text-white truncate">{item.value}</div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            </div>
                        )}

                    </div>
                </main>
            </div>
            {/* Live notification popups — click to open the related page */}
            {notifPopups.length > 0 && (
                <div className="fixed top-6 right-6 z-[1300] space-y-2 w-[90vw] max-w-sm">
                    {notifPopups.map(p => (
                        <button
                            key={p.id}
                            onClick={() => openNotification(p)}
                            className="w-full text-left bg-white dark:bg-[#0F172A] border border-primary/30 rounded-2xl shadow-2xl p-4 flex gap-3 hover:border-primary transition-all animate-modal-pop"
                        >
                            <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-xl">notifications_active</span>
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-black text-sm text-slate-900 dark:text-white truncate">{p.title}</div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">{p.body}</p>
                                <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Click to view</span>
                            </div>
                            <span
                                onClick={(e) => { e.stopPropagation(); setNotifPopups(prev => prev.filter(x => x.id !== p.id)); }}
                                className="material-symbols-outlined text-slate-300 hover:text-slate-500 text-lg shrink-0"
                            >close</span>
                        </button>
                    ))}
                </div>
            )}
        {/* Floating ChatWidget at bottom-right */}
        <ChatWidget />
      </div>
    );
  };

export default MemberDashboard;
