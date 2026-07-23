import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useAdmin } from '../context/AdminContext';
import WebsiteContentEditor from '../components/WebsiteContentEditor';
import MembersManager from '../components/MembersManager';
import InboxManager from '../components/InboxManager';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppearance } from '../hooks/useAppearance';
import EventsTab from '../components/admin/EventsTab';
import CommitteesManager from '../components/admin/CommitteesManager';
import FormerOfficersManager from '../components/admin/FormerOfficersManager';
import PartnersManager from '../components/admin/PartnersManager';
import SettingsPanel from '../components/admin/SettingsPanel';
import PayCoolsTransactions from '../components/admin/PayCoolsTransactions';
import { db, auth } from '../config/firebase';
import { doc, onSnapshot, arrayUnion, arrayRemove, collection, getDocs, getDoc, query, orderBy, setDoc, updateDoc, addDoc, serverTimestamp, deleteDoc, where } from 'firebase/firestore';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import type { AccreditationApplication, VisitingEvaluationForm } from '../types/accreditation';
import { ASSESSMENT_CATEGORIES, getCategoryStats } from '../data/assessmentCategories';
import VisitingEvaluationModal from '../components/VisitingEvaluationModal';
import FileViewerModal, { type ViewerFile } from '../components/FileViewerModal';


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

const getFileIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') return { name: 'picture_as_pdf', color: 'text-rose-500' };
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return { name: 'image', color: 'text-blue-500' };
    if (['mp4', 'mov', 'avi', 'webm', 'mkv'].includes(ext)) return { name: 'movie', color: 'text-amber-500' };
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return { name: 'folder_zip', color: 'text-purple-500' };
    return { name: 'description', color: 'text-slate-500' };
};

import { ALL_SECTIONS, type AdminRole } from '../context/AuthContext';
import RichTextEditor from '../components/RichTextEditor';
import { getEmbeddableUrl } from '../utils/portalUrl';
import gsap from 'gsap';

