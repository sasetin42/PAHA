import React, { useState, useMemo, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import type { MemberProfile } from '../context/AdminContext';
import { getCoordinates } from '../utils/geocoding';
import { cleanPhoneInput, formatPhoneForDB } from '../utils/phone';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, query, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import InspectApplicationModal from './InspectApplicationModal';
import FileViewerModal, { type ViewerFile } from './FileViewerModal';
import { OFFICIAL_DIRECTORY, normalizeInstitutionName } from '../data/officialDirectory';
import { WORKFLOW_STATUS_LABELS } from '../types/accreditation';

const MEMBERSHIP_DOC_LABELS: Record<string, string> = {
    prc_id: 'Updated PRC License ID of Representative',
    board_res: 'Board Resolution',
    dean_letter: 'Endorsement Letter from the Dean',
    walkthrough_video: 'Clinic Walkthrough Video',
};

const getApplicationId = (app: any) => {
    if (!app) return '—';
    if (app.applicationId) return app.applicationId;
    const appNo = String(app.id || '').replace(/[^0-9]/g, '');
    const year = app.date ? new Date(app.date).getFullYear() : new Date().getFullYear();
    return `PAHA-${year}-${String(appNo).padStart(4, '0')}`;
};

interface MembersManagerProps {
    filter?: 'all' | 'accredited';
    canEdit?: boolean;
}

const MembersManager: React.FC<MembersManagerProps> = ({ filter = 'all', canEdit = true }) => {
    const { members, addMember, updateMember, deleteMember, toggleMemberActive, uploadImage, registrations, updateApplicationStatus } = useAdmin();
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedProfile, setSelectedProfile] = useState<MemberProfile | null>(null);
    const liveProfile = useMemo(() => {
        if (!selectedProfile) return null;
        return members.find(m => m.id === selectedProfile.id) || selectedProfile;
    }, [selectedProfile, members]);
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const navigate = useNavigate();
    const [inspectAppId, setInspectAppId] = useState<string | null>(null);
    const [showReconcileModal, setShowReconcileModal] = useState(false);
    const [reconcileBusyId, setReconcileBusyId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const normalizePhoneDigits = (phone: string) => (phone || '').replace(/\D/g, '').slice(-10);

    const reconcileReport = useMemo(() => {
        const matchedMemberIds = new Set<string>();
        const needsFix: { member: MemberProfile; official: typeof OFFICIAL_DIRECTORY[number]; diffs: string[] }[] = [];
        const missing: typeof OFFICIAL_DIRECTORY = [];

        for (const entry of OFFICIAL_DIRECTORY) {
            const key = normalizeInstitutionName(entry.institution);
            const member = members.find(m => normalizeInstitutionName(m.name) === key);
            if (!member) {
                missing.push(entry);
                continue;
            }
            matchedMemberIds.add(member.id);

            const currentRep = ((member as any).representativeName || member.headVeterinarian || '').trim();
            const diffs: string[] = [];
            if (currentRep.toLowerCase() !== entry.representative.trim().toLowerCase()) diffs.push('representative');
            if ((member.address || '').trim().toLowerCase() !== entry.address.trim().toLowerCase()) diffs.push('address');
            if (entry.phone && normalizePhoneDigits(member.phone) !== normalizePhoneDigits(entry.phone)) diffs.push('phone');
            if (!!member.isAccredited !== entry.accredited) diffs.push('accreditation');

            if (diffs.length > 0) needsFix.push({ member, official: entry, diffs });
        }

        const extra = members.filter(m => !matchedMemberIds.has(m.id));
        return { needsFix, missing, extra };
    }, [members]);

    const applyReconcileFix = async (member: MemberProfile, official: typeof OFFICIAL_DIRECTORY[number]) => {
        setReconcileBusyId(member.id);
        try {
            await updateMember(member.id, {
                representativeName: official.representative,
                address: official.address,
                phone: official.phone || member.phone,
                isAccredited: official.accredited,
            } as Partial<MemberProfile>);
        } finally {
            setReconcileBusyId(null);
        }
    };

    const applyAllReconcileFixes = async () => {
        for (const { member, official } of reconcileReport.needsFix) {
            await applyReconcileFix(member, official);
        }
    };

    // Load active accreditation applications and payments for badge resolution
    const [acApplications, setAcApplications] = useState<any[]>([]);
    const [allTransactions, setAllTransactions] = useState<any[]>([]);
    const [membershipApps, setMembershipApps] = useState<any[]>([]);
    const [usersMap, setUsersMap] = useState<Record<string, any>>({});
    const [memberReps, setMemberReps] = useState<any[]>([]);
    const [memberModalTab, setMemberModalTab] = useState<'clinic' | 'account' | 'membership_info' | 'accreditation'>('clinic');
    const [viewerFile, setViewerFile] = useState<ViewerFile | null>(null);
    const [membershipPlans, setMembershipPlans] = useState<any[]>([]);
    const [editModalTab, setEditModalTab] = useState<'clinic_info' | 'membership_details'>('clinic_info');

    useEffect(() => {
        const unsub = onSnapshot(collection(db, 'membership_plans'), (snapshot) => {
            setMembershipPlans(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.error('[MembersManager] Plans error:', err);
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            const map: Record<string, any> = {};
            snapshot.docs.forEach(doc => {
                map[doc.id] = doc.data();
            });
            setUsersMap(map);
        }, (err) => {
            console.error('[MembersManager] Users error:', err);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!selectedProfile) {
            setMemberReps([]);
            return;
        }
        const linkedApp = membershipApps.find(app => app.email === selectedProfile.email);
        const uid = linkedApp?.uid || (selectedProfile as any).uid;
        if (uid) {
            const repsRef = collection(db, 'users', uid, 'representatives');
            const unsubscribe = onSnapshot(repsRef, (snap) => {
                setMemberReps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            }, (err) => {
                console.error('[MembersManager] Reps error:', err);
            });
            return () => unsubscribe();
        } else {
            setMemberReps([]);
        }
    }, [selectedProfile, membershipApps]);

    useEffect(() => {
        const qApps = query(collection(db, 'accreditation_applications'));
        const unsubApps = onSnapshot(qApps, (snap) => {
            setAcApplications(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.error('[MembersManager] Accreditation apps error:', err);
        });

        const qTx = query(collection(db, 'paymentTransactions'));
        const unsubTx = onSnapshot(qTx, (snap) => {
            setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.error('[MembersManager] Transactions error:', err);
        });

        const qMemApps = query(collection(db, 'membership_applications'));
        const unsubMemApps = onSnapshot(qMemApps, (snap) => {
            setMembershipApps(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        }, (err) => {
            console.error('[MembersManager] Membership apps error:', err);
        });

        return () => {
            unsubApps();
            unsubTx();
            unsubMemApps();
        };
    }, []);

    // Close dropdowns on document click
    useEffect(() => {
        const closeDropdown = () => setActiveDropdown(null);
        document.addEventListener('click', closeDropdown);
        return () => document.removeEventListener('click', closeDropdown);
    }, []);
    
    // Search and View State
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [accreditationFilter, setAccreditationFilter] = useState<'all' | 'accredited' | 'standard'>(
        filter === 'accredited' ? 'accredited' : 'all'
    );
    const [sortBy, setSortBy] = useState<keyof MemberProfile>('joinedAt');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    React.useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, typeFilter, accreditationFilter]);

    const getInitials = (name: string) => {
        if (!name) return 'PA';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    };

    const resolveMemberAvatar = (member: MemberProfile) => {
        if (!member) return null;
        
        // 1. Check linked user in usersMap
        const emailKey = (member.email || '').toLowerCase().trim();
        const linkedApp = membershipApps.find(app => (app.email || '').toLowerCase().trim() === emailKey);
        const uid = linkedApp?.uid || (member as any).uid || (member as any).userId;
        if (uid && usersMap[uid]) {
            const u = usersMap[uid];
            const userImg = u.photoUrl || u.clinicImageUrl || u.clinicLogo || u.avatarUrl || u.imageUrl;
            if (userImg && typeof userImg === 'string' && userImg.trim() !== '') return userImg;
        }

        // 2. Check linked application in membershipApps
        if (linkedApp) {
            const appImg = linkedApp.photoUrl || linkedApp.clinicImageUrl || linkedApp.clinicLogo || linkedApp.imageUrl;
            if (appImg && typeof appImg === 'string' && appImg.trim() !== '') return appImg;
        }

        // 3. Direct properties on member object
        const m = member as any;
        const directImg = m.photoUrl || m.clinicImageUrl || m.clinicLogo || m.imageUrl || m.avatarUrl || m.photo || m.headVetPhotoUrl;
        if (directImg && typeof directImg === 'string' && directImg.trim() !== '' && !directImg.includes('unsplash.com/photo-1584132967334')) {
            return directImg;
        }

        // 4. member.image fallback
        if (member.image && typeof member.image === 'string' && member.image.trim() !== '' && !member.image.includes('unsplash.com/photo-1584132967334')) {
            return member.image;
        }

        return member.image || null;
    };


    // Form State (shared for add/edit)
    const [formData, setFormData] = useState<Partial<MemberProfile>>({
        name: '',
        headVeterinarian: '',
        address: '',
        phone: '',
        email: '',
        type: 'Clinic',
        isAccredited: filter === 'accredited',
        image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=2070&auto=format&fit=crop',
        memberId: '',
        joinedAt: new Date().toISOString(),
        businessStructure: 'Sole Proprietorship',
        date: new Date().toISOString(),
        annualDues: 2000,
        renewalDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString(),
        paymentStatus: 'paid',
        paymentMethod: 'Manual Bank Transfer',
        paymentReference: ''
    } as any);

    const resetForm = () => {
        setFormData({
            name: '',
            headVeterinarian: '',
            address: '',
            phone: '',
            email: '',
            type: 'Clinic',
            isAccredited: filter === 'accredited',
            image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=2070&auto=format&fit=crop',
            memberId: '',
            joinedAt: new Date().toISOString(),
            businessStructure: 'Sole Proprietorship',
            date: new Date().toISOString(),
            annualDues: 2000,
            renewalDate: new Date(new Date().getFullYear() + 1, new Date().getMonth(), new Date().getDate()).toISOString(),
            paymentStatus: 'paid',
            paymentMethod: 'Manual Bank Transfer',
            paymentReference: ''
        } as any);
        setIsEditing(null);
        setShowAddForm(false);
        setEditModalTab('clinic_info');
    };

    const handleEditClick = (member: MemberProfile) => {
        setIsEditing(member.id);
        const matchedApp = membershipApps.find(app => app.email === member.email) || {};
        
        // Compute renewal date if not present
        const paidAtDate = matchedApp.paidAt ? new Date(matchedApp.paidAt) : member.joinedAt ? new Date(member.joinedAt) : new Date();
        const renewalDate = new Date(paidAtDate.getFullYear() + 1, paidAtDate.getMonth(), paidAtDate.getDate()).toISOString();

        setFormData({
            ...member,
            memberId: (member as any).memberId || getApplicationId(matchedApp) || '',
            joinedAt: member.joinedAt || matchedApp.paidAt || new Date().toISOString(),
            businessStructure: (member as any).businessStructure || matchedApp.businessStructure || 'Sole Proprietorship',
            date: (member as any).date || matchedApp.date || member.joinedAt || new Date().toISOString(),
            annualDues: (member as any).annualDues || (matchedApp.type === 'Associate' ? 3500 : 2000),
            renewalDate: (member as any).renewalDate || renewalDate,
            paymentStatus: (member as any).paymentStatus || matchedApp.paymentStatus || (matchedApp.status === 'approved' ? 'paid' : 'pending'),
            paymentMethod: (member as any).paymentMethod || matchedApp.paymentMethod || 'Manual Bank Transfer',
            paymentReference: (member as any).paymentReference || matchedApp.paymentReference || '',
        } as any);
        setEditModalTab('clinic_info');
        setShowAddForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            phone: formatPhoneForDB(formData.phone)
        };
        try {
            if (isEditing) {
                await updateMember(isEditing, dataToSave);
            } else {
                await addMember(dataToSave as Omit<MemberProfile, 'id'>);
            }

            // Sync with membership_applications if matching application exists
            const matchedApp = membershipApps.find(app => app.email === formData.email);
            if (matchedApp && matchedApp.id) {
                const appRef = doc(db, 'membership_applications', matchedApp.id);
                await updateDoc(appRef, {
                    type: formData.type || matchedApp.type,
                    businessStructure: (formData as any).businessStructure || matchedApp.businessStructure,
                    date: (formData as any).date || matchedApp.date || new Date().toISOString(),
                    paidAt: (formData as any).joinedAt || matchedApp.paidAt || new Date().toISOString(),
                    status: (formData as any).paymentStatus || matchedApp.paymentStatus || matchedApp.status || 'pending',
                    paymentMethod: (formData as any).paymentMethod || matchedApp.paymentMethod || 'Manual Bank Transfer',
                    paymentReference: (formData as any).paymentReference || matchedApp.paymentReference || '',
                    memberId: (formData as any).memberId || matchedApp.memberId || ''
                });
            }
        } catch (err) {
            console.error("Error saving member details: ", err);
        }
        resetForm();
    };

    const handleDeleteClick = (id: string) => {
        setPendingDeleteId(id);
        setPasswordInput('');
        setPasswordError('');
        setShowPasswordModal(true);
    };

    const handleConfirmDelete = async () => {
        if (!pendingDeleteId) return;
        setIsDeleting(true);
        setPasswordError('');

        const adminEmail = auth.currentUser?.email;
        if (!adminEmail) {
            setPasswordError('You must be signed in to delete a member.');
            setIsDeleting(false);
            return;
        }

        try {
            await signInWithEmailAndPassword(auth, adminEmail, passwordInput);
        } catch (err: any) {
            setPasswordError('Incorrect password. Please try again.');
            setIsDeleting(false);
            return;
        }

        try {
            await deleteMember(pendingDeleteId);
        } catch (err: any) {
            setPasswordError('Deletion failed on the server — the account was NOT fully removed. ' + (err?.message || 'Please try again.'));
            setIsDeleting(false);
            return;
        }

        setShowPasswordModal(false);
        setIsDeleting(false);
        setPasswordInput('');
        setPendingDeleteId(null);
    };

    const handleCancelDelete = () => {
        setShowPasswordModal(false);
        setPendingDeleteId(null);
        setPasswordInput('');
        setPasswordError('');
    };

    const handleToggleActive = (member: MemberProfile) => {
        const deactivating = !member.deactivated;
        const msg = deactivating
            ? 'Deactivate this member? They will be unable to log in or access the member dashboard until reactivated.'
            : 'Reactivate this member? They will regain access to the member dashboard.';
        if (confirm(msg)) {
            toggleMemberActive(member.id, deactivating);
        }
    };

    // Filter and Sort Logic
    const filteredMembers = useMemo(() => {
        let result = [...members];

        // Accreditation Filter
        if (filter === 'accredited') {
            result = result.filter(m => m.isAccredited);
        } else if (accreditationFilter !== 'all') {
            result = result.filter(m => accreditationFilter === 'accredited' ? m.isAccredited : !m.isAccredited);
        }

        // Type Filter
        if (typeFilter !== 'all') {
            result = result.filter(m => m.type === typeFilter);
        }

        // Search Filter
        if (searchQuery.trim()) {
            const queryTerms = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
            result = result.filter(m => {
                return queryTerms.every(term => 
                    m.name.toLowerCase().includes(term) || 
                    (m.headVeterinarian && m.headVeterinarian.toLowerCase().includes(term)) ||
                    m.address.toLowerCase().includes(term) ||
                    m.email.toLowerCase().includes(term)
                );
            });
        }

        // Sorting
        result.sort((a, b) => {
            const valA = a[sortBy];
            const valB = b[sortBy];
            
            // Put undefined/null/empty values at the bottom
            if (valA === undefined || valA === null || valA === '') return 1;
            if (valB === undefined || valB === null || valB === '') return -1;
            
            const strA = valA.toString().toLowerCase();
            const strB = valB.toString().toLowerCase();
            
            if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
            if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [members, filter, searchQuery, typeFilter, accreditationFilter, sortBy, sortOrder]);

    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    const paginatedMembers = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredMembers.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredMembers, currentPage, itemsPerPage]);


    // KPI stats calculations based on members
    const totalCount = members.length;
    const accreditedCount = members.filter(m => m.isAccredited).length;
    const clinicCount = members.filter(m => m.type === 'Clinic' || m.type === 'Hospital' || m.type === 'Specialized Clinic').length;
    const professionalCount = members.filter(m => m.type === 'Professional Member').length;

return (
        <div className="relative">
            <div className="space-y-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-3xl font-semibold">hail</span>
                        Manage PAHA Members
                    </h2>

                    <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-1">
                        {filter === 'accredited' ? 'Accredited Member Directory' : 'Member Directory & Control Center'}
                    </p>
                </div>
                {canEdit && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowReconcileModal(true)}
                            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 hover:border-primary/40 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-[10px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-base text-primary">fact_check</span>
                            Reconcile Directory
                        </button>
                        <button
                            onClick={() => { resetForm(); setShowAddForm(true); }}
                            className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-[10px] text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-sm transition-all active:scale-95"
                        >
                            <span className="material-symbols-outlined text-base">add_circle</span>
                            Add New Member
                        </button>
                    </div>
                )}
            </div>
            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between transition-all hover:shadow-md">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Members</p>
                        <h3 className="text-2xl font-black text-slate-800 dark:text-white mt-1">{totalCount}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500 shrink-0">
                        <span className="material-symbols-outlined text-2xl">group</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between transition-all hover:shadow-md">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Accredited Vets</p>
                        <h3 className="text-2xl font-black text-emerald-500 mt-1">{accreditedCount}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
                        <span className="material-symbols-outlined text-2xl">verified</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between transition-all hover:shadow-md">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Clinics & Hospitals</p>
                        <h3 className="text-2xl font-black text-purple-500 mt-1">{clinicCount}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
                        <span className="material-symbols-outlined text-2xl">medical_services</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between transition-all hover:shadow-md">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Professional Vets</p>
                        <h3 className="text-2xl font-black text-amber-500 mt-1">{professionalCount}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                        <span className="material-symbols-outlined text-2xl">school</span>
                    </div>
                </div>
            </div>

            {/* Advanced Filter Widget */}
            <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-[16px] shadow-sm border border-slate-200 dark:border-white/5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 md:gap-5 items-end">
                    <div className="md:col-span-5">
                        <label htmlFor="mm-search" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Search Members</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input
                                id="mm-search"
                                type="text"
                                placeholder="Search by name, vet, email, or address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="mm-type-filter" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Facility Type</label>
                        <select
                            id="mm-type-filter"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            <option value="all">All Types</option>
                            <option value="Clinic">Clinic</option>
                            <option value="Hospital">Hospital</option>
                            <option value="Center">Center</option>
                            <option value="Specialized Clinic">Specialized Clinic</option>
                            <option value="Professional Member">Professional Member</option>
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="mm-status-filter" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Accreditation</label>
                        <select
                            id="mm-status-filter"
                            value={accreditationFilter}
                            onChange={(e: any) => setAccreditationFilter(e.target.value)}
                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                            disabled={filter === 'accredited'}
                        >
                            <option value="all">All Members</option>
                            <option value="accredited">Accredited Only</option>
                            <option value="standard">Standard Only</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label htmlFor="mm-sort-by" className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5">Sort Members</label>
                        <select
                            id="mm-sort-by"
                            value={`${sortBy}-${sortOrder}`}
                            onChange={(e) => {
                                const [key, order] = e.target.value.split('-') as [keyof MemberProfile, 'asc' | 'desc'];
                                setSortBy(key);
                                setSortOrder(order);
                            }}
                            className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                        >
                            <option value="joinedAt-desc">Newest First</option>
                            <option value="joinedAt-asc">Oldest First</option>
                            <option value="name-asc">Name (A-Z)</option>
                            <option value="name-desc">Name (Z-A)</option>
                            <option value="type-asc">Type (A-Z)</option>
                            <option value="type-desc">Type (Z-A)</option>
                            <option value="headVeterinarian-asc">Head Vet (A-Z)</option>
                            <option value="headVeterinarian-desc">Head Vet (Z-A)</option>
                        </select>
                    </div>
                </div>
                {(searchQuery || typeFilter !== 'all' || (filter !== 'accredited' && accreditationFilter !== 'all')) && (
                    <div className="flex justify-end pt-1">
                        <button
                            onClick={() => {
                                setSearchQuery('');
                                setTypeFilter('all');
                                setAccreditationFilter(filter === 'accredited' ? 'accredited' : 'all');
                            }}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xs">filter_alt_off</span>
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Enhanced Table Card */}
            <div className="bg-white dark:bg-slate-800 rounded-[16px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar min-w-full">
                    <table className="w-full text-left border-collapse min-w-[1050px]">
                        <thead className="bg-slate-50/80 dark:bg-slate-900/60 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th className="px-6 py-5 min-w-[260px]">Member Info</th>
                                <th className="px-6 py-5 min-w-[220px]">Contact Info</th>
                                <th className="px-6 py-5 min-w-[240px]">Location</th>
                                <th className="px-6 py-5 min-w-[170px]">Clinic Type</th>
                                <th className="px-6 py-5 min-w-[160px]">Payment Details</th>
                                <th className="px-6 py-5 min-w-[100px] text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-slate-100 dark:divide-white/5">
                            {filteredMembers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                                        <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">person_search</span>
                                        No members found.
                                    </td>
                                </tr>
                            ) : (
                                paginatedMembers.map(member => (
                                    <tr 
                                        key={member.id} 
                                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors cursor-pointer text-slate-900 dark:text-white"
                                        onClick={() => setSelectedProfile(member)}
                                    >
                                        <td className="px-6 py-6">
                                            <div className="flex items-center gap-4">
                                                {(() => {
                                                    const avatarUrl = resolveMemberAvatar(member);
                                                    const initials = getInitials(member.name);
                                                    return (
                                                        <div className="relative shrink-0 group">
                                                            <div 
                                                                className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-white/10 shadow-sm flex items-center justify-center transition-all overflow-hidden group-hover:ring-2 group-hover:ring-primary/40"
                                                                title={avatarUrl ? "Click to view full profile image" : member.name}
                                                                onClick={(e) => {
                                                                    if (avatarUrl) {
                                                                        e.stopPropagation();
                                                                        setViewerFile({
                                                                            url: avatarUrl,
                                                                            name: `${member.name} - Profile Image`
                                                                        });
                                                                    }
                                                                }}
                                                            >
                                                                {avatarUrl ? (
                                                                    <img src={avatarUrl} alt={member.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                                                                ) : (
                                                                    <div className="flex flex-col items-center justify-center font-black text-slate-500 dark:text-slate-400 text-xs">
                                                                        {initials}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {member.isAccredited && (
                                                                <div className="absolute -top-1 -right-1 size-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 shadow-sm">
                                                                    <span className="material-symbols-outlined text-[9px] text-white font-black" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                                <div className="min-w-0">
                                                    <h4 className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate max-w-[200px]" title={member.name}>
                                                        {member.name}
                                                    </h4>
                                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 uppercase tracking-wide flex items-center gap-1 truncate max-w-[200px]" title={member.headVeterinarian || 'No Head Vet Specified'}>
                                                        <span className="material-symbols-outlined text-[12px] shrink-0">medical_services</span>
                                                        <span className="truncate">{member.headVeterinarian || 'No Head Vet Specified'}</span>
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="space-y-2">
                                                <a 
                                                    href={`mailto:${member.email}`} 
                                                    className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1.5 transition-colors truncate max-w-[200px]"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <span className="material-symbols-outlined text-sm shrink-0">mail</span>
                                                    <span className="truncate">{member.email}</span>
                                                </a>
                                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-sm shrink-0">call</span>
                                                    {member.phone || 'N/A'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6">
                                            <div className="flex flex-col gap-1.5 max-w-[220px]">
                                                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium line-clamp-1 italic leading-relaxed">{member.address}</p>
                                                <a 
                                                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(member.address)}${member.lat ? `&center=${member.lat},${member.lng}` : ''}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-[9px] font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1 mt-0.5 transition-colors"
                                                    onClick={e => e.stopPropagation()}
                                                >
                                                    <span className="material-symbols-outlined text-xs">location_on</span>
                                                    View on Map
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap">
                                            <div className="flex flex-col items-start gap-2">
                                                <span className={`px-2.5 py-0.5 rounded-[100px] text-[8px] font-extrabold uppercase tracking-wider text-white shadow-sm flex items-center gap-1
                                                    ${member.type === 'Hospital' ? 'bg-rose-600' : 
                                                      member.type === 'Center' ? 'bg-sky-600' : 
                                                      member.type === 'Specialized Clinic' ? 'bg-purple-600' : 
                                                      member.type === 'Professional Member' ? 'bg-amber-600' : 'bg-emerald-600'}`}>
                                                    <span className="material-symbols-outlined text-[10px] text-white">
                                                        {member.type === 'Hospital' ? 'local_hospital' : 
                                                         member.type === 'Center' ? 'domain' : 
                                                         member.type === 'Specialized Clinic' ? 'star' : 
                                                         member.type === 'Professional Member' ? 'school' : 'medical_services'}
                                                    </span>
                                                    {member.type}
                                                </span>
                                                {member.isAccredited ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[100px] text-[8px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-sm uppercase tracking-wider">
                                                        <span className="size-1 rounded-full bg-emerald-500 animate-pulse" />
                                                        Accredited
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[100px] text-[8px] font-black bg-slate-100 dark:bg-slate-900 text-slate-450 dark:text-slate-500 border border-slate-200 dark:border-white/5 shadow-sm uppercase tracking-wider">
                                                        <span className="size-1 rounded-full bg-slate-400 dark:bg-slate-500" />
                                                        Standard
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-6 whitespace-nowrap">
                                            {(() => {
                                                const app = acApplications.find(a => a.email === member.email || a.clinicName === member.name);
                                                const tx = allTransactions.find(t => t.customerEmail === member.email || t.customerName === member.name);
                                                
                                                // Resolve status details
                                                let accText = "No App";
                                                let accStyle = "bg-slate-100 dark:bg-slate-900/50 text-slate-450 border-slate-200 dark:border-white/5";
                                                if (app) {
                                                    if (app.status === 'accredited') {
                                                        accText = "Accredited";
                                                        accStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                                                    } else if (app.status === 'paid') {
                                                        accText = "Paid";
                                                        accStyle = "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
                                                    } else if (app.status === 'for_payment') {
                                                        accText = "For Payment";
                                                        accStyle = "bg-blue-500/10 text-blue-500 border-blue-500/20";
                                                    } else if (app.status === 'needs_compliance' || app.status === 'rejected') {
                                                        accText = "Declined";
                                                        accStyle = "bg-rose-500/10 text-rose-500 border-rose-500/20";
                                                    } else {
                                                        accText = "In Pipeline";
                                                        accStyle = "bg-amber-500/10 text-amber-500 border-amber-500/20";
                                                    }
                                                }

                                                const memApp = membershipApps.find(a => a.email === member.email || a.uid === member.id);
                                                let payText = "UNPAID";
                                                let payStyle = "bg-slate-500/15 text-slate-500 border-slate-500/20";
                                                
                                                if (memApp) {
                                                    if (memApp.paymentStatus === 'paid' || (memApp.status === 'approved' && memApp.paymentStatus !== 'pending_payment' && memApp.paymentStatus !== 'pending_manual')) {
                                                        payText = "PAID";
                                                        payStyle = "bg-emerald-500/15 text-emerald-500 border-emerald-500/20";
                                                    } else if (memApp.paymentStatus === 'pending_manual') {
                                                        payText = "PENDING REVIEW";
                                                        payStyle = "bg-amber-500/15 text-amber-500 border-amber-500/20 animate-pulse";
                                                    }
                                                } else if (tx) {
                                                    payText = tx.status === 'SUCCESS' ? 'PAID' : tx.status || 'PENDING';
                                                    payStyle = payText === 'PAID' || payText === 'SUCCESS' 
                                                        ? 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20' 
                                                        : 'bg-amber-500/15 text-amber-500 border-amber-500/20';
                                                }

                                                return (
                                                    <div className="flex flex-col gap-1.5 text-[8px] font-extrabold uppercase tracking-wider">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-slate-450 font-semibold lowercase">accred:</span>
                                                            <span className={`px-2 py-0.5 rounded-[100px] border ${accStyle}`}>{accText}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-slate-450 font-semibold lowercase">member:</span>
                                                            <span className={`px-2 py-0.5 rounded-[100px] border ${payStyle}`}>{payText}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-6 py-6 text-right whitespace-nowrap" onClick={e => e.stopPropagation()}>
                                            <div className="relative inline-block text-left">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(activeDropdown === member.id ? null : member.id);
                                                    }}
                                                    style={{ backgroundColor: '#1E60A3' }}
                                                    className="size-8 rounded-[8px] hover:opacity-90 text-white flex items-center justify-center transition-all border border-transparent shadow-sm"
                                                    title="Action menu"
                                                >
                                                    <span className="material-symbols-outlined text-base">more_vert</span>
                                                </button>

                                                {activeDropdown === member.id && (
                                                    <div className="absolute right-0 mt-1.5 w-40 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-lg z-50 overflow-hidden py-1 animate-scale-up">
                                                        {(() => {
                                                            const app = acApplications.find(a => a.email === member.email || a.clinicName === member.name);
                                                            return (
                                                                <button
                                                                    onClick={() => {
                                                                        setActiveDropdown(null);
                                                                        if (app) {
                                                                            setInspectAppId(app.id);
                                                                        } else {
                                                                            // Route to accreditation list with query text filled out
                                                                            navigate(`/admin?tab=accreditation&search=${encodeURIComponent(member.name)}`);
                                                                        }
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-[11px] font-bold text-primary hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">fact_check</span>
                                                                    Inspect Application
                                                                </button>
                                                            );
                                                        })()}
                                                        {(() => {
                                                            const mApp = membershipApps.find(a => a.email === member.email || a.uid === member.id);
                                                            if (mApp && (mApp.paymentStatus === 'pending_manual' || mApp.status === 'pending')) {
                                                                return (
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            setActiveDropdown(null);
                                                                            if (window.confirm(`Approve membership application and confirm payment for ${member.name}?`)) {
                                                                                try {
                                                                                    await updateApplicationStatus(mApp.id, 'approved');
                                                                                    alert('Membership successfully approved!');
                                                                                } catch (err: any) {
                                                                                    alert('Error approving membership: ' + err.message);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="w-full px-3 py-2 text-left text-[11px] font-bold text-emerald-650 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-white/5"
                                                                    >
                                                                        <span className="material-symbols-outlined text-sm text-emerald-650">check_circle</span>
                                                                        Approve Membership
                                                                    </button>
                                                                );
                                                            }
                                                            return null;
                                                        })()}
                                                        <button
                                                            onClick={() => {
                                                                setSelectedProfile(member);
                                                                setActiveDropdown(null);
                                                            }}
                                                            className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-white/5"
                                                        >
                                                            <span className="material-symbols-outlined text-sm">visibility</span>
                                                            View Info
                                                        </button>
                                                        {canEdit && (
                                                            <>
                                                                <button
                                                                    onClick={() => {
                                                                        handleEditClick(member);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-[11px] font-bold text-slate-700 dark:text-slate-355 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-white/5"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                                    Edit Details
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleToggleActive(member);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-[11px] font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-white/5"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">{member.deactivated ? 'toggle_on' : 'block'}</span>
                                                                    {member.deactivated ? 'Reactivate Member' : 'Deactivate Member'}
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        handleDeleteClick(member.id);
                                                                        setActiveDropdown(null);
                                                                    }}
                                                                    className="w-full px-3 py-2 text-left text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center gap-2 transition-colors border-t border-slate-100 dark:border-white/5"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                    Delete Member
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {/* Pagination Controls */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-semibold text-slate-500">
                    <div>
                        Showing {filteredMembers.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} entries
                    </div>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-1">
                            <button
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center border border-slate-200 dark:border-white/10"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_left</span>
                            </button>
                            {Array.from({ length: totalPages }).map((_, i) => {
                                const page = i + 1;
                                if (totalPages > 6 && page > 1 && page < totalPages && Math.abs(page - currentPage) > 1) {
                                    if (page === 2 || page === totalPages - 1) {
                                        return <span key={page} className="px-2 select-none">...</span>;
                                    }
                                    return null;
                                }
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`size-8 rounded-lg flex items-center justify-center transition-colors border ${
                                            currentPage === page
                                            ? 'bg-primary text-white border-primary'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/10'
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors flex items-center justify-center border border-slate-200 dark:border-white/10"
                            >
                                <span className="material-symbols-outlined text-sm">chevron_right</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>


            {/* Modal Form */}
            {showAddForm && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowAddForm(false)}></div>
                    
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 w-full max-w-4xl rounded-[16px] shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-slide-up text-slate-900 dark:text-white">
                        
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/[0.02] relative z-10">
                            <div className="space-y-1">
                                <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-3">
                                    <span className="material-symbols-outlined text-primary text-2xl">{isEditing ? 'edit_square' : 'person_add'}</span>
                                    {isEditing ? 'Edit Professional Member' : 'Register New Member'}
                                </h3>
                                <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold uppercase tracking-widest leading-relaxed">Ensure all information is accurate for accreditation purposes.</p>
                            </div>
                            <button 
                                onClick={() => setShowAddForm(false)}
                                className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-red-500/10 hover:text-red-500 text-slate-500 dark:text-slate-400 transition-all flex items-center justify-center border border-slate-200 dark:border-white/10 active:scale-90"
                            >
                                <span className="material-symbols-outlined font-bold text-sm">close</span>
                            </button>
                        </div>                        {/* Modal Tabs */}
                        <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 border-b border-slate-100 dark:border-white/5 relative z-10">
                            {[
                                { id: 'clinic_info', label: 'Clinic Information', icon: 'storefront', color: 'text-teal-500' },
                                { id: 'membership_details', label: 'Membership & Payments', icon: 'card_membership', color: 'text-indigo-500' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setEditModalTab(tab.id as any)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all
                                        ${editModalTab === tab.id 
                                            ? 'bg-white dark:bg-slate-800 text-primary shadow-sm border border-slate-200/50 dark:border-white/5' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined text-base ${tab.color}`}>{tab.icon}</span>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar relative z-10 space-y-6">
                            <form id="memberForm" onSubmit={handleSubmit} className="space-y-6">
                                {editModalTab === 'clinic_info' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-left">
                                        {/* Basic Info */}
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block border-b border-slate-100 dark:border-white/5 pb-1">Core Information</p>
                                                
                                                <div className="space-y-1">
                                                    <label htmlFor="mm-name" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">CLINIC / HOSPITAL NAME</label>
                                                    <input
                                                        id="mm-name"
                                                        name="mm-name"
                                                        required
                                                        type="text"
                                                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none ring-primary/5 focus:ring-4 ring-primary/5 transition-all font-semibold text-xs placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                                        placeholder="e.g. Metro Vet Hospital"
                                                        value={formData.name || ''}
                                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label htmlFor="mm-headVet" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">LEAD VETERINARIAN (FULL NAME)</label>
                                                    <input
                                                        id="mm-headVet"
                                                        name="mm-headVet"
                                                        type="text"
                                                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                                        placeholder="Name of Lead Doctor"
                                                        value={formData.headVeterinarian || ''}
                                                        onChange={e => setFormData({ ...formData, headVeterinarian: e.target.value })}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-4 pt-2">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block border-b border-slate-100 dark:border-white/5 pb-1">Contact & Access</p>
                                                
                                                <div className="grid grid-cols-1 gap-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-email" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">CONTACT EMAIL ADDRESS</label>
                                                        <input
                                                            id="mm-email"
                                                            name="mm-email"
                                                            required
                                                            type="email"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                                            placeholder="contact@clinic.com"
                                                            value={formData.email || ''}
                                                            onChange={e => setFormData({ ...formData, email: e.target.value })}
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-phone" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">CONTACT MOBILE / LANDLINE</label>
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
                                                                id="mm-phone"
                                                                name="mm-phone"
                                                                type="text" 
                                                                required 
                                                                placeholder="900 000 0000" 
                                                                value={cleanPhoneInput(formData.phone)}
                                                                onChange={e => setFormData({ ...formData, phone: cleanPhoneInput(e.target.value) })}
                                                                maxLength={10}
                                                                className="w-full text-xs font-semibold pl-16 pr-3 py-2.5 rounded-[8px] bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white focus:ring-2 focus:ring-primary/20 outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Address & Type */}
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block border-b border-slate-100 dark:border-white/5 pb-1">Location & Classification</p>
                                                
                                                <div className="space-y-1">
                                                    <label htmlFor="mm-address" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">COMPLETE ADDRESS</label>
                                                    <textarea
                                                        id="mm-address"
                                                        name="mm-address"
                                                        required
                                                        rows={3}
                                                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs resize-none placeholder:text-slate-400 dark:placeholder:text-slate-700"
                                                        placeholder="Unit, Street, Barangay, City, Province"
                                                        value={formData.address || ''}
                                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-type" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">TYPE OF ESTABLISHMENT</label>
                                                        <select
                                                            id="mm-type"
                                                            name="mm-type"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs appearance-none cursor-pointer"
                                                            value={formData.type || 'Clinic'}
                                                            onChange={e => {
                                                                const newType = e.target.value;
                                                                // Sync default dues from plan if matched
                                                                const matchedPlan = membershipPlans.find(p => p.type === newType || p.id === newType);
                                                                const newDues = matchedPlan ? Number(matchedPlan.recurringFee ?? matchedPlan.fee ?? 0) : (newType === 'Associate' ? 3500 : 2000);
                                                                setFormData({ ...formData, type: newType, annualDues: newDues } as any);
                                                            }}
                                                        >
                                                            <option value="Clinic">Clinic</option>
                                                            <option value="Hospital">Hospital</option>
                                                            <option value="Specialized Clinic">Specialized Clinic</option>
                                                            <option value="Center">Center</option>
                                                            <option value="Professional Member">Professional Member</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">PAHA ACCREDITATION TIER</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setFormData({ ...formData, isAccredited: !formData.isAccredited })}
                                                            className={`w-full flex items-center justify-between px-4 py-2.5 rounded-[10px] border transition-all font-semibold text-xs ${
                                                                formData.isAccredited 
                                                                ? 'bg-primary/10 border-primary/40 text-primary shadow-sm' 
                                                                : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-white/10 text-slate-400 dark:text-slate-500'
                                                            }`}
                                                        >
                                                            <span>{formData.isAccredited ? 'Accredited' : 'Standard'}</span>
                                                            <div className={`w-4 h-4 rounded-full flex items-center justify-center transition-all ${formData.isAccredited ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}>
                                                                {formData.isAccredited && <span className="material-symbols-outlined text-[10px] text-white font-bold">check</span>}
                                                            </div>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Map Preview Logic Block */}
                                            <div className="p-4 bg-primary/5 rounded-[12px] border border-primary/10 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="material-symbols-outlined text-primary text-lg">explore</span>
                                                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Map Location Coordinates (For 'Find a Vet' Map)</span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (formData.address) {
                                                                const coords = getCoordinates(formData.address, isEditing || 'new-member');
                                                                setFormData({ ...formData, ...coords });
                                                            } else {
                                                                alert('Please enter an address first');
                                                            }
                                                        }}
                                                        className="text-[9px] font-bold bg-primary text-white px-2.5 py-1 rounded-[6px] active:scale-95 transition-all hover:bg-primary/90"
                                                    >
                                                        Auto-Sync
                                                    </button>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-lat" className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase px-1">Latitude (Map Y-Coordinate)</label>
                                                        <input
                                                            id="mm-lat"
                                                            name="mm-lat"
                                                            type="number"
                                                            step="any"
                                                            className="w-full bg-slate-105 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-805 dark:text-white outline-none focus:border-primary/50 transition-all font-mono"
                                                            value={formData.lat || ''}
                                                            onChange={e => setFormData({ ...formData, lat: parseFloat(e.target.value) })}
                                                            placeholder="0.0000"
                                                        />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-lng" className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase px-1">Longitude (Map X-Coordinate)</label>
                                                        <input
                                                            id="mm-lng"
                                                            name="mm-lng"
                                                            type="number"
                                                            step="any"
                                                            className="w-full bg-slate-105 dark:bg-black/40 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-1.5 text-xs text-slate-805 dark:text-white outline-none focus:border-primary/50 transition-all font-mono"
                                                            value={formData.lng || ''}
                                                            onChange={e => setFormData({ ...formData, lng: parseFloat(e.target.value) })}
                                                            placeholder="0.0000"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Image Section */}
                                        <div className="md:col-span-2 space-y-4 pt-4 border-t border-slate-105 dark:border-white/5">
                                            <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block">Logo & Media</p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="relative group cursor-pointer h-32">
                                                    <div className="flex flex-col items-center justify-center w-full h-full border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[12px] hover:border-primary/50 bg-slate-50 dark:bg-white/[0.02] hover:bg-slate-100 dark:hover:bg-white/[0.05] transition-all relative overflow-hidden group/upload">
                                                        {formData.image ? (
                                                            <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <>
                                                                <span className="material-symbols-outlined text-3xl text-slate-400 group-hover:text-primary mb-1.5 transition-all">upload_file</span>
                                                                <p className="text-[9px] font-bold text-slate-455 dark:text-slate-500 uppercase tracking-widest">Upload Photo</p>
                                                            </>
                                                        )}
                                                        {isUploading && (
                                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                                                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                                <span className="text-[9px] font-bold uppercase tracking-widest text-white animate-pulse">Uploading...</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                    <label htmlFor="mm-imageUpload" className="sr-only">Upload Member Photo</label>
                                                    <input
                                                        id="mm-imageUpload"
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={async (e) => {
                                                            const file = e.target.files?.[0];
                                                            if (file) {
                                                                try {
                                                                    setIsUploading(true);
                                                                    const url = await uploadImage(file);
                                                                    setFormData({ ...formData, image: url });
                                                                } catch (error) {
                                                                    console.error("Image upload failed", error);
                                                                    alert("Failed to upload image.");
                                                                } finally {
                                                                    setIsUploading(false);
                                                                }
                                                                }
                                                        }}
                                                        disabled={isUploading}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-20"
                                                    />
                                                </div>

                                                <div className="md:col-span-2 flex flex-col gap-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-imageUrl" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Profile Image / Logo URL (Direct Link)</label>
                                                        <input
                                                            id="mm-imageUrl"
                                                            name="mm-imageUrl"
                                                            type="url"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-800 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all text-xs font-mono placeholder:text-slate-550"
                                                            value={formData.image || ''}
                                                            onChange={e => setFormData({ ...formData, image: e.target.value })}
                                                            placeholder="https://images.unsplash.com/photo-..."
                                                        />
                                                    </div>

                                                    {formData.image && (
                                                        <div className="rounded-[10px] border border-slate-200 dark:border-white/10 p-1.5 relative group-preview flex items-center justify-between">
                                                            <img src={formData.image} alt="Preview" className="w-16 h-10 object-cover rounded-[6px] border border-slate-200 dark:border-white/5" />
                                                            <button 
                                                                type="button" 
                                                                onClick={() => setFormData({ ...formData, image: '' })}
                                                                className="w-8 h-8 rounded-lg hover:bg-red-500/10 text-red-500 flex items-center justify-center transition-all"
                                                            >
                                                                <span className="material-symbols-outlined text-[18px]">delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in text-left">
                                        {/* Membership Info Column */}
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block border-b border-slate-100 dark:border-white/5 pb-1">Membership Configuration</p>
                                                
                                                <div className="space-y-1">
                                                    <label htmlFor="mm-edit-memberId" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Membership ID</label>
                                                    <input
                                                        id="mm-edit-memberId"
                                                        name="mm-edit-memberId"
                                                        type="text"
                                                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none ring-primary/5 focus:ring-4 transition-all font-mono text-xs"
                                                        placeholder="PAHA-YYYY-NNNN"
                                                        value={(formData as any).memberId || ''}
                                                        onChange={e => setFormData({ ...formData, memberId: e.target.value } as any)}
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label htmlFor="mm-edit-type" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Candidacy Membership Type</label>
                                                    <select
                                                        id="mm-edit-type"
                                                        name="mm-edit-type"
                                                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs appearance-none cursor-pointer"
                                                        value={formData.type || 'Clinic'}
                                                        onChange={e => {
                                                            const newType = e.target.value;
                                                            const matchedPlan = membershipPlans.find(p => p.type === newType || p.id === newType);
                                                            const newDues = matchedPlan ? Number(matchedPlan.recurringFee ?? matchedPlan.fee ?? 0) : (newType === 'Associate' ? 3500 : 2000);
                                                            setFormData({ ...formData, type: newType, annualDues: newDues } as any);
                                                        }}
                                                    >
                                                        <option value="Clinic">Clinic</option>
                                                        <option value="Hospital">Hospital</option>
                                                        <option value="Specialized Clinic">Specialized Clinic</option>
                                                        <option value="Center">Center</option>
                                                        <option value="Professional Member">Professional Member</option>
                                                    </select>
                                                </div>

                                                <div className="space-y-1">
                                                    <label htmlFor="mm-edit-businessStructure" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Business Structure</label>
                                                    <select
                                                        id="mm-edit-businessStructure"
                                                        name="mm-edit-businessStructure"
                                                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs appearance-none cursor-pointer"
                                                        value={(formData as any).businessStructure || 'Sole Proprietorship'}
                                                        onChange={e => setFormData({ ...formData, businessStructure: e.target.value } as any)}
                                                    >
                                                        <option value="Sole Proprietorship">Sole Proprietorship</option>
                                                        <option value="Partnership">Partnership</option>
                                                        <option value="Corporation">Corporation</option>
                                                        <option value="Cooperative">Cooperative</option>
                                                        <option value="Non-Profit">Non-Profit</option>
                                                    </select>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-edit-joinedAt" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Member Since</label>
                                                        <input
                                                            id="mm-edit-joinedAt"
                                                            name="mm-edit-joinedAt"
                                                            type="date"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs"
                                                            value={(formData as any).joinedAt ? new Date((formData as any).joinedAt).toISOString().split('T')[0] : ''}
                                                            onChange={e => {
                                                                const d = new Date(e.target.value);
                                                                setFormData({ ...formData, joinedAt: isNaN(d.getTime()) ? '' : d.toISOString() } as any);
                                                            }}
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-edit-renewalDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Next Renewal Date</label>
                                                        <input
                                                            id="mm-edit-renewalDate"
                                                            name="mm-edit-renewalDate"
                                                            type="date"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs"
                                                            value={(formData as any).renewalDate ? new Date((formData as any).renewalDate).toISOString().split('T')[0] : ''}
                                                            onChange={e => {
                                                                const d = new Date(e.target.value);
                                                                setFormData({ ...formData, renewalDate: isNaN(d.getTime()) ? '' : d.toISOString() } as any);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Payments Column */}
                                        <div className="space-y-6">
                                            <div className="space-y-4">
                                                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block border-b border-slate-100 dark:border-white/5 pb-1">Payment Configuration</p>
                                                
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-edit-paymentStatus" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Payment Status</label>
                                                        <select
                                                            id="mm-edit-paymentStatus"
                                                            name="mm-edit-paymentStatus"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs appearance-none cursor-pointer"
                                                            value={(formData as any).paymentStatus || 'paid'}
                                                            onChange={e => setFormData({ ...formData, paymentStatus: e.target.value } as any)}
                                                        >
                                                            <option value="paid">Paid (Approved)</option>
                                                            <option value="pending">Pending Verification</option>
                                                            <option value="unpaid">Unpaid / Expired</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-edit-paymentMethod" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Payment Method</label>
                                                        <select
                                                            id="mm-edit-paymentMethod"
                                                            name="mm-edit-paymentMethod"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs appearance-none cursor-pointer"
                                                            value={(formData as any).paymentMethod || 'Manual Bank Transfer'}
                                                            onChange={e => setFormData({ ...formData, paymentMethod: e.target.value } as any)}
                                                        >
                                                            <option value="Manual Bank Transfer">Manual Bank Transfer</option>
                                                            <option value="PayCools">PayCools Payment</option>
                                                            <option value="GCash">GCash / Direct Wallet</option>
                                                            <option value="Credit Card">Credit Card</option>
                                                        </select>
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                                                    <label htmlFor="mm-edit-paymentReference" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Payment Reference ID</label>
                                                    <input
                                                        id="mm-edit-paymentReference"
                                                        name="mm-edit-paymentReference"
                                                        type="text"
                                                        className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none ring-primary/5 focus:ring-4 transition-all font-mono text-xs placeholder:text-slate-400"
                                                        placeholder="TXNxxxxxxxxxx or Receipt Ref"
                                                        value={(formData as any).paymentReference || ''}
                                                        onChange={e => setFormData({ ...formData, paymentReference: e.target.value } as any)}
                                                    />
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-edit-annualDues" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Annual Membership Dues (₱)</label>
                                                        <input
                                                            id="mm-edit-annualDues"
                                                            name="mm-edit-annualDues"
                                                            type="number"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none ring-primary/5 focus:ring-4 transition-all font-semibold text-xs"
                                                            placeholder="5000"
                                                            value={(formData as any).annualDues || ''}
                                                            onChange={e => setFormData({ ...formData, annualDues: Number(e.target.value) } as any)}
                                                        />
                                                    </div>

                                                    <div className="space-y-1">
                                                        <label htmlFor="mm-edit-date" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block px-1">Registration Date</label>
                                                        <input
                                                            id="mm-edit-date"
                                                            name="mm-edit-date"
                                                            type="date"
                                                            className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-white/10 rounded-[10px] px-4 py-2.5 text-slate-900 dark:text-white focus:border-primary/50 outline-none focus:ring-4 ring-primary/5 transition-all font-semibold text-xs"
                                                            value={(formData as any).date ? new Date((formData as any).date).toISOString().split('T')[0] : ''}
                                                            onChange={e => {
                                                                const d = new Date(e.target.value);
                                                                setFormData({ ...formData, date: isNaN(d.getTime()) ? '' : d.toISOString() } as any);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div>

                        {/* Modal Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-end gap-3 relative z-10">
                            <button
                                type="button"
                                onClick={() => setShowAddForm(false)}
                                className="px-5 py-2.5 rounded-[10px] text-xs font-bold uppercase tracking-wider bg-[#232323] hover:bg-[#333333] text-white hover:text-white/90 shadow-sm active:scale-95 transition-all"
                            >
                                Discard
                            </button>
                            <button 
                                form="memberForm"
                                type="submit" 
                                disabled={isUploading}
                                className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-[10px] font-bold uppercase tracking-wider text-xs shadow-sm hover:shadow active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
                            >
                                {isUploading ? (
                                    <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-base">save</span>
                                )}
                                {isEditing ? 'UPDATE' : 'Register Member'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Member Profile Modal */}
            {selectedProfile && liveProfile && (() => {
                const matchedApp = membershipApps.find(app => app.email === liveProfile.email) || {};
                const initials = `${liveProfile.name?.[0] ?? 'M'}`.toUpperCase();
                const userDoc = usersMap[(matchedApp as any).uid];
                const displayPhotoUrl = userDoc?.photoUrl || liveProfile.image || (matchedApp as any).photoUrl;

                return (
                    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedProfile(null)}></div>
                        <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col relative z-50 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-modal-pop text-left text-slate-900 dark:text-white">
                            
                            {/* Header */}
                            <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                                        <span className="material-symbols-outlined text-xl">admin_panel_settings</span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold uppercase tracking-tight text-slate-900 dark:text-white leading-none">Member Profile</h3>
                                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Management Terminal v2.2</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {canEdit && (
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedProfile(null); handleEditClick(liveProfile); }}
                                            className="px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 hover:bg-primary hover:text-white rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
                                        >
                                            <span className="material-symbols-outlined text-[13px]">edit</span>
                                            Edit Profile
                                        </button>
                                    )}
                                    <button 
                                        onClick={() => setSelectedProfile(null)} 
                                        className="size-9 hover:bg-red-500/10 hover:text-red-500 rounded-xl transition-all flex items-center justify-center text-slate-400 group"
                                    >
                                        <span className="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
                                    </button>
                                </div>
                            </div>

                            {/* Summary Panel */}
                            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/10 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                    {displayPhotoUrl && !displayPhotoUrl.includes('placeholder') ? (
                                        <img src={displayPhotoUrl} className="size-16 rounded-2xl object-cover shadow-md border-2 border-white dark:border-slate-700" alt="Avatar" />
                                    ) : (
                                        <div className="size-16 rounded-2xl bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center text-white text-2xl font-black shadow-lg">
                                            {initials}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-955 dark:text-white leading-tight">{liveProfile.name}</h2>
                                        <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mt-0.5">{liveProfile.type || matchedApp.type || 'Regular'} Facility Member</p>
                                        <div className="flex gap-2 mt-2">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                                liveProfile.isAccredited ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                                            }`}>
                                                <span className={`size-1.5 rounded-full ${
                                                    liveProfile.isAccredited ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-500'
                                                }`}></span>
                                                {liveProfile.isAccredited ? 'Accredited' : 'Standard'}
                                            </span>
                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase rounded-full border border-emerald-500/20">
                                                <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>link</span>
                                                Active Directory
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right sm:border-l border-slate-100 dark:border-white/5 sm:pl-6">
                                    <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">Joined Date</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{liveProfile.joinedAt ? new Date(liveProfile.joinedAt).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</p>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="flex bg-slate-100/50 dark:bg-slate-900/50 p-1.5 border-b border-slate-100 dark:border-white/5">
                                {[
                                    { id: 'clinic', label: 'Clinic & Contacts', icon: 'storefront', color: 'text-teal-500' },
                                    { id: 'account', label: 'Docs Onboarding', icon: 'assignment', color: 'text-amber-500' },
                                    { id: 'membership_info', label: 'Membership Information', icon: 'card_membership', color: 'text-indigo-500' },
                                    { id: 'accreditation', label: 'Accreditation', icon: 'verified_user', color: 'text-orange-500' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setMemberModalTab(tab.id as any)}
                                        className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all
                                            ${memberModalTab === tab.id 
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
                                {memberModalTab === 'clinic' && (
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
                                                    <p className="text-xs font-semibold text-slate-955 dark:text-white">{liveProfile.address || matchedApp.clinicAddress || '—'}</p>
                                                    {matchedApp.region && (
                                                        <span className="inline-block mt-2 px-2.5 py-0.5 bg-primary/10 text-primary text-[9px] font-black uppercase rounded">
                                                            {matchedApp.region}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-teal-500">apartment</span> Clinic / Hospital Name
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{liveProfile.name || matchedApp.hospitalName || matchedApp.clinicName || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-blue-500">corporate_fare</span> Business Structure
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{matchedApp.businessStructure || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-amber-500">badge</span> PRC License No
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{matchedApp.prcLicenseNo || matchedApp.prcLicense || 'N/A'}</p>
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
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{(liveProfile as any).representativeName || matchedApp.representativeName || liveProfile.headVeterinarian || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-violet-500">badge</span> Owner Name
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{matchedApp.ownerName || '—'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-sky-500">mail</span> Email Address
                                                    </p>
                                                    <a href={`mailto:${liveProfile.email}`} className="text-xs font-semibold text-primary hover:underline block truncate">{liveProfile.email}</a>
                                                </div>
                                                <div>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-emerald-500">call</span> Mobile / Phone Number
                                                    </p>
                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{liveProfile.phone || matchedApp.mobile || matchedApp.phone || '—'}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Description */}
                                        {matchedApp.description && (
                                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 space-y-3">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[13px] text-amber-500">description</span> Clinic Profile / Description
                                                </p>
                                                <p className="text-xs text-slate-650 dark:text-slate-300 leading-relaxed italic">
                                                    "{matchedApp.description}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Facility Gallery */}
                                        {matchedApp.facilityMedia && matchedApp.facilityMedia.length > 0 && (
                                            <div className="space-y-3">
                                                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-[13px] text-teal-500">photo_library</span> Facility Photos
                                                </p>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                                    {matchedApp.facilityMedia.map((media: any, idx: number) => (
                                                        <div
                                                            key={idx}
                                                            className="group relative aspect-video rounded-xl overflow-hidden bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5 cursor-pointer shadow-sm"
                                                            onClick={() => setViewerFile({ url: media.url, name: `Facility Photo ${idx + 1}.jpg` })}
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

                                {memberModalTab === 'account' && (
                                    <div className="space-y-6 animate-fade-in">
                                        {/* Attachments */}
                                        <div className="space-y-3">
                                            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                                <span className="material-symbols-outlined text-[13px] text-orange-500">folder</span> Attachments & Documentation
                                            </p>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {matchedApp.attachment && (
                                                    <div
                                                        onClick={() => setViewerFile({ url: matchedApp.attachment.url, name: 'Business Permit / Legal PDF' })}
                                                        className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all cursor-pointer group shadow-sm"
                                                    >
                                                        <div className="size-10 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-xl">description</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors truncate">Business Permit / Legal PDF</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Click to view file</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-base transition-colors">visibility</span>
                                                    </div>
                                                )}

                                                {matchedApp.paymentReference && (
                                                    <div
                                                        onClick={() => setViewerFile({ url: matchedApp.paymentReference, name: 'Manual Payment Receipt' })}
                                                        className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100/50 dark:hover:bg-white/5 transition-all cursor-pointer group shadow-sm"
                                                    >
                                                        <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                                                            <span className="material-symbols-outlined text-xl">payments</span>
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-bold text-xs text-slate-700 dark:text-slate-200 group-hover:text-primary transition-colors truncate">Manual Payment Receipt</p>
                                                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Click to view receipt</p>
                                                        </div>
                                                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary text-base transition-colors">visibility</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Onboarding Documents — the authoritative copy lives on the clinic's
                                                own users/{uid} profile (userDoc); the membership_applications doc
                                                only gets a mirrored copy when the member uploads while that exact
                                                application is their "pending" one, so it can be stale or missing
                                                for approved/re-applied members. Prefer the profile copy. */}
                                            {(() => {
                                                const onboardingDocs = (userDoc?.membershipDocuments && Object.keys(userDoc.membershipDocuments).length > 0)
                                                    ? userDoc.membershipDocuments
                                                    : matchedApp.membershipDocuments;
                                                if (!onboardingDocs || Object.keys(onboardingDocs).length === 0) return null;
                                                return (
                                                <div className="pt-2">
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-3 flex items-center gap-1.5">
                                                        <span className="material-symbols-outlined text-[13px] text-blue-500">folder_open</span> Onboarding Documents
                                                    </p>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {Object.entries(onboardingDocs as Record<string, any[]>).map(([docId, files]) => {
                                                            if (!files || files.length === 0) return null;
                                                            return (
                                                                <div key={docId} className="p-3.5 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-slate-200 dark:border-white/5">
                                                                    <p className="text-[9px] font-black text-slate-500 dark:text-slate-455 mb-2 uppercase tracking-wide leading-tight">
                                                                        {MEMBERSHIP_DOC_LABELS[docId] || docId}
                                                                    </p>
                                                                    <div className="space-y-1.5">
                                                                        {files.map((file: any, idx: number) => (
                                                                            <button
                                                                                key={idx}
                                                                                onClick={() => setViewerFile({ url: file.url, name: file.name })}
                                                                                className="w-full flex items-center gap-2.5 p-2 bg-white dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-white/5 hover:border-primary transition-colors group text-left"
                                                                            >
                                                                                <span className="material-symbols-outlined text-primary text-sm">
                                                                                    {docId === 'walkthrough_video' ? 'movie' : 'description'}
                                                                                </span>
                                                                                <span className="flex-1 min-w-0 text-[11px] font-semibold text-slate-700 dark:text-slate-200 truncate group-hover:text-primary transition-colors">
                                                                                    {file.name}
                                                                                </span>
                                                                                <span className="material-symbols-outlined text-slate-455 group-hover:text-primary text-xs">visibility</span>
                                                                            </button>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                )}

                                {memberModalTab === 'membership_info' && (() => {
                                    const displayReps = [
                                        ...memberReps,
                                        ...(matchedApp.representatives || [])
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

                                    const paidAtDate = matchedApp.paidAt ? new Date(matchedApp.paidAt) : liveProfile.joinedAt ? new Date(liveProfile.joinedAt) : null;
                                    const renewalDate = paidAtDate ? new Date(paidAtDate.getFullYear() + 1, paidAtDate.getMonth(), paidAtDate.getDate()) : null;
                                    
                                    const memberSinceStr = paidAtDate
                                        ? paidAtDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                        : '—';
                                        
                                    const renewalDateStr = renewalDate
                                        ? renewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                                        : '—';

                                    const userPlan = membershipPlans.find(p => p.type === liveProfile.type || p.id === liveProfile.type);
                                    // Annual dues = the recurring renewal fee (₱2,000), not the one-time ₱5,000 first payment
                                    const annualDuesStr = userPlan
                                        ? `₱${Number(userPlan.recurringFee ?? userPlan.fee ?? 0).toLocaleString()} / year`
                                        : (liveProfile.type === 'Associate' ? '₱3,500 / year' : '₱2,000 / year');

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
                                                        <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white truncate" title={(liveProfile as any).memberId || getApplicationId(matchedApp)}>{(liveProfile as any).memberId || getApplicationId(matchedApp)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-amber-500">info</span> Status
                                                        </p>
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                                                            Active Member
                                                        </span>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-teal-500">card_membership</span> Membership Type
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{liveProfile.type || 'Regular'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-blue-500">corporate_fare</span> Business Structure
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{matchedApp.businessStructure || '—'}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-455 mb-1 flex items-center gap-1.5">
                                                            <span className="material-symbols-outlined text-[13px] text-rose-500">calendar_today</span> Registration Date
                                                        </p>
                                                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                                                            {(() => {
                                                                const dateVal = matchedApp.date || liveProfile.joinedAt;
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
                                                    * Synced with the annual membership plan cycle. Expiry notifications and billing are automatically generated 30 days prior to the renewal date.
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
                                                                                    (e.target as HTMLElement).style.display = 'none';
                                                                                }}
                                                                            />
                                                                        ) : (
                                                                            <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 border border-primary/20">
                                                                                <span className="material-symbols-outlined text-lg">person</span>
                                                                            </div>
                                                                        )}
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="font-bold text-xs text-slate-800 dark:text-white truncate">{rep.fullName || rep.name}</p>
                                                                            <p className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider truncate">{rep.designation || rep.role || 'Representative'}</p>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="space-y-1.5 text-[10px] font-medium text-slate-500 pt-1 border-t border-slate-200/50 dark:border-white/5">
                                                                        {rep.email && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-xs">mail</span><span className="truncate">{rep.email}</span></div>}
                                                                        {rep.phone && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-xs">call</span><span>{rep.phone}</span></div>}
                                                                        {rep.prcLicenseNo && <div className="flex items-center gap-1.5"><span className="material-symbols-outlined text-xs">badge</span><span>PRC: {rep.prcLicenseNo}</span></div>}
                                                                    </div>

                                                                    {/* Status Badges */}
                                                                    <div className="absolute top-3 right-3 flex gap-1">
                                                                        {isPrimary && (
                                                                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[8px] font-bold uppercase tracking-wider">
                                                                                Primary
                                                                            </span>
                                                                        )}
                                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                                                                            isActive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-400/10 text-slate-400'
                                                                        }`}>
                                                                            {isActive ? 'Active' : 'Inactive'}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}

                                {memberModalTab === 'accreditation' && (() => {
                                    const accApp = acApplications.find(a => a.email === liveProfile.email || a.clinicId === (matchedApp as any).uid || a.clinicName === liveProfile.name);
                                    const myRegistrations = registrations.filter(r => (r.attendeeEmail || '').toLowerCase() === (liveProfile.email || '').toLowerCase());
                                    return (
                                        <div className="space-y-6 animate-fade-in text-left">
                                            {/* Accreditation Status */}
                                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5 space-y-5">
                                                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-200/60 dark:border-white/5">
                                                    <div className="size-8 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-lg">verified_user</span>
                                                    </div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Accreditation Status</h4>
                                                </div>
                                                {!accApp ? (
                                                    <p className="text-xs text-slate-400 italic">This member has not applied for accreditation yet.</p>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                                accApp.status === 'accredited' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                                (accApp.status === 'rejected' || accApp.status === 'needs_compliance') ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                                'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                                                            }`}>
                                                                {WORKFLOW_STATUS_LABELS[accApp.status as keyof typeof WORKFLOW_STATUS_LABELS] || String(accApp.status).replace(/_/g, ' ')}
                                                            </span>
                                                            <span className="text-[10px] text-slate-400 font-mono">{accApp.loiData?.loiRef || accApp.id}</span>
                                                        </div>
                                                        {accApp.paymentData?.accreditationNo && (
                                                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50 dark:border-white/5">
                                                                <div>
                                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-1">Accreditation No.</p>
                                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{accApp.paymentData.accreditationNo}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-450 mb-1">Valid Until</p>
                                                                    <p className="text-xs font-semibold text-slate-900 dark:text-white">{accApp.paymentData.validUntil ? new Date(accApp.paymentData.validUntil).toLocaleDateString() : '—'}</p>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {accApp.complianceRejectionReason && accApp.status === 'needs_compliance' && (
                                                            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-500/20">
                                                                <p className="text-[10px] font-bold text-red-600 dark:text-red-400">Reason: {accApp.complianceRejectionReason}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Events Joined */}
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-2.5 pb-2">
                                                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                                        <span className="material-symbols-outlined text-lg">event</span>
                                                    </div>
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Events Joined ({myRegistrations.length})</h4>
                                                </div>
                                                {myRegistrations.length === 0 ? (
                                                    <div className="p-4 text-center bg-slate-50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-white/5 text-xs text-slate-400 font-semibold italic">
                                                        No event registrations yet.
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {myRegistrations.map(reg => (
                                                            <div key={reg.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-white/5">
                                                                <div className="min-w-0">
                                                                    <p className="text-xs font-bold text-slate-800 dark:text-white truncate">{reg.eventTitle}</p>
                                                                    <p className="text-[10px] text-slate-400">{reg.registrationDate ? new Date(reg.registrationDate).toLocaleDateString() : ''}</p>
                                                                </div>
                                                                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full shrink-0 ${
                                                                    reg.paymentStatus === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                                }`}>{reg.paymentStatus}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-end gap-2.5">
                                <button onClick={() => setSelectedProfile(null)} className="px-5 py-2.5 bg-slate-150 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-650 dark:text-slate-300 rounded-xl font-bold text-xs uppercase tracking-wider transition-all">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })()}
            {inspectAppId && (
                <InspectApplicationModal
                    appId={inspectAppId}
                    onClose={() => setInspectAppId(null)}
                />
            )}
            <FileViewerModal file={viewerFile} onClose={() => setViewerFile(null)} />

            {/* Reconcile Directory Modal */}
            {showReconcileModal && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowReconcileModal(false)} />
                    <div className="bg-white dark:bg-[#1E293B] rounded-3xl w-full max-w-4xl max-h-[88vh] flex flex-col relative z-50 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-modal-pop">
                        <div className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">fact_check</span>
                                    Reconcile with Official Directory
                                </h3>
                                <p className="text-[11px] text-slate-400 mt-1">
                                    Comparing {members.length} database members against {OFFICIAL_DIRECTORY.length} entries in the official PAHA directory.
                                </p>
                            </div>
                            <button onClick={() => setShowReconcileModal(false)} className="size-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {/* Needs Fix */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-amber-600 flex items-center gap-1.5">
                                        <span className="material-symbols-outlined text-sm">warning</span>
                                        Mismatched Records ({reconcileReport.needsFix.length})
                                    </h4>
                                    {reconcileReport.needsFix.length > 0 && (
                                        <button
                                            onClick={applyAllReconcileFixes}
                                            className="px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
                                        >
                                            Apply All Fixes
                                        </button>
                                    )}
                                </div>
                                {reconcileReport.needsFix.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No mismatches found — all matched records are accurate.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {reconcileReport.needsFix.map(({ member, official, diffs }) => (
                                            <div key={member.id} className="p-4 rounded-xl border border-amber-200 dark:border-amber-500/20 bg-amber-50/50 dark:bg-amber-500/5">
                                                <div className="flex items-center justify-between gap-3 mb-2">
                                                    <span className="font-bold text-sm text-slate-900 dark:text-white">{member.name}</span>
                                                    <button
                                                        disabled={reconcileBusyId === member.id}
                                                        onClick={() => applyReconcileFix(member, official)}
                                                        className="shrink-0 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 disabled:opacity-40 transition-all"
                                                    >
                                                        {reconcileBusyId === member.id ? 'Applying...' : 'Apply Fix'}
                                                    </button>
                                                </div>
                                                <div className="space-y-1.5">
                                                    {diffs.includes('representative') && (
                                                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                                            <span className="font-bold uppercase tracking-wider text-slate-400">Representative:</span>{' '}
                                                            <span className="line-through text-rose-500">{(member as any).representativeName || member.headVeterinarian || '—'}</span>{' '}
                                                            → <span className="text-emerald-600 font-semibold">{official.representative}</span>
                                                        </div>
                                                    )}
                                                    {diffs.includes('address') && (
                                                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                                            <span className="font-bold uppercase tracking-wider text-slate-400">Address:</span>{' '}
                                                            <span className="line-through text-rose-500">{member.address || '—'}</span>{' '}
                                                            → <span className="text-emerald-600 font-semibold">{official.address}</span>
                                                        </div>
                                                    )}
                                                    {diffs.includes('phone') && (
                                                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                                            <span className="font-bold uppercase tracking-wider text-slate-400">Phone:</span>{' '}
                                                            <span className="line-through text-rose-500">{member.phone || '—'}</span>{' '}
                                                            → <span className="text-emerald-600 font-semibold">{official.phone}</span>
                                                        </div>
                                                    )}
                                                    {diffs.includes('accreditation') && (
                                                        <div className="text-[11px] text-slate-600 dark:text-slate-300">
                                                            <span className="font-bold uppercase tracking-wider text-slate-400">Accreditation:</span>{' '}
                                                            <span className="line-through text-rose-500">{member.isAccredited ? 'Accredited' : 'Not Accredited'}</span>{' '}
                                                            → <span className="text-emerald-600 font-semibold">{official.accredited ? 'Accredited' : 'Not Accredited'}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Missing from database */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-3">
                                    <span className="material-symbols-outlined text-sm">person_search</span>
                                    In Directory, Not in Database ({reconcileReport.missing.length})
                                </h4>
                                {reconcileReport.missing.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Every directory entry has a matching database record.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {reconcileReport.missing.map(entry => (
                                            <div key={entry.institution} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02]">
                                                <div className="min-w-0">
                                                    <div className="font-bold text-xs text-slate-800 dark:text-white truncate">{entry.institution}</div>
                                                    <div className="text-[10px] text-slate-400 truncate">{entry.representative} · {entry.address}</div>
                                                </div>
                                                <button
                                                    onClick={() => addMember({
                                                        name: entry.institution,
                                                        address: entry.address,
                                                        phone: entry.phone,
                                                        email: '',
                                                        type: 'Regular',
                                                        isAccredited: entry.accredited,
                                                        image: '',
                                                        representativeName: entry.representative,
                                                    } as Omit<MemberProfile, 'id'>)}
                                                    className="shrink-0 px-3 py-1.5 rounded-lg bg-primary text-white text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* In database, not in official directory */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5 mb-3">
                                    <span className="material-symbols-outlined text-sm">help_outline</span>
                                    In Database, Not in Directory ({reconcileReport.extra.length})
                                </h4>
                                {reconcileReport.extra.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No unlisted records — nothing to review here.</p>
                                ) : (
                                    <p className="text-[11px] text-slate-400 mb-2">These aren't in the official directory PDF. Review manually — they may be newer members not yet added to the printed directory, or records that need cleanup.</p>
                                )}
                                {reconcileReport.extra.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                        {reconcileReport.extra.map(m => (
                                            <span key={m.id} className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/5 text-[10px] font-semibold text-slate-600 dark:text-slate-300">{m.name}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

        {/* Password Confirmation Modal for Account Deletion */}
        {showPasswordModal && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 dark:border-white/10">
                    <div className="flex items-center gap-3 mb-5">
                        <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center">
                            <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-lg">warning</span>
                        </div>
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Confirm Deletion</h3>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">Enter your password to permanently delete this member.</p>
                        </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                        This will <strong>permanently remove</strong> the member's account, all application records, uploaded documents, event registrations, and login access. This action <strong>cannot be undone</strong>.
                    </p>

                    <div className="mb-1">
                        <label htmlFor="delete-confirm-password" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                            Your Password
                        </label>
                        <input
                            id="delete-confirm-password"
                            type="password"
                            value={passwordInput}
                            onChange={e => { setPasswordInput(e.target.value); setPasswordError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleConfirmDelete()}
                            placeholder="Enter your password"
                            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-400 dark:focus:border-rose-400 transition-all"
                            autoFocus
                        />
                        {passwordError && (
                            <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1.5 font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">error</span>
                                {passwordError}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-2 mt-5">
                        <button
                            onClick={handleCancelDelete}
                            disabled={isDeleting}
                            className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting || !passwordInput}
                            className="flex-1 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-xl bg-rose-600 hover:bg-rose-700 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                        >
                            {isDeleting ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Verifying...
                                </>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-sm">delete_forever</span>
                                    Delete Account
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}
        </div>
    );
};

export default MembersManager;