const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const containerRef = useRef<HTMLDivElement>(null);
    const {
        messages, applications, announcements, registrations, updateApplicationStatus, deleteApplication,
        addAnnouncement, updateAnnouncement, deleteAnnouncement,
        updateEventRegistrationPaymentStatus, updateEventRegistration, deleteEventRegistration,
        events, addEvent, updateEvent,
        deleteEvent, uploadImage, uploadFile,
        updateEventPartial, deleteFile, getNewEventId,
        members, accreditationSubmissions, accreditationApplications,
        notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead,
    } = useAdmin();
    const { user, profile, signOut, isSuperAdmin, adminRole, allowedSections } = useAuth();
    const { logoUrl, sidebarExpandedLogoUrl, sidebarCollapsedLogoUrl } = useAppearance();
    const location = useLocation();
    const [searchParams, setSearchParams] = useSearchParams();

    const VALID_TABS = ['dashboard','messages','inbox','membership_plans','applications','accreditation','members','accredited','announcements','cms','events','committees','former_officers','partners','access_control','settings','paycools_transactions'] as const;
    type TabId = typeof VALID_TABS[number];

    const getActiveTabFromPath = (): TabId => {
        const subRoute = location.pathname.split('/admin/')[1] || '';
        const tabPart = subRoute.split('?')[0].split('/')[0] as TabId;
        if (VALID_TABS.includes(tabPart)) {
            return tabPart;
        }
        const legacyTab = searchParams.get('tab') as TabId;
        if (VALID_TABS.includes(legacyTab)) {
            return legacyTab;
        }
        return 'dashboard';
    };

    const activeTab = getActiveTabFromPath();

    const setActiveTab = (tab: TabId) => {
        navigate(`/admin/${tab}`, { replace: false });
    };

    // Notifications carry a `link` field naming which part of the dashboard
    // they relate to — map it to the matching tab so clicking one takes the
    // admin straight there instead of just marking it read in place.
    const NOTIF_LINK_TO_TAB: Partial<Record<string, TabId>> = {
        dashboard: 'dashboard',
        messages: 'messages',
        inbox: 'inbox',
        applications: 'applications',
        accreditation: 'accreditation',
        events: 'events',
        membership: 'applications',
        members: 'members',
    };

    const handleNotificationClick = (n: any) => {
        markNotificationRead(n.id);
        setShowNotifications(false);
        const targetTab = n.link ? NOTIF_LINK_TO_TAB[n.link] : undefined;
        if (targetTab) setActiveTab(targetTab);
    };

    // Sidebar nav badges reflect real unread notifications for that section —
    // not raw record counts (a badge used to just show "how many events exist"
    // etc., which isn't a notification at all).
    const unreadByTab = React.useMemo(() => {
        const counts: Partial<Record<TabId, number>> = {};
        notifications.forEach((n: any) => {
            if (n.read) return;
            const tab = n.link ? NOTIF_LINK_TO_TAB[n.link] : undefined;
            if (tab) counts[tab] = (counts[tab] || 0) + 1;
        });
        return counts;
    }, [notifications]);
    const getApplicationId = (app: any) => {
        if (!app) return '';
        // Sort all applications by date ascending to get a stable index
        const sortedApps = [...applications].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const idx = sortedApps.findIndex(a => a.id === app.id);
        const appNo = idx !== -1 ? idx + 1 : 1;
        const year = app.date ? new Date(app.date).getFullYear() : new Date().getFullYear();
        return `PAHA-${year}-${String(appNo).padStart(4, '0')}`;
    };


    // Password-gated delete confirmation — every destructive delete action in
    // this dashboard routes through here instead of a plain window.confirm(),
    // requiring the signed-in admin to re-enter their password each time
    // before the delete actually runs.
    const [pendingDelete, setPendingDelete] = useState<{ message: string; action: () => void | Promise<void> } | null>(null);
    const [deletePassword, setDeletePassword] = useState('');
    const [deletePasswordError, setDeletePasswordError] = useState('');
    const [deletePasswordVerifying, setDeletePasswordVerifying] = useState(false);
    const [showDeletePassword, setShowDeletePassword] = useState(false);

    const requestDelete = (message: string, action: () => void | Promise<void>) => {
        setDeletePassword('');
        setDeletePasswordError('');
        setPendingDelete({ message, action });
    };

    const closeDeleteConfirm = () => {
        setPendingDelete(null);
        setDeletePassword('');
        setDeletePasswordError('');
        setShowDeletePassword(false);
    };

    const confirmPendingDelete = async () => {
        if (!pendingDelete) return;
        if (!deletePassword) { setDeletePasswordError('Please enter your password.'); return; }
        if (!user?.email) { setDeletePasswordError('No signed-in admin account found.'); return; }
        setDeletePasswordVerifying(true);
        setDeletePasswordError('');
        try {
            const credential = EmailAuthProvider.credential(user.email, deletePassword);
            await reauthenticateWithCredential(auth.currentUser!, credential);
            const action = pendingDelete.action;
            closeDeleteConfirm();
            await action();
        } catch (err: any) {
            setDeletePasswordError(err?.code === 'auth/wrong-password' || err?.code === 'auth/invalid-credential'
                ? 'Incorrect password.'
                : (err?.message || 'Failed to verify password.'));
        } finally {
            setDeletePasswordVerifying(false);
        }
    };

    const [acUsers, setAcUsers] = useState<any[]>([]);
    const [acLoading, setAcLoading] = useState(false);
    const [acEditUser, setAcEditUser] = useState<any | null>(null);
    const [acEditRole, setAcEditRole] = useState<AdminRole>('viewer');
    const [acEditSections, setAcEditSections] = useState<string[]>([]);
    const [acSaving, setAcSaving] = useState(false);
    const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any | null>(null);
    const [planType, setPlanType] = useState<'Regular' | 'Associate' | 'Institutional' | 'Affiliate'>('Regular');
    const [planTitle, setPlanTitle] = useState('');
    const [planFee, setPlanFee] = useState(5000);
    const [planDescription, setPlanDescription] = useState('');
    const [planFeatures, setPlanFeatures] = useState('');
    const [planValidityDuration, setPlanValidityDuration] = useState(1);
    const [savingPlan, setSavingPlan] = useState(false);
    const [msgSearchQuery, setMsgSearchQuery] = useState('');
    const [msgStatusFilter, setMsgStatusFilter] = useState<'all' | 'unread' | 'read' | 'replied'>('all');
    const [msgStartDate, setMsgStartDate] = useState('');
    const [msgEndDate, setMsgEndDate] = useState('');
    const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
    const [appSearchQuery, setAppSearchQuery] = useState('');
    const [appStatusFilter, setAppStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
    const [appTypeFilter, setAppTypeFilter] = useState<'all' | 'regular' | 'associate'>('all');
    const [appStartDate, setAppStartDate] = useState('');
    const [appEndDate, setAppEndDate] = useState('');
    const [appActionTarget, setAppActionTarget] = useState<any | null>(null);
    const [appActionType, setAppActionType] = useState<'approved' | 'rejected' | null>(null);
    const [appRemarksDraft, setAppRemarksDraft] = useState('');
    const [appActionSaving, setAppActionSaving] = useState(false);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [appModalTab, setAppModalTab] = useState<'clinic' | 'account' | 'membership_info'>('clinic');


    const handleManualSync = async (app: any) => {
        try {
            const fullName = `${app.firstName || ''} ${app.lastName || ''}`.trim() || app.representativeName || app.ownerName || 'Unknown';
            const memberData = {
                name: fullName,
                email: app.email,
                phone: app.mobile || '',
                address: app.clinicAddress || '',
                type: app.type || 'Regular',
                headVeterinarian: app.hospitalName || '',
                joinedAt: app.date || new Date().toISOString()
            };

            const membersRef = collection(db, 'members');
            const qMembers = query(membersRef, where('email', '==', app.email));
            const memberSnap = await getDocs(qMembers);
            
            if (memberSnap.empty) {
                await addDoc(membersRef, memberData);
            } else {
                const existingDocId = memberSnap.docs[0].id;
                await updateDoc(doc(db, 'members', existingDocId), {
                    name: fullName,
                    phone: app.mobile || '',
                    address: app.clinicAddress || '',
                    type: app.type || 'Regular',
                    headVeterinarian: app.hospitalName || ''
                });
            }

            if (app.uid) {
                await updateDoc(doc(db, 'users', app.uid), {
                    displayName: app.ownerName || fullName,
                    fullName: app.representativeName || app.ownerName || fullName,
                    clinicName: app.clinicName || app.hospitalName || '',
                    clinicAddress: app.clinicAddress || '',
                    address: app.clinicAddress || '',
                    phone: app.mobile || '',
                    prcLicense: app.prcLicenseNo || app.prcLicense || ''
                });
            }
            showToast('✓ Database records successfully synced!', 'success');
        } catch (e) {
            console.error(e);
            showToast('Failed to sync details.', 'error');
        }
    };

    const [accSearchQuery, setAccSearchQuery] = useState('');
    const [accStatusFilter, setAccStatusFilter] = useState<string>('all');
    const [accStartDate, setAccStartDate] = useState('');
    const [accEndDate, setAccEndDate] = useState('');

    const [currentTime, setCurrentTime] = useState(new Date());
    const [usersMap, setUsersMap] = useState<Record<string, any>>({});

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const map: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                map[doc.id] = doc.data();
            });
            setUsersMap(map);
        });
        return () => unsubscribe();
    }, []);
    useEffect(() => {
        let active = true;
        const initPlans = async () => {
            try {
                const defaults = [
                    { id: 'Regular', type: 'Regular', title: 'Regular Membership', fee: 5000.00, description: 'For licensed veterinarians representing companion animal clinics.', features: 'Voting rights, clinic directory listing, legal assistance', validityDuration: 1 },
                    { id: 'Associate', type: 'Associate', title: 'Associate Membership', fee: 3500.00, description: 'For individual veterinarians not representing clinics.', features: 'Professional networking, legal advice', validityDuration: 1 },
                    { id: 'Institutional', type: 'Institutional', title: 'Institutional Membership', fee: 10000.00, description: 'For veterinary hospitals, schools, and large institutions.', features: 'Group CPD passes, premium directory branding', validityDuration: 1 },
                    { id: 'Affiliate', type: 'Affiliate', title: 'Affiliate Membership', fee: 4500.00, description: 'For partners, suppliers, and allied professionals.', features: 'Exhibition priority, logo inclusion on print', validityDuration: 1 }
                ];
                for (const plan of defaults) {
                    const docRef = doc(db, 'membership_plans', plan.id);
                    const docSnap = await getDoc(docRef);
                    if (!docSnap.exists() && active) {
                        await setDoc(docRef, {
                            type: plan.type,
                            title: plan.title,
                            fee: plan.fee,
                            description: plan.description,
                            features: plan.features.split(', '),
                            validityDuration: plan.validityDuration,
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to seed membership plans:', err);
            }
        };

        initPlans().then(() => {
            if (!active) return;
            const q = query(collection(db, 'membership_plans'), orderBy('createdAt', 'desc'));
            return onSnapshot(q, (snapshot: any) => {
                setMembershipPlans(snapshot.docs.map((d: any) => ({ id: d.id, ...d.data() })));
            });
        });

        return () => {
            active = false;
        };
    }, []);

    const handleSavePlan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!planTitle.trim()) {
            showToast('Plan title is required.', 'error');
            return;
        }
        setSavingPlan(true);
        try {
            const planId = editingPlan ? editingPlan.id : planType;
            await setDoc(doc(db, 'membership_plans', planId), {
                type: planType,
                title: planTitle,
                fee: planFee,
                description: planDescription,
                features: planFeatures.split('\n').filter(f => f.trim() !== ''),
                validityDuration: planValidityDuration,
                createdAt: editingPlan ? editingPlan.createdAt : new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            showToast(editingPlan ? 'Membership plan updated successfully!' : 'Custom membership plan created!', 'success');
            setIsPlanModalOpen(false);
            setEditingPlan(null);
        } catch (err) {
            console.error('Failed to save plan:', err);
            showToast('Failed to save plan details.', 'error');
        } finally {
            setSavingPlan(false);
        }
    };

    const handleDeletePlan = (planId: string) => {
        requestDelete('Are you sure you want to delete this membership plan? This may break active checkouts for this type.', async () => {
            try {
                await deleteDoc(doc(db, 'membership_plans', planId));
                showToast('Membership plan deleted.', 'success');
            } catch (err) {
                console.error('Failed to delete plan:', err);
                showToast('Failed to delete membership plan.', 'error');
            }
        });
    };

    const handleDeleteAccreditation = (appId: string) => {
        requestDelete('Are you sure you want to delete this accreditation application? This action cannot be undone.', async () => {
            try {
                await deleteDoc(doc(db, 'accreditation_applications', appId));
                showToast('Application deleted successfully.', 'success');
            } catch (err) {
                console.error('Failed to delete application:', err);
                showToast('Failed to delete application.', 'error');
            }
        });
    };

    const handleViewDetails = async (msg: any) => {
        setSelectedMessage(msg);
        if (!msg.status || msg.status === 'unread') {
            try {
                await updateDoc(doc(db, 'contact_messages', msg.id), { status: 'read' });
            } catch (e) {
                console.error('Failed to update message status:', e);
            }
        }
    };

    const handleMarkReplied = async (msg: any) => {
        try {
            await updateDoc(doc(db, 'contact_messages', msg.id), { status: 'replied' });
            if (selectedMessage && selectedMessage.id === msg.id) {
                setSelectedMessage({ ...selectedMessage, status: 'replied' });
            }
        } catch (e) {
            console.error('Failed to mark message as replied:', e);
        }
    };

    const handleMarkUnread = async (msg: any) => {
        try {
            await updateDoc(doc(db, 'contact_messages', msg.id), { status: 'unread' });
            if (selectedMessage && selectedMessage.id === msg.id) {
                setSelectedMessage({ ...selectedMessage, status: 'unread' });
            }
        } catch (e) {
            console.error('Failed to mark message as unread:', e);
        }
    };

    const handleDelete = (msgId: string) => {
        requestDelete('Are you sure you want to delete this message permanently?', async () => {
            try {
                await deleteDoc(doc(db, 'contact_messages', msgId));
                if (selectedMessage && selectedMessage.id === msgId) {
                    setSelectedMessage(null);
                }
            } catch (e) {
                console.error('Failed to delete message:', e);
            }
        });
    };

    // Derived Stats
    const pendingApps = applications.filter(a => a.status === 'pending').length;
    
    const revenueYTD = registrations
        .filter(reg => reg.paymentStatus === 'paid')
        .reduce((sum, reg) => {
            const event = events.find(e => e.id === reg.eventId);
            return sum + (event?.price || 0);
        }, 0);

    useLayoutEffect(() => {
        if (!containerRef.current) return;
        
        const ctx = gsap.context(() => {
            gsap.from('.stat-card', {
                y: 20,
                opacity: 0,
                duration: 0.6,
                stagger: 0.1,
                ease: 'power3.out'
            });

            gsap.from('.activity-card', {
                x: -20,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: 0.4
            });

            gsap.from('.infras-card', {
                x: 20,
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out',
                delay: 0.4
            });
        }, containerRef);

        return () => ctx.revert();
    }, [activeTab]);

    const activities = React.useMemo(() => {
        const items: any[] = [];
        
        applications.forEach(app => {
            items.push({
                id: `app-${app.id}`,
                title: 'New Applicant',
                description: `Dr. ${app.firstName} ${app.lastName} applied as ${app.type}.`,
                date: new Date(app.date),
                icon: 'person_add',
                color: 'bg-emerald-500',
                ring: 'ring-emerald-50 dark:ring-emerald-900/10'
            });
        });

        registrations.forEach(reg => {
            items.push({
                id: `reg-${reg.id}`,
                title: 'Event Registration',
                description: `${reg.attendeeName} registered for ${reg.eventTitle}.`,
                date: new Date(reg.registrationDate),
                icon: 'how_to_reg',
                color: 'bg-blue-500',
                ring: 'ring-blue-50 dark:ring-blue-900/10'
            });
        });

        messages.forEach(msg => {
            items.push({
                id: `msg-${msg.id}`,
                title: 'New Inquiry',
                description: `From ${msg.firstName} ${msg.lastName}`,
                date: new Date(msg.date),
                icon: 'chat_bubble',
                color: 'bg-purple-500',
                ring: 'ring-purple-50 dark:ring-purple-900/10'
            });
        });

        accreditationSubmissions.forEach(sub => {
            items.push({
                id: `sub-${sub.id}`,
                title: 'Accreditation Submission',
                description: `${sub.clinicName} submitted compliance docs.`,
                date: sub.createdAt?.toDate ? sub.createdAt.toDate() : new Date(),
                icon: 'verified_user',
                color: 'bg-amber-500',
                ring: 'ring-amber-50 dark:ring-amber-900/10'
            });
        });

        return items.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);
    }, [applications, registrations, messages, accreditationSubmissions]);

    const formatCurrency = (val: number) => {
        if (val >= 1000000) return `₱${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `₱${(val / 1000).toFixed(0)}k`;
        return `₱${val}`;
    };

    const timeAgo = (date: Date) => {
        const diff = new Date().getTime() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString();
    };
    const [selectedApplication, setSelectedApplication] = useState<any | null>(null);
    const [selectedAppReps, setSelectedAppReps] = useState<any[]>([]);
    const [candidateUser, setCandidateUser] = useState<any | null>(null);

    useEffect(() => {
        if (selectedApplication) {
            let unsubReps: (() => void) | undefined;
            if (selectedApplication.uid) {
                const repsRef = collection(db, 'users', selectedApplication.uid, 'representatives');
                unsubReps = onSnapshot(repsRef, (snap) => {
                    setSelectedAppReps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
                });
            } else {
                setSelectedAppReps([]);
            }

            if (selectedApplication.email) {
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', selectedApplication.email));
                getDocs(q).then((snap) => {
                    if (!snap.empty) {
                        setCandidateUser(snap.docs[0].data());
                    } else {
                        setCandidateUser(null);
                    }
                }).catch(err => {
                    console.error('Error fetching candidate user:', err);
                    setCandidateUser(null);
                });
            } else {
                setCandidateUser(null);
            }

            return () => {
                if (unsubReps) unsubReps();
            };
        } else {
            setSelectedAppReps([]);
            setCandidateUser(null);
        }
    }, [selectedApplication]);
    const [announcementModal, setAnnouncementModal] = useState<{ open: boolean; announcement?: any }>({ open: false });
    const [eventModal, setEventModal] = useState<{ open: boolean; event?: any; mode?: 'add' | 'edit' }>({ open: false });
    const [viewingEventRegistrations, setViewingEventRegistrations] = useState<any | null>(null);
    const [selectedRegistration, setSelectedRegistration] = useState<any | null>(null);
    const [registrationEditModal, setRegistrationEditModal] = useState<{ open: boolean; registration?: any }>({ open: false });

    const exportRegistrationsToCSV = (eventTitle: string, eventRegistrations: any[]) => {
        const headers = ['Registration ID', 'Date', 'Name', 'Email', 'Mobile', 'Payment Method', 'Price', 'Status'];
        const rows = eventRegistrations.map(reg => [
            `"${reg.id}"`,
            `"${new Date(reg.registrationDate || '').toLocaleString()}"`,
            `"${reg.attendeeName}"`,
            `"${reg.attendeeEmail}"`,
            `"${reg.mobile || 'N/A'}"`,
            `"${reg.paymentMethod.replace('_', ' ')}"`,
            `"${reg.amount || (viewingEventRegistrations?.price || 0)}"`,
            `"${reg.paymentStatus}"`
        ]);

        const csvString = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `${eventTitle.replace(/\s+/g, '_')}_Manifest.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setToast({ message: "Digital Manifest exported successfully", type: 'success' });
    };


    
    // Media States
    const [eventPreview, setEventPreview] = useState<string>('');
    const [highlightsVideoURL, setHighlightsVideoURL] = useState<string | null>(null);
    const [highlightsVideoPath, setHighlightsVideoPath] = useState<string | null>(null);
    const [eventVideoProgress, setEventVideoProgress] = useState<number>(0);
    const [eventGallery, setEventGallery] = useState<{ url: string; path: string; progress: number; id: string }[]>([]);
    const [uploadingCount, setUploadingCount] = useState(0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
    const [eventDescription, setEventDescription] = useState<string>('');


    useEffect(() => {
        if (eventModal.open) {
            setEventDescription(eventModal.event?.description || '');
            setEventPreview(eventModal.event?.image || '');
        } else {
            setEventDescription('');
            setEventPreview('');
            setHighlightsVideoURL(null);
            setHighlightsVideoPath(null);
            setEventGallery([]);
        }
    }, [eventModal.open, eventModal.event]);

    // Realtime Sync Hook
    useEffect(() => {
        if (!eventModal.open || !eventModal.event?.id) return;

        const unsubscribe = onSnapshot(doc(db, 'events', eventModal.event.id), (snapshot: any) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                setHighlightsVideoURL(data.highlightsVideoURL || null);
                setHighlightsVideoPath(data.highlightsVideoPath || null);
                if (data.galleryImages) {
                    setEventGallery(prev => {
                        const existing = prev.filter(p => p.progress < 100);
                        const fullyUploaded = data.galleryImages.map((img: any) => ({
                            id: img.path,
                            url: img.url,
                            path: img.path,
                            progress: 100
                        }));
                        return [...fullyUploaded, ...existing];
                    });
                }
            }
        });

        return () => unsubscribe();
    }, [eventModal.open, eventModal.event?.id]);


    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Media Handlers
    const handleVideoUpload = async (file: File) => {
        if (!eventModal.event?.id) return;
        const dirPath = `events/${eventModal.event.id}/highlights`;
        setUploadingCount(prev => prev + 1);
        try {
            const { url, path: actualPath } = await uploadFile(file, dirPath, (progress) => {
                setEventVideoProgress(Math.round(progress));
            });
            await updateEventPartial(eventModal.event.id, {
                highlightsVideoURL: url,
                highlightsVideoPath: actualPath,
                videoUrl: url // Legacy
            });
            setHighlightsVideoURL(url);
            setHighlightsVideoPath(actualPath);
            showToast("Video uploaded successfully.");
        } catch (error) {
            console.error(error);
            showToast("Video upload failed.", "error");
        } finally {
            setUploadingCount(prev => prev - 1);
            setEventVideoProgress(0);
        }
    };

    const handleVideoDelete = () => {
        if (!eventModal.event?.id || !highlightsVideoPath) return;
        requestDelete('Are you sure you want to delete this highlight video?', async () => {
            try {
                await deleteFile(highlightsVideoPath);
                await updateEventPartial(eventModal.event!.id, {
                    highlightsVideoURL: null,
                    highlightsVideoPath: null,
                    videoUrl: "" // Legacy
                });
                setHighlightsVideoURL(null);
                setHighlightsVideoPath(null);
                showToast("Video deleted.");
            } catch (error) {
                showToast("Deletion failed.", "error");
            }
        });
    };

    const handleGalleryUpload = async (files: File[]) => {
        if (!eventModal.event?.id) return;
        setUploadingCount(prev => prev + files.length);

        for (const file of files) {
            const tempId = Math.random().toString(36).substr(2, 9);
            setEventGallery(prev => [...prev, { id: tempId, url: '', path: '', progress: 0 }]);
            
            try {
                const dirPath = `events/${eventModal.event.id}/gallery`;
                
                const { url, path: actualPath } = await uploadFile(file, dirPath, (progress) => {
                    setEventGallery(prev => prev.map(item => 
                        item.id === tempId ? { ...item, progress: Math.round(progress) } : item
                    ));
                });

                const newImage = { url, path: actualPath, uploadedAt: new Date().toISOString() };
                
                await updateEventPartial(eventModal.event.id, {
                    galleryImages: arrayUnion(newImage) as any,
                    galleryUrls: arrayUnion(url) as any // Legacy
                });

                setEventGallery(prev => prev.filter(item => item.id !== tempId));
            } catch (error) {
                console.error(error);
                showToast(`Failed to upload ${file.name}`, "error");
                setEventGallery(prev => prev.filter(item => item.id !== tempId));
            } finally {
                setUploadingCount(prev => prev - 1);
            }
        }
    };

    const handleGalleryDelete = (path: string) => {
        if (!eventModal.event?.id) return;
        const eventId = eventModal.event.id;
        requestDelete('Are you sure you want to remove this photo from the gallery?', async () => {
            try {
                await deleteFile(path);
                const currentEvent = events.find(e => e.id === eventId);
                const imageToRemove = (currentEvent?.galleryImages || []).find(img => img.path === path);
                const urlToRemove = imageToRemove?.url || '';

                if (imageToRemove) {
                    await updateEventPartial(eventId, {
                        galleryImages: arrayRemove(imageToRemove) as any,
                        ...(urlToRemove ? { galleryUrls: arrayRemove(urlToRemove) as any } : {})
                    });
                }
                showToast("Photo removed.");
            } catch (error) {
                showToast("Delete failed.", "error");
            }
        });
    };
    const [announcementPreview, setAnnouncementPreview] = useState<string>('');
    const [isUploading, setIsUploading] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    
    // Profile Edit States
    const [profileName, setProfileName] = useState('');
    const [profileImgUrl, setProfileImgUrl] = useState('');
    const [profileEmail, setProfileEmail] = useState('');
    const [profileBirthday, setProfileBirthday] = useState('');
    const [profilePhone, setProfilePhone] = useState('');
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [profileMessage, setProfileMessage] = useState('');
    const [profileError, setProfileError] = useState('');

    // Password Update States
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState('');
    const [passwordError, setPasswordError] = useState('');

    // Initialize Profile Fields when Modal Opens
    useEffect(() => {
        if (isProfileModalOpen && profile) {
            setProfileName(profile.displayName || '');
            setProfileImgUrl(profile.image || '');
            setProfileEmail(profile.email || user?.email || '');
            setProfileBirthday(profile.birthday || '');
            setProfilePhone(profile.phone || '');
            setProfileMessage('');
            setProfileError('');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrentPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
            setPasswordMessage('');
            setPasswordError('');
        }
    }, [isProfileModalOpen, profile, user]);

    // Handle Profile detail updates
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setIsSavingProfile(true);
        setProfileMessage('');
        setProfileError('');

        try {
            await updateDoc(doc(db, 'users', user.uid), {
                displayName: profileName,
                image: profileImgUrl,
                email: profileEmail,
                birthday: profileBirthday,
                phone: profilePhone ? `+63${profilePhone}` : '',
                updatedAt: serverTimestamp(),
            });
            setProfileMessage('Profile details updated successfully!');
        } catch (error: any) {
            console.error("Failed to update profile:", error);
            setProfileError(error.message || 'Failed to update profile details.');
        } finally {
            setIsSavingProfile(false);
        }
    };

    // Handle Admin profile image upload
    const handleAdminImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;
        setIsUploadingImage(true);
        setProfileMessage('');
        setProfileError('');
        try {
            const dirPath = `users/${user.uid}/profile`;
            const { url } = await uploadFile(file, dirPath);
            setProfileImgUrl(url);
            setProfileMessage('Profile picture uploaded successfully! Save changes to persist.');
        } catch (error: any) {
            console.error("Image upload failed:", error);
            setProfileError('Failed to upload profile picture.');
        } finally {
            setIsUploadingImage(false);
        }
    };

    // Handle Password Updates
    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !user.email) return;
        
        if (newPassword !== confirmPassword) {
            setPasswordError('New passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters long.');
            return;
        }

        setIsChangingPassword(true);
        setPasswordMessage('');
        setPasswordError('');

        try {
            // Reauthenticate first
            const credential = EmailAuthProvider.credential(user.email, currentPassword);
            await reauthenticateWithCredential(user, credential);
            
            // Update password
            await updatePassword(user, newPassword);
            
            setPasswordMessage('Password updated successfully!');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error("Failed to change password:", error);
            setPasswordError(error.message || 'Failed to update password. Check your current password.');
        } finally {
            setIsChangingPassword(false);
        }
    };

    const toggleTheme = () => {
        const nextDark = !isDark;
        setIsDark(nextDark);
        if (nextDark) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
    };
    const [inspectingApp, setInspectingApp] = useState<AccreditationApplication | null>(null);
    const [failReason, setFailReason] = useState('');
    const [showFailInput, setShowFailInput] = useState(false);
    const [accredActionLoading, setAccredActionLoading] = useState(false);
    const [selectedVisitDate, setSelectedVisitDate] = useState('');
    const [selectedRevisitDate, setSelectedRevisitDate] = useState('');
    const [vefModal, setVefModal] = useState<{ open: boolean; existing: VisitingEvaluationForm | null }>({ open: false, existing: null });
    const [accredFileViewer, setAccredFileViewer] = useState<ViewerFile | null>(null);
    const [quickPayApp, setQuickPayApp] = useState<AccreditationApplication | null>(null);
    const [quickPayLoading, setQuickPayLoading] = useState(false);
    const [showQuickRejectInput, setShowQuickRejectInput] = useState(false);
    const [quickRejectReason, setQuickRejectReason] = useState('');
    const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);

    const [liveAccreditationFee, setLiveAccreditationFee] = useState(15000);
    const [liveAccreditationProcessingFee, setLiveAccreditationProcessingFee] = useState(2500);

    useEffect(() => {
        const unsub = onSnapshot(doc(db, 'systemSettings', 'accreditation'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setLiveAccreditationFee(data.baseFee || 15000);
                const feeEnabled = data.enableProcessingFee !== undefined ? data.enableProcessingFee : true;
                setLiveAccreditationProcessingFee(feeEnabled ? (data.processingFee !== undefined ? data.processingFee : 2500) : 0);
            }
        }, (err) => {
            console.error('[AdminDashboard] Acc settings error:', err);
        });
        return () => unsub();
    }, []);

    const handleQuickApprovePayment = async (app: AccreditationApplication) => {
        setQuickPayLoading(true);
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
                clinicId: app.clinicId,
                type: 'accreditation_approved',
                title: 'Accreditation Manual Payment Approved!',
                body: `Congratulations! Your manual payment for ${app.clinicName} was confirmed and approved. Accreditation No: ${accreditationNo}. Valid until ${validUntil.toLocaleDateString()}.`,
                read: false,
                createdAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'admin_notifications'), {
                type: 'accreditation',
                title: 'Manual Payment Approved',
                body: `${app.clinicName} manual payment approved. Accreditation No: ${accreditationNo}.`,
                link: 'accreditation',
                read: false,
                createdAt: serverTimestamp(),
            });

            showToast(`Payment Approved! Accredited No: ${accreditationNo}`, 'success');
            setQuickPayApp(null);
        } catch (e) {
            console.error(e);
            showToast('Failed to approve manual payment.', 'error');
        } finally {
            setQuickPayLoading(false);
        }
    };

    const handleQuickRejectPayment = async (app: AccreditationApplication, reason?: string) => {
        setQuickPayLoading(true);
        try {
            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                status: 'for_payment',
                'paymentData.rejectedAt': new Date().toISOString(),
                'paymentData.rejectionReason': reason || 'Payment proof verification failed. Please upload a valid receipt.',
                updatedAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'member_notifications'), {
                clinicId: app.clinicId,
                type: 'accreditation_rejected',
                title: 'Manual Payment Proof Declined',
                body: `Your payment proof for ${app.clinicName} was declined: ${reason || 'Invalid or unreadable deposit slip'}. Please upload a clear receipt in the Accreditation portal.`,
                read: false,
                createdAt: serverTimestamp(),
            });

            await addDoc(collection(db, 'admin_notifications'), {
                type: 'accreditation',
                title: 'Manual Payment Declined',
                body: `Manual payment for ${app.clinicName} was declined.`,
                link: 'accreditation',
                read: false,
                createdAt: serverTimestamp(),
            });

            showToast('Manual payment rejected. Notification sent to member.', 'info');
            setQuickPayApp(null);
        } catch (e) {
            console.error(e);
            showToast('Failed to reject manual payment.', 'error');
        } finally {
            setQuickPayLoading(false);
        }
    };

    // Keep the inspected application's evaluation forms in sync with live data
    useEffect(() => {
        if (!inspectingApp) return;
        const fresh = accreditationApplications.find(a => a.id === inspectingApp.id);
        if (fresh && JSON.stringify(fresh.visitingEvaluationForms || []) !== JSON.stringify(inspectingApp.visitingEvaluationForms || [])) {
            setInspectingApp(fresh);
        }
    }, [accreditationApplications, inspectingApp]);

    // Handle incoming URL parameters to inspect specific applications
    useEffect(() => {
        const inspectId = searchParams.get('inspect');
        if (inspectId) {
            const matchApp = accreditationApplications.find(a => a.id === inspectId);
            if (matchApp) {
                setInspectingApp(matchApp);
                setShowFailInput(false);
                setFailReason('');
                setSelectedVisitDate(matchApp.loiData?.preferredVisitDates?.[0] || '');
            }
        } else {
            setInspectingApp(null);
        }

        const searchQuery = searchParams.get('search');
        if (searchQuery) {
            setAccSearchQuery(searchQuery);
        }
    }, [searchParams, accreditationApplications]);

    const formattedTime = currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    const formattedDate = currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0F172A] font-display text-slate-900 dark:text-slate-100 flex overflow-hidden relative">

            {/* Mobile Sidebar Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] md:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* Premium Sidebar */}
            <aside 
                className={`flex-shrink-0 bg-[#F8FAFC] dark:bg-[#111827] text-slate-600 dark:text-slate-300 h-screen sticky top-0 z-[110] transition-all duration-300 ease-in-out flex flex-col shadow-xl border-r border-slate-200 dark:border-white/5
                    ${isSidebarExpanded ? 'w-60' : 'w-16'} 
                    ${isMobileMenuOpen ? 'fixed left-0' : 'fixed -left-60 md:static'}
                `}
            >
                {/* Sidebar Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200 dark:border-slate-700/50">
                    {isSidebarExpanded && (
                        <div className="flex items-center animate-fade-in whitespace-nowrap overflow-hidden">
                            {sidebarExpandedLogoUrl || logoUrl ? (
                                <img src={sidebarExpandedLogoUrl || logoUrl} className="h-9 w-auto max-w-[140px] object-contain" alt="Logo" />
                            ) : (
                                <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-primary/20">P</div>
                            )}
                        </div>
                    )}
                    {!isSidebarExpanded && (
                        <div className="w-8 h-8 flex items-center justify-center mx-auto overflow-hidden">
                            {sidebarCollapsedLogoUrl || logoUrl ? (
                                <img src={sidebarCollapsedLogoUrl || logoUrl} className="w-full h-full object-contain" alt="Logo" />
                            ) : (
                                <div className="w-8 h-8 rounded-[10px] bg-primary flex items-center justify-center text-white font-semibold text-lg shadow-lg shadow-primary/20">P</div>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
                        className="hidden md:flex p-1.5 rounded-[10px] hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                    >
                        <span className="material-symbols-outlined text-lg">
                            {isSidebarExpanded ? 'menu_open' : 'menu'}
                        </span>
                    </button>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="md:hidden p-1.5 rounded-[10px] hover:bg-slate-200 dark:hover:bg-slate-700/50 transition-colors text-slate-500 hover:text-slate-800"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Sidebar Navigation */}
                <nav className="flex-1 p-2 space-y-1 overflow-y-auto no-scrollbar pt-6">
                    {(() => {
                        const navItems = [
                            { id: 'dashboard', icon: 'grid_view', label: 'Dashboard', badge: unreadByTab['dashboard'], color: 'text-blue-500 dark:text-blue-400' },
                            { id: 'messages', icon: 'chat_bubble', label: 'Inquiries', badge: unreadByTab['messages'], color: 'text-emerald-500 dark:text-emerald-400' },
                            { id: 'inbox', icon: 'forum', label: 'Inbox', badge: unreadByTab['inbox'], color: 'text-teal-500 dark:text-teal-400' },
                            { id: 'members', icon: 'group', label: 'PAHA Members', color: 'text-indigo-500 dark:text-indigo-400' },
                            { id: 'accreditation', icon: 'assignment_turned_in', label: 'Accreditation', badge: unreadByTab['accreditation'], color: 'text-orange-500 dark:text-orange-400' },
                            { id: 'applications', icon: 'person_add', label: 'Applications', badge: unreadByTab['applications'], color: 'text-violet-500 dark:text-violet-400' },
                            { id: 'events', icon: 'event', label: 'Events Hub', badge: unreadByTab['events'], color: 'text-amber-500 dark:text-amber-400' },
                            { id: 'announcements', icon: 'notifications', label: 'Broadcasts', badge: unreadByTab['announcements'], color: 'text-rose-500 dark:text-rose-400' },
                            { id: 'cms', icon: 'web', label: 'Editor', color: 'text-cyan-500 dark:text-cyan-400' },
                            { id: 'partners', icon: 'handshake', label: 'Partners', color: 'text-pink-500 dark:text-pink-400' },
                            { id: 'committees', icon: 'diversity_3', label: 'Committees', color: 'text-purple-500 dark:text-purple-400' },
                            { id: 'former_officers', icon: 'history', label: 'Archives', color: 'text-slate-500 dark:text-slate-400' },
                            ...(isSuperAdmin ? [{ id: 'access_control', icon: 'admin_panel_settings', label: 'Access Control', color: 'text-red-500 dark:text-red-400' }] : []),
                            ...(isSuperAdmin ? [{ id: 'paycools_transactions', icon: 'payments', label: 'PayCools Logs', color: 'text-emerald-500 dark:text-emerald-400' }] : []),
                            ...(isSuperAdmin ? [{ id: 'settings', icon: 'settings', label: 'Settings', color: 'text-slate-500 dark:text-slate-400' }] : []),
                        ];

                        const filteredNavItems = navItems.filter(item => {
                            return isSuperAdmin || allowedSections.includes(item.id);
                        });

                        return filteredNavItems.map(item => {
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => {
                                        setActiveTab(item.id as any);
                                        if (window.innerWidth < 768) setIsMobileMenuOpen(false);
                                        window.scrollTo({ top: 0, behavior: 'instant' });
                                    }}
                                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-[10px] transition-all relative border border-transparent
                                        ${activeTab === item.id 
                                            ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm' 
                                            : 'hover:bg-slate-200/50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-transparent'
                                        }`}
                                    title={!isSidebarExpanded ? item.label : ''}
                                >
                                    <span className={`material-symbols-outlined shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} ${item.color}`}>
                                        {item.icon}
                                    </span>
                                    {isSidebarExpanded && (
                                        <span className="font-semibold text-xs flex-1 text-left animate-fade-in truncate">{item.label}</span>
                                    )}
                                    {item.badge && item.badge > 0 && (
                                        <span className={`flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-semibold text-white ${!isSidebarExpanded ? 'absolute -top-1 -right-1 ring-2 ring-[#F8FAFC] dark:ring-[#111827]' : ''}`}>
                                            {item.badge}
                                        </span>
                                    )}
                                    {activeTab === item.id && (
                                        <div className="absolute left-[-8px] top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full shadow-[0_0_15px_rgba(43,141,238,0.6)]" />
                                    )}
                                </button>
                            );
                        });
                    })()}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-3 border-t border-slate-200 dark:border-slate-700/50 space-y-2">
                    {isSidebarExpanded && (
                        <div className="px-3 py-2 text-center border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-800/10 rounded-[8px] animate-fade-in">
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">System App version 1.0.0</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Wrapper */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden overflow-y-auto custom-scrollbar">
                
                {/* Top Header */}
                <header className="h-16 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800 sticky top-0 z-[100] px-6 md:px-10 flex items-center justify-between shadow-sm dark:shadow-slate-900/10 dark:border-white/5">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 rounded-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 active:scale-95 transition-transform"
                        >
                            <span className="material-symbols-outlined">menu</span>
                        </button>
                        <div className="hidden md:block">
                            <p className="text-xl font-bold uppercase text-slate-900 dark:text-white tracking-tight">
                                {activeTab.replace('_', ' ')}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 md:gap-4">
                        {/* Global Search bar */}
                        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 rounded-[10px] w-72 xl:w-96 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                            <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
                            <input 
                                id="ad-resourceSearch"
                                name="ad-resourceSearch"
                                type="text" 
                                placeholder="Search resources..." 
                                className="bg-transparent border-none outline-none focus:outline-none focus:ring-0 focus:border-none focus-visible:outline-none text-xs text-slate-700 dark:text-slate-200 placeholder-slate-400 w-full"
                            />
                        </div>

                        {/* Beautiful Divider */}
                        <div className="hidden lg:block h-6 w-px bg-slate-200 dark:bg-slate-800/80 mx-1"></div>

                        {/* Live Clock Widget */}
                        <div className="hidden xl:flex items-center gap-3 px-3 py-1.5 bg-slate-50/50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-white/5 rounded-[10px] shadow-sm hover:border-primary/20 dark:hover:border-primary/30 transition-all duration-300">
                            <div className="w-7 h-7 rounded-[8px] bg-primary/10 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined text-base animate-pulse">schedule</span>
                            </div>
                            <div className="flex flex-col text-left">
                                <span className="text-[12px] font-bold text-slate-800 dark:text-slate-100 font-mono tracking-tight leading-none mb-0.5">
                                    {formattedTime}
                                </span>
                                <span className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                                    {formattedDate}
                                </span>
                            </div>
                        </div>

                        {/* Beautiful Divider */}
                        <div className="hidden xl:block h-6 w-px bg-slate-200 dark:bg-slate-800/80 mx-1"></div>

                        {/* Theme Toggle Button */}
                        <button
                            type="button"
                            onClick={toggleTheme}
                            className="w-10 h-10 rounded-[10px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
                            title="Toggle Light/Dark Theme"
                        >
                            <span className="material-symbols-outlined text-xl">
                                {isDark ? 'light_mode' : 'dark_mode'}
                            </span>
                        </button>

                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <button
                                    onClick={() => { setShowNotifications(!showNotifications); if (!showNotifications && unreadNotificationCount > 0) markAllNotificationsRead(); }}
                                    className="w-10 h-10 rounded-[10px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-primary hover:border-primary/30 transition-all relative group"
                                >
                                    <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">notifications</span>
                                    {unreadNotificationCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-900 flex items-center justify-center text-[9px] font-bold text-white">
                                            {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                                        </span>
                                    )}
                                </button>

                                {showNotifications && (
                                    <>
                                        <div className="fixed inset-0 z-[150]" onClick={() => setShowNotifications(false)} />
                                        <div className="absolute right-0 top-12 w-80 bg-white dark:bg-[#1E293B] rounded-[10px] shadow-2xl border border-slate-200 dark:border-white/10 z-[200] overflow-hidden animate-modal-pop">
                                            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-widest">Notifications</h4>
                                                <button onClick={() => markAllNotificationsRead()} className="text-[9px] font-semibold text-primary hover:underline uppercase tracking-widest">Mark all read</button>
                                            </div>
                                            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-white/5">
                                                {notifications.length === 0 ? (
                                                    <div className="py-8 text-center text-xs text-slate-400">No notifications yet.</div>
                                                ) : notifications.slice(0, 20).map(n => (
                                                    <div
                                                        key={n.id}
                                                        onClick={() => handleNotificationClick(n)}
                                                        role="button"
                                                        tabIndex={0}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleNotificationClick(n); }}
                                                        className={`px-4 py-3 hover:bg-slate-50 dark:hover:bg-white/5 cursor-pointer transition-colors ${!n.read ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                                                    >
                                                        <div className="flex items-start gap-3">
                                                            <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${!n.read ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                                            <div>
                                                                <p className="text-[11px] font-semibold text-slate-900 dark:text-white font-sans">{n.title}</p>
                                                                <p className="text-[10px] text-slate-500 mt-0.5 leading-relaxed font-sans">{n.body}</p>
                                                                <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest font-sans">
                                                                    {n.createdAt?.toDate ? n.createdAt.toDate().toLocaleString() : 'Just now'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className="h-10 w-px bg-slate-200 dark:bg-slate-800 mx-1 hidden sm:block"></div>

                        {/* Profile Dropdown Container */}
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                                className="flex items-center gap-3 p-1.5 rounded-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-transparent hover:border-slate-200 dark:hover:border-white/5 active:scale-95 transition-all duration-200 text-left"
                            >
                                {profile?.image ? (
                                    <img src={profile.image} className="w-8 h-8 rounded-full object-cover shadow-inner ring-2 ring-primary/20 shrink-0" alt="Avatar" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-blue-600 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-xs font-bold text-white shadow-inner shrink-0">
                                        {profile?.displayName?.substring(0, 2).toUpperCase() || 'AD'}
                                    </div>
                                )}
                                <div className="hidden md:flex flex-col min-w-0 max-w-[120px]">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">{profile?.displayName || 'Master Admin'}</p>
                                    <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">{user?.email || 'admin@paha.com'}</p>
                                </div>
                                <span className="material-symbols-outlined text-slate-400 text-sm">keyboard_arrow_down</span>
                            </button>

                            {showProfileDropdown && (
                                <>
                                    <div className="fixed inset-0 z-[150]" onClick={() => setShowProfileDropdown(false)} />
                                    <div className="absolute right-0 top-11 w-64 bg-white dark:bg-[#1E293B] rounded-[12px] shadow-2xl border border-slate-200 dark:border-white/10 z-[200] overflow-hidden animate-modal-pop text-left">
                                        {/* User Info Header Card */}
                                        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-white/5 flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                {profile?.image ? (
                                                    <img src={profile.image} className="w-10 h-10 rounded-full object-cover shadow-md border border-white dark:border-slate-700" alt="Profile" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-600 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-sm font-bold text-white shadow-md shrink-0">
                                                        {profile?.displayName?.substring(0, 2).toUpperCase() || 'AD'}
                                                    </div>
                                                )}
                                                <div className="text-left min-w-0 flex-1">
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                                        {profile?.displayName || 'Master Admin'}
                                                    </h4>
                                                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                                        {user?.email || 'admin@paha.com'}
                                                    </p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/5">
                                                <span className={`text-[8px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                                    adminRole === 'super_admin' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                                                    adminRole === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                                                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                                }`}>
                                                    {adminRole?.replace('_', ' ') || 'Admin'}
                                                </span>
                                                <span className="text-[8px] font-bold text-emerald-500 uppercase flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 ml-auto">
                                                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                                                    Synced
                                                </span>
                                            </div>
                                        </div>

                                        {/* Dropdown Options */}
                                        <div className="p-1.5 divide-y divide-slate-100 dark:divide-white/5">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsProfileModalOpen(true);
                                                    setShowProfileDropdown(false);
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[8px] transition-colors text-left"
                                            >
                                                <span className="material-symbols-outlined text-slate-400 text-base">manage_accounts</span>
                                                Account Profile
                                            </button>
                                            {isSuperAdmin && (
                                                <button
                                                    onClick={() => {
                                                        setActiveTab('settings');
                                                        setShowProfileDropdown(false);
                                                    }}
                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-[8px] transition-colors text-left"
                                                >
                                                    <span className="material-symbols-outlined text-slate-400 text-base">settings</span>
                                                    System Settings
                                                </button>
                                            )}
                                            
                                            <button
                                                onClick={async () => {
                                                    setShowProfileDropdown(false);
                                                    if (window.confirm('Are you sure you want to end your administrative session?')) {
                                                        try {
                                                            await signOut();
                                                            navigate('/admin/login');
                                                        } catch (error) {
                                                            console.error("Logout failed:", error);
                                                            alert("Logout failed. Please try again.");
                                                        }
                                                    }
                                                }}
                                                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-[8px] transition-colors text-left"
                                            >
                                                <span className="material-symbols-outlined text-rose-500 dark:text-rose-400 text-base">logout</span>
                                                System Logout
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                    </div>
                </header>

                {/* Content Area */}
                <main className="p-4 md:p-10 pb-24 max-w-[1600px] mx-auto w-full">

                {adminRole === 'viewer' && (
                    <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined">visibility</span>
                        <span className="text-sm font-semibold">You are in <strong>View Only</strong> mode. You can browse data but cannot create, edit, or delete records.</span>
                    </div>
                )}

                {/* Access Control Tab */}
                {activeTab === 'access_control' && isSuperAdmin && (
                    <AccessControlPanel
                        acUsers={acUsers} setAcUsers={setAcUsers}
                        acLoading={acLoading} setAcLoading={setAcLoading}
                        acEditUser={acEditUser} setAcEditUser={setAcEditUser}
                        acEditRole={acEditRole} setAcEditRole={setAcEditRole}
                        acEditSections={acEditSections} setAcEditSections={setAcEditSections}
                        acSaving={acSaving} setAcSaving={setAcSaving}
                    />
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && isSuperAdmin && (
                    <SettingsPanel />
                )}

                {/* PayCools Transactions Tab */}
                {activeTab === 'paycools_transactions' && isSuperAdmin && (
                    <PayCoolsTransactions />
                )}

                {/* Dashboard Tab */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-10 animate-fade-in">
                        
                        {/* 1. Header & Stats Hub */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl font-semibold text-slate-900 dark:text-white uppercase tracking-tight">System Overview</h1>
                                <p className="text-sm text-slate-500 font-medium">Real-time operational metrics and infrastructure status.</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] flex items-center gap-3 shadow-sm">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Database: Online</span>
                                </div>
                                <button className="px-4 py-2 bg-primary text-white rounded-[10px] font-semibold text-xs uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:scale-95">
                                    Generate Report
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                { title: 'Registered Members', value: members.length, icon: 'group', color: 'bg-blue-500', trend: '+12.4%', label: 'Active Directory' },
                                { title: 'Pending Applications', value: pendingApps, icon: 'pending_actions', color: 'bg-orange-500', trend: `${pendingApps > 5 ? 'High' : 'Low'} priority`, label: 'Approval Queue' },
                                { title: 'Total Inquiries', value: messages.length, icon: 'mark_email_unread', color: 'bg-purple-500', trend: 'Live', label: 'Communication Hub' },
                                { title: 'Fiscal Revenue', value: formatCurrency(revenueYTD), icon: 'account_balance_wallet', color: 'bg-emerald-500', trend: '2026 FY', label: 'Financial Records' },
                            ].map((stat, i) => (
                                <div key={i} className="stat-card group relative bg-white dark:bg-slate-800/50 p-7 rounded-[2.5rem] border border-slate-200/60 dark:border-white/5 shadow-sm hover:shadow-2xl hover:shadow-primary/5 transition-all duration-500 overflow-hidden">
                                    <div className="absolute top-0 right-0 p-5 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
                                        <span className="material-symbols-outlined text-[100px] leading-none">{stat.icon}</span>
                                    </div>
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-12 h-12 ${stat.color} rounded-[10px] flex items-center justify-center text-white shadow-lg`}>
                                            <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest leading-none mb-1">{stat.label}</p>
                                            <p className="text-[10px] font-semibold text-emerald-500 uppercase tracking-tighter">{stat.trend}</p>
                                        </div>
                                    </div>
                                    <div className="relative z-10">
                                        <h3 className="text-4xl font-semibold text-slate-900 dark:text-white mb-2 tracking-tighter">{stat.value}</h3>
                                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{stat.title}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                            {/* 2. Main Analytics Section */}
                        <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
                            {/* Live Activity Stream */}
                            <div className="xl:col-span-2 space-y-4 activity-card">
                                <section className="bg-white dark:bg-slate-800/40 rounded-[3rem] p-10 border border-slate-200/60 dark:border-white/5 shadow-sm backdrop-blur-md relative overflow-hidden">
                                    <div className="flex items-center justify-between mb-12 relative z-10">
                                        <div>
                                            <h3 className="text-xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white mb-1">Activity Stream</h3>
                                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.3em]">Operational Chronology</p>
                                        </div>
                                        <div className="flex bg-slate-100 dark:bg-slate-900/50 p-1 rounded-[10px] border border-slate-200 dark:border-white/5">
                                            {['Live', 'Critical', 'Audit'].map((filter) => (
                                                <button key={filter} className={`px-4 py-1.5 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest transition-all ${filter === 'Live' ? 'bg-white dark:bg-slate-800 text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                                                    {filter}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-4 relative z-10">
                                        {activities.length === 0 ? (
                                            <div className="py-20 text-center">
                                                <div className="w-16 h-16 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                                                    <span className="material-symbols-outlined text-3xl">inbox</span>
                                                </div>
                                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">No Recent Transactions</p>
                                            </div>
                                        ) : (
                                            activities.map((activity) => (
                                                <div key={activity.id} className="group flex items-center gap-4 p-4 rounded-[10px] hover:bg-slate-50 dark:hover:bg-white/5 transition-all border border-transparent hover:border-slate-200/60 dark:hover:border-white/5 font-display">
                                                    <div className={`w-10 h-10 rounded-full ${activity.color} shrink-0 flex items-center justify-center text-white shadow-lg shadow-black/5 group-hover:scale-110 transition-transform`}>
                                                        <span className="material-symbols-outlined text-lg">{activity.icon}</span>
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-4 mb-0.5">
                                                            <h4 className="text-[11px] font-semibold text-slate-900 dark:text-white uppercase tracking-wider truncate">{activity.title}</h4>
                                                            <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest shrink-0">{timeAgo(activity.date)}</span>
                                                        </div>
                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                                            {activity.description}
                                                        </p>
                                                    </div>
                                                    <button className="opacity-0 group-hover:opacity-100 p-2 rounded-[10px] hover:bg-slate-200 dark:hover:bg-slate-700 transition-all">
                                                        <span className="material-symbols-outlined text-sm">chevron_right</span>
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>

                                    {/* Subtly animated background glow */}
                                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
                                </section>
                            </div>

                            {/* Infrastructure & Status Cards */}
                            <div className="space-y-8 infras-card">
                                <section className="bg-slate-900 rounded-[2.5rem] p-5 text-white relative overflow-hidden shadow-2xl ring-1 ring-white/10">
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
                                    <h3 className="text-[10px] font-semibold uppercase tracking-[0.4em] text-slate-500 mb-8 border-b border-white/10 pb-4">Infrastructure Monitor</h3>
                                    
                                    <div className="space-y-8 relative z-10">
                                        {[
                                            { label: 'Storage Cluster', value: '34.2 GB / 100 GB', progress: 34, color: 'bg-primary' },
                                            { label: 'API Latency', value: '24ms (Nominal)', progress: 95, color: 'bg-emerald-500' },
                                            { label: 'Memory Usage', value: '1.2 GB / 4 GB', progress: 28, color: 'bg-blue-400' },
                                        ].map((item, idx) => (
                                            <div key={idx} className="space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-widest">
                                                    <span className="text-slate-400">{item.label}</span>
                                                    <span className="text-white">{item.value}</span>
                                                </div>
                                                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                                    <div className={`h-full ${item.color} rounded-full transition-all duration-1000 shadow-[0_0_10px_rgba(255,255,255,0.2)]`} style={{ width: `${item.progress}%` }}></div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="mt-12 flex items-center justify-between">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-xs text-slate-500">dns</span>
                                                </div>
                                            ))}
                                        </div>
                                        <span className="text-[9px] font-semibold text-emerald-500 uppercase tracking-widest">Nodes Synchronized</span>
                                    </div>
                                </section>

                                <div className="bg-white dark:bg-slate-800/40 rounded-[2rem] p-4 border border-slate-200/60 dark:border-white/5 shadow-sm text-center">
                                    <span className="material-symbols-outlined text-4xl text-primary/20 mb-3">verified</span>
                                    <h4 className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-widest leading-none mb-1">Secured Environment</h4>
                                    <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-widest">TLS 1.3 / AES-256 Encryption Active</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Messages Tab */}
                {activeTab === 'messages' && (() => {
                    const totalCount = messages.length;
                    const unreadCount = messages.filter(m => !m.status || m.status === 'unread').length;
                    const repliedCount = messages.filter(m => m.status === 'replied').length;
                    const todayCount = messages.filter(m => {
                        try {
                            return new Date(m.date).toDateString() === new Date().toDateString();
                        } catch {
                            return false;
                        }
                    }).length;

                    const filtered = messages.filter(msg => {
                        const name = `${msg.firstName || ''} ${msg.lastName || ''}`.toLowerCase();
                        const email = (msg.email || '').toLowerCase();
                        const body = (msg.message || '').toLowerCase();
                        const searchLower = msgSearchQuery.toLowerCase();
                        const matchesSearch = !msgSearchQuery || name.includes(searchLower) || email.includes(searchLower) || body.includes(searchLower);

                        const status = msg.status || 'unread';
                        const matchesStatus = msgStatusFilter === 'all' || status === msgStatusFilter;

                        let matchesDate = true;
                        if (msgStartDate || msgEndDate) {
                            const msgTime = new Date(msg.date).getTime();
                            if (msgStartDate) {
                                const start = new Date(msgStartDate).setHours(0,0,0,0);
                                if (msgTime < start) matchesDate = false;
                            }
                            if (msgEndDate) {
                                const end = new Date(msgEndDate).setHours(23,59,59,999);
                                if (msgTime > end) matchesDate = false;
                            }
                        }

                        return matchesSearch && matchesStatus && matchesDate;
                    });



                    return (
                        <div className="space-y-6">
                            {/* KPI Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Inquiries</p>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <span className="material-symbols-outlined text-2xl">mail</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unread Messages</p>
                                        <h3 className="text-2xl font-bold text-amber-500 mt-1">{unreadCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <span className="material-symbols-outlined text-2xl">mark_email_unread</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Replied/Resolved</p>
                                        <h3 className="text-2xl font-bold text-emerald-500 mt-1">{repliedCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <span className="material-symbols-outlined text-2xl">mark_email_read</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Received Today</p>
                                        <h3 className="text-2xl font-bold text-purple-500 mt-1">{todayCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                        <span className="material-symbols-outlined text-2xl">today</span>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Filter Widget */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                    <div className="lg:col-span-2">
                                        <label htmlFor="ad-msgSearch" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Search Keywords</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                            <input
                                                id="ad-msgSearch"
                                                name="ad-msgSearch"
                                                type="text"
                                                placeholder="Search name, email, query..."
                                                value={msgSearchQuery}
                                                onChange={(e) => setMsgSearchQuery(e.target.value)}
                                                className="w-full text-xs font-semibold pl-9 pr-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-msgStatus" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            id="ad-msgStatus"
                                            name="ad-msgStatus"
                                            value={msgStatusFilter}
                                            onChange={(e: any) => setMsgStatusFilter(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="all">All Inquiries</option>
                                            <option value="unread">Unread</option>
                                            <option value="read">Read</option>
                                            <option value="replied">Replied/Resolved</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-msgStartDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
                                        <input
                                            id="ad-msgStartDate"
                                            name="ad-msgStartDate"
                                            type="date"
                                            value={msgStartDate}
                                            onChange={(e) => setMsgStartDate(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ad-msgEndDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
                                        <input
                                            id="ad-msgEndDate"
                                            name="ad-msgEndDate"
                                            type="date"
                                            value={msgEndDate}
                                            onChange={(e) => setMsgEndDate(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                {(msgSearchQuery || msgStatusFilter !== 'all' || msgStartDate || msgEndDate) && (
                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={() => {
                                                setMsgSearchQuery('');
                                                setMsgStatusFilter('all');
                                                setMsgStartDate('');
                                                setMsgEndDate('');
                                            }}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">filter_alt_off</span>
                                            Clear Filters
                                        </button>
                                    </div>
                                )}
                            </div>
                            {/* Enhanced modern table design */}
                            <div className="bg-white dark:bg-slate-800 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/5">
                                            <tr>
                                                <th className="p-4">Status</th>
                                                <th className="p-4">Received Date</th>
                                                <th className="p-4">Sender Name</th>
                                                <th className="p-4">Email Address</th>
                                                <th className="p-4">Message Summary</th>
                                                <th className="p-4 text-left">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs divide-y divide-slate-100 dark:divide-white/5">
                                            {filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-slate-500 font-medium">
                                                        <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">inbox</span>
                                                        No matching inquiries found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filtered.map(msg => {
                                                    const status = msg.status || 'unread';
                                                    let statusBadge = (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500">
                                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                                            Unread
                                                        </span>
                                                    );
                                                    if (status === 'read') {
                                                        statusBadge = (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-500">
                                                                <span className="size-1.5 rounded-full bg-blue-500" />
                                                                Read
                                                            </span>
                                                        );
                                                    } else if (status === 'replied') {
                                                        statusBadge = (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                                                Replied
                                                            </span>
                                                        );
                                                    }

                                                    return (
                                                        <tr key={msg.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                            <td className="p-4 whitespace-nowrap">{statusBadge}</td>
                                                            <td className="p-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-semibold">
                                                                {new Date(msg.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </td>
                                                            <td className="p-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                                                                {msg.firstName} {msg.lastName}
                                                            </td>
                                                            <td className="p-4 text-primary font-medium">{msg.email}</td>
                                                            <td className="p-4 max-w-xs truncate text-slate-600 dark:text-slate-400">{msg.message}</td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex justify-end gap-1.5">
                                                                    <button
                                                                        onClick={() => handleViewDetails(msg)}
                                                                        title="View Details"
                                                                        className="size-7 rounded-[8px] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-primary flex items-center justify-center transition-all border border-transparent hover:border-slate-200 dark:hover:border-white/10"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                                                    </button>
                                                                    {status !== 'replied' && (
                                                                        <button
                                                                            onClick={() => handleMarkReplied(msg)}
                                                                            title="Mark as Replied"
                                                                            className="size-7 rounded-[8px] hover:bg-emerald-50 dark:hover:bg-emerald-500/10 text-slate-500 hover:text-emerald-500 flex items-center justify-center transition-all border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/20"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">mark_email_read</span>
                                                                        </button>
                                                                    )}
                                                                    {status === 'replied' && (
                                                                        <button
                                                                            onClick={() => handleMarkUnread(msg)}
                                                                            title="Mark as Unread"
                                                                            className="size-7 rounded-[8px] hover:bg-amber-50 dark:hover:bg-amber-500/10 text-slate-500 hover:text-amber-500 flex items-center justify-center transition-all border border-transparent hover:border-amber-200 dark:hover:border-amber-500/20"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">mark_email_unread</span>
                                                                        </button>
                                                                    )}
                                                                    <button
                                                                        onClick={() => handleDelete(msg.id)}
                                                                        title="Delete Message"
                                                                        className="size-7 rounded-[8px] hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 hover:text-rose-500 flex items-center justify-center transition-all border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>


                        </div>
                    );
                })()}
                {/* Membership Applications Tab */}
                {activeTab === 'applications' && (() => {
                    const totalCount = applications.length;
                    const pendingCount = applications.filter(a => a.status === 'pending').length;
                    const approvedCount = applications.filter(a => a.status === 'approved').length;
                    const rejectedCount = applications.filter(a => a.status === 'rejected').length;

                    const filtered = applications.filter(app => {
                        const name = `${app.firstName || ''} ${app.lastName || ''}`.toLowerCase();
                        const email = (app.email || '').toLowerCase();
                        const hospital = (app.hospitalName || '').toLowerCase();
                        const school = (app.vetSchool || '').toLowerCase();
                        const searchLower = appSearchQuery.toLowerCase();
                        const matchesSearch = !appSearchQuery || name.includes(searchLower) || email.includes(searchLower) || hospital.includes(searchLower) || school.includes(searchLower);

                        // Once approved, an applicant is a full member and belongs in the
                        // PAHA Members tab, not this working queue — exclude them from the
                        // default view (still reachable by explicitly filtering "Approved").
                        const matchesStatus = appStatusFilter === 'all' ? app.status !== 'approved' : app.status === appStatusFilter;
                        const matchesType = appTypeFilter === 'all' || app.type === appTypeFilter;

                        let matchesDate = true;
                        if (appStartDate || appEndDate) {
                            const appTime = new Date(app.date).getTime();
                            if (appStartDate) {
                                const start = new Date(appStartDate).setHours(0,0,0,0);
                                if (appTime < start) matchesDate = false;
                            }
                            if (appEndDate) {
                                const end = new Date(appEndDate).setHours(23,59,59,999);
                                if (appTime > end) matchesDate = false;
                            }
                        }

                        return matchesSearch && matchesStatus && matchesType && matchesDate;
                    });

                    const sorted = [...filtered].sort((a, b) => {
                        const dateA = a.date ? new Date(a.date).getTime() : 0;
                        const dateB = b.date ? new Date(b.date).getTime() : 0;
                        return dateB - dateA;
                    });

                    return (
                        <div className="space-y-6">
                            {/* KPI Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Applications</p>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <span className="material-symbols-outlined text-2xl">groups</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Review</p>
                                        <h3 className="text-2xl font-bold text-amber-500 mt-1">{pendingCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <span className="material-symbols-outlined text-2xl">pending_actions</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Approved Members</p>
                                        <h3 className="text-2xl font-bold text-emerald-500 mt-1">{approvedCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <span className="material-symbols-outlined text-2xl">how_to_reg</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Rejected</p>
                                        <h3 className="text-2xl font-bold text-rose-500 mt-1">{rejectedCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                                        <span className="material-symbols-outlined text-2xl">block</span>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Filter Widget */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                                    <div>
                                        <label htmlFor="ad-appSearch" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Search Candidates</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                            <input
                                                id="ad-appSearch"
                                                name="ad-appSearch"
                                                type="text"
                                                placeholder="Search name, email, school..."
                                                value={appSearchQuery}
                                                onChange={(e) => setAppSearchQuery(e.target.value)}
                                                className="w-full text-xs font-semibold pl-9 pr-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-appStatus" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            id="ad-appStatus"
                                            name="ad-appStatus"
                                            value={appStatusFilter}
                                            onChange={(e: any) => setAppStatusFilter(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="approved">Approved</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-appType" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Membership Type</label>
                                        <select
                                            id="ad-appType"
                                            name="ad-appType"
                                            value={appTypeFilter}
                                            onChange={(e: any) => setAppTypeFilter(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="all">All Types</option>
                                            <option value="regular">Regular</option>
                                            <option value="associate">Associate</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-appStartDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
                                        <input
                                            id="ad-appStartDate"
                                            name="ad-appStartDate"
                                            type="date"
                                            value={appStartDate}
                                            onChange={(e) => setAppStartDate(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ad-appEndDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
                                        <input
                                            id="ad-appEndDate"
                                            name="ad-appEndDate"
                                            type="date"
                                            value={appEndDate}
                                            onChange={(e) => setAppEndDate(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                {(appSearchQuery || appStatusFilter !== 'all' || appTypeFilter !== 'all' || appStartDate || appEndDate) && (
                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={() => {
                                                setAppSearchQuery('');
                                                setAppStatusFilter('all');
                                                setAppTypeFilter('all');
                                                setAppStartDate('');
                                                setAppEndDate('');
                                            }}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">filter_alt_off</span>
                                            Clear Filters
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Remarks Confirmation Modal */}
                            {appActionTarget && appActionType && (
                                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setAppActionTarget(null); setAppActionType(null); setAppRemarksDraft(''); }} />
                                    <div className="relative z-10 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md border border-slate-200 dark:border-white/10 overflow-hidden animate-modal-pop">
                                        {/* Modal header */}
                                        <div className={`px-6 py-4 flex items-center gap-3 border-b border-slate-100 dark:border-white/5 ${appActionType === 'approved' ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-rose-50 dark:bg-rose-950/30'}`}>
                                            <div className={`size-10 rounded-xl flex items-center justify-center ${appActionType === 'approved' ? 'bg-emerald-500' : 'bg-rose-500'} shadow-lg`}>
                                                <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                    {appActionType === 'approved' ? 'how_to_reg' : 'person_off'}
                                                </span>
                                            </div>
                                            <div>
                                                <h4 className={`font-black text-sm ${appActionType === 'approved' ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                                                    {appActionType === 'approved' ? 'Approve Application' : 'Reject Application'}
                                                </h4>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{appActionTarget.firstName} {appActionTarget.lastName}</p>
                                            </div>
                                        </div>
                                        {/* Modal body */}
                                        <div className="px-6 py-5 space-y-4">
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5">
                                                {appActionTarget.facilityMedia?.[0]?.url ? (
                                                    <img src={appActionTarget.facilityMedia[0].url} className="size-12 rounded-xl object-cover flex-shrink-0 border border-slate-200 dark:border-white/10" alt="" />
                                                ) : (
                                                    <div className={`size-12 rounded-xl flex items-center justify-center text-white font-black text-base flex-shrink-0 ${appActionType === 'approved' ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-500 to-pink-600'}`}>
                                                        {`${appActionTarget.firstName?.[0] ?? ''}${appActionTarget.lastName?.[0] ?? ''}`.toUpperCase()}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-bold text-slate-900 dark:text-white text-sm">{appActionTarget.firstName} {appActionTarget.lastName}</p>
                                                    <p className="text-xs text-slate-400 font-medium">{appActionTarget.email}</p>
                                                    <p className="text-[10px] text-slate-400 uppercase tracking-wider mt-0.5">{appActionTarget.type} · {appActionTarget.hospitalName || appActionTarget.vetSchool || 'N/A'}</p>
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="app-action-remarks" className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
                                                    {appActionType === 'approved' ? '✓ Approval Remarks (optional)' : '✗ Rejection Reason (optional)'}
                                                </label>
                                                <textarea
                                                    id="app-action-remarks"
                                                    rows={3}
                                                    value={appRemarksDraft}
                                                    onChange={e => setAppRemarksDraft(e.target.value)}
                                                    placeholder={appActionType === 'approved'
                                                        ? 'e.g., Documents verified. Welcome to PAHA!'
                                                        : 'e.g., Incomplete documentation. Please resubmit with valid PRC license.'}
                                                    className="w-full text-xs px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 resize-none placeholder:text-slate-300 dark:placeholder:text-slate-600"
                                                />
                                            </div>
                                        </div>
                                        {/* Modal footer */}
                                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-white/[0.02]">
                                            <button
                                                onClick={() => { setAppActionTarget(null); setAppActionType(null); setAppRemarksDraft(''); }}
                                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors rounded-lg"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                disabled={appActionSaving}
                                                onClick={async () => {
                                                    setAppActionSaving(true);
                                                    try {
                                                        if (appActionType === 'approved') {
                                                            await handleManualSync(appActionTarget);
                                                        }
                                                        await updateApplicationStatus(appActionTarget.id, appActionType);
                                                        if (appRemarksDraft.trim()) {
                                                            await updateDoc(doc(db, 'membership_applications', appActionTarget.id), {
                                                                adminRemarks: appRemarksDraft.trim(),
                                                                reviewedAt: new Date().toISOString(),
                                                                reviewedBy: user?.email || 'admin',
                                                            });
                                                        }
                                                        showToast(appActionType === 'approved'
                                                            ? `✓ Application of ${appActionTarget.firstName} ${appActionTarget.lastName} approved!`
                                                            : `✗ Application of ${appActionTarget.firstName} ${appActionTarget.lastName} rejected.`,
                                                            appActionType === 'approved' ? 'success' : 'error'
                                                        );
                                                    } finally {
                                                        setAppActionSaving(false);
                                                        setAppActionTarget(null);
                                                        setAppActionType(null);
                                                        setAppRemarksDraft('');
                                                    }
                                                }}
                                                className={`inline-flex items-center gap-2 px-5 py-2 text-xs font-black text-white rounded-xl transition-all active:scale-95 disabled:opacity-60 ${appActionType === 'approved' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-rose-500 hover:bg-rose-600 shadow-rose-500/20'} shadow-lg`}
                                            >
                                                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                                                    {appActionType === 'approved' ? 'check_circle' : 'cancel'}
                                                </span>
                                                {appActionSaving ? 'Processing...' : (appActionType === 'approved' ? 'Confirm Approval' : 'Confirm Rejection')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Enhanced table */}
                            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <h3 className="font-black text-slate-900 dark:text-white text-sm">Application Records</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">{sorted.length} result{sorted.length !== 1 ? 's' : ''} found</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center gap-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-500/20">
                                            <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" />
                                            {applications.filter(a => a.status === 'pending').length} Pending
                                        </span>
                                    </div>
                                </div>
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/5">
                                            <tr>
                                                <th className="px-5 py-3.5">Membership ID</th>
                                                <th className="px-5 py-3.5">Applicant</th>
                                                <th className="px-5 py-3.5">Submitted</th>
                                                <th className="px-5 py-3.5">Type</th>
                                                <th className="px-5 py-3.5">Status</th>
                                                <th className="px-5 py-3.5">Payment</th>
                                                <th className="px-5 py-3.5 text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs divide-y divide-slate-100 dark:divide-white/5">
                                            {sorted.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-5 py-14 text-center text-slate-400">
                                                        <span className="material-symbols-outlined text-4xl opacity-30 block mb-2">inbox</span>
                                                        <p className="font-semibold">No applications found.</p>
                                                        <p className="text-[10px] mt-1">Try adjusting your filters.</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                sorted.map(app => {
                                                    const initials = `${app.firstName?.[0] ?? ''}${app.lastName?.[0] ?? ''}`.toUpperCase();
                                                    const avatarColors: Record<string, string> = {
                                                        A:'from-blue-500 to-indigo-600', B:'from-violet-500 to-purple-600',
                                                        C:'from-emerald-500 to-teal-600', D:'from-amber-500 to-orange-600',
                                                        E:'from-rose-500 to-pink-600', F:'from-cyan-500 to-blue-600',
                                                    };
                                                    const avatarGradient = avatarColors[initials[0]] ?? 'from-slate-500 to-slate-700';

                                                    const statusConfig = {
                                                        pending: { dot: 'bg-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Pending', pulse: true },
                                                        approved: { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Approved', pulse: false },
                                                        rejected: { dot: 'bg-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', label: 'Rejected', pulse: false },
                                                    }[app.status] ?? { dot: 'bg-slate-400', bg: 'bg-slate-100', text: 'text-slate-500', label: app.status, pulse: false };

                                                    const pStatus = (app as any).paymentStatus;
                                                    const payConfig = pStatus === 'paid'
                                                        ? { dot: 'bg-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Paid' }
                                                        : pStatus === 'pending_manual'
                                                        ? { dot: 'bg-amber-500 animate-pulse', bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Proof Submitted' }
                                                        : { dot: 'bg-slate-400', bg: 'bg-slate-100 dark:bg-white/5', text: 'text-slate-500', label: 'Unpaid' };

                                                    const linkedM = members.find(m => m.email === app.email);
                                                    const memberId = getApplicationId(app);

                                                    return (
                                                        <tr key={app.id} className="hover:bg-blue-50/30 dark:hover:bg-white/[0.02] transition-colors group">
                                                            {/* Membership ID */}
                                                            <td className="px-5 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-350 font-bold uppercase tracking-wider text-[10px]">
                                                                {memberId}
                                                            </td>

                                                            {/* Applicant with avatar */}
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <div className="flex items-center gap-3">
                                                                    {/* Live uploaded image or initials fallback */}
                                                                    {(() => {
                                                                        const userDoc = usersMap[(app as any).uid];
                                                                        const displayPhotoUrl = (app as any).photoUrl || userDoc?.photoUrl || (linkedM as any)?.image || (linkedM as any)?.photoUrl;
                                                                        return displayPhotoUrl ? (
                                                                            <img
                                                                                src={displayPhotoUrl}
                                                                                alt={`${app.firstName} ${app.lastName}`}
                                                                                className="size-9 rounded-xl object-cover flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-md ring-1 ring-black/5"
                                                                            />
                                                                        ) : app.facilityMedia?.[0]?.url ? (
                                                                            <img
                                                                                src={app.facilityMedia[0].url}
                                                                                alt={`${app.firstName} ${app.lastName}`}
                                                                                className="size-9 rounded-xl object-cover flex-shrink-0 border-2 border-white dark:border-slate-700 shadow-md ring-1 ring-black/5"
                                                                            />
                                                                        ) : (
                                                                            <div className={`size-9 rounded-xl bg-gradient-to-br ${avatarGradient} flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-md`}>
                                                                                {initials}
                                                                            </div>
                                                                        );
                                                                    })()}
                                                                    <div>
                                                                        <div className="font-bold text-slate-900 dark:text-white text-xs">{app.firstName} {app.lastName}</div>
                                                                        <div className="text-[10px] text-slate-400 font-medium">{app.email}</div>
                                                                    </div>
                                                                </div>
                                                            </td>

                                                            {/* Submitted */}
                                                            <td className="px-5 py-3.5 whitespace-nowrap text-slate-500 dark:text-slate-400 font-medium">
                                                                <div className="text-xs">{new Date(app.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                                                                <div className="text-[10px] text-slate-400">{new Date(app.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                                                            </td>

                                                            {/* Type */}
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                                    app.type === 'regular'
                                                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                                                        : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                                                                }`}>
                                                                    {app.type}
                                                                </span>
                                                            </td>

                                                            {/* Status */}
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${statusConfig.bg} ${statusConfig.text} border border-current/10`}>
                                                                    <span className={`size-1.5 rounded-full ${statusConfig.dot} ${statusConfig.pulse ? 'animate-pulse' : ''}`} />
                                                                    {statusConfig.label}
                                                                </span>
                                                            </td>

                                                            {/* Payment */}
                                                            <td className="px-5 py-3.5 whitespace-nowrap">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${payConfig.bg} ${payConfig.text}`}>
                                                                    <span className={`size-1.5 rounded-full ${payConfig.dot}`} />
                                                                    {payConfig.label}
                                                                </span>
                                                            </td>



                                                            {/* Actions */}
                                                            <td className="px-5 py-3.5 text-right relative">
                                                                <div className="flex justify-end items-center">
                                                                    <div className="relative inline-block text-left">
                                                                        <button
                                                                            id={`app-action-btn-${app.id}`}
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setActiveDropdownId(activeDropdownId === app.id ? null : app.id);
                                                                            }}
                                                                            title="Actions"
                                                                            className="inline-flex items-center justify-center size-8 rounded-lg bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-slate-700/50 text-slate-600 dark:text-slate-350 transition-all border border-slate-200 dark:border-white/5"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm font-bold">more_vert</span>
                                                                        </button>

                                                                        {activeDropdownId === app.id && (
                                                                            <>
                                                                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdownId(null)} />
                                                                                <div className="absolute right-0 mt-1.5 w-44 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-white/10 z-20 overflow-hidden animate-modal-pop text-left">
                                                                                    <div className="p-1 space-y-0.5">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setSelectedApplication(app);
                                                                                                setAppModalTab('clinic');
                                                                                                setActiveDropdownId(null);
                                                                                            }}
                                                                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg transition-colors"
                                                                                        >
                                                                                            <span className="material-symbols-outlined text-slate-400 text-base">visibility</span>
                                                                                            View Details
                                                                                        </button>

                                                                                        {app.status === 'pending' && adminRole !== 'viewer' && (
                                                                                            <>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setAppActionTarget(app);
                                                                                                        setAppActionType('approved');
                                                                                                        setAppRemarksDraft('');
                                                                                                        setActiveDropdownId(null);
                                                                                                    }}
                                                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                                                                >
                                                                                                    <span className="material-symbols-outlined text-emerald-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                                                                                                    Approve
                                                                                                </button>
                                                                                                <button
                                                                                                    onClick={() => {
                                                                                                        setAppActionTarget(app);
                                                                                                        setAppActionType('rejected');
                                                                                                        setAppRemarksDraft('');
                                                                                                        setActiveDropdownId(null);
                                                                                                    }}
                                                                                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                                                                                                >
                                                                                                    <span className="material-symbols-outlined text-rose-500 text-base" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
                                                                                                    Reject
                                                                                                </button>
                                                                                            </>
                                                                                        )}

                                                                                        {adminRole !== 'viewer' && (
                                                                                            <button
                                                                                                onClick={() => {
                                                                                                    setActiveDropdownId(null);
                                                                                                    requestDelete(`Delete application of ${app.firstName} ${app.lastName}?`, () => {
                                                                                                        deleteApplication(app.id);
                                                                                                    });
                                                                                                }}
                                                                                                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                                                            >
                                                                                                <span className="material-symbols-outlined text-rose-500 text-base">delete</span>
                                                                                                Delete
                                                                                            </button>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* Accreditation Tab */}
                {activeTab === 'accreditation' && !inspectingApp && (() => {
                    const totalCount = accreditationApplications.length;
                    const scheduledCount = accreditationApplications.filter(a => a.status === 'for_site_visit').length;
                    const accreditedCount = accreditationApplications.filter(a => a.status === 'accredited').length;
                    const reviewCount = accreditationApplications.filter(a => ['intent_submitted', 'intent_resubmitted', 'self_assessment_completed', 'inspection_completed', 'under_review'].includes(a.status)).length;

                    const filtered = accreditationApplications.filter(app => {
                        const clinic = (app.clinicName || '').toLowerCase();
                        const rep = (app.loiData?.representativeName || '').toLowerCase();
                        const ref = (app.loiData?.loiRef || app.id || '').toLowerCase();
                        const searchLower = accSearchQuery.toLowerCase();
                        const matchesSearch = !accSearchQuery || clinic.includes(searchLower) || rep.includes(searchLower) || ref.includes(searchLower);

                        const matchesStatus = accStatusFilter === 'all' || app.status === accStatusFilter;

                        let matchesDate = true;
                        if (accStartDate || accEndDate) {
                            const appTime = new Date(app.submittedAt).getTime();
                            if (accStartDate) {
                                const start = new Date(accStartDate).setHours(0,0,0,0);
                                if (appTime < start) matchesDate = false;
                            }
                            if (accEndDate) {
                                const end = new Date(accEndDate).setHours(23,59,59,999);
                                if (appTime > end) matchesDate = false;
                            }
                        }

                        return matchesSearch && matchesStatus && matchesDate;
                    });

                    return (
                        <div className="space-y-6">
                            {/* KPI Section */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Submissions</p>
                                        <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{totalCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                        <span className="material-symbols-outlined text-2xl">approval_delegation</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Site Visits Scheduled</p>
                                        <h3 className="text-2xl font-bold text-amber-500 mt-1">{scheduledCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                                        <span className="material-symbols-outlined text-2xl">calendar_today</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fully Accredited</p>
                                        <h3 className="text-2xl font-bold text-emerald-500 mt-1">{accreditedCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                        <span className="material-symbols-outlined text-2xl">verified</span>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Under Review</p>
                                        <h3 className="text-2xl font-bold text-purple-500 mt-1">{reviewCount}</h3>
                                    </div>
                                    <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                        <span className="material-symbols-outlined text-2xl">rate_review</span>
                                    </div>
                                </div>
                            </div>

                            {/* Advanced Filter Widget */}
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                                    <div>
                                        <label htmlFor="ad-accSearch" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Search Clinics Names</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                                            <input
                                                id="ad-accSearch"
                                                name="ad-accSearch"
                                                type="text"
                                                placeholder="Search clinic, reference..."
                                                value={accSearchQuery}
                                                onChange={(e) => setAccSearchQuery(e.target.value)}
                                                className="w-full text-xs font-semibold pl-9 pr-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-accStatus" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                                        <select
                                            id="ad-accStatus"
                                            name="ad-accStatus"
                                            value={accStatusFilter}
                                            onChange={(e: any) => setAccStatusFilter(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="intent_submitted">Intent Submitted</option>
                                            <option value="intent_resubmitted">Intent Resubmitted</option>
                                            <option value="self_assessment_completed">Self-Assessment Completed</option>
                                            <option value="for_site_visit">For Site Visit</option>
                                            <option value="inspection_completed">Inspection Completed</option>
                                            <option value="needs_compliance">Needs Compliance</option>
                                            <option value="for_payment">For Payment</option>
                                            <option value="payment_submitted">Manual Payment for Review</option>
                                            <option value="paid">Paid</option>
                                            <option value="accredited">Accredited</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="ad-accStartDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
                                        <input
                                            id="ad-accStartDate"
                                            name="ad-accStartDate"
                                            type="date"
                                            value={accStartDate}
                                            onChange={(e) => setAccStartDate(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="ad-accEndDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
                                        <input
                                            id="ad-accEndDate"
                                            name="ad-accEndDate"
                                            type="date"
                                            value={accEndDate}
                                            onChange={(e) => setAccEndDate(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                                        />
                                    </div>
                                </div>
                                {(accSearchQuery || accStatusFilter !== 'all' || accStartDate || accEndDate) && (
                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={() => {
                                                setAccSearchQuery('');
                                                setAccStatusFilter('all');
                                                setAccStartDate('');
                                                setAccEndDate('');
                                            }}
                                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xs">filter_alt_off</span>
                                            Clear Filters
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Modern table design */}
                            <div className="bg-white dark:bg-slate-800 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/5">
                                            <tr>
                                                <th className="p-4">Clinic & Member</th>
                                                <th className="p-4">Contact & Location</th>
                                                <th className="p-4">Inspection Visit</th>
                                                <th className="p-4">Self-Assessment</th>
                                                <th className="p-4">Submission Date</th>
                                                <th className="p-4">Accreditation Status</th>
                                                <th className="p-4 text-left">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-xs divide-y divide-slate-100 dark:divide-white/5">
                                            {filtered.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                                                                        <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">inbox</span>
                                                        No accreditation submissions found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                filtered.map(app => {
                                                    const saData = app.selfAssessmentData;
                                                    const appAny = app as any;
                                                    const appUserId = appAny.userId || app.clinicId;
                                                    const appEmail = appAny.email || appAny.loiData?.email;
                                                    const userDoc = appUserId ? usersMap[appUserId] : null;
                                                    const matchedMember = members.find(m => m.id === app.clinicId || m.id === appUserId || (m.email && appEmail && m.email.toLowerCase() === appEmail.toLowerCase()));
                                                    const clinicProfileImg = (app as any).clinicImageUrl || 
                                                                             (app as any).clinicLogo || 
                                                                             (app as any).photoUrl || 
                                                                             (app as any).loiData?.clinicImageUrl || 
                                                                             (app as any).loiData?.clinicLogo || 
                                                                             userDoc?.clinicImageUrl || 
                                                                             userDoc?.clinicLogo || 
                                                                             userDoc?.photoUrl || 
                                                                             userDoc?.avatarUrl || 
                                                                             (matchedMember as any)?.clinicImageUrl || 
                                                                             (matchedMember as any)?.clinicLogo || 
                                                                             (matchedMember as any)?.photoUrl || 
                                                                             matchedMember?.image || 
                                                                             '';
                                                    const statusColors: Record<string, string> = {
                                                        intent_submitted: 'bg-blue-500/10 text-blue-500',
                                                        intent_resubmitted: 'bg-amber-500/10 text-amber-500',
                                                        self_assessment_completed: 'bg-purple-500/10 text-purple-500',
                                                        for_site_visit: 'bg-amber-500/10 text-amber-500',
                                                        inspection_completed: 'bg-teal-500/10 text-teal-500',
                                                        under_review: 'bg-purple-500/10 text-purple-500',
                                                        needs_compliance: 'bg-rose-500/10 text-rose-500',
                                                        for_payment: 'bg-blue-500/10 text-blue-500',
                                                        payment_submitted: 'bg-amber-500/10 text-amber-500',
                                                        paid: 'bg-emerald-500/10 text-emerald-500',
                                                        rejected: 'bg-rose-500/10 text-rose-500',
                                                        accredited: 'bg-emerald-500/10 text-emerald-500',
                                                        vef_failed: 'bg-rose-500/10 text-rose-500',
                                                        revisit_requested: 'bg-amber-500/10 text-amber-500',
                                                        accreditation_banned: 'bg-rose-500/10 text-rose-500',
                                                    };
                                                    const rowVisited = app.status === 'inspection_completed' || !!app.visitData?.completedAt || ((app.visitingEvaluationForms?.length ?? 0) > 0);
                                                    const showVisited = rowVisited && !['rejected', 'accredited', 'under_review', 'approved', 'for_payment', 'paid', 'needs_compliance', 'vef_failed', 'revisit_requested', 'accreditation_banned'].includes(app.status);
                                                    const statusLabel = app.status === 'needs_compliance' ? 'Failed'
                                                        : app.status === 'vef_failed' ? 'Visited: Failed'
                                                        : app.status === 'revisit_requested' ? 'Request for Revisit'
                                                        : app.status === 'accreditation_banned' ? 'Banned'
                                                        : app.status === 'payment_submitted' ? 'Manual Payment for Review'
                                                        : (showVisited && app.status === 'inspection_completed') ? 'Visited: Passed'
                                                        : showVisited ? 'Visited'
                                                        : app.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                                    const statusColor = showVisited ? statusColors.inspection_completed : (statusColors[app.status] || 'bg-slate-100 text-slate-600');

                                                    return (
                                                        <tr key={app.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                                            <td className="p-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div 
                                                                        className={`size-10 rounded-full border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center ${clinicProfileImg ? 'cursor-pointer hover:opacity-85 hover:scale-105 transition-all shadow-sm' : ''}`}
                                                                        onClick={() => {
                                                                            if (clinicProfileImg) {
                                                                                setAccredFileViewer({
                                                                                    url: clinicProfileImg,
                                                                                    name: `${app.clinicName} - Clinic Profile Image`
                                                                                });
                                                                            }
                                                                        }}
                                                                        title={clinicProfileImg ? "Click to view clinic profile image" : "No profile image"}
                                                                    >
                                                                        {clinicProfileImg ? (
                                                                            <img src={clinicProfileImg} alt={app.clinicName} className="size-full object-cover" />
                                                                        ) : (
                                                                            <span className="material-symbols-outlined text-lg text-slate-400">pets</span>
                                                                        )}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-bold text-slate-900 dark:text-white leading-tight">{app.clinicName}</div>
                                                                        <div className="text-[10px] text-slate-500 font-semibold mt-0.5">{app.loiData?.representativeName || '—'}</div>
                                                                        <div className="mt-1 flex items-center">
                                                                            <span className="font-mono text-[9px] font-bold text-primary bg-primary/5 px-2 py-0.5 rounded-[5px]">
                                                                                {app.loiData?.loiRef || app.id.slice(0, 8)}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="flex flex-col gap-0.5">
                                                                    <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300 font-semibold">
                                                                        <span className="material-symbols-outlined text-xs">mail</span>
                                                                        <span>{app.loiData?.email || matchedMember?.email || '—'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-slate-500 text-[10px] mt-0.5">
                                                                        <span className="material-symbols-outlined text-[11px]">call</span>
                                                                        <span>{app.loiData?.phone || matchedMember?.phone || '—'}</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5">
                                                                        <span className="material-symbols-outlined text-[11px]">location_on</span>
                                                                        <span className="truncate max-w-[150px]">{app.loiData?.clinicAddress || matchedMember?.address || '—'}</span>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap">
                                                                {app.visitData?.scheduledDate ? (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                                                                            <span className="material-symbols-outlined text-xs">calendar_today</span>
                                                                            <span>{new Date(app.visitData.scheduledDate).toLocaleDateString()}</span>
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500 font-medium">
                                                                            {app.visitData.scheduledTime || '—'}
                                                                        </div>
                                                                        <div className="text-[9px] text-slate-400 uppercase tracking-wider font-semibold">
                                                                            Inspector: {app.visitData.inspectorName || '—'}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 italic">Not scheduled</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4 text-slate-650 dark:text-slate-450">
                                                                {saData ? (
                                                                    <div className="flex flex-col gap-0.5">
                                                                        <div className="font-semibold text-slate-700 dark:text-slate-350">
                                                                            Submitted
                                                                        </div>
                                                                        <div className="text-[10px] text-slate-500">
                                                                            {new Date(saData.submittedAt).toLocaleDateString()}
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <span className="text-slate-400 italic">Not yet submitted</span>
                                                                )}
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap text-slate-700 dark:text-slate-300 font-semibold">
                                                                {new Date(app.submittedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                            </td>
                                                            <td className="p-4 whitespace-nowrap">
                                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${statusColor}`}>
                                                                    <span className={`size-1.5 rounded-full ${
                                                                        statusColor.includes('text-emerald-500') ? 'bg-emerald-500' :
                                                                        statusColor.includes('text-amber-500') ? 'bg-amber-500' :
                                                                        statusColor.includes('text-rose-500') ? 'bg-rose-500' : 'bg-primary'
                                                                    }`} />
                                                                    {statusLabel}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-left relative">
                                                                <div className="relative inline-block text-left">
                                                                    <button
                                                                        type="button"
                                                                        id={`acc-action-menu-btn-${app.id}`}
                                                                        onClick={() => setOpenActionMenuId(openActionMenuId === app.id ? null : app.id)}
                                                                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                                                                    >
                                                                        <span>Actions</span>
                                                                        <span className="material-symbols-outlined text-xs">keyboard_arrow_down</span>
                                                                    </button>

                                                                    {openActionMenuId === app.id && (
                                                                        <>
                                                                            {/* Overlay backdrop */}
                                                                            <div
                                                                                className="fixed inset-0 z-45"
                                                                                onClick={() => setOpenActionMenuId(null)}
                                                                            />

                                                                            {/* Dropdown Menu Box */}
                                                                            <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-white/10 shadow-2xl z-50 p-1.5 space-y-1 text-left animate-in fade-in zoom-in-95 duration-100">
                                                                                <div className="px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-white/5">
                                                                                    Application Actions
                                                                                </div>

                                                                                {/* Inspect Details Option */}
                                                                                <button
                                                                                    type="button"
                                                                                    id={`inspect-app-menu-btn-${app.id}`}
                                                                                    onClick={() => {
                                                                                        setInspectingApp(app);
                                                                                        setShowFailInput(false);
                                                                                        setFailReason('');
                                                                                        setSelectedVisitDate(app.loiData?.preferredVisitDates?.[0] || '');
                                                                                        setOpenActionMenuId(null);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-xl transition-colors cursor-pointer group text-left"
                                                                                >
                                                                                    <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors text-sm">visibility</span>
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <p className="font-black leading-tight text-slate-800 dark:text-white">Inspect Details</p>
                                                                                        <p className="text-[10px] text-slate-400 font-medium">View & evaluate application</p>
                                                                                    </div>
                                                                                </button>

                                                                                {/* Payment Approval & Payment Details Option */}
                                                                                {(app.status === 'payment_submitted' || app.status === 'paid' || app.status === 'accredited' || (app.status as string) === 'for_site_visit' || !!(app as any).paymentData || !!(app as any).paymentProofUrl || !!(app as any).proofOfPaymentUrl) && (
                                                                                    <button
                                                                                        type="button"
                                                                                        id={`approve-pay-menu-btn-${app.id}`}
                                                                                        onClick={() => {
                                                                                            setQuickPayApp(app);
                                                                                            setShowQuickRejectInput(false);
                                                                                            setQuickRejectReason('');
                                                                                            setOpenActionMenuId(null);
                                                                                        }}
                                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-xl transition-colors cursor-pointer group text-left"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-emerald-500 transition-colors text-sm">payments</span>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="font-black leading-tight">Approval Details</p>
                                                                                            <p className="text-[10px] text-slate-400 font-medium">Review payment proof & gateway details</p>
                                                                                        </div>
                                                                                    </button>
                                                                                )}

                                                                                {/* Delete Option */}
                                                                                {adminRole !== 'viewer' && (
                                                                                    <button
                                                                                        type="button"
                                                                                        id={`delete-app-menu-btn-${app.id}`}
                                                                                        onClick={() => {
                                                                                            handleDeleteAccreditation(app.id);
                                                                                            setOpenActionMenuId(null);
                                                                                        }}
                                                                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors cursor-pointer group text-left"
                                                                                    >
                                                                                        <span className="material-symbols-outlined text-rose-500 transition-colors text-sm">delete</span>
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <p className="font-black leading-tight">Delete Record</p>
                                                                                            <p className="text-[10px] text-slate-400 font-medium">Permanently remove record</p>
                                                                                        </div>
                                                                                    </button>
                                                                                )}
                                                                            </div>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    );
                })()}
                {/* Accreditation — Full Inspection Page */}
                {activeTab === 'accreditation' && inspectingApp && (() => {
                    const app = inspectingApp;
                    const saData = app.selfAssessmentData;
                    const checkedItems = saData?.checkedItems || {};
                    // Visit is considered done once a Visiting Evaluation Form has been submitted
                    const hasVisited = app.status === 'inspection_completed' || !!app.visitData?.completedAt || (app.visitingEvaluationForms?.length ?? 0) > 0;

                    // Step 1 of the decision: approving the LOI only unlocks Self-Assessment
                    // for the applicant — it must NOT jump straight to scheduling a site visit.
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
                            setInspectingApp(null);
                        } catch (e) { showToast('Failed to approve.', 'error'); }
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
                            setInspectingApp(null);
                        } catch (e) { showToast('Failed to schedule visit.', 'error'); }
                        finally { setAccredActionLoading(false); }
                    };

                    // Admin approves one of the member's proposed revisit dates —
                    // confirms the schedule and sends the applicant back to the
                    // normal "for_site_visit" flow.
                    const handleApproveRevisit = async () => {
                        if (!selectedRevisitDate) { showToast('Please select a date first.', 'error'); return; }
                        setAccredActionLoading(true);
                        try {
                            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                                status: 'for_site_visit',
                                stage: 3,
                                visitData: { scheduledDate: selectedRevisitDate, scheduledTime: '', inspectorName: '', notes: '', confirmedAt: new Date().toISOString() },
                                updatedAt: serverTimestamp(),
                            });
                            await addDoc(collection(db, 'member_notifications'), {
                                clinicId: app.clinicId, type: 'accreditation_approved',
                                title: 'Revisit Approved',
                                body: `Your revisit for ${app.clinicName} has been confirmed: ${new Date(selectedRevisitDate).toLocaleDateString()}.`,
                                read: false, createdAt: serverTimestamp(),
                            });
                            showToast('Revisit approved. Member notified.', 'success');
                            setInspectingApp(null);
                        } catch (e) { showToast('Failed to approve revisit.', 'error'); }
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
                            setInspectingApp(null);
                        } catch (e) { showToast('Failed to reject.', 'error'); }
                        finally { setAccredActionLoading(false); }
                    };

                    // Approve compliance documents — go straight to Payment
                    const handleApproveCompliance = async () => {
                        setAccredActionLoading(true);
                        try {
                            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                                status: 'for_payment', stage: 6, updatedAt: serverTimestamp(),
                            });
                            await addDoc(collection(db, 'member_notifications'), {
                                clinicId: app.clinicId, type: 'accreditation_for_payment',
                                title: 'Documents Approved — Proceed to Payment',
                                body: `Your compliance documents for ${app.clinicName} were approved. Please proceed to payment.`,
                                read: false, createdAt: serverTimestamp(),
                            });
                            showToast('Approved. Moved to Payment.', 'success');
                        } catch (e) { showToast('Failed to approve.', 'error'); }
                        finally { setAccredActionLoading(false); }
                    };

                    // Decline compliance documents — mark Failed, member must resend
                    const handleDeclineCompliance = async () => {
                        setAccredActionLoading(true);
                        try {
                            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                                status: 'needs_compliance', updatedAt: serverTimestamp(),
                            });
                            await addDoc(collection(db, 'member_notifications'), {
                                clinicId: app.clinicId, type: 'accreditation_needs_compliance',
                                title: 'Documents Declined — Resend Requirements',
                                body: `Your compliance documents for ${app.clinicName} were declined. Please resend the required documents.`,
                                read: false, createdAt: serverTimestamp(),
                            });
                            showToast('Declined. Member asked to resend.', 'success');
                        } catch (e) { showToast('Failed to decline.', 'error'); }
                        finally { setAccredActionLoading(false); }
                    };

                    return (
                        <div className="space-y-4 animate-fade-in">
                            {/* Back + Title */}
                            <div className="flex items-center gap-4">
                                <button
                                    onClick={() => {
                                        setInspectingApp(null);
                                        setSearchParams(prev => {
                                            const next = new URLSearchParams(prev);
                                            next.delete('inspect');
                                            return next;
                                        });
                                    }}
                                    className="size-12 rounded-2xl bg-[#2563EB] text-white hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center shrink-0 z-20 cursor-pointer active:scale-95"
                                    title="Back to Accreditation Table"
                                >
                                    <span className="material-symbols-outlined text-2xl font-bold">arrow_back</span>
                                </button>
                                <div>
                                    <h2 className="text-2xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white">Inspect Application</h2>
                                    <p className="text-sm text-slate-500 font-mono">{app.loiData?.loiRef || app.id}</p>
                                </div>
                                <div className="ml-auto flex items-center gap-3">
                                    {app.status === 'rejected' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-red-100 text-red-700 font-bold text-xs uppercase">Rejected</span>
                                    ) : app.status === 'accredited' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-emerald-100 text-emerald-700 font-bold text-xs uppercase">Accredited</span>
                                    ) : app.status === 'paid' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-emerald-100 text-emerald-700 font-bold text-xs uppercase">Paid</span>
                                    ) : app.status === 'for_payment' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-blue-100 text-blue-700 font-bold text-xs uppercase">For Payment</span>
                                    ) : app.status === 'needs_compliance' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-red-100 text-red-700 font-bold text-xs uppercase">Failed</span>
                                    ) : app.status === 'under_review' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-purple-100 text-purple-700 font-bold text-xs uppercase">Under Review</span>
                                    ) : app.status === 'vef_failed' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-red-100 text-red-700 font-bold text-xs uppercase">Site Visit Not Passed</span>
                                    ) : app.status === 'revisit_requested' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-amber-100 text-amber-700 font-bold text-xs uppercase">Request for Revisit</span>
                                    ) : app.status === 'accreditation_banned' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-red-100 text-red-700 font-bold text-xs uppercase">Banned</span>
                                    ) : hasVisited ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-teal-100 text-teal-700 font-bold text-xs uppercase">Visited</span>
                                    ) : app.status === 'for_site_visit' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-amber-100 text-amber-700 font-bold text-xs uppercase">Wait for Visitation</span>
                                    ) : app.status === 'self_assessment_completed' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-blue-100 text-blue-700 font-bold text-xs uppercase">Self-Assessment Done</span>
                                    ) : app.status === 'loi_approved' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-blue-100 text-blue-700 font-bold text-xs uppercase">LOI Approved</span>
                                    ) : app.status === 'intent_resubmitted' ? (
                                        <span className="px-4 py-2 rounded-[10px] bg-amber-100 text-amber-700 font-bold text-xs uppercase">Intent Resubmitted</span>
                                    ) : null}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
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
                                                { label: 'Phone', value: app.loiData?.phone },
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

                                    {/* Uploaded Documents (member's onboarding + compliance files) — the
                                        authoritative copy lives on the clinic's own users/{uid} profile;
                                        the application doc's mirrored copy can be stale, so prefer usersMap. */}
                                    {(() => {
                                        const applicantProfile = usersMap[app.clinicId] || {};
                                        const memberDocs = Object.entries(((applicantProfile.membershipDocuments || (app as any).membershipDocuments || {})) as Record<string, any[]>).filter(([, files]) => files?.length);
                                        const catDocs = ASSESSMENT_CATEGORIES
                                            .map(cat => ({ title: cat.title, files: app.complianceData?.categories?.[cat.id]?.uploadedFiles || [] }))
                                            .filter(c => c.files.length > 0);

                                        const allFiles = [
                                            ...memberDocs.flatMap(([docId, files]) =>
                                                files.map((file: any) => ({
                                                    ...file,
                                                    label: MEMBERSHIP_DOC_LABELS[docId] || docId
                                                }))
                                            ),
                                            ...catDocs.flatMap((c) =>
                                                c.files.map((file: any) => ({
                                                    ...file,
                                                    label: c.title
                                                }))
                                            )
                                        ];

                                        const showActions = adminRole !== 'viewer' && (app.status === 'inspection_completed' || app.status === 'under_review' || app.status === 'needs_compliance' || app.status === 'for_compliance_submission');
                                        if (allFiles.length === 0 && !showActions) return null;

                                        return (
                                            <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 p-4">
                                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Uploaded Files</h3>
                                                {allFiles.length > 0 ? (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        {allFiles.map((file: any, idx: number) => {
                                                            const iconData = getFileIcon(file.name);
                                                            return (
                                                                <div key={idx} className="bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/10 hover:border-primary/30 transition-all hover:shadow-md rounded-2xl p-4 flex flex-col justify-between h-[120px] group">
                                                                    <div className="flex items-start gap-3 min-w-0">
                                                                        <div className={`p-2 rounded-xl shrink-0 ${iconData.color} bg-current/10 flex items-center justify-center`}>
                                                                            <span className="material-symbols-outlined text-xl">{iconData.name}</span>
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block truncate">{file.label}</span>
                                                                            <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200 mt-1" title={file.name}>{file.name}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setAccredFileViewer({ url: file.url, name: file.name })}
                                                                            className="flex items-center gap-1 text-[11px] font-bold text-primary hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                                                            Preview
                                                                        </button>
                                                                        <a
                                                                            href={file.url}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">open_in_new</span>
                                                                            Open
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center justify-center py-8 text-center">
                                                        <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-600 mb-2">folder_off</span>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No compliance files uploaded</p>
                                                    </div>
                                                )}

                                                {/* Approve / Decline compliance documents */}
                                                {adminRole !== 'viewer' && (app.status === 'inspection_completed' || app.status === 'under_review' || app.status === 'needs_compliance' || app.status === 'for_compliance_submission') && (
                                                    <div className="mt-5 pt-5 border-t border-slate-100 dark:border-white/10 space-y-3">
                                                        {app.status === 'needs_compliance' && (
                                                            <div className="px-3 py-2 rounded-[10px] bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20">
                                                                <p className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                                                    <span className="material-symbols-outlined text-sm">error</span>
                                                                    Failed — waiting for the member to resend requirements.
                                                                </p>
                                                            </div>
                                                        )}
                                                        <button
                                                            onClick={handleApproveCompliance}
                                                            disabled={accredActionLoading}
                                                            className="w-full py-3.5 rounded-[10px] font-bold text-sm bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                                        >
                                                            {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">check_circle</span>}
                                                            Approved — Proceed to Payment
                                                        </button>
                                                        {app.status !== 'needs_compliance' && (
                                                            <button
                                                                onClick={handleDeclineCompliance}
                                                                disabled={accredActionLoading}
                                                                className="w-full py-3.5 rounded-[10px] font-bold text-sm bg-red-500 text-white hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">cancel</span>
                                                                Declined
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })()}
                                </div>

                                {/* Right column — actions */}
                                <div className="space-y-4">
                                    {/* Preferred Visit Dates — overridden by the member's proposed REVISIT
                                        dates once a revisit has been requested, so this never shows the
                                        stale original LOI dates alongside a since-failed visit. */}
                                    {(() => {
                                        const revisitDates = app.visitData?.preferredRevisitDates;
                                        const isRevisit = !!revisitDates?.length;
                                        const dates = isRevisit ? revisitDates! : (app.loiData?.preferredVisitDates || []);
                                        const selected = isRevisit ? selectedRevisitDate : selectedVisitDate;
                                        const setSelected = isRevisit ? setSelectedRevisitDate : setSelectedVisitDate;
                                        const locked = isRevisit ? false : hasVisited;
                                        return (
                                            <div className={`bg-white dark:bg-slate-800/40 rounded-[10px] border p-4 ${isRevisit ? 'border-amber-200 dark:border-amber-500/20' : 'border-slate-200 dark:border-white/5'}`}>
                                                <h3 className={`text-xs font-bold uppercase tracking-widest mb-4 ${isRevisit ? 'text-amber-600' : 'text-slate-400'}`}>{isRevisit ? 'Preferred Revisit Dates' : 'Preferred Visit Dates'}</h3>
                                                {dates.length ? (
                                                    <div className="space-y-2">
                                                        {dates.map((date, i) => (
                                                            <label key={i} htmlFor={`visit-${i}`} className={`flex items-center gap-3 p-3 rounded-[10px] border-2 transition-all ${locked ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
                                                                selected === date
                                                                    ? 'border-primary bg-primary/5'
                                                                    : 'border-slate-100 dark:border-white/5 hover:border-slate-200'
                                                            }`}>
                                                                <input id={`visit-${i}`} type="radio" name="visitDate" value={date} checked={selected === date} onChange={() => setSelected(date)} disabled={locked} className="accent-primary disabled:cursor-not-allowed" />
                                                                <div>
                                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Option {i + 1}</p>
                                                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                                                </div>
                                                            </label>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-slate-400 italic">No preferred dates submitted.</p>
                                                )}
                                                {isRevisit && app.status === 'revisit_requested' && adminRole !== 'viewer' && (
                                                    <button
                                                        onClick={handleApproveRevisit}
                                                        disabled={accredActionLoading || !selectedRevisitDate}
                                                        className="w-full mt-4 py-3 rounded-[10px] font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-40"
                                                    >
                                                        {accredActionLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">event_available</span>}
                                                        Approve Revisit
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })()}

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

                                            {!showFailInput ? (
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
                                                        id="ad-failReason"
                                                        name="ad-failReason"
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
                                            )}
                                            {app.status === 'self_assessment_completed' && !selectedVisitDate && <p className="text-[10px] text-amber-600 font-semibold text-center">Select a visit date above before scheduling</p>}
                                        </div>
                                    )}

                                    {/* Rejection reason display */}
                                    {app.status === 'rejected' && app.rejectionReason && (
                                        <div className="bg-red-50 dark:bg-red-900/10 rounded-[10px] border border-red-200 dark:border-red-500/20 p-5">
                                            <p className="text-xs font-bold uppercase tracking-widest text-red-500 mb-2">Rejection Reason</p>
                                            <p className="text-sm text-slate-700 dark:text-slate-300">{app.rejectionReason}</p>
                                        </div>
                                    )}

                                    {/* Visit scheduled notice */}
                                    {(app.status === 'for_site_visit' || hasVisited) && app.visitData && (
                                        <div className={`rounded-[10px] border p-5 ${app.status === 'vef_failed' ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-500/20' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-500/20'}`}>
                                            <p className={`text-xs font-bold uppercase tracking-widest mb-2 ${app.status === 'vef_failed' ? 'text-red-600' : 'text-amber-600'}`}>
                                                {app.status === 'vef_failed' ? 'Site Visit Not Passed' : hasVisited ? 'Site Visit Completed' : 'Wait for Visitation'}
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

                                            {/* Saved evaluation forms */}
                                            {app.visitingEvaluationForms && app.visitingEvaluationForms.length > 0 && (() => {
                                                const sortedForms = [...app.visitingEvaluationForms].sort((a, b) => b.version - a.version);
                                                const latestForm = sortedForms[0];
                                                return (
                                                <div className="mt-4 space-y-2">
                                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Evaluation Forms</p>
                                                    {sortedForms.map(form => (
                                                        <div key={form.version} className="flex items-center gap-2 p-2.5 bg-white dark:bg-slate-800 rounded-[10px] border border-slate-100 dark:border-white/5">
                                                            <span className={`material-symbols-outlined text-lg ${form.result === 'Passed' ? 'text-emerald-500' : 'text-red-500'}`}>picture_as_pdf</span>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-[11px] font-bold text-slate-700 dark:text-white truncate">{form.filename || `Version ${String(form.version).padStart(2, '0')}`}</p>
                                                                <p className={`text-[10px] font-bold uppercase ${form.result === 'Passed' ? 'text-emerald-600' : 'text-red-600'}`}>{form.result}</p>
                                                            </div>
                                                            {form.url && (
                                                                <a href={form.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded-[10px]" title="View / Download">
                                                                    <span className="material-symbols-outlined text-sm text-primary">download</span>
                                                                </a>
                                                            )}
                                                            {adminRole !== 'viewer' && (
                                                                <button onClick={() => setVefModal({ open: true, existing: form })} className="p-1.5 hover:bg-slate-100 dark:hover:bg-white/10 rounded-[10px]" title="Edit (creates a new version)">
                                                                    <span className="material-symbols-outlined text-sm text-slate-500">edit</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}

                                                    {/* Failure remarks — the same text shown to the member */}
                                                    {latestForm.result === 'Fail' && latestForm.failRemarks && (
                                                        <div className="rounded-[10px] border border-red-200 dark:border-red-500/20 bg-red-50/60 dark:bg-red-500/5 p-3">
                                                            <p className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-1">Remarks — Why It Failed</p>
                                                            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{latestForm.failRemarks}</p>
                                                        </div>
                                                    )}
                                                </div>
                                                );
                                            })()}

                                            {/* Revisit is requested by the MEMBER (mirrors the original LOI
                                                site-visit-date flow) — admin just waits here once failed. */}
                                            {app.status === 'vef_failed' && (
                                                <div className="mt-4 pt-4 border-t border-red-200 dark:border-red-500/20">
                                                    <p className="text-xs text-red-600 dark:text-red-400 italic">Waiting for the member to request a revisit after addressing the remarks above.</p>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Self-Assessment Summary — placed below the VEF card so the
                                        inspector sees the applicant's own checklist right after the
                                        actual visit form, for easy side-by-side comparison. Passing
                                        self-assessment does not guarantee a passing VEF, and vice versa —
                                        they're independent (owner-reported vs. PAHA-verified). */}
                                    <div className="bg-white dark:bg-slate-800/40 rounded-[10px] border border-slate-200 dark:border-white/5 p-4">
                                        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                                            Self-Assessment Summary
                                            {saData && <span className="ml-2 text-slate-300">· Submitted {new Date(saData.submittedAt).toLocaleDateString()}</span>}
                                        </h3>
                                        {!saData ? (
                                            <p className="text-sm text-slate-400 italic">Self-assessment not yet submitted by the applicant.</p>
                                        ) : (
                                            <div className="space-y-3">
                                                {ASSESSMENT_CATEGORIES.map(cat => {
                                                    const stats = getCategoryStats(cat, checkedItems);
                                                    const passed = stats.passed;
                                                    return (
                                                        <div key={cat.id} className="flex items-center gap-3">
                                                            <div className={`size-7 rounded-[10px] flex items-center justify-center shrink-0 ${passed ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                                                                <span className={`material-symbols-outlined text-sm ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>
                                                                    {passed ? 'check_circle' : 'warning'}
                                                                </span>
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{cat.title}</p>
                                                                <div className="h-1 bg-slate-100 dark:bg-slate-700 rounded-full mt-1 overflow-hidden">
                                                                    <div className={`h-full rounded-full transition-all ${passed ? 'bg-emerald-500' : 'bg-amber-500'}`} style={{ width: `${stats.score}%` }} />
                                                                </div>
                                                            </div>
                                                            <div className="text-right shrink-0">
                                                                <span className={`text-sm font-black ${passed ? 'text-emerald-600' : 'text-amber-600'}`}>{stats.score}%</span>
                                                                <p className={`text-[9px] font-bold uppercase ${passed ? 'text-emerald-500' : 'text-slate-400'}`}>{passed ? 'Pass' : `Need ${cat.passingScore}%`}</p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Visiting Evaluation Form Modal */}
                            {vefModal.open && (
                                <VisitingEvaluationModal
                                    isOpen={vefModal.open}
                                    onClose={() => setVefModal({ open: false, existing: null })}
                                    app={app}
                                    existingForm={vefModal.existing}
                                    onSaved={() => showToast('Evaluation sent to member and saved.', 'success')}
                                />
                            )}

                            {/* Shared Accreditation Modals (Accessible from both list table and inspection view) */}
                            {activeTab === 'accreditation' && (
                                <>
                                    <FileViewerModal file={accredFileViewer} onClose={() => setAccredFileViewer(null)} />
                                    {quickPayApp && (() => {
                                        const isManualPayment = (quickPayApp as any).paymentData?.method === 'manual' || 
                                                                !!(quickPayApp as any).paymentData?.proofOfPaymentUrl || 
                                                                !!(quickPayApp as any).paymentData?.paymentProofUrl || 
                                                                !!(quickPayApp as any).paymentProofUrl;
                                        const refNo = (quickPayApp as any).paymentData?.referenceNo || (quickPayApp as any).paymentData?.merchantOrderId || (quickPayApp as any).loiData?.loiRef || quickPayApp.id;
                                        const isAccredited = quickPayApp.status === 'accredited' || quickPayApp.status === 'paid';

                                        return (
                                        <div className="fixed inset-0 z-[990] flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-md animate-fade-in overflow-y-auto">
                                            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl max-w-2xl w-full my-8 overflow-hidden animate-scale-up flex flex-col max-h-[90vh]">
                                                
                                                {/* Modal Header */}
                                                <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-slate-800/80 sticky top-0 z-20">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`size-11 rounded-2xl ${isManualPayment ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'} flex items-center justify-center font-bold shrink-0 shadow-sm`}>
                                                            <span className="material-symbols-outlined text-2xl">{isManualPayment ? 'account_balance' : 'bolt'}</span>
                                                        </div>
                                                        <div>
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <h3 className="text-base font-extrabold text-slate-900 dark:text-white uppercase tracking-tight">Payment & Approval Record</h3>
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                                    isAccredited
                                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border border-emerald-300/30'
                                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300/30'
                                                                }`}>
                                                                    {quickPayApp.status === 'accredited' ? 'Accredited' : quickPayApp.status === 'paid' ? 'Paid' : 'Pending Approval'}
                                                                </span>
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                                                    isManualPayment 
                                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300'
                                                                        : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300'
                                                                }`}>
                                                                    {isManualPayment ? 'Manual Bank Transfer' : 'PayCools Gateway'}
                                                                </span>
                                                            </div>
                                                            <p className="text-xs text-slate-500 font-mono mt-0.5">{quickPayApp.clinicName}</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        id="close-quick-pay-modal-top"
                                                        onClick={() => {
                                                            setQuickPayApp(null);
                                                            setShowQuickRejectInput(false);
                                                            setQuickRejectReason('');
                                                        }}
                                                        disabled={quickPayLoading}
                                                        className="size-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
                                                    >
                                                        <span className="material-symbols-outlined text-xl">close</span>
                                                    </button>
                                                </div>

                                                {/* Modal Scrollable Body */}
                                                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                                                    
                                                    {/* Member & Clinic Information Card */}
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-sm text-blue-500">storefront</span>
                                                            Member & Clinic Reference Info
                                                        </h4>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200/60 dark:border-white/5 text-xs">
                                                            <div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Reference No</span>
                                                                <span className="font-semibold text-slate-800 dark:text-white font-mono">{(quickPayApp as any).loiData?.loiRef || quickPayApp.id}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Head Vet / Representative</span>
                                                                <span className="font-semibold text-slate-800 dark:text-white">{(quickPayApp as any).loiData?.representativeName || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Email Address</span>
                                                                <span className="font-semibold text-slate-800 dark:text-white truncate block">{(quickPayApp as any).loiData?.email || '—'}</span>
                                                            </div>
                                                            <div>
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Contact Phone</span>
                                                                <span className="font-semibold text-slate-800 dark:text-white">{(quickPayApp as any).loiData?.phone || '—'}</span>
                                                            </div>
                                                            <div className="sm:col-span-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Clinic Address</span>
                                                                <span className="font-semibold text-slate-800 dark:text-white truncate block">{(quickPayApp as any).loiData?.clinicAddress || '—'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Statement of Account & Payment Method Card */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/20 p-4 rounded-2xl space-y-2 flex flex-col justify-between">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mb-2">
                                                                    <span className="material-symbols-outlined text-sm">calculate</span>
                                                                    Statement of Account Breakdown
                                                                </p>
                                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 py-0.5">
                                                                    <span>Accreditation Fee</span>
                                                                    <span className="font-bold">₱{((quickPayApp?.paymentData?.amount !== undefined ? quickPayApp.paymentData.amount : (liveAccreditationFee + liveAccreditationProcessingFee)) - (quickPayApp?.paymentData?.amount !== undefined ? (quickPayApp.paymentData.amount > liveAccreditationProcessingFee ? liveAccreditationProcessingFee : 0) : liveAccreditationProcessingFee)).toLocaleString()}.00</span>
                                                                </div>
                                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-300 py-0.5">
                                                                    <span>Processing Fee</span>
                                                                    <span className="font-bold">₱{(quickPayApp?.paymentData?.amount !== undefined ? (quickPayApp.paymentData.amount > liveAccreditationProcessingFee ? liveAccreditationProcessingFee : 0) : liveAccreditationProcessingFee).toLocaleString()}.00</span>
                                                                </div>
                                                            </div>
                                                            <div className="border-t border-emerald-200/60 dark:border-emerald-500/30 pt-2 flex justify-between text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                                                                <span>Total Amount</span>
                                                                <span>₱{(quickPayApp?.paymentData?.amount !== undefined ? quickPayApp.paymentData.amount : (liveAccreditationFee + liveAccreditationProcessingFee)).toLocaleString()}.00</span>
                                                            </div>
                                                        </div>

                                                        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/20 p-4 rounded-2xl space-y-2 text-xs flex flex-col justify-between">
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400 flex items-center gap-1 mb-2">
                                                                    <span className="material-symbols-outlined text-sm">payments</span>
                                                                    Payment Submission Details
                                                                </p>
                                                                <div className="space-y-1.5 text-slate-700 dark:text-slate-300">
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Payment Method</span>
                                                                        <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                                                            <span className="material-symbols-outlined text-xs text-blue-500">{isManualPayment ? 'account_balance' : 'credit_card'}</span>
                                                                            {(quickPayApp as any).paymentData?.method || (isManualPayment ? 'Manual Bank Deposit / GCash' : 'PayCools Online Gateway')}
                                                                        </span>
                                                                    </div>
                                                                    <div>
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Transaction Ref / Order ID</span>
                                                                        <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 truncate block">{refNo}</span>
                                                                    </div>
                                                                    {(quickPayApp as any).accreditationNumber && (
                                                                        <div>
                                                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Accreditation Cert #</span>
                                                                            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{(quickPayApp as any).accreditationNumber}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="pt-1.5 border-t border-blue-200/55 dark:border-blue-500/20 text-[11px] text-slate-500 flex justify-between items-center">
                                                                <span>Submitted:</span>
                                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                                    {(quickPayApp as any).paymentData?.triggeredAt ? new Date((quickPayApp as any).paymentData.triggeredAt).toLocaleString() : 'Recent'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Uploaded Documents & Reference Files Display Section */}
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-3 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-sm text-emerald-500">attach_file</span>
                                                            Uploaded Proof & Reference Documents
                                                        </h4>
                                                        
                                                        <div className="space-y-3">
                                                            {/* Deposit Slip / Receipt Preview Card */}
                                                            {((quickPayApp as any).paymentData?.proofOfPaymentUrl || (quickPayApp as any).paymentData?.paymentProofUrl || (quickPayApp as any).paymentProofUrl) ? (
                                                                <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                                                                            <span className="material-symbols-outlined text-base text-emerald-500">receipt</span>
                                                                            Submitted Deposit Slip / Official Receipt
                                                                        </span>
                                                                        <button
                                                                            type="button"
                                                                            id="view-deposit-slip-btn"
                                                                            onClick={() => setAccredFileViewer({
                                                                                url: (quickPayApp as any).paymentData?.proofOfPaymentUrl || (quickPayApp as any).paymentData?.paymentProofUrl || (quickPayApp as any).paymentProofUrl,
                                                                                name: `${quickPayApp.clinicName} - Payment Deposit Slip`
                                                                            })}
                                                                            className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                                                                        >
                                                                            <span className="material-symbols-outlined text-sm">fullscreen</span> Preview Full Screen
                                                                        </button>
                                                                    </div>
                                                                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group bg-slate-900/80 flex items-center justify-center min-h-[160px] max-h-[260px]">
                                                                        <img
                                                                            src={(quickPayApp as any).paymentData?.proofOfPaymentUrl || (quickPayApp as any).paymentData?.paymentProofUrl || (quickPayApp as any).paymentProofUrl}
                                                                            alt="Payment Proof"
                                                                            className="w-full max-h-[250px] object-contain"
                                                                        />
                                                                        <a
                                                                            href={(quickPayApp as any).paymentData?.proofOfPaymentUrl || (quickPayApp as any).paymentData?.paymentProofUrl || (quickPayApp as any).paymentProofUrl}
                                                                            target="_blank"
                                                                            rel="noopener noreferrer"
                                                                            className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white font-bold text-xs"
                                                                        >
                                                                            <span className="material-symbols-outlined text-lg">open_in_new</span> Open File in New Tab
                                                                        </a>
                                                                    </div>
                                                                </div>
                                                            ) : !isManualPayment ? (
                                                                <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-3">
                                                                    <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 font-bold">
                                                                        <span className="material-symbols-outlined text-xl">verified_user</span>
                                                                    </div>
                                                                    <div>
                                                                        <p className="font-extrabold uppercase tracking-wider text-[11px] text-indigo-700 dark:text-indigo-300">PayCools Online Gateway Verification</p>
                                                                        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">Automated online transaction processed via PayCools API. Order Reference: <span className="font-mono font-bold text-slate-800 dark:text-slate-200">{refNo}</span></p>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/20 rounded-2xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2.5">
                                                                    <span className="material-symbols-outlined text-xl shrink-0">warning</span>
                                                                    <div>
                                                                        <p className="font-bold">No receipt image attached</p>
                                                                        <p className="text-[11px] opacity-80">Approving will manually validate accreditation payment for this clinic record.</p>
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Other Application Reference Files (LOI, VEF) */}
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                                {(quickPayApp as any).loiData?.loiFileUrl && (
                                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                                                                        <div className="flex items-center gap-2 truncate">
                                                                            <span className="material-symbols-outlined text-base text-blue-500">description</span>
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">Letter of Intent (LOI)</span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            id="view-loi-file-btn"
                                                                            onClick={() => setAccredFileViewer({
                                                                                url: (quickPayApp as any).loiData!.loiFileUrl!,
                                                                                name: `${quickPayApp.clinicName} - Letter of Intent`
                                                                            })}
                                                                            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                                                                        >
                                                                            View LOI
                                                                        </button>
                                                                    </div>
                                                                )}

                                                                {(quickPayApp as any).inspectionData?.vefFileUrl && (
                                                                    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-white/5 flex items-center justify-between text-xs">
                                                                        <div className="flex items-center gap-2 truncate">
                                                                            <span className="material-symbols-outlined text-base text-emerald-500">fact_check</span>
                                                                            <span className="font-semibold text-slate-700 dark:text-slate-200 truncate">Evaluation Report (VEF)</span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            id="view-vef-file-btn"
                                                                            onClick={() => setAccredFileViewer({
                                                                                url: (quickPayApp as any).inspectionData!.vefFileUrl!,
                                                                                name: `${quickPayApp.clinicName} - VEF Report`
                                                                            })}
                                                                            className="px-2.5 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-[11px] font-bold transition-all cursor-pointer shrink-0"
                                                                        >
                                                                            View VEF
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Rejection Form Input Drawer */}
                                                    {showQuickRejectInput && (
                                                        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 rounded-2xl space-y-3 animate-fade-in">
                                                            <label htmlFor="ad-quick-reject-reason-input" className="text-xs font-black uppercase tracking-wider text-rose-700 dark:text-rose-400 block">
                                                                Reason for Declining Payment Proof
                                                            </label>
                                                            <textarea
                                                                id="ad-quick-reject-reason-input"
                                                                rows={2}
                                                                value={quickRejectReason}
                                                                onChange={(e) => setQuickRejectReason(e.target.value)}
                                                                placeholder="Specify reason (e.g. Unreadable receipt image, amount mismatched, invalid deposit reference...)"
                                                                className="w-full px-3 py-2 rounded-xl text-xs border border-rose-200 dark:border-rose-500/30 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500"
                                                            />
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    id="cancel-reject-input-btn"
                                                                    onClick={() => setShowQuickRejectInput(false)}
                                                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                                                >
                                                                    Back
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    id="submit-reject-pay-btn"
                                                                    onClick={() => {
                                                                        handleQuickRejectPayment(quickPayApp, quickRejectReason);
                                                                        setShowQuickRejectInput(false);
                                                                        setQuickRejectReason('');
                                                                    }}
                                                                    disabled={quickPayLoading}
                                                                    className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition-all cursor-pointer active:scale-95"
                                                                >
                                                                    Confirm Rejection
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}

                                                </div>

                                                {/* Modal Footer Bar */}
                                                <div className="flex items-center justify-between gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-white/10 sticky bottom-0 z-20">
                                                    {adminRole !== 'viewer' && quickPayApp.status !== 'accredited' && quickPayApp.status !== 'paid' ? (
                                                        <>
                                                            <button
                                                                type="button"
                                                                id="reject-quick-pay-btn"
                                                                onClick={() => setShowQuickRejectInput(prev => !prev)}
                                                                disabled={quickPayLoading}
                                                                className="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/30 transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 cursor-pointer active:scale-95"
                                                            >
                                                                <span className="material-symbols-outlined text-base">cancel</span>
                                                                Decline Proof
                                                            </button>
                                                            
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    id="cancel-quick-pay-btn"
                                                                    onClick={() => {
                                                                        setQuickPayApp(null);
                                                                        setShowQuickRejectInput(false);
                                                                        setQuickRejectReason('');
                                                                    }}
                                                                    disabled={quickPayLoading}
                                                                    className="py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-40 cursor-pointer"
                                                                >
                                                                    Close
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    id="confirm-quick-pay-btn"
                                                                    onClick={() => handleQuickApprovePayment(quickPayApp)}
                                                                    disabled={quickPayLoading}
                                                                    className="py-3 px-5 rounded-xl font-extrabold text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer active:scale-95"
                                                                >
                                                                    {quickPayLoading ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-base font-bold">verified</span>}
                                                                    Approve Payment
                                                                </button>
                                                            </div>
                                                        </>
                                                    ) : (
                                                        <div className="w-full flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                                                <span className="material-symbols-outlined text-base">verified</span>
                                                                Accreditation Payment Validated
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    id="inspect-app-from-pay-modal"
                                                                    onClick={() => {
                                                                        const targetApp = quickPayApp;
                                                                        setQuickPayApp(null);
                                                                        setInspectingApp(targetApp);
                                                                    }}
                                                                    className="py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 transition-colors cursor-pointer flex items-center gap-1.5"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                                    Inspect App
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    id="close-quick-pay-modal-bottom"
                                                                    onClick={() => setQuickPayApp(null)}
                                                                    className="py-2.5 px-5 rounded-xl font-bold text-xs uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                                                                >
                                                                    Close Details
                                                                </button>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })()}
                                </>
                            )}
                        </div>
                    );
                })()}

                {/* Announcements Tab */}
                {activeTab === 'announcements' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-3xl font-semibold">Announcements</h2>
                            {adminRole !== 'viewer' && (
                                <button
                                    onClick={() => {
                                        setAnnouncementPreview('');
                                        setAnnouncementModal({ open: true });
                                    }}
                                    className="bg-primary text-white px-4 py-2 rounded-[10px] font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
                                >
                                    <span className="material-symbols-outlined text-lg">add</span>
                                    Add Announcement
                                </button>
                            )}
                        </div>
                        <div className="bg-white dark:bg-slate-800 rounded-[10px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase">
                                    <tr>
                                        <th className="p-4 font-semibold">Image</th>
                                        <th className="p-4 font-semibold">Title</th>
                                        <th className="p-4 font-semibold">Category</th>
                                        <th className="p-4 font-semibold">Date</th>
                                        <th className="p-4 font-semibold">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                                    {announcements.length === 0 ? (
                                        <tr><td colSpan={5} className="p-5 text-center text-slate-500">No announcements yet.</td></tr>
                                    ) : (
                                        announcements.map(announcement => (
                                            <tr key={announcement.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                                                <td className="p-4">
                                                    <img src={announcement.image} alt={announcement.title} className="w-16 h-16 object-cover rounded-[10px]" />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-semibold">{announcement.title}</div>
                                                    <div className="text-xs text-slate-500 line-clamp-1">{announcement.summary}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">{announcement.category}</span>
                                                </td>
                                                <td className="p-4 text-slate-500">{announcement.date}</td>
                                                <td className="p-4 flex gap-2">
                                                    {adminRole !== 'viewer' && (
                                                        <>
                                                            <button
                                                                onClick={() => {
                                                                    setAnnouncementPreview(announcement.image || '');
                                                                    setAnnouncementModal({ open: true, announcement });
                                                                }}
                                                                className="bg-blue-50 dark:bg-white/10 text-primary p-1 rounded hover:bg-primary hover:text-white transition-colors"
                                                                title="Edit"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    requestDelete('Delete this announcement?', () => {
                                                                        deleteAnnouncement(announcement.id);
                                                                    });
                                                                }}
                                                                className="bg-red-50 dark:bg-white/10 text-red-500 p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                                title="Delete"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}



                {/* Membership Plans Tab */}
                {activeTab === 'membership_plans' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Membership Plans</h2>
                                <p className="text-xs text-slate-500">Configure plans that synchronized with the PayCools checkout portal</p>
                            </div>
                            {adminRole !== 'viewer' && (
                                <button
                                    id="add-membership-plan-btn"
                                    onClick={() => {
                                        setEditingPlan(null);
                                        setPlanType('Regular');
                                        setPlanTitle('');
                                        setPlanFee(5000);
                                        setPlanDescription('');
                                        setPlanFeatures('');
                                        setPlanValidityDuration(1);
                                        setIsPlanModalOpen(true);
                                    }}
                                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-[12px] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                                >
                                    <span className="material-symbols-outlined text-base">add</span>
                                    Create Custom Plan
                                </button>
                            )}
                        </div>

                        {/* Plans Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                            {membershipPlans.length === 0 ? (
                                <div className="col-span-full bg-white dark:bg-slate-800 p-8 text-center rounded-[12px] border border-slate-200 dark:border-white/5 text-slate-500">
                                    No membership plans loaded. Default plans are loading.
                                </div>
                            ) : (
                                membershipPlans.map((plan) => (
                                    <div key={plan.id} className="bg-white dark:bg-slate-800 rounded-[16px] border border-slate-200 dark:border-white/5 p-6 shadow-sm flex flex-col hover:shadow-md transition-all relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                                        <div className="mb-4">
                                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                {plan.type}
                                            </span>
                                            <h3 className="text-base font-black text-slate-900 dark:text-white mt-2 leading-tight">{plan.title}</h3>
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{plan.description}</p>
                                        </div>

                                        <div className="my-3 py-3 border-t border-b border-slate-100 dark:border-white/5">
                                            <div className="flex justify-between text-xs text-slate-400">
                                                <span>Total Price / Fee</span>
                                                <span>Validity</span>
                                            </div>
                                            <div className="flex justify-between items-baseline mt-0.5">
                                                <p className="text-2xl font-black text-slate-950 dark:text-white">₱{plan.fee?.toLocaleString()}.00</p>
                                                <p className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider">{plan.validityDuration || 1} {plan.validityDuration === 1 ? 'Year' : 'Years'}</p>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-2 mb-6">
                                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Core Benefits</p>
                                            {plan.features?.map((f: string, i: number) => (
                                                <div key={i} className="flex items-start gap-2">
                                                    <span className="material-symbols-outlined text-emerald-500 text-sm select-none">check_circle</span>
                                                    <span className="text-xs text-slate-600 dark:text-slate-300 leading-snug">{f}</span>
                                                </div>
                                            ))}
                                        </div>

                                        {adminRole !== 'viewer' && (
                                            <div className="flex gap-2">
                                                <button
                                                    id={`edit-plan-btn-${plan.id.toLowerCase()}`}
                                                    onClick={() => {
                                                        setEditingPlan(plan);
                                                        setPlanType(plan.type || 'Regular');
                                                        setPlanTitle(plan.title || '');
                                                        setPlanFee(plan.fee || 5000);
                                                        setPlanDescription(plan.description || '');
                                                        setPlanFeatures(plan.features?.join('\n') || '');
                                                        setPlanValidityDuration(plan.validityDuration || 1);
                                                        setIsPlanModalOpen(true);
                                                    }}
                                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold text-xs rounded-[10px] transition-all flex items-center justify-center gap-1.5"
                                                >
                                                    <span className="material-symbols-outlined text-xs">edit</span>
                                                    Edit Details
                                                </button>
                                                <button
                                                    id={`delete-plan-btn-${plan.id.toLowerCase()}`}
                                                    onClick={() => handleDeletePlan(plan.id)}
                                                    className="size-9 rounded-[10px] hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-400 hover:text-red-500 border border-slate-200 dark:border-white/10 hover:border-red-200 dark:hover:border-red-500/20 transition-all flex items-center justify-center"
                                                >
                                                    <span className="material-symbols-outlined text-base">delete</span>
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Create / Edit Plan Modal */}
                        {isPlanModalOpen && (
                            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPlanModalOpen(false)}></div>
                                <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-5 md:p-6 shadow-2xl border border-slate-200 dark:border-white/5 transform scale-100 transition-all relative z-10">
                                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/5 mb-4">
                                        <h3 className="text-base font-black text-slate-900 dark:text-white">
                                            {editingPlan ? 'Edit Membership Plan' : 'Create Custom Membership Plan'}
                                        </h3>
                                        <button
                                            onClick={() => setIsPlanModalOpen(false)}
                                            className="size-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined">close</span>
                                        </button>
                                    </div>

                                    <form onSubmit={handleSavePlan} className="space-y-3">
                                        <div>
                                            <label htmlFor="plan-type-select" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Membership Type</label>
                                            <select
                                                id="plan-type-select"
                                                value={planType}
                                                onChange={e => setPlanType(e.target.value as any)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                                disabled={!!editingPlan}
                                            >
                                                <option value="Regular">Regular</option>
                                                <option value="Associate">Associate</option>
                                                <option value="Institutional">Institutional</option>
                                                <option value="Affiliate">Affiliate</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="plan-title-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Plan Title *</label>
                                            <input
                                                id="plan-title-input"
                                                type="text"
                                                required
                                                value={planTitle}
                                                onChange={e => setPlanTitle(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                                placeholder="e.g. Regular Membership Plan"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="plan-fee-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fee (PHP) *</label>
                                            <input
                                                id="plan-fee-input"
                                                type="number"
                                                required
                                                min="0"
                                                value={planFee}
                                                onChange={e => setPlanFee(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                                placeholder="e.g. 5000"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="plan-duration-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Validity Duration (Years) *</label>
                                            <input
                                                id="plan-duration-input"
                                                type="number"
                                                required
                                                min="1"
                                                max="10"
                                                value={planValidityDuration}
                                                onChange={e => setPlanValidityDuration(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                                placeholder="e.g. 1"
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="plan-desc-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
                                            <textarea
                                                id="plan-desc-input"
                                                rows={2}
                                                value={planDescription}
                                                onChange={e => setPlanDescription(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white resize-none"
                                                placeholder="Provide a brief summary of who this plan is tailored for..."
                                            />
                                        </div>

                                        <div>
                                            <label htmlFor="plan-features-input" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Benefits / Features (One per line)</label>
                                            <textarea
                                                id="plan-features-input"
                                                rows={3}
                                                value={planFeatures}
                                                onChange={e => setPlanFeatures(e.target.value)}
                                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                                placeholder="Feature Benefit 1&#10;Feature Benefit 2&#10;Feature Benefit 3"
                                            />
                                        </div>

                                        <button
                                            id="submit-plan-form-btn"
                                            type="submit"
                                            disabled={savingPlan}
                                            className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[10px] font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 mt-3 flex items-center justify-center gap-2"
                                        >
                                            {savingPlan ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-sm">save</span>}
                                            Save Plan Details
                                        </button>
                                    </form>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Member Inbox / Chat Tab */}
                {activeTab === 'inbox' && (
                    <div className="h-full pb-8">
                        <InboxManager />
                    </div>
                )}

                {/* Members Directory Manager Tab */}
                {activeTab === 'members' && (
                    <div className="h-full pb-8">
                        <MembersManager canEdit={adminRole !== 'viewer'} />
                    </div>
                )}

                {/* Accredited Clinics Tab */}
                {activeTab === 'accredited' && (
                    <div className="h-full pb-8">
                        <MembersManager filter="accredited" canEdit={adminRole !== 'viewer'} />
                    </div>
                )}

                {/* CMS Tab - Website Content Editor */}
                {activeTab === 'cms' && (
                    <div className="h-full">
                        <WebsiteContentEditor />
                    </div>
                )}

                {/* Events Tab */}
                {activeTab === 'events' && (
                    <EventsTab
                        events={events}
                        canEdit={adminRole !== 'viewer'}
                        onAdd={() => {
                            const newId = getNewEventId();
                            setEventPreview('');
                            setEventDescription('');
                            setHighlightsVideoURL(null);
                            setHighlightsVideoPath(null);
                            setEventVideoProgress(0);
                            setEventGallery([]);
                            setEventModal({ open: true, event: { id: newId }, mode: 'add' });
                        }}
                        onEdit={(e) => {
                            setEventPreview(e.image || '');
                            setEventDescription(e.description || '');
                            setHighlightsVideoURL(e.highlightsVideoURL || e.videoUrl || null);
                            setHighlightsVideoPath(e.highlightsVideoPath || null);
                            setEventVideoProgress((e.highlightsVideoURL || e.videoUrl) ? 100 : 0);
                            setEventGallery(e.galleryImages ? e.galleryImages.map((img: any) => ({
                                id: img.path,
                                url: img.url,
                                path: img.path,
                                progress: 100
                            })) : (e.galleryUrls || []).map((url: string) => ({ 
                                id: url, 
                                url, 
                                path: url, 
                                progress: 100 
                            })));
                            setEventModal({ open: true, event: e, mode: 'edit' });
                        }}
                        onDelete={async (id) => {
                            try {
                                await deleteEvent(id);
                                showToast("Event successfully deleted", "success");
                            } catch (e) {
                                console.error("Delete failed:", e);
                                showToast("Failed to delete event. Please ensure you have correct permissions.", "error");
                            }
                        }}
                        onViewRegistrations={(e) => setViewingEventRegistrations(e)}
                    />
                )}

                {/* Partners Manager Tab */}
                {activeTab === 'partners' && (
                    <div className="h-full pb-8">
                        <PartnersManager />
                    </div>
                )}

                {/* Committees Manager Tab */}
                {activeTab === 'committees' && (
                    <div className="h-full pb-8">
                        <CommitteesManager />
                    </div>
                )}

                {/* Former Officers Manager Tab */}
                {activeTab === 'former_officers' && (
                    <div className="h-full pb-8">
                        <FormerOfficersManager />
                    </div>
                )}



            {/* View Details Modal */}
            {selectedApplication && (() => {
                const initials = `${selectedApplication.firstName?.[0] ?? ''}${selectedApplication.lastName?.[0] ?? ''}`.toUpperCase();
                const linkedMember = members.find(m => m.email === selectedApplication.email);
                
                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedApplication(null)}></div>
                        <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col relative z-50 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-modal-pop text-left">
                            
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                        <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white leading-none">Application Profile</h3>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Management Terminal v2.2</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     {selectedApplication.status === 'pending' && adminRole !== 'viewer' && (
                                         <>
                                             <button
                                                 type="button"
                                                 onClick={() => { updateApplicationStatus(selectedApplication.id, 'rejected'); setSelectedApplication(null); }}
                                                 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-455 bg-rose-500/10 hover:bg-rose-500 hover:text-white rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                             >
                                                 <span className="material-symbols-outlined text-[13px]">cancel</span>
                                                 Reject Candidate
                                             </button>
                                             <button
                                                 type="button"
                                                 onClick={async () => { 
                                                     await handleManualSync(selectedApplication); 
                                                     await updateApplicationStatus(selectedApplication.id, 'approved'); 
                                                     setSelectedApplication(null); 
                                                 }}
                                                 className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-455 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                             >
                                                 <span className="material-symbols-outlined text-[13px]">check_circle</span>
                                                 Approve & Sync
                                             </button>
                                         </>
                                     )}
                                     <button 
                                         onClick={() => setSelectedApplication(null)} 
                                         className="size-9 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all flex items-center justify-center text-slate-400 group"
                                     >
                                         <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
                                     </button>
                                 </div>
                            </div>

                            {/* Candidate Summary Panel */}
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {selectedApplication.photoUrl || (candidateUser as any)?.photoUrl || (linkedMember as any)?.image || (linkedMember as any)?.photoUrl ? (
                                        <img src={selectedApplication.photoUrl || (candidateUser as any)?.photoUrl || (linkedMember as any)?.image || (linkedMember as any)?.photoUrl} className="size-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" alt="Avatar" />
                                    ) : (
                                        <div className="size-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                            {initials || 'AD'}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-950 dark:text-white leading-tight">Dr. {selectedApplication.firstName} {selectedApplication.lastName}</h2>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">{selectedApplication.type || selectedApplication.membershipType || 'Regular'} Membership Candidate</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                selectedApplication.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                selectedApplication.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                            }`}>
                                                <span className={`size-1.5 rounded-full ${
                                                    selectedApplication.status === 'approved' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                                                    selectedApplication.status === 'rejected' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                                                    'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)] animate-pulse'
                                                }`}></span>
                                                {selectedApplication.status}
                                            </span>
                                            {linkedMember ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase rounded-full border border-emerald-500/20">
                                                    <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>link</span>
                                                    Synced
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-bold uppercase rounded-full border border-amber-500/20">
                                                    <span className="material-symbols-outlined text-[10px]">link_off</span>
                                                    Not Linked
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right sm:border-l border-slate-100 dark:border-white/5 sm:pl-6">
                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Submitted On</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{selectedApplication.date ? new Date(selectedApplication.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</p>
                                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{selectedApplication.date ? new Date(selectedApplication.date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 border-b border-slate-100 dark:border-white/5">
                                {[
                                    { id: 'clinic', label: 'Clinic & Contacts', icon: 'storefront', color: 'text-teal-500' },
                                    { id: 'account', label: 'Docs Onboarding', icon: 'assignment', color: 'text-amber-500' },
                                    { id: 'membership_info', label: 'Membership Information', icon: 'card_membership', color: 'text-indigo-500' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setAppModalTab(tab.id as any)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all
                                            ${appModalTab === tab.id 
                                                ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200/50 dark:border-white/5' 
                                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                            }`}
                                    >
                                        <span className={`material-symbols-outlined text-base ${tab.color}`}>{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-white dark:bg-[#1E293B]">
                                {appModalTab === 'clinic' && (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* Clinic info card */}
                                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 space-y-5">
                                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/60 dark:border-white/5">
                                                <div className="size-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-lg">apartment</span>
                                                </div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Institution Identity</h4>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div className="md:col-span-3">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-rose-500">location_on</span> Clinic Address
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-955 dark:text-white">{selectedApplication.clinicAddress || '—'}</p>
                                                    {selectedApplication.region && (
                                                        <span className="inline-block mt-2 px-2.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded">
                                                            {selectedApplication.region}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-teal-500">apartment</span> Clinic / Hospital Name
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.hospitalName || selectedApplication.clinicName || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-blue-500">corporate_fare</span> Business Structure
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.businessStructure || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-amber-500">badge</span> PRC License No
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.prcLicenseNo || selectedApplication.prcLicense || 'N/A'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Contact details */}
                                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 space-y-5">
                                            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/60 dark:border-white/5">
                                                <div className="size-8 rounded-lg bg-teal-500/10 text-teal-500 flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-lg">contacts</span>
                                                </div>
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Contact Details</h4>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-indigo-500">person</span> Representative Name
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.representativeName || `${selectedApplication.firstName || ''} ${selectedApplication.lastName || ''}`.trim() || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-violet-500">badge</span> Owner Name
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.ownerName || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-sky-500">mail</span> Email Address
                                                    </p>
                                                    <a href={`mailto:${selectedApplication.email}`} className="text-xs font-semibold text-primary hover:underline block truncate">{selectedApplication.email}</a>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-emerald-500">call</span> Mobile / Phone Number
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.mobile || selectedApplication.phone || '—'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {selectedApplication.description && (
                                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 space-y-3">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[13px] text-amber-500">description</span> Clinic Profile / Description
                                                </p>
                                                <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed italic">
                                                    "{selectedApplication.description}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Facility Gallery */}
                                        {selectedApplication.facilityMedia && selectedApplication.facilityMedia.length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[13px] text-teal-500">photo_library</span> Facility Photos
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {selectedApplication.facilityMedia.map((media: any, idx: number) => (
                                                        <div 
                                                            key={idx} 
                                                            className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 cursor-pointer shadow-sm"
                                                            onClick={() => window.open(media.url, '_blank')}
                                                        >
                                                            <img src={media.url} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-550" alt="" />
                                                            <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-white text-base">open_in_new</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {appModalTab === 'account' && (
                                    <div className="space-y-6 animate-fade-in">

                                        {/* Attachments */}
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[13px] text-orange-500">folder</span> Attachments & Documentation
                                            </p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {selectedApplication.attachment && (
                                                    <div 
                                                        onClick={() => window.open(selectedApplication.attachment.url, '_blank')}
                                                        className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all cursor-pointer group shadow-sm"
                                                    >
                                                        <div className="size-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-xl">description</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors truncate">Business Permit / Legal PDF</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Click to view file</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-base transition-colors">open_in_new</span>
                                                    </div>
                                                )}

                                                {selectedApplication.paymentReference && (
                                                    <div 
                                                        onClick={() => window.open(selectedApplication.paymentReference, '_blank')}
                                                        className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all cursor-pointer group shadow-sm"
                                                    >
                                                        <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-xl">payments</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors truncate">Manual Payment Receipt</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Click to view receipt</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-base transition-colors">open_in_new</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Membership Onboarding Documents */}
                                            {selectedApplication.membershipDocuments && Object.keys(selectedApplication.membershipDocuments).length > 0 && (
                                                <div className="pt-2">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-3 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-blue-500">folder_open</span> Membership Onboarding Documents
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {Object.entries(selectedApplication.membershipDocuments as Record<string, any[]>).map(([docId, files]) => {
                                                            if (!files || files.length === 0) return null;
                                                            return (
                                                                <div key={docId} className="p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-white/5">
                                                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-450 mb-2 uppercase tracking-wide leading-tight">
                                                                        {MEMBERSHIP_DOC_LABELS[docId] || docId}
                                                                    </p>
                                                                    <div className="space-y-1.5">
                                                                        {files.map((file: any, idx: number) => (
                                                                            <a
                                                                                key={idx}
                                                                                href={file.url}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-2.5 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-white/5 hover:border-primary transition-colors group"
                                                                            >
                                                                                <span className="material-symbols-outlined text-primary text-sm">
                                                                                    {docId === 'walkthrough_video' ? 'movie' : 'description'}
                                                                                </span>
                                                                                <span className="flex-1 min-w-0 text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                                                                                    {file.name}
                                                                                </span>
                                                                                <span className="material-symbols-outlined text-slate-455 group-hover:text-primary text-xs">open_in_new</span>
                                                                            </a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {appModalTab === 'membership_info' && (() => {
                                    const displayReps = [
                                        ...selectedAppReps,
                                        ...(selectedApplication.representatives || [])
                                    ].reduce((acc: any[], current: any) => {
                                        const emailVal = current.email || '';
                                        const prcVal = current.prc || current.prcLicenseNo || current.prcLicense || '';
                                        
                                        const exists = acc.find(item => {
                                            const itemEmail = item.email || '';
                                            const itemPrc = item.prc || item.prcLicenseNo || item.prcLicense || '';
                                            
                                            if (item.id && current.id && item.id === current.id) return true;
                                            if (prcVal && itemPrc && prcVal === itemPrc) return true;
                                            if (emailVal && itemEmail && emailVal === itemEmail) return true;
                                            return false;
                                        });
                                        
                                        if (!exists) {
                                            return acc.concat([current]);
                                        }
                                        return acc;
                                    }, []);

                                    const paidAtDate = selectedApplication.paidAt ? new Date(selectedApplication.paidAt) : selectedApplication.date ? new Date(selectedApplication.date) : null;
                                    const renewalDate = paidAtDate ? new Date(paidAtDate.getFullYear() + 1, paidAtDate.getMonth(), paidAtDate.getDate()) : null;
                                    
                                    const memberSinceStr = selectedApplication.status === 'approved' && paidAtDate
                                        ? paidAtDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                        : '—';
                                        
                                    const renewalDateStr = selectedApplication.status === 'approved' && renewalDate
                                        ? renewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                        : '—';

                                    const userPlan = membershipPlans.find(p => p.type === selectedApplication.type || p.id === selectedApplication.type);
                                    const annualDuesStr = userPlan 
                                        ? `₱${Number(userPlan.fee || 0).toLocaleString()} / year` 
                                        : (selectedApplication.type === 'Associate' ? '₱3,500 / year' : '₱5,000 / year');

                                    return (
                                        <div className="space-y-6 animate-fade-in text-left">
                                            {/* Membership Info Card */}
                                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 space-y-5">
                                                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/60 dark:border-white/5">
                                                    <div className="size-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-lg">card_membership</span>
                                                    </div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Membership Details</h4>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-indigo-500">badge</span> Membership ID
                                                        </p>
                                                        <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white truncate" title={getApplicationId(selectedApplication)}>{getApplicationId(selectedApplication)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-amber-500">info</span> Candidacy Status
                                                        </p>
                                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                                                            selectedApplication.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                            selectedApplication.status === 'rejected' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' :
                                                            'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                                        }`}>
                                                            {selectedApplication.status}
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-teal-500">card_membership</span> Candidacy Membership Type
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.type || selectedApplication.membershipType || 'Regular'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-blue-500">corporate_fare</span> Business Structure
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{selectedApplication.businessStructure || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-rose-500">calendar_today</span> Registration Date
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                                            {(() => {
                                                                const dateVal = selectedApplication.date || selectedApplication.createdAt;
                                                                if (!dateVal) return '—';
                                                                const d = new Date(dateVal);
                                                                return isNaN(d.getTime()) ? '—' : `${d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })} at ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                                                            })()}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-emerald-500">payments</span> Annual Membership Dues
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{annualDuesStr}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-violet-500">event_available</span> Member Since
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{memberSinceStr}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-orange-500">event_repeat</span> Next Renewal Date
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{renewalDateStr}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Renewal Reminder Card */}
                                            <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-3">
                                                <div className="flex items-center gap-2.5">
                                                    <span className="material-symbols-outlined text-amber-500 shrink-0 text-xl">schedule</span>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-amber-800 dark:text-amber-400">Renewal & Validity Cycle</h4>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium text-slate-500 pt-1">
                                                    <div><strong>Duration:</strong> 1 Year (Annual Cycle)</div>
                                                    <div>
                                                        <strong>Next Renewal:</strong>{' '}
                                                        <span className="font-bold text-amber-700 dark:text-amber-450">{renewalDateStr}</span>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-amber-600/80 dark:text-amber-500/70 leading-relaxed mt-1">
                                                    * Upon approval, a 1-year validation period is created. Expiry notification alerts will be sent automatically to the clinic email 30 days prior to the renewal date.
                                                </p>
                                            </div>

                                            {/* Clinic Representatives List */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2.5 pb-2">
                                                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-lg">group</span>
                                                    </div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Clinic Representatives</h4>
                                                </div>

                                                {displayReps.length === 0 ? (
                                                    <div className="p-4 text-center bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-xs text-slate-400 font-semibold italic">
                                                        No representatives registered for this clinic.
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                        {displayReps.map((rep: any, idx: number) => {
                                                            const repImg = rep.image || rep.avatar || rep.imageUrl || rep.photoUrl;
                                                            const isPrimary = rep.isPrimary === true || rep.role === 'Primary' || (rep.designation && rep.designation.toLowerCase().includes('primary'));
                                                            const isActive = (rep.status ?? 'active') === 'active';
                                                            return (
                                                                <div key={rep.id || idx} className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 space-y-3 relative overflow-hidden shadow-sm">
                                                                    <div className="flex items-center gap-3">
                                                                        {repImg ? (
                                                                            <img 
                                                                                src={repImg} 
                                                                                className="size-10 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-white/10" 
                                                                                alt={rep.fullName || rep.name || 'Representative'} 
                                                                                onError={(e) => {
                                                                                    // fallback if image fails to load
                                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <div className="size-10 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-sm shrink-0">
                                                                                {rep.fullName?.[0]?.toUpperCase() || rep.name?.[0]?.toUpperCase() || 'R'}
                                                                            </div>
                                                                        )}
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="text-xs font-black text-slate-900 dark:text-white truncate">{rep.fullName || rep.name}</p>
                                                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold truncate">
                                                                                {rep.designation || rep.role || 'Representative'}
                                                                                {(rep.prc || rep.prcLicenseNo || rep.prcLicense) && ` · PRC ${rep.prc || rep.prcLicenseNo || rep.prcLicense}`}
                                                                            </p>
                                                                        </div>
                                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider shrink-0 ${
                                                                            isPrimary
                                                                                ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20'
                                                                                : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                                                        }`}>
                                                                            <span className={`size-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                                            {isPrimary ? 'Primary' : 'Rep'} — {isActive ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </div>
                                                                    <div className="text-[11px] text-slate-600 dark:text-slate-400 space-y-1.5 pt-2.5 border-t border-slate-200/60 dark:border-white/5">
                                                                        {rep.email && (
                                                                            <div className="flex items-center gap-1.5 truncate">
                                                                                <span className="material-symbols-outlined text-[13px] text-blue-500">mail</span>
                                                                                <span className="font-semibold text-slate-700 dark:text-slate-350">{rep.email}</span>
                                                                            </div>
                                                                        )}
                                                                        {(rep.phone || rep.contactNo || rep.mobile || rep.contact) && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="material-symbols-outlined text-[13px] text-emerald-500">call</span>
                                                                                <span className="font-semibold text-slate-700 dark:text-slate-350">{rep.phone || rep.contactNo || rep.mobile || rep.contact}</span>
                                                                            </div>
                                                                        )}
                                                                        {(rep.prc || rep.prcLicenseNo || rep.prcLicense) && (
                                                                            <div className="flex items-center gap-1.5">
                                                                                <span className="material-symbols-outlined text-[13px] text-amber-500">badge</span>
                                                                                <span className="font-semibold text-slate-700 dark:text-slate-350">PRC License: {rep.prc || rep.prcLicenseNo || rep.prcLicense}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action / Decisions */}
                                            {selectedApplication.status === 'pending' && adminRole !== 'viewer' && (
                                                <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/10 space-y-4">
                                                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                                                        <span className="material-symbols-outlined text-base">warning</span>
                                                        <h4 className="text-xs font-bold uppercase tracking-wider">Candidate Pending Approval</h4>
                                                    </div>
                                                    <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                                                        This application is waiting for administrative review. Approving will register this candidate as an official active member and automatically sync their profiles.
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-800/30 flex justify-end">
                                <button 
                                    onClick={() => setSelectedApplication(null)} 
                                    className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-md"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Event Registration List Modal */}
            {viewingEventRegistrations && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setViewingEventRegistrations(null)}></div>
                    <div className="bg-white dark:bg-[#1E293B] rounded-[2rem] w-full max-w-7xl max-h-[85vh] overflow-hidden flex flex-col relative z-50 shadow-2xl animate-modal-pop border border-white/10 ring-1 ring-white/10">
                        {/* Compact Header */}
                        <div className="px-6 py-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/80 backdrop-blur-xl z-20">
                            <div className="flex items-center gap-4">
                                <div className="size-10 rounded-[10px] bg-primary flex items-center justify-center text-white shadow-lg">
                                    <span className="material-symbols-outlined text-xl">how_to_reg</span>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold uppercase tracking-tight text-slate-900 dark:text-white leading-none mb-1">{viewingEventRegistrations.title}</h3>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest bg-slate-200/50 dark:bg-white/5 px-2 py-0.5 rounded-full">Terminal v2.1</p>
                                        <div className="flex items-center gap-1 px-2 py-0.5 bg-primary/10 rounded-full border border-primary/20">
                                            <span className="text-[9px] font-semibold text-primary uppercase tracking-widest">{registrations.filter(r => r.eventId === viewingEventRegistrations.id).length} ENTRIES</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setViewingEventRegistrations(null)} className="size-8 hover:bg-red-500/10 hover:text-red-500 rounded-[10px] transition-all flex items-center justify-center text-slate-400 group">
                                <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">close</span>
                            </button>
                        </div>
                        
                        {/* Compact Intelligence Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-white dark:bg-[#0F172A] border-b border-slate-200 dark:border-white/5">
                            {(() => {
                                const eventRegistrations = registrations.filter(r => r.eventId === viewingEventRegistrations.id);
                                const paidCount = eventRegistrations.filter(r => r.paymentStatus === 'paid').length;
                                const totalRevenue = paidCount * (viewingEventRegistrations.price || 0);

                                return (
                                    <>
                                        <div className="bg-emerald-500/5 p-4 rounded-[10px] border border-emerald-500/20 relative group overflow-hidden">
                                            <p className="text-[8px] font-semibold uppercase text-emerald-600/60 tracking-widest leading-none mb-2">GROSS REVENUE</p>
                                            <h4 className="text-xl font-semibold text-emerald-500">₱{totalRevenue.toLocaleString()}</h4>
                                            <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-4xl text-emerald-500/10 rotate-12 transition-transform duration-700">payments</span>
                                        </div>
                                        <div className="bg-blue-500/5 p-4 rounded-[10px] border border-blue-500/20 relative group overflow-hidden">
                                            <p className="text-[8px] font-semibold uppercase text-blue-600/60 tracking-widest leading-none mb-2">ACTIVE ATTENDANCE</p>
                                            <h4 className="text-xl font-semibold text-blue-500">{paidCount} <span className="text-[10px] font-semibold opacity-30">/ {eventRegistrations.length}</span></h4>
                                            <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-4xl text-blue-500/10 rotate-12 transition-transform duration-700">check_circle</span>
                                        </div>
                                        <div className="bg-amber-500/5 p-4 rounded-[10px] border border-amber-500/20 relative group overflow-hidden">
                                            <p className="text-[8px] font-semibold uppercase text-amber-600/60 tracking-widest leading-none mb-2">PENDING SYNC</p>
                                            <h4 className="text-xl font-semibold text-amber-500">{eventRegistrations.length - paidCount}</h4>
                                            <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-4xl text-amber-500/10 rotate-12 transition-transform duration-700">hourglass_empty</span>
                                        </div>
                                        <div className="bg-slate-500/5 p-4 rounded-[10px] border border-slate-500/20 relative group overflow-hidden">
                                            <p className="text-[8px] font-semibold uppercase text-slate-600/60 tracking-widest leading-none mb-2">SLOTS REMAINING</p>
                                            <h4 className="text-xl font-semibold text-slate-700 dark:text-white">{(viewingEventRegistrations.capacity || 0) - eventRegistrations.length}</h4>
                                            <span className="material-symbols-outlined absolute -right-3 -bottom-3 text-4xl text-slate-500/10 rotate-12 transition-transform duration-700">groups</span>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        {/* Dense List Dynamics */}
                        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#F8FAFC] dark:bg-[#0F172A]">
                            <div className="bg-white dark:bg-slate-800/80 rounded-[10px] border border-slate-200 dark:border-white/5 shadow-xl overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-400 text-[9px] uppercase tracking-widest sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 font-semibold">Digital Signature</th>
                                            <th className="p-4 font-semibold">Attendee Profile</th>
                                            <th className="p-4 font-semibold text-center">Protocol & Fee</th>
                                            <th className="p-4 font-semibold text-center">Payment Reference Data</th>
                                            <th className="p-4 font-semibold text-center">Status</th>
                                            <th className="p-4 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                                        {(() => {
                                            const eventRegistrations = registrations.filter(r => r.eventId === viewingEventRegistrations.id);
                                            return eventRegistrations.length === 0 ? (
                                                <tr><td colSpan={6} className="p-20 text-center text-slate-400 font-semibold uppercase tracking-widest text-xs">NO ENTRIES DETECTED</td></tr>
                                            ) : (
                                                eventRegistrations.sort((a,b) => new Date(b.registrationDate || '').getTime() - new Date(a.registrationDate || '').getTime()).map(reg => (
                                                    <tr key={reg.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="font-mono text-[10px] font-semibold text-primary uppercase">REG-{reg.id.substring(0, 10).toUpperCase()}</span>
                                                                <span className="text-[9px] text-slate-400 font-medium">
                                                                    {new Date(reg.registrationDate || '').toLocaleDateString(undefined, { month: 'numeric', day: 'numeric', year: 'numeric' })}
                                                                    <span className="mx-1 opacity-40">•</span>
                                                                    {new Date(reg.registrationDate || '').toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className="size-8 rounded-[10px] bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 font-semibold text-[11px] border border-slate-200 dark:border-white/5 shadow-inner">
                                                                    {reg.attendeeName.substring(0, 2).toUpperCase()}
                                                                </div>
                                                                <div>
                                                                    <div className="font-semibold text-slate-900 dark:text-white uppercase tracking-tight leading-none mb-0.5 text-xs">{reg.attendeeName}</div>
                                                                    <div className="text-[10px] text-slate-500 font-medium leading-none">{reg.attendeeEmail}</div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <div className="flex flex-col items-center">
                                                                <span className="px-1.5 py-0.5 rounded-[10px] bg-slate-900 dark:bg-white text-[8px] font-semibold uppercase text-white dark:text-slate-900 border border-transparent">
                                                                    {reg.paymentMethod.replace('_', ' ')}
                                                                </span>
                                                                <span className="text-[10px] font-semibold text-slate-900 dark:text-white uppercase tracking-tighter mt-1">₱{viewingEventRegistrations.price.toLocaleString()}</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {(reg as any).paymentReference ? (
                                                                <button 
                                                                    onClick={() => window.open((reg as any).paymentReference, '_blank')}
                                                                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20 transition-all group/ref"
                                                                >
                                                                    <span className="material-symbols-outlined text-[16px] group-hover/ref:scale-110 transition-transform">receipt_long</span>
                                                                    <span className="text-[10px] font-semibold uppercase tracking-wider">View Proof</span>
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] font-semibold text-slate-300 uppercase tracking-widest">No Reference</span>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold uppercase inline-flex items-center gap-1 shadow-sm ring-1 ring-inset ${
                                                                reg.paymentStatus === 'paid' ? 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/30' :
                                                                reg.paymentStatus === 'refunded' ? 'bg-rose-500/10 text-rose-600 ring-rose-500/30' :
                                                                'bg-amber-500/10 text-amber-600 ring-amber-500/30'
                                                            }`}>
                                                                <span className={`size-1 rounded-full ${
                                                                    reg.paymentStatus === 'paid' ? 'bg-emerald-500 animate-pulse' :
                                                                    reg.paymentStatus === 'refunded' ? 'bg-rose-500' :
                                                                    'bg-amber-500'
                                                                }`}></span>
                                                                {reg.paymentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-right">
                                                            <div className="flex justify-end gap-1.5 transition-all">
                                                                {reg.paymentStatus === 'pending' && (
                                                                    <button
                                                                        onClick={() => updateEventRegistrationPaymentStatus(reg.id, 'paid')}
                                                                        className="size-8 bg-emerald-500 text-white rounded-[10px] hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center active:scale-90"
                                                                        title="Verify Payment"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">verified</span>
                                                                    </button>
                                                                )}
                                                                {reg.paymentStatus === 'paid' && (
                                                                    <button
                                                                        onClick={() => updateEventRegistrationPaymentStatus(reg.id, 'pending')}
                                                                        className="size-8 bg-amber-500 text-white rounded-[10px] hover:bg-amber-600 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center active:scale-90"
                                                                        title="Review"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">history</span>
                                                                    </button>
                                                                )}
                                                                <button
                                                                    onClick={() => setRegistrationEditModal({ open: true, registration: reg })}
                                                                    className="size-8 bg-blue-500 text-white rounded-[10px] hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center active:scale-90"
                                                                    title="Edit Registration"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        requestDelete(`Are you sure you want to delete registration for ${reg.attendeeName}?`, async () => {
                                                                            try {
                                                                                await deleteEventRegistration(reg.id);
                                                                            } catch (error) {
                                                                                console.error("Delete failed:", error);
                                                                                alert("Failed to delete registration.");
                                                                            }
                                                                        });
                                                                    }}
                                                                    className="size-8 bg-rose-500 text-white rounded-[10px] hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 flex items-center justify-center active:scale-90"
                                                                    title="Delete Entry"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                </button>
                                                                <button
                                                                    className="size-8 bg-white dark:bg-white/5 text-slate-500 rounded-[10px] hover:bg-primary hover:text-white transition-all flex items-center justify-center border border-slate-200 dark:border-white/10 active:scale-90"
                                                                    onClick={() => setSelectedRegistration(reg)}
                                                                    title="Full Profile"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Compact Controller */}
                        <div className="px-10 py-5 border-t border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-slate-800/80 backdrop-blur-xl flex justify-between items-center z-10">
                            <button
                                onClick={() => {
                                    const eventRegistrations = registrations.filter(r => r.eventId === viewingEventRegistrations.id);
                                    exportRegistrationsToCSV(viewingEventRegistrations.title, eventRegistrations);
                                }}
                                className="px-6 py-2.5 text-[9px] font-semibold uppercase bg-primary text-white rounded-[10px] flex items-center gap-2 hover:scale-105 transition-all shadow-lg shadow-primary/25"
                            >
                                <span className="material-symbols-outlined text-sm">ios_share</span>
                                Export Terminal Manifest
                            </button>
                            <button 
                                onClick={() => setViewingEventRegistrations(null)} 
                                className="px-8 py-2.5 text-[9px] font-semibold uppercase bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[10px] hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                Exit Terminal
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Profile Modal */}
            {selectedRegistration && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setSelectedRegistration(null)}></div>
                    <div className="bg-white dark:bg-[#1E293B] rounded-[2.5rem] w-full max-w-md overflow-hidden flex flex-col relative z-50 shadow-2xl animate-modal-pop border border-white/5">
                        <div className="p-5 pb-4 flex flex-col items-center text-center">
                            <div className="size-20 rounded-[1.5rem] bg-gradient-to-br from-primary to-indigo-600 flex items-center justify-center text-white text-3xl font-semibold shadow-2xl shadow-primary/30 mb-6 border-4 border-white/10">
                                {selectedRegistration.attendeeName.substring(0, 2).toUpperCase()}
                            </div>
                            <h3 className="text-xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white leading-none mb-2">{selectedRegistration.attendeeName}</h3>
                            <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full mb-8">
                                <span className="material-symbols-outlined text-sm text-slate-400">fingerprint</span>
                                <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">ID: {selectedRegistration.id.toUpperCase()}</span>
                            </div>
                        </div>

                        <div className="px-8 pb-10 space-y-3">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                                    <div className="size-8 rounded-[10px] bg-white dark:bg-slate-800 flex items-center justify-center text-primary border border-slate-200 dark:border-white/10">
                                        <span className="material-symbols-outlined text-lg">mail</span>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-semibold uppercase text-slate-400 tracking-widest">Email Address</p>
                                        <p className="text-xs font-semibold">{selectedRegistration.attendeeEmail}</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                                    <div className="size-8 rounded-[10px] bg-white dark:bg-slate-800 flex items-center justify-center text-primary border border-slate-200 dark:border-white/10">
                                        <span className="material-symbols-outlined text-lg">phone_iphone</span>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-semibold uppercase text-slate-400 tracking-widest">Mobile Link</p>
                                        <p className="text-xs font-semibold">{selectedRegistration.mobile || 'Not Linked'}</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                                    <div className="size-8 rounded-[10px] bg-white dark:bg-slate-800 flex items-center justify-center text-primary border border-slate-200 dark:border-white/10">
                                        <span className="material-symbols-outlined text-lg">payments</span>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-semibold uppercase text-slate-400 tracking-widest">Payment Route</p>
                                        <p className="text-xs font-semibold uppercase text-primary">{selectedRegistration.paymentMethod.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-center gap-4">
                                    <div className="size-8 rounded-[10px] bg-white dark:bg-slate-800 flex items-center justify-center text-primary border border-slate-200 dark:border-white/10">
                                        <span className="material-symbols-outlined text-lg">verified_user</span>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-semibold uppercase text-slate-400 tracking-widest">System Status</p>
                                        <p className={`text-xs font-semibold uppercase ${selectedRegistration.paymentStatus === 'paid' ? 'text-emerald-500' : 'text-amber-500'}`}>{selectedRegistration.paymentStatus}</p>
                                    </div>
                                </div>
                            </div>

                            <button
                                className="w-full py-4 text-[10px] font-semibold uppercase tracking-[0.2em] bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[10px] hover:scale-[0.98] transition-all shadow-xl active:scale-95 mt-4"
                                onClick={() => setSelectedRegistration(null)}
                            >
                                CLOSE PROFILE VAULT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Registration Edit Modal */}
            {registrationEditModal.open && registrationEditModal.registration && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setRegistrationEditModal({ open: false })}></div>
                    <div className="bg-white dark:bg-[#1E293B] rounded-[2.5rem] w-full max-w-lg overflow-hidden flex flex-col relative z-50 shadow-2xl animate-modal-pop border border-white/5">
                        <div className="p-5 border-b border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50">
                            <h3 className="text-xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white leading-none mb-1">Edit Registration</h3>
                            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest leading-none">Modify Attendee Data</p>
                        </div>
                        
                        <form 
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const formData = new FormData(e.currentTarget);
                                const updates = {
                                    attendeeName: formData.get('attendeeName') as string,
                                    attendeeEmail: formData.get('attendeeEmail') as string,
                                    mobile: formData.get('mobile') as string,
                                    paymentStatus: formData.get('paymentStatus') as any,
                                    paymentMethod: formData.get('paymentMethod') as any,
                                };
                                try {
                                    await updateEventRegistration(registrationEditModal.registration.id, updates);
                                    setRegistrationEditModal({ open: false });
                                    showToast("Registration updated successfully");
                                } catch (error) {
                                    console.error("Update failed:", error);
                                    showToast("Failed to update registration", "error");
                                }
                            }}
                            className="p-5 space-y-4 overflow-y-auto max-h-[70vh]"
                        >
                            <div className="space-y-2">
                                <label htmlFor="regedit-attendeeName" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Attendee Name</label>
                                <input 
                                    id="regedit-attendeeName"
                                    name="attendeeName" 
                                    defaultValue={registrationEditModal.registration.attendeeName}
                                    className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="regedit-attendeeEmail" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Email Address</label>
                                <input 
                                    id="regedit-attendeeEmail"
                                    name="attendeeEmail" 
                                    type="email"
                                    defaultValue={registrationEditModal.registration.attendeeEmail}
                                    className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label htmlFor="regedit-mobile" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Mobile Number</label>
                                <input 
                                    id="regedit-mobile"
                                    name="mobile" 
                                    defaultValue={registrationEditModal.registration.mobile}
                                    className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label htmlFor="regedit-paymentStatus" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Payment Status</label>
                                    <select 
                                        id="regedit-paymentStatus"
                                        name="paymentStatus" 
                                        defaultValue={registrationEditModal.registration.paymentStatus}
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="refunded">Refunded</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label htmlFor="regedit-paymentMethod" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Payment Method</label>
                                    <select 
                                        id="regedit-paymentMethod"
                                        name="paymentMethod" 
                                        defaultValue={registrationEditModal.registration.paymentMethod}
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold focus:ring-2 focus:ring-primary outline-none"
                                    >
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="e_wallet">E-Wallet</option>
                                        <option value="credit_card">Credit Card</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setRegistrationEditModal({ open: false })}
                                    className="flex-1 py-4 text-[10px] font-semibold uppercase tracking-widest bg-slate-100 dark:bg-white/5 text-slate-500 rounded-[10px] hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 text-[10px] font-semibold uppercase tracking-widest bg-primary text-white rounded-[10px] hover:scale-[0.98] transition-all shadow-xl shadow-primary/20"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Event Add/Edit Modal */}
            {eventModal.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEventModal({ open: false })}></div>
                    <div className="bg-white dark:bg-[#1E293B] rounded-[10px] w-full max-w-2xl max-h-[95vh] flex flex-col relative z-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-modal-pop border border-white/10 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 relative z-10">
                            <div className="flex items-center gap-3">
                                <div>
                                    <h3 className="text-xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                                        {eventModal.mode === 'edit' ? 'Edit Event Details' : 'Initialize New Event'}
                                    </h3>
                                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest leading-none">Management Terminal v2</p>
                                </div>
                            </div>
                            <button onClick={() => setEventModal({ open: false })} className="size-10 hover:bg-red-500/10 hover:text-red-500 rounded-[10px] transition-all flex items-center justify-center text-slate-400">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <form
                            id="admin-event-form"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    setIsUploading(true);
                                    const formData = new FormData(e.currentTarget);

                                    let finalImageUrl = eventPreview;
                                    const imageFile = formData.get('imageFile') as File;

                                    if (imageFile && imageFile.size > 0) {
                                        finalImageUrl = await uploadImage(imageFile);
                                        setEventPreview(finalImageUrl);
                                    }

                                    const data: any = {
                                        title: formData.get('title') as string,
                                        date: formData.get('date') as string,
                                        location: formData.get('location') as string,
                                        category: formData.get('category') as string,
                                        description: eventDescription,
                                        image: finalImageUrl,
                                        videoUrl: highlightsVideoURL,
                                        highlightsVideoURL: highlightsVideoURL,
                                        highlightsVideoPath: highlightsVideoPath,
                                        galleryImages: eventGallery
                                            .filter(item => item.url)
                                            .map(item => ({
                                                url: item.url,
                                                path: item.path,
                                                uploadedAt: new Date()
                                            })),
                                        price: Number(formData.get('price')),
                                        capacity: Number(formData.get('capacity')),
                                        status: formData.get('status') as any,
                                        registrationLink: (formData.get('registrationLink') as string) || '',
                                    };

                                    if (eventModal.mode === 'edit') {
                                        await updateEvent(eventModal.event.id, data);
                                    } else {
                                        await addEvent({ ...data, id: eventModal.event?.id, registeredCount: 0 });
                                    }
                                    setEventModal({ open: false });
                                } catch (error) {
                                    console.error("Error saving event:", error);
                                    alert("Failed to save event. Please try again.");
                                } finally {
                                    setIsUploading(false);
                                }
                            }}
                            className="flex-1 overflow-y-auto p-4 md:p-5 space-y-8 custom-scrollbar bg-white dark:bg-slate-900/50"
                        >
                            {/* NEW: IMAGE UPLOAD AT TOP */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm">photo_camera</span>
                                    Visual Branding
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                                    {/* Dropzone */}
                                    <div className="relative group cursor-pointer">
                                        <div className={`flex flex-col items-center justify-center w-full h-44 border-2 border-dashed rounded-[10px] transition-all duration-300 relative overflow-hidden ${
                                            isUploading ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/10 hover:border-primary hover:bg-primary/5 bg-slate-50 dark:bg-slate-800'
                                        }`}>
                                            {isUploading ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <span className="material-symbols-outlined animate-spin text-3xl text-primary">progress_activity</span>
                                                    <p className="text-xs font-semibold text-primary animate-pulse">Syncing Image Assets...</p>
                                                </div>
                                            ) : eventPreview ? (
                                                <>
                                                    <img src={eventPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-40 transition-opacity" />
                                                    <div className="relative z-10 flex flex-col items-center">
                                                        <div className="size-14 rounded-full bg-white/80 dark:bg-slate-900/80 flex items-center justify-center mb-3 border border-slate-200 dark:border-white/5 group-hover:scale-110 transition-transform backdrop-blur-sm shadow-xl">
                                                            <span className="material-symbols-outlined text-primary">image</span>
                                                        </div>
                                                        <p className="text-xs font-semibold text-slate-800 dark:text-white">Image Selected</p>
                                                        <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest bg-white/50 dark:bg-black/50 px-2 py-0.5 rounded-full">Click to Change</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="size-14 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center mb-3 border border-slate-200 dark:border-white/5 group-hover:scale-110 transition-transform">
                                                        <span className="material-symbols-outlined text-primary">add_a_photo</span>
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">Select Event Cover</p>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 uppercase tracking-widest">SVG, PNG, JPG accepted</p>
                                                </>
                                            )}
                                        </div>
                                        <label htmlFor="ev-imageFile" className="sr-only">Event Cover Image</label>
                                        <input
                                            id="ev-imageFile"
                                            type="file"
                                            name="imageFile"
                                            accept="image/*"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const objectUrl = URL.createObjectURL(file);
                                                    setEventPreview(objectUrl);
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                            disabled={isUploading}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6 pt-4">
                                <div className="md:col-span-2">
                                    <label htmlFor="ev-title" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Event Nomenclature</label>
                                    <input
                                        id="ev-title"
                                        type="text"
                                        name="title"
                                        defaultValue={eventModal.event?.title}
                                        required
                                        placeholder="Enter event name..."
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all duration-300"
                                    />
                                </div>

                                        <div className="space-y-2">
                                            <label htmlFor="ev-date" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-1">Date Schedule</label>
                                            <div className="relative group">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg group-focus-within:text-primary transition-colors">calendar_today</span>
                                                <input
                                                    id="ev-date"
                                                    type="date"
                                                    name="date"
                                                    defaultValue={eventModal.event?.date && !isNaN(Date.parse(eventModal.event.date)) ? new Date(eventModal.event.date).toISOString().split('T')[0] : eventModal.event?.date}
                                                    required
                                                    className="w-full pl-12 pr-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all [color-scheme:light] dark:[color-scheme:dark]"
                                                />
                                    </div>
                                </div>

                                        <div className="space-y-2">
                                            <label htmlFor="ev-location" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Geographic Target</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">location_on</span>
                                                <input
                                                    id="ev-location"
                                                    type="text"
                                                    name="location"
                                                    defaultValue={eventModal.event?.location}
                                                    required
                                                    placeholder="e.g. Manila Hotel"
                                                    className="w-full pl-12 pr-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                                />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="ev-category" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Category Segment</label>
                                    <select
                                        id="ev-category"
                                        name="category"
                                        defaultValue={eventModal.event?.category || 'Seminar'}
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary appearance-none outline-none transition-all cursor-pointer"
                                    >
                                        <option value="Seminar">Seminar</option>
                                        <option value="Workshop">Workshop</option>
                                        <option value="Conference">Conference</option>
                                        <option value="Webinar">Webinar</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="ev-status" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Operational Status</label>
                                    <select
                                        id="ev-status"
                                        name="status"
                                        defaultValue={eventModal.event?.status || 'upcoming'}
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary appearance-none outline-none transition-all cursor-pointer"
                                    >
                                        <option value="upcoming">Upcoming Stage</option>
                                        <option value="ongoing">Live / Ongoing</option>
                                        <option value="completed">Concluded</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="ev-price" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Pricing Matrix (₱)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">₱</span>
                                        <input
                                            id="ev-price"
                                            type="number"
                                            name="price"
                                            defaultValue={eventModal.event?.price || 0}
                                            min="0"
                                            className="w-full pl-10 pr-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="ev-capacity" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Participant Cap</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">groups</span>
                                        <input
                                            id="ev-capacity"
                                            type="number"
                                            name="capacity"
                                            defaultValue={eventModal.event?.capacity || 100}
                                            min="1"
                                            className="w-full pl-12 pr-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2 space-y-2">
                                    <label htmlFor="ev-registrationLink" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Registration Link</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 text-lg">link</span>
                                        <input
                                            id="ev-registrationLink"
                                            type="url"
                                            name="registrationLink"
                                            defaultValue={eventModal.event?.registrationLink || ''}
                                            placeholder="https://..."
                                            className="w-full pl-12 pr-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="md:col-span-2">
                                    <label htmlFor="ev-description" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block mb-2">Extensive Narrative</label>
                                    <RichTextEditor 
                                        value={eventDescription}
                                        onChange={setEventDescription}
                                        onImageUpload={async (file) => {
                                            const eventId = eventModal.event?.id || `new_${Date.now()}`;
                                            const { url } = await uploadFile(file, `events/${eventId}/narrative_images`);
                                            return url;
                                        }}
                                        placeholder="Describe the event outcomes and agenda with rich formatting..."
                                    />
                                </div>


                                {/* EVENT HIGHLIGHTS & GALLERY SECTION */}
                                <div className="md:col-span-2 pt-6 mt-2 border-t border-slate-200 dark:border-white/10 space-y-4">
                                    <h4 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary">perm_media</span>
                                        Media & Highlights
                                    </h4>
                                    
                                    <div className="space-y-8">
                                        {/* Video Section */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">Video Highlights</p>
                                                {highlightsVideoURL && (
                                                    <span className="text-[10px] font-semibold text-green-500 uppercase flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-sm">verified</span>
                                                        Uploaded
                                                    </span>
                                                )}
                                            </div>

                                            <div 
                                                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                                                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                                                onDrop={async (e) => {
                                                    e.preventDefault();
                                                    e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                                                    const file = e.dataTransfer.files[0];
                                                    if (file && file.type.startsWith('video/')) handleVideoUpload(file);
                                                }}
                                                className="relative group border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[10px] p-5 text-center transition-all bg-slate-50 dark:bg-slate-800/50 hover:border-primary/50 overflow-hidden"
                                            >
                                                {highlightsVideoURL ? (
                                                    <div className="space-y-4 relative z-10">
                                                        <div className="aspect-video w-full max-w-lg mx-auto rounded-[10px] overflow-hidden bg-black shadow-2xl relative group/player border border-white/10">
                                                            <video src={highlightsVideoURL} controls className="w-full h-full object-contain" />
                                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 flex justify-between items-center opacity-0 group-hover/player:opacity-100 transition-opacity">
                                                                <p className="text-[10px] text-white/60 font-medium truncate max-w-[200px]">{highlightsVideoPath?.split('/').pop()}</p>
                                                                <button 
                                                                    type="button"
                                                                    onClick={handleVideoDelete}
                                                                    className="bg-red-500 text-white px-3 py-1.5 rounded-[10px] shadow-xl hover:bg-red-600 transition-colors flex items-center gap-2 font-semibold text-[10px] uppercase"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                    Delete Highlights
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4 relative z-10">
                                                        <div className="w-16 h-16 bg-primary/10 rounded-[10px] flex items-center justify-center mx-auto text-primary group-hover:rotate-12 transition-transform">
                                                            <span className="material-symbols-outlined text-3xl">movie_edit</span>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Drag & drop your highlight reel</p>
                                                            <p className="text-xs text-slate-400 mt-1">MP4, WebM or MOV (Max 100MB)</p>
                                                        </div>
                                                        <div className="flex justify-center gap-2">
                                                            <button 
                                                                type="button" 
                                                                className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-white/10 rounded-[10px] text-[10px] font-semibold uppercase tracking-widest hover:bg-slate-50 transition-colors relative"
                                                            >
                                                                Browse Files
                                                                <label htmlFor="ev-videoFile" className="sr-only">Video Highlights File</label>
                                                                <input 
                                                                    id="ev-videoFile"
                                                                    type="file" 
                                                                    accept="video/*" 
                                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) handleVideoUpload(file);
                                                                    }}
                                                                />
                                                            </button>
                                                        </div>
                                                        {eventVideoProgress > 0 && eventVideoProgress < 100 && (
                                                            <div className="max-w-xs mx-auto pt-2">
                                                                <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-primary transition-all duration-300" style={{ width: `${eventVideoProgress}%` }}></div>
                                                                </div>
                                                                <p className="text-[10px] font-semibold text-primary uppercase mt-2 animate-pulse">Uploading {eventVideoProgress}%</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                {/* Background blur for texture */}
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full pointer-events-none"></div>
                                            </div>
                                        </div>

                                        {/* Gallery Grid */}
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-end">
                                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest block">Photo Gallery</p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-tighter">
                                                        {eventGallery.filter(i => i.progress === 100).length} of {eventGallery.length} Ready
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                {/* Upload Button */}
                                                <div 
                                                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                                                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                                                    onDrop={async (e) => {
                                                        e.preventDefault();
                                                        e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                                                        handleGalleryUpload(Array.from(e.dataTransfer.files));
                                                    }}
                                                    className="aspect-square border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[10px] flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer relative group"
                                                >
                                                    <label htmlFor="ev-galleryFiles" className="sr-only">Gallery Photos</label>
                                                    <input 
                                                        id="ev-galleryFiles"
                                                        type="file" 
                                                        multiple 
                                                        accept="image/*" 
                                                        className="absolute inset-0 opacity-0 cursor-pointer z-20" 
                                                        onChange={(e) => handleGalleryUpload(Array.from(e.target.files || []))}
                                                    />
                                                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 group-hover:text-primary group-hover:scale-110 transition-all">
                                                        <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
                                                    </div>
                                                    <span className="text-[9px] font-semibold text-slate-500 group-hover:text-primary uppercase tracking-wider">Add Photos</span>
                                                </div>

                                                {/* Images */}
                                                {eventGallery.map((img, idx) => (
                                                    <div key={img.id || idx} className="aspect-square rounded-[10px] overflow-hidden bg-slate-100 dark:bg-slate-800/50 relative group shadow-sm border border-slate-200 dark:border-white/5">
                                                        {img.url ? (
                                                            <>
                                                                <img src={img.url} alt="" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent opacity-0 group-hover:opacity-100 transition-opacity p-2 flex flex-col justify-end">
                                                                    <button 
                                                                        type="button"
                                                                        onClick={() => handleGalleryDelete(img.path)}
                                                                        className="w-full bg-red-500 hover:bg-red-600 text-white py-1.5 rounded-[10px] shadow-xl transition-all flex items-center justify-center gap-1 font-semibold text-[9px] uppercase"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm">delete</span>
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <div className="w-full h-full flex flex-col items-center justify-center p-4">
                                                                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                                                                    <div 
                                                                        className="h-full bg-primary transition-all duration-300" 
                                                                        style={{ width: `${img.progress}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-primary uppercase animate-pulse">{img.progress}%</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-white/5 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
                            <button
                                type="button"
                                onClick={() => setEventModal({ open: false })}
                                className="px-6 py-3 text-xs font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Abort
                            </button>
                            <button
                                type="submit"
                                form="admin-event-form"
                                disabled={isUploading || uploadingCount > 0}
                                className="px-8 py-3 text-xs font-semibold uppercase tracking-widest text-white bg-primary hover:bg-primary/90 rounded-[10px] shadow-[0_10px_20px_-5px_rgba(var(--primary-rgb),0.3)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all active:scale-95"
                            >
                                {isUploading || uploadingCount > 0 ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                        {uploadingCount > 0 ? `Syncing Assets (${uploadingCount})...` : 'Persisting...'}
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">{eventModal.mode === 'edit' ? 'save' : 'add_task'}</span>
                                        {eventModal.mode === 'edit' ? 'Update Record' : 'Registry Event'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {announcementModal.open && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setAnnouncementModal({ open: false })}></div>
                    <div className="bg-white dark:bg-[#1E293B] rounded-[10px] w-full max-w-2xl max-h-[95vh] flex flex-col relative z-50 shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] animate-modal-pop border border-white/10 overflow-hidden">
                        {/* Header */}
                        <div className="p-4 border-b border-slate-200 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 relative z-10">
                            <div>
                                <h3 className="text-xl font-semibold uppercase tracking-tight text-slate-900 dark:text-white leading-none mb-1">
                                    {announcementModal.announcement ? 'Broadcast Module: Edit' : 'Broadcast Module: New'}
                                </h3>
                                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest leading-none">Management Terminal v2.1</p>
                            </div>
                            <button onClick={() => setAnnouncementModal({ open: false })} className="size-10 hover:bg-red-500/10 hover:text-red-500 rounded-[10px] transition-all flex items-center justify-center text-slate-400 group">
                                <span className="material-symbols-outlined text-xl group-hover:rotate-90 transition-transform">close</span>
                            </button>
                        </div>

                        <form
                            id="announcement-terminal-form"
                            onSubmit={async (e) => {
                                e.preventDefault();
                                try {
                                    setIsUploading(true);
                                    const formData = new FormData(e.currentTarget);
                                    let finalImageUrl = announcementPreview;
                                    const imageFile = formData.get('announcementImageFile') as File;

                                    if (imageFile && imageFile.size > 0) {
                                        finalImageUrl = await uploadImage(imageFile);
                                        setAnnouncementPreview(finalImageUrl);
                                    }

                                    const data = {
                                        title: formData.get('title') as string,
                                        category: formData.get('category') as string,
                                        date: formData.get('date') as string,
                                        summary: formData.get('summary') as string,
                                        image: finalImageUrl,
                                        link: formData.get('link') as string || undefined,
                                    };
                                    if (announcementModal.announcement) {
                                        await updateAnnouncement(announcementModal.announcement.id, data);
                                    } else {
                                        await addAnnouncement(data);
                                    }
                                    setAnnouncementModal({ open: false });
                                } catch (error) {
                                    console.error("Error saving announcement:", error);
                                    alert("Failed to save announcement. Please try again.");
                                } finally {
                                    setIsUploading(false);
                                }
                            }}
                            className="flex-1 overflow-y-auto p-4 md:p-5 space-y-8 custom-scrollbar bg-white dark:bg-slate-900/50"
                        >
                            {/* Section: Core Identity */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-2 bg-primary rounded-full animate-pulse"></div>
                                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Transmission Details</h4>
                                </div>
                                
                                <div className="space-y-2">
                                    <label htmlFor="ann-title" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">title</span> Broadcast Title
                                    </label>
                                    <input
                                        id="ann-title"
                                        type="text"
                                        name="title"
                                        defaultValue={announcementModal.announcement?.title}
                                        required
                                        placeholder="Enter headline message..."
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all duration-300"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label htmlFor="ann-category" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">category</span> Category Tag
                                        </label>
                                        <input
                                            id="ann-category"
                                            type="text"
                                            name="category"
                                            defaultValue={announcementModal.announcement?.category}
                                            required
                                            placeholder="e.g., Major Event, Updates"
                                            className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all duration-300"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label htmlFor="ann-date" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <span className="material-symbols-outlined text-sm">event</span> Timestamp Label
                                        </label>
                                        <input
                                            id="ann-date"
                                            type="text"
                                            name="date"
                                            defaultValue={announcementModal.announcement?.date}
                                            required
                                            placeholder="e.g., Sept 2-4, 2025"
                                            className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all duration-300"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label htmlFor="ann-summary" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">subject</span> Brief Summary
                                    </label>
                                    <textarea
                                        id="ann-summary"
                                        name="summary"
                                        defaultValue={announcementModal.announcement?.summary}
                                        required
                                        rows={4}
                                        placeholder="The core message of this broadcast..."
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all duration-300 resize-none"
                                    />
                                </div>
                                
                                <div className="space-y-2">
                                    <label htmlFor="ann-link" className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <span className="material-symbols-outlined text-sm">link</span> External Link (Optional)
                                    </label>
                                    <input
                                        id="ann-link"
                                        type="url"
                                        name="link"
                                        defaultValue={announcementModal.announcement?.link}
                                        placeholder="https://..."
                                        className="w-full px-5 py-4 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none transition-all duration-300"
                                    />
                                </div>
                            </div>

                            {/* Section: Visual Asset */}
                            <div className="space-y-4 pt-4">
                                <div className="flex items-center gap-3">
                                    <div className="size-2 bg-primary rounded-full animate-pulse"></div>
                                    <h4 className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">Visual Identification</h4>
                                </div>

                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[10px] border border-slate-200 dark:border-white/5 space-y-4">
                                    <div className="flex flex-col md:flex-row gap-5">
                                        <div className="flex-1 space-y-4">
                                            <div className="relative group overflow-hidden rounded-[10px] aspect-video bg-slate-200 dark:bg-white/5 border border-slate-300 dark:border-white/10 flex items-center justify-center">
                                                {announcementPreview ? (
                                                    <>
                                                        <img src={announcementPreview} alt="Preview" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                            <button 
                                                                type="button"
                                                                onClick={() => setAnnouncementPreview('')}
                                                                className="size-10 bg-rose-500 text-white rounded-[10px] shadow-xl flex items-center justify-center hover:scale-110 transition-all"
                                                            >
                                                                <span className="material-symbols-outlined">delete</span>
                                                            </button>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                                        <span className="material-symbols-outlined text-4xl">image</span>
                                                        <p className="text-[10px] font-semibold uppercase tracking-widest">No Asset Loaded</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="w-full md:w-64 space-y-4">
                                            <div className="relative">
                                                <label htmlFor="ann-imageFile" className="sr-only">Announcement Image</label>
                                                <input
                                                    id="ann-imageFile"
                                                    type="file"
                                                    name="announcementImageFile"
                                                    accept="image/*"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={async (e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const reader = new FileReader();
                                                            reader.onloadend = () => setAnnouncementPreview(reader.result as string);
                                                            reader.readAsDataURL(file);
                                                        }
                                                    }}
                                                />
                                                <div className="px-4 py-4 rounded-[10px] border-2 border-dashed border-slate-300 dark:border-white/10 bg-white dark:bg-slate-900/50 flex flex-col items-center justify-center gap-2 hover:border-primary/50 hover:bg-primary/5 transition-all text-center">
                                                    <span className="material-symbols-outlined text-slate-400">cloud_upload</span>
                                                    <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-widest">Upload Key Visual</p>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-slate-400 font-semibold uppercase leading-relaxed">
                                                Recommended: 16:9 Aspect Ratio. Max size 5MB. Support for WebP, JPG, PNG.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </form>

                        {/* Footer */}
                        <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-slate-800/50 flex justify-end items-center gap-4">
                            <button 
                                type="button"
                                onClick={() => setAnnouncementModal({ open: false })} 
                                className="px-6 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                            >
                                Abort Broadcast
                            </button>
                            <button
                                form="announcement-terminal-form"
                                type="submit"
                                disabled={isUploading}
                                className="px-8 py-3 text-[10px] font-semibold uppercase tracking-widest text-white bg-primary hover:bg-primary/90 rounded-[10px] shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center gap-2 transition-all active:scale-95"
                            >
                                {isUploading ? (
                                    <>
                                        <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                                        Syncing Broadcast...
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-sm">send</span>
                                        {announcementModal.announcement ? 'Commit Update' : 'Initialize Broadcast'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </main>

        {/* Toast System */}
        {toast && (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[300] animate-bounce-in">
                <div className={`px-6 py-4 rounded-[10px] shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
                    toast?.type === 'error' ? 'bg-red-500/90 border-red-400 text-white' : 
                    toast?.type === 'info' ? 'bg-slate-800/90 border-slate-700 text-white' :
                    'bg-primary/90 border-primary/50 text-white'
                }`}>
                    <span className="material-symbols-outlined">
                        {toast?.type === 'error' ? 'error' : toast?.type === 'info' ? 'info' : 'check_circle'}
                    </span>
                    <p className="text-sm font-semibold tracking-tight">{toast?.message}</p>
                    <button onClick={() => setToast(null)} className="ml-2 hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                </div>
            </div>
        )}

            {/* Password-gated Delete Confirmation Modal */}
            {pendingDelete && (
                <div className="fixed inset-0 z-[400] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !deletePasswordVerifying && closeDeleteConfirm()}></div>
                    <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-md relative z-10 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-modal-pop">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center gap-3 bg-rose-50 dark:bg-rose-500/5">
                            <div className="size-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                                <span className="material-symbols-outlined text-xl">delete_forever</span>
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Confirm Deletion</h3>
                                <p className="text-[10px] text-slate-400 mt-0.5">This action is permanent and cannot be undone.</p>
                            </div>
                        </div>
                        <form
                            onSubmit={(e) => { e.preventDefault(); confirmPendingDelete(); }}
                            className="p-6 space-y-4"
                        >
                            <p className="text-sm text-slate-700 dark:text-slate-300">{pendingDelete.message}</p>
                            <div>
                                <label htmlFor="ad-deletePassword" className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1.5">Enter your password to confirm *</label>
                                <div className="relative">
                                    <input
                                        id="ad-deletePassword"
                                        name="ad-deletePassword"
                                        type={showDeletePassword ? 'text' : 'password'}
                                        autoFocus
                                        value={deletePassword}
                                        onChange={(e) => { setDeletePassword(e.target.value); setDeletePasswordError(''); }}
                                        className="w-full px-4 py-3 pr-10 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/40 focus:border-rose-500 outline-none transition-all"
                                        placeholder="Your admin password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowDeletePassword(v => !v)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                        tabIndex={-1}
                                    >
                                        <span className="material-symbols-outlined text-base">{showDeletePassword ? 'visibility_off' : 'visibility'}</span>
                                    </button>
                                </div>
                                {deletePasswordError && (
                                    <p className="text-[11px] font-semibold text-red-600 mt-1.5">{deletePasswordError}</p>
                                )}
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={closeDeleteConfirm}
                                    disabled={deletePasswordVerifying}
                                    className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all disabled:opacity-40"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={deletePasswordVerifying || !deletePassword}
                                    className="px-4 py-2.5 text-xs font-black uppercase tracking-wider bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-md flex items-center gap-2"
                                >
                                    {deletePasswordVerifying && <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-3.5" />}
                                    {deletePasswordVerifying ? 'Verifying...' : 'Delete Permanently'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Account Profile Modal */}
            {isProfileModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity duration-300" onClick={() => setIsProfileModalOpen(false)} />
                    
                    <div className="bg-white dark:bg-[#1E293B] rounded-[16px] border border-slate-200 dark:border-white/10 shadow-2xl w-full max-w-3xl overflow-hidden z-[310] relative flex flex-col md:flex-row animate-modal-pop text-left">
                        
                        {/* Close button */}
                        <button 
                            type="button"
                            onClick={() => setIsProfileModalOpen(false)}
                            className="absolute right-4 top-4 p-2 rounded-[10px] bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>

                        {/* Left Column: Avatar & Summary Info */}
                        <div className="w-full md:w-2/5 p-6 bg-slate-50/50 dark:bg-slate-800/40 border-r border-slate-200 dark:border-white/5 flex flex-col items-center justify-center text-center">
                            <div className="relative group mb-4">
                                {profileImgUrl ? (
                                    <img src={profileImgUrl} className="w-24 h-24 rounded-full object-cover shadow-lg border-2 border-white dark:border-slate-700" alt="Profile" />
                                ) : (
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-blue-600 dark:from-slate-700 dark:to-slate-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                                        {profileName?.substring(0, 2).toUpperCase() || 'AD'}
                                    </div>
                                )}
                                
                                {/* Photo Upload Overlay */}
                                <label className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold uppercase tracking-wider">
                                    <span className="material-symbols-outlined text-lg mb-0.5">cloud_upload</span>
                                    {isUploadingImage ? 'Uploading...' : 'Upload'}
                                    <input 
                                        id="ad-profileImage"
                                        name="ad-profileImage"
                                        type="file" 
                                        accept="image/*" 
                                        onChange={handleAdminImageUpload} 
                                        className="hidden" 
                                        disabled={isUploadingImage}
                                    />
                                </label>
                            </div>

                            <h3 className="text-base font-bold text-slate-900 dark:text-white truncate max-w-full">
                                {profileName || 'Master Admin'}
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate max-w-full mb-4">
                                {profileEmail || user?.email || 'admin@paha.com'}
                            </p>

                            <div className="flex flex-wrap gap-1.5 justify-center">
                                <span className={`text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                                    adminRole === 'super_admin' ? 'bg-indigo-500/10 text-indigo-500 border border-indigo-500/20' :
                                    adminRole === 'admin' ? 'bg-primary/10 text-primary border border-primary/20' :
                                    'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                                }`}>
                                    {adminRole?.replace('_', ' ') || 'Admin'}
                                </span>
                                <span className="text-[9px] font-bold text-emerald-500 uppercase flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                    <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                                    Synced
                                </span>
                            </div>
                        </div>

                        {/* Right Column: Account & Password Edit Forms */}
                        <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[85vh] md:max-h-[550px] no-scrollbar">
                            <h2 className="text-lg font-bold text-slate-950 dark:text-white mb-6 uppercase tracking-wider">Account Settings</h2>
                            
                            {/* Profile Details Edit Form */}
                            <form onSubmit={handleUpdateProfile} className="space-y-4 pb-6 border-b border-slate-100 dark:border-white/5">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Update Info</h3>
                                
                                {profileMessage && (
                                    <div className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-[8px]">{profileMessage}</div>
                                )}
                                {profileError && (
                                    <div className="text-[11px] font-semibold text-red-600 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-[8px]">{profileError}</div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="ad-profileName" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Display Name</label>
                                        <input 
                                            id="ad-profileName"
                                            name="ad-profileName"
                                            type="text" 
                                            value={profileName}
                                            onChange={(e) => setProfileName(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="Full Name"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="ad-profileEmail" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
                                        <input 
                                            id="ad-profileEmail"
                                            name="ad-profileEmail"
                                            type="email" 
                                            value={profileEmail}
                                            onChange={(e) => setProfileEmail(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="admin@paha.com"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="ad-profileBirthday" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Birthday</label>
                                        <input 
                                            id="ad-profileBirthday"
                                            name="ad-profileBirthday"
                                            type="date" 
                                            value={profileBirthday}
                                            onChange={(e) => setProfileBirthday(e.target.value)}
                                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="ad-profilePhone" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Phone Number</label>
                                        <div className="relative flex items-center w-full">
                                            <div className="absolute left-3 flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-450 select-none pointer-events-none">
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
                                                id="ad-profilePhone"
                                                name="ad-profilePhone"
                                                type="tel" 
                                                value={profilePhone ? (profilePhone.startsWith('+63') ? profilePhone.slice(3) : profilePhone.startsWith('63') && profilePhone.length === 12 ? profilePhone.slice(2) : profilePhone.startsWith('0') && profilePhone.length === 11 ? profilePhone.slice(1) : profilePhone) : ''}
                                                onChange={(e) => {
                                                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    setProfilePhone(cleaned);
                                                }}
                                                className="w-full text-xs font-semibold pl-16 pr-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                                placeholder="900 000 0000"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="w-full py-2.5 rounded-[8px] bg-primary text-white font-bold text-xs uppercase tracking-widest hover:bg-primary/95 shadow-md shadow-primary/10 transition-all disabled:opacity-50"
                                >
                                    {isSavingProfile ? 'Updating Info...' : 'Save Profile Info'}
                                </button>
                            </form>

                            {/* Password Change Form */}
                            <form onSubmit={handleUpdatePassword} className="space-y-4 pt-6">
                                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">Change Password</h3>
                                
                                {passwordMessage && (
                                    <div className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-[8px]">{passwordMessage}</div>
                                )}
                                {passwordError && (
                                    <div className="text-[11px] font-semibold text-red-600 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-[8px]">{passwordError}</div>
                                )}

                                <div>
                                    <label htmlFor="ad-currentPassword" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Current Password</label>
                                    <div className="relative">
                                        <input 
                                            id="ad-currentPassword"
                                            name="ad-currentPassword"
                                            type={showCurrentPassword ? "text" : "password"} 
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full text-xs font-semibold pl-3 pr-10 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-base">
                                                {showCurrentPassword ? "visibility" : "visibility_off"}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="ad-newPassword" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">New Password</label>
                                    <div className="relative">
                                        <input 
                                            id="ad-newPassword"
                                            name="ad-newPassword"
                                            type={showNewPassword ? "text" : "password"} 
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full text-xs font-semibold pl-3 pr-10 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-base">
                                                {showNewPassword ? "visibility" : "visibility_off"}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="ad-confirmPassword" className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">Confirm New Password</label>
                                    <div className="relative">
                                        <input 
                                            id="ad-confirmPassword"
                                            name="ad-confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"} 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full text-xs font-semibold pl-3 pr-10 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder="••••••••"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-base">
                                                {showConfirmPassword ? "visibility" : "visibility_off"}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="w-full py-2.5 rounded-[8px] bg-indigo-600 text-white font-bold text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-md shadow-indigo-600/10 transition-all disabled:opacity-50"
                                >
                                    {isChangingPassword ? 'Changing Password...' : 'Change Password'}
                                </button>
                            </form>

                        </div>

                    </div>
                </div>
            )}

            {/* Modern Inquiry Details Modal at Root Level */}
            {selectedMessage && (() => {
                const status = selectedMessage.status || 'unread';
                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-slate-800 rounded-[16px] max-w-lg w-full p-6 shadow-2xl relative border border-slate-200 dark:border-white/5 animate-scale-up text-left">
                            <button
                                onClick={() => setSelectedMessage(null)}
                                className="absolute top-4 right-4 size-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                            >
                                <span className="material-symbols-outlined text-lg">close</span>
                            </button>

                            <div className="mb-4">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    status === 'replied' ? 'bg-emerald-500/10 text-emerald-500' :
                                    status === 'read' ? 'bg-blue-500/10 text-blue-500' : 'bg-amber-500/10 text-amber-500'
                                }`}>
                                    <span className={`size-1.5 rounded-full ${
                                        status === 'replied' ? 'bg-emerald-500' :
                                        status === 'read' ? 'bg-blue-500' : 'bg-amber-500'
                                    }`} />
                                    {status.toUpperCase()}
                                </span>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-2">
                                    Inquiry Details
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                                    Received on {new Date(selectedMessage.date).toLocaleString(undefined, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>

                            <div className="space-y-4 border-t border-b border-slate-100 dark:border-white/5 py-4 my-4">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Sender</p>
                                    <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
                                        {selectedMessage.firstName} {selectedMessage.lastName}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Email Address</p>
                                    <a href={`mailto:${selectedMessage.email}`} className="text-sm font-semibold text-primary hover:underline mt-0.5 block">
                                        {selectedMessage.email}
                                    </a>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Message Content</p>
                                    <div className="mt-1 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-[8px] text-xs leading-relaxed text-slate-700 dark:text-slate-300 max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
                                        {selectedMessage.message}
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                                <div className="flex gap-2">
                                    {status !== 'replied' ? (
                                        <button
                                            onClick={() => handleMarkReplied(selectedMessage)}
                                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-sm">check_circle</span>
                                            Mark Replied
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => handleMarkUnread(selectedMessage)}
                                            className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5"
                                        >
                                            <span className="material-symbols-outlined text-sm">mark_email_unread</span>
                                            Mark Unread
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleDelete(selectedMessage.id)}
                                        className="px-4 py-2 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-[8px] text-xs font-bold transition-all flex items-center gap-1.5"
                                    >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                        Delete
                                    </button>
                                </div>
                                <button
                                    onClick={() => setSelectedMessage(null)}
                                    className="px-4 py-2 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-[8px] text-xs font-bold transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}

    </div>
</div>
);
};

// ─────────────────────────────────────────────────────────────────────────────
// ACCESS CONTROL PANEL — Super Admin only
// ─────────────────────────────────────────────────────────────────────────────
const FIREBASE_API_KEY = 'AIzaSyCk55QWOf76a4eTYXD2RNQCWA7WeCVxrNI';

const AccessControlPanel: React.FC<{
    acUsers: any[]; setAcUsers: React.Dispatch<React.SetStateAction<any[]>>;
    acLoading: boolean; setAcLoading: (v: boolean) => void;
    acEditUser: any; setAcEditUser: (u: any) => void;
    acEditRole: AdminRole; setAcEditRole: (r: AdminRole) => void;
    acEditSections: string[]; setAcEditSections: React.Dispatch<React.SetStateAction<string[]>>;
    acSaving: boolean; setAcSaving: (v: boolean) => void;
}> = ({ acUsers, setAcUsers, acLoading, setAcLoading, acEditUser, setAcEditUser, acEditRole, setAcEditRole, acEditSections, setAcEditSections, acSaving, setAcSaving }) => {

    const [createForm, setCreateForm] = useState({ email: '', password: '', displayName: '', role: 'admin' as AdminRole, sections: ['dashboard'] as string[] });
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');
    const [createSuccess, setCreateSuccess] = useState('');

    useEffect(() => {
        setAcLoading(true);
        getDocs(collection(db, 'users')).then(snap => {
            setAcUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
            setAcLoading(false);
        });
    }, []);

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');
        setCreateSuccess('');
        if (!createForm.email || !createForm.password || createForm.sections.length === 0) {
            setCreateError('Email, password, and at least one section are required.');
            return;
        }
        setCreating(true);
        try {
            // Create Firebase Auth account via REST API (no sign-out of current user)
            const res = await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: createForm.email, password: createForm.password, returnSecureToken: true }),
                }
            );
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const uid = data.localId;

            // Write Firestore profile
            const profile = {
                email: createForm.email,
                displayName: createForm.displayName || createForm.email.split('@')[0],
                adminRole: createForm.role,
                allowedSections: createForm.sections,
                isAdmin: createForm.role !== 'viewer',
                createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', uid), profile);

            setAcUsers(prev => [...prev, { uid, ...profile }]);
            setCreateSuccess(`Account created for ${createForm.email}`);
            setCreateForm({ email: '', password: '', displayName: '', role: 'admin', sections: ['dashboard'] });
        } catch (err: any) {
            setCreateError(err.message || 'Failed to create account.');
        }
        setCreating(false);
    };

    const toggleCreateSection = (id: string) =>
        setCreateForm(prev => ({
            ...prev,
            sections: prev.sections.includes(id) ? prev.sections.filter(s => s !== id) : [...prev.sections, id],
        }));

    const openEdit = (u: any) => {
        setAcEditUser(u);
        setAcEditRole(u.adminRole || (u.role === 'admin' ? 'admin' : 'viewer'));
        setAcEditSections(u.allowedSections || []);
    };

    const savePermissions = async () => {
        if (!acEditUser) return;
        setAcSaving(true);
        await setDoc(doc(db, 'users', acEditUser.uid), {
            ...acEditUser,
            adminRole: acEditRole,
            allowedSections: acEditRole === 'admin' ? acEditSections : acEditSections,
            isAdmin: acEditRole !== 'viewer',
        }, { merge: true });
        setAcUsers(prev => prev.map(u => u.uid === acEditUser.uid
            ? { ...u, adminRole: acEditRole, allowedSections: acEditSections }
            : u
        ));
        setAcSaving(false);
        setAcEditUser(null);
    };

    const toggleSection = (id: string) => {
        setAcEditSections(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        );
    };

    const ROLE_COLORS: Record<string, string> = {
        super_admin: 'bg-primary/10 text-primary border-primary/20',
        admin: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        viewer: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
    };

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Access <span className="text-primary">Control</span></h1>
                <p className="text-slate-400 text-sm mt-1">Manage admin roles and section permissions.</p>
            </div>

            {/* Create New User Form */}
            <div className="bg-white dark:bg-slate-900/60 rounded-[10px] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary">person_add</span>
                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Register New Admin / Viewer</h3>
                </div>
                <form onSubmit={handleCreateUser} className="p-4 space-y-4">
                    {/* Basic info row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="ac-create-displayName" className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Display Name</label>
                            <input
                                id="ac-create-displayName"
                                type="text"
                                placeholder="e.g. Secretariat"
                                value={createForm.displayName}
                                onChange={e => setCreateForm(p => ({ ...p, displayName: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="ac-create-email" className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email Address *</label>
                            <input
                                id="ac-create-email"
                                type="email"
                                placeholder="secretariat@paha.org.ph"
                                value={createForm.email}
                                onChange={e => setCreateForm(p => ({ ...p, email: e.target.value }))}
                                required
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>
                        <div>
                            <label htmlFor="ac-create-password" className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Password *</label>
                            <input
                                id="ac-create-password"
                                type="password"
                                placeholder="Min. 6 characters"
                                value={createForm.password}
                                onChange={e => setCreateForm(p => ({ ...p, password: e.target.value }))}
                                required
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-primary/50 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Role selector */}
                    <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2">Role *</p>
                        <div className="flex gap-3">
                            {([
                                { value: 'admin', label: 'Admin', sub: 'Full edit on assigned sections', icon: 'manage_accounts', color: 'bg-emerald-500' },
                                { value: 'viewer', label: 'Viewer', sub: 'Read-only on assigned sections', icon: 'visibility', color: 'bg-slate-500' },
                            ] as { value: AdminRole; label: string; sub: string; icon: string; color: string }[]).map(r => (
                                <label key={r.value} htmlFor={`ac-create-role-${r.value}`} className={`flex-1 flex items-center gap-3 p-4 rounded-[10px] border-2 cursor-pointer transition-all ${createForm.role === r.value ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/10 hover:border-slate-300'}`}>
                                    <input id={`ac-create-role-${r.value}`} type="radio" name="role" value={r.value} checked={createForm.role === r.value} onChange={() => setCreateForm(p => ({ ...p, role: r.value }))} className="hidden" />
                                    <div className={`size-9 rounded-[10px] ${r.color} flex items-center justify-center text-white shrink-0`}>
                                        <span className="material-symbols-outlined text-lg">{r.icon}</span>
                                    </div>
                                    <div>
                                        <div className={`font-black text-sm ${createForm.role === r.value ? 'text-primary' : 'text-slate-700 dark:text-white/70'}`}>{r.label}</div>
                                        <div className="text-[10px] text-slate-400">{r.sub}</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Section checkboxes */}
                    <div>
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Allowed Sections *</p>
                                <button type="button" onClick={() => setCreateForm(p => ({ ...p, sections: p.sections.length === ALL_SECTIONS.length ? [] : ALL_SECTIONS.map(s => s.id) }))} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                    {createForm.sections.length === ALL_SECTIONS.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {ALL_SECTIONS.map(s => (
                                    <label key={s.id} htmlFor={`ac-create-section-${s.id}`} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border cursor-pointer transition-all ${createForm.sections.includes(s.id) ? 'bg-primary/5 border-primary/30 text-primary' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/30 hover:border-slate-300'}`}>
                                        <input id={`ac-create-section-${s.id}`} type="checkbox" className="hidden" checked={createForm.sections.includes(s.id)} onChange={() => toggleCreateSection(s.id)} />
                                    <span className={`size-4 rounded flex items-center justify-center shrink-0 border transition-all ${createForm.sections.includes(s.id) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                                        {createForm.sections.includes(s.id) && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                    </span>
                                    <span className="text-xs font-semibold">{s.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {createError && <p className="text-sm text-red-500 font-semibold flex items-center gap-2"><span className="material-symbols-outlined text-base">error</span>{createError}</p>}
                    {createSuccess && <p className="text-sm text-emerald-500 font-semibold flex items-center gap-2"><span className="material-symbols-outlined text-base">check_circle</span>{createSuccess}</p>}

                    <div className="flex justify-end">
                        <button type="submit" disabled={creating} className="px-8 py-3 bg-primary text-white rounded-[10px] font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50">
                            <span className="material-symbols-outlined text-base">{creating ? 'hourglass_empty' : 'person_add'}</span>
                            {creating ? 'Creating...' : 'Create Account'}
                        </button>
                    </div>
                </form>
            </div>

            {/* Role legend */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                    { role: 'Super Admin', icon: 'shield_person', desc: 'Full access to all sections and settings. Cannot be restricted.', color: 'bg-primary/10 border-primary/20 text-primary' },
                    { role: 'Admin', icon: 'manage_accounts', desc: 'Full edit access to assigned sections only.', color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' },
                    { role: 'Viewer', icon: 'visibility', desc: 'Read-only access to assigned sections. Cannot create, edit, or delete.', color: 'bg-slate-500/10 border-slate-500/20 text-slate-500' },
                ].map((r, i) => (
                    <div key={i} className={`rounded-[10px] border p-5 ${r.color}`}>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="material-symbols-outlined text-xl">{r.icon}</span>
                            <span className="font-black text-sm uppercase tracking-wider">{r.role}</span>
                        </div>
                        <p className="text-xs opacity-70 leading-relaxed">{r.desc}</p>
                    </div>
                ))}
            </div>

            {/* Users table */}
            <div className="bg-white dark:bg-slate-900/60 rounded-[10px] border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-black text-slate-900 dark:text-white text-sm uppercase tracking-tight">Admin Users</h3>
                    <span className="text-xs text-slate-400">{acUsers.length} user{acUsers.length !== 1 ? 's' : ''}</span>
                </div>
                {acLoading ? (
                    <div className="py-12 text-center text-slate-400">
                        <span className="animate-spin border-4 border-primary/20 border-t-primary rounded-full w-8 h-8 block mx-auto mb-3"></span>
                        Loading users...
                    </div>
                ) : acUsers.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-sm">No users found in the system.</div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-white/5">
                        {acUsers.map(u => {
                            const role: string = u.adminRole || (u.role === 'admin' ? 'admin' : 'viewer');
                            return (
                                <div key={u.uid} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors">
                                    <div className="flex items-center gap-3">
                                        {u.image ? (
                                            <img src={u.image} alt={u.displayName} className="size-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="size-8 rounded-full bg-gradient-to-tr from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {(u.displayName || u.email || 'AD').substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-900 dark:text-white">{u.displayName || 'No Name'}</h4>
                                            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">{u.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${ROLE_COLORS[role] || 'bg-slate-500/10 text-slate-500 border-slate-500/20'}`}>
                                            {role}
                                        </span>
                                        {u.allowedSections && (
                                            <span className="text-[10px] text-slate-400 font-bold hidden md:inline">
                                                {u.allowedSections.length} section{u.allowedSections.length !== 1 ? 's' : ''} allowed
                                            </span>
                                        )}
                                        <button
                                            onClick={() => openEdit(u)}
                                            className="p-1.5 rounded-[8px] bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-primary dark:hover:text-white border border-slate-200 dark:border-white/5 transition-all hover:border-primary/20 hover:scale-105 active:scale-95 flex items-center justify-center"
                                        >
                                            <span className="material-symbols-outlined text-base">edit</span>
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Permissions Modal */}
            {acEditUser && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-white/10 rounded-[10px] max-w-lg w-full p-6 shadow-2xl relative animate-scale-up text-left">
                        <button onClick={() => setAcEditUser(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white">
                            <span className="material-symbols-outlined text-base">close</span>
                        </button>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-4">Edit Section Permissions</h3>
                        <p className="text-xs text-slate-400 mb-6">User: <strong className="text-slate-600 dark:text-white">{acEditUser.displayName || acEditUser.email}</strong></p>

                        <div className="mb-6">
                            <label htmlFor="ac-edit-role" className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Role</label>
                            <div className="flex gap-2" id="ac-edit-role">
                                {(['admin', 'viewer'] as AdminRole[]).map(r => (
                                    <button
                                        key={r}
                                        onClick={() => setAcEditRole(r)}
                                        className={`flex-1 py-3 rounded-[10px] font-black text-xs uppercase tracking-widest border transition-all ${acEditRole === r ? (r === 'admin' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25' : 'bg-slate-700 text-white border-slate-700') : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/30 hover:border-slate-400'}`}
                                    >
                                        {r === 'admin' ? 'Admin (Edit)' : 'Viewer (Read-Only)'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Section checkboxes */}
                        <div className="mb-6">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allowed Sections</p>
                                <button onClick={() => setAcEditSections(acEditSections.length === ALL_SECTIONS.length ? [] : ALL_SECTIONS.map(s => s.id))} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                                    {acEditSections.length === ALL_SECTIONS.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                {ALL_SECTIONS.map(s => (
                                    <label key={s.id} htmlFor={`ac-edit-section-${s.id}`} className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border cursor-pointer transition-all ${acEditSections.includes(s.id) ? 'bg-primary/5 border-primary/30 text-primary' : 'border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/30 hover:border-slate-300'}`}>
                                        <input id={`ac-edit-section-${s.id}`} type="checkbox" className="hidden" checked={acEditSections.includes(s.id)} onChange={() => toggleSection(s.id)} />
                                        <span className={`size-4 rounded flex items-center justify-center shrink-0 border transition-all ${acEditSections.includes(s.id) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/20'}`}>
                                            {acEditSections.includes(s.id) && <span className="material-symbols-outlined text-white text-[12px]">check</span>}
                                        </span>
                                        <span className="text-xs font-semibold">{s.label}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setAcEditUser(null)} className="flex-1 py-3 rounded-[10px] border border-slate-200 dark:border-white/10 text-slate-500 dark:text-white/30 font-black text-xs uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-white/5 transition-all">Cancel</button>
                            <button onClick={savePermissions} disabled={acSaving} className="flex-1 py-3 rounded-[10px] bg-primary text-white font-black text-xs uppercase tracking-widest hover:bg-primary/90 transition-all shadow-lg shadow-primary/25 disabled:opacity-50">
                                {acSaving ? 'Saving...' : 'Save Permissions'}
                            </button>
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
};

export default AdminDashboard;
