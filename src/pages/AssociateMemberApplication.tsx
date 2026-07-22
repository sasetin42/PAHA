import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { INITIAL_MEMBERS_DATA } from '../data/initialMembers';
import type { InitialMember } from '../data/initialMembers';
import { cleanPhoneInput } from '../utils/phone';

interface Representative {
    id: string;
    fullName: string;
    designation: string;
    designationOther: string;
    prcLicenseNo: string;
    contactNo: string;
    email: string;
}

interface RequiredDocument {
    id: string;
    label: string;
    note?: string;
}

interface FormState {
    clinicName: string;
    primaryRep: Representative;
    additionalReps: Representative[];
    documents: { [key: string]: File | null };
    confirmed: boolean;
}

const CLINIC_OPTIONS = INITIAL_MEMBERS_DATA.map((m: InitialMember) => ({
    name: m.name,
    address: m.address,
    email: m.email,
    phone: m.phone,
    headVeterinarian: m.headVeterinarian,
    type: m.type,
}));

const MAX_ADDITIONAL_REPS = 1; // Increase when tier feature is re-enabled

const newRep = (): Representative => ({
    id: `rep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    fullName: '',
    designation: '',
    designationOther: '',
    prcLicenseNo: '',
    contactNo: '',
    email: '',
});

const REQUIRED_DOCS: RequiredDocument[] = [
    { id: 'parent_cert', label: "Parent Clinic's PAHA Membership Certificate", note: "Copy of the parent clinic's current certificate of membership." },
    { id: 'business_permit', label: "Current Business Permit / Mayor's Permit" },
    { id: 'bai_cert', label: "BAI Certificate of Registration", note: "Classification must be Veterinary Clinic (Surgical) or Veterinary Hospital" },
    { id: 'bir_2303', label: "BIR COR 2303" },
    { id: 'ptr_rep', label: "Current PTR of Representative" },
    { id: 'prc_id', label: "Updated PRC License ID of Representative" },
];

const AssociateMemberApplication: React.FC = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [formData, setFormData] = useState<FormState>({
        clinicName: '',
        primaryRep: newRep(),
        additionalReps: [],
        documents: {},
        confirmed: false,
    });

    const LAST_STEP = 3;
    const isClinicSelected = formData.clinicName.trim() !== '';
    const selectedClinic = CLINIC_OPTIONS.find((c: any) => c.name === formData.clinicName);

    const steps = [
        { id: 1, name: 'Representatives', icon: 'group' },
        { id: 2, name: 'Documents', icon: 'upload_file' },
        { id: 3, name: 'Review & Submit', icon: 'task_alt' },
    ];

    const isRepComplete = (rep: Representative) =>
        rep.fullName.trim() !== '' &&
        rep.designation.trim() !== '' &&
        (rep.designation !== 'Others' || rep.designationOther.trim() !== '') &&
        rep.contactNo.trim() !== '' &&
        rep.email.trim() !== '';

    const validateStep = (s: number) => {
        if (s === 1)
            return (
                isClinicSelected &&
                isRepComplete(formData.primaryRep) &&
                formData.additionalReps.every(isRepComplete)
            );
        if (s === 2) return REQUIRED_DOCS.every(d => formData.documents[d.id]);
        return true;
    };

    const handleNext = () => {
        if (validateStep(step)) {
            setStep(p => Math.min(p + 1, LAST_STEP));
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleBack = () => {
        setStep(p => Math.max(p - 1, 1));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const updatePrimaryRep = (field: keyof Representative, value: string) =>
        setFormData(prev => ({ ...prev, primaryRep: { ...prev.primaryRep, [field]: value } }));

    const updateAdditionalRep = (id: string, field: keyof Representative, value: string) =>
        setFormData(prev => ({
            ...prev,
            additionalReps: prev.additionalReps.map(r => (r.id === id ? { ...r, [field]: value } : r)),
        }));

    const addRepresentative = () => {
        if (formData.additionalReps.length < MAX_ADDITIONAL_REPS) {
            setFormData(prev => ({ ...prev, additionalReps: [...prev.additionalReps, newRep()] }));
        }
    };

    const removeRepresentative = (id: string) =>
        setFormData(prev => ({
            ...prev,
            additionalReps: prev.additionalReps.filter(r => r.id !== id),
        }));

    const handleFileUpload = (id: string, file: File | null) =>
        setFormData(prev => ({ ...prev, documents: { ...prev.documents, [id]: file } }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.confirmed) return;
        setIsSubmitting(true);
        try {
            const uploadedUrls: Record<string, string> = {};
            const applicationId = `ASSOC-${Date.now()}`;
            for (const [id, file] of Object.entries(formData.documents)) {
                if (file) {
                    const fileRef = ref(storage, `associate_applications/${applicationId}/${id}_${file.name}`);
                    const snapshot = await uploadBytes(fileRef, file);
                    uploadedUrls[id] = await getDownloadURL(snapshot.ref);
                }
            }
            const allReps = [formData.primaryRep, ...formData.additionalReps];
            await addDoc(collection(db, 'membership_applications'), {
                applicationId,
                membershipType: 'Associate',
                clinicName: formData.clinicName,
                clinicAddress: selectedClinic?.address ?? '',
                email: selectedClinic?.email ?? '',
                phone: selectedClinic?.phone ?? '',
                headVeterinarian: selectedClinic?.headVeterinarian ?? '',
                representatives: allReps,
                // Legacy fields
                type: 'Associate',
                hospitalName: formData.clinicName,
                mobile: selectedClinic?.phone ?? '',
                representativeName: formData.primaryRep.fullName,
                prcLicenseNo: formData.primaryRep.prcLicenseNo,
                contactNo: formData.primaryRep.contactNo,
                representativeEmail: formData.primaryRep.email,
                firstName: formData.primaryRep.fullName.split(' ')[0] || '',
                lastName: formData.primaryRep.fullName.split(' ').slice(1).join(' ') || '',
                documents: uploadedUrls,
                createdAt: serverTimestamp(),
                date: new Date().toISOString(),
                status: 'pending',
            });
            setShowSuccessModal(true);
        } catch (error: any) {
            alert(`Submission failed (${error.code ?? 'no-code'}): ${error.message ?? 'Unknown error'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputEnabled = 'w-full px-5 py-4 rounded-xl border outline-none transition-all bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB]';
    const inputDisabled = 'w-full px-5 py-4 rounded-xl border outline-none bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/50 text-slate-400 cursor-not-allowed';
    const inp = (disabled: boolean) => (disabled ? inputDisabled : inputEnabled);

    const ReadOnlyField = ({ label, value }: { label: string; value: string }) => (
        <div className="space-y-1.5">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 ml-1 uppercase tracking-wider flex items-center gap-1">
                {label}
                <span className="material-symbols-outlined text-[12px] text-slate-400">lock</span>
            </p>
            <div className="w-full px-5 py-4 rounded-xl border bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-medium cursor-not-allowed">
                {value || '—'}
            </div>
        </div>
    );

    const RepCard = ({
        rep,
        index,
        isPrimary,
        onUpdate,
        onRemove,
    }: {
        rep: Representative;
        index: number;
        isPrimary: boolean;
        onUpdate: (f: keyof Representative, v: string) => void;
        onRemove?: () => void;
    }) => (
        <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`size-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${isPrimary ? 'bg-[#2563EB]' : 'bg-slate-500'}`}>
                        {index + 1}
                    </div>
                    <span className="font-bold text-[#1E3A8A] dark:text-white text-sm uppercase tracking-wider">
                        {isPrimary ? 'Primary Representative' : `Additional Representative ${index}`}
                    </span>
                    {isPrimary && (
                        <span className="text-[10px] font-bold bg-blue-100 dark:bg-blue-900/30 text-[#2563EB] px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
                    )}
                </div>
                {!isPrimary && onRemove && (
                    <button
                        type="button"
                        onClick={onRemove}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold"
                    >
                        <span className="material-symbols-outlined text-base">delete</span>
                        Remove
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                    <label htmlFor={`assoc-rep-${index}-fullName`} className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1 uppercase tracking-wider">
                        Name of Representative <span className="text-red-500">*</span>
                    </label>
                    <input
                        id={`assoc-rep-${index}-fullName`}
                        type="text"
                        required
                        placeholder="Full legal name"
                        disabled={!isClinicSelected}
                        className={inp(!isClinicSelected)}
                        value={rep.fullName}
                        onChange={e => onUpdate('fullName', e.target.value)}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor={`assoc-rep-${index}-designation`} className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1 uppercase tracking-wider">
                        Designation <span className="text-red-500">*</span>
                    </label>
                    <select
                        id={`assoc-rep-${index}-designation`}
                        required
                        disabled={!isClinicSelected}
                        className={inp(!isClinicSelected) + ' appearance-none'}
                        value={rep.designation}
                        onChange={e => onUpdate('designation', e.target.value)}
                    >
                        <option value="">Select designation</option>
                        <option value="Veterinarian">Veterinarian</option>
                        <option value="Senior Veterinarian">Senior Veterinarian</option>
                        <option value="Clinic Manager">Clinic Manager</option>
                        <option value="Branch Manager">Branch Manager</option>
                        <option value="Medical Officer">Medical Officer</option>
                        <option value="Others">Others</option>
                    </select>
                </div>
                {rep.designation === 'Others' && (
                    <div className="space-y-1.5">
                        <label htmlFor={`assoc-rep-${index}-designationOther`} className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1 uppercase tracking-wider">
                            Specify Designation <span className="text-red-500">*</span>
                        </label>
                        <input
                            id={`assoc-rep-${index}-designationOther`}
                            type="text"
                            required
                            placeholder="Enter designation"
                            disabled={!isClinicSelected}
                            className={inp(!isClinicSelected)}
                            value={rep.designationOther}
                            onChange={e => onUpdate('designationOther', e.target.value)}
                        />
                    </div>
                )}
                <div className="space-y-1.5">
                    <label htmlFor={`assoc-rep-${index}-prcLicense`} className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1 uppercase tracking-wider">
                        PRC License No.
                    </label>
                    <input
                        id={`assoc-rep-${index}-prcLicense`}
                        type="text"
                        placeholder="e.g. 0012345"
                        disabled={!isClinicSelected}
                        className={inp(!isClinicSelected)}
                        value={rep.prcLicenseNo}
                        onChange={e => {
                            const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                            onUpdate('prcLicenseNo', cleaned);
                        }}
                        onBlur={() => {
                            if (rep.prcLicenseNo && rep.prcLicenseNo.length < 6) {
                                onUpdate('prcLicenseNo', rep.prcLicenseNo.padStart(6, '0'));
                            }
                        }}
                    />
                </div>
                <div className="space-y-1.5">
                    <label htmlFor={`assoc-rep-${index}-contactNo`} className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1 uppercase tracking-wider">
                        Contact No. <span className="text-red-500">*</span>
                    </label>
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
                            id={`assoc-rep-${index}-contactNo`}
                            type="tel"
                            required
                            placeholder="9XX XXX XXXX"
                            disabled={!isClinicSelected}
                            className={inp(!isClinicSelected) + ' pl-16'}
                            value={cleanPhoneInput(rep.contactNo)}
                            onChange={e => onUpdate('contactNo', cleanPhoneInput(e.target.value))}
                            maxLength={10}
                        />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label htmlFor={`assoc-rep-${index}-email`} className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-1 uppercase tracking-wider">
                        Email <span className="text-red-500">*</span>
                    </label>
                    <input
                        id={`assoc-rep-${index}-email`}
                        type="email"
                        required
                        placeholder="representative@email.com"
                        disabled={!isClinicSelected}
                        className={inp(!isClinicSelected)}
                        value={rep.email}
                        onChange={e => onUpdate('email', e.target.value)}
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#0F172A] pt-32 pb-20 px-4 transition-colors duration-500">
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <div className="max-w-4xl mx-auto relative z-10">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-[#2563EB] text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-4 border border-blue-100 dark:border-blue-900/30">
                        <span className="material-symbols-outlined text-sm">account_tree</span>
                        Associate Membership
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-[#1E3A8A] dark:text-white mb-4 tracking-tight">
                        Associate <span className="text-[#2563EB]">Application</span>
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto font-medium">
                        Select your clinic and register your representatives below.
                    </p>
                </div>

                {/* Progress Stepper */}
                <div className="mb-12 flex items-center justify-between px-4 max-w-2xl mx-auto relative">
                    <div className="absolute top-5 left-8 right-8 h-0.5 bg-slate-200 dark:bg-slate-700 -z-10"></div>
                    {steps.map(s => (
                        <div key={s.id} className="flex flex-col items-center gap-2">
                            <div className={`flex items-center justify-center size-10 rounded-full border-2 transition-all duration-300 z-10 ${
                                step === s.id
                                    ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-lg shadow-blue-500/30 scale-110'
                                    : step > s.id
                                    ? 'bg-green-500 border-green-500 text-white'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'
                            }`}>
                                {step > s.id
                                    ? <span className="material-symbols-outlined text-[18px]">check</span>
                                    : <span className="material-symbols-outlined text-[18px]">{s.icon}</span>}
                            </div>
                            <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-center max-w-[72px] leading-tight ${
                                step === s.id ? 'text-[#1E3A8A] dark:text-white' : 'text-slate-400'
                            }`}>
                                {s.name}
                            </span>
                        </div>
                    ))}
                    <div
                        className="absolute top-5 left-8 h-0.5 bg-[#2563EB] transition-all duration-500 -z-10"
                        style={{ width: `${((step - 1) / (LAST_STEP - 1)) * 84}%` }}
                    ></div>
                </div>

                {/* Form Card */}
                <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 md:p-10 shadow-xl border border-slate-100 dark:border-slate-700">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* ── STEP 1: CLINIC + REPRESENTATIVES ── */}
                        {step === 1 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                                <div>
                                    <h2 className="text-2xl font-bold text-[#1E3A8A] dark:text-white mb-1">Clinic & Representatives</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Select a clinic first — clinic details will auto-fill, then complete the representative information.
                                    </p>
                                </div>

                                {/* ── Clinic Name Dropdown ── */}
                                <div className="space-y-1.5">
                                    <label htmlFor="assoc-clinicName" className="text-sm font-bold text-slate-700 dark:text-slate-300 ml-1">
                                        Clinic Name <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <select
                                            id="assoc-clinicName"
                                            required
                                            className="w-full px-5 py-4 pr-10 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-all appearance-none cursor-pointer font-medium"
                                            value={formData.clinicName}
                                            onChange={e => setFormData(prev => ({ ...prev, clinicName: e.target.value }))}
                                        >
                                            <option value="">— Select a clinic —</option>
                                            {CLINIC_OPTIONS.map((c: any) => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
                                    </div>
                                    {!isClinicSelected && (
                                        <p className="text-xs text-amber-600 dark:text-amber-400 ml-1 flex items-center gap-1 mt-1">
                                            <span className="material-symbols-outlined text-sm">info</span>
                                            Select a clinic to unlock all fields below.
                                        </p>
                                    )}
                                </div>

                                {/* ── Auto-filled locked clinic fields ── */}
                                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity duration-300 ${!isClinicSelected ? 'opacity-40 pointer-events-none select-none' : ''}`}>
                                    <ReadOnlyField label="Address" value={selectedClinic?.address ?? ''} />
                                    <ReadOnlyField label="Phone" value={selectedClinic?.phone ?? ''} />
                                    <ReadOnlyField label="Email" value={selectedClinic?.email ?? ''} />
                                    <ReadOnlyField label="Head Veterinarian" value={selectedClinic?.headVeterinarian ?? ''} />
                                </div>

                                {/* ── Divider ── */}
                                <div className="flex items-center gap-3">
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Representatives</span>
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                                </div>

                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Up to {MAX_ADDITIONAL_REPS} additional representative{MAX_ADDITIONAL_REPS > 1 ? 's' : ''} allowed.
                                    </p>
                                    <div className="text-xs font-bold px-3 py-1.5 rounded-full bg-blue-100 text-[#2563EB] dark:bg-blue-900/30">
                                        {formData.additionalReps.length} / {MAX_ADDITIONAL_REPS} additional
                                    </div>
                                </div>

                                {/* Primary Rep */}
                                <RepCard
                                    rep={formData.primaryRep}
                                    index={0}
                                    isPrimary
                                    onUpdate={updatePrimaryRep}
                                />

                                {/* Additional Reps */}
                                {formData.additionalReps.map((rep, idx) => (
                                    <RepCard
                                        key={rep.id}
                                        rep={rep}
                                        index={idx + 1}
                                        isPrimary={false}
                                        onUpdate={(f, v) => updateAdditionalRep(rep.id, f, v)}
                                        onRemove={() => removeRepresentative(rep.id)}
                                    />
                                ))}

                                {/* Add Rep Button */}
                                {formData.additionalReps.length < MAX_ADDITIONAL_REPS && (
                                    <button
                                        type="button"
                                        onClick={addRepresentative}
                                        disabled={!isClinicSelected}
                                        className={`w-full py-4 rounded-2xl border-2 border-dashed font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                                            !isClinicSelected
                                                ? 'border-slate-200 dark:border-slate-700/50 text-slate-300 cursor-not-allowed'
                                                : 'border-[#2563EB]/40 text-[#2563EB] hover:border-[#2563EB] hover:bg-blue-50 dark:hover:bg-blue-900/10 cursor-pointer'
                                        }`}
                                    >
                                        <span className="material-symbols-outlined">person_add</span>
                                        Add New Representative
                                        <span className="text-xs font-normal text-slate-400 ml-1">
                                            ({formData.additionalReps.length}/{MAX_ADDITIONAL_REPS} added)
                                        </span>
                                    </button>
                                )}

                                {formData.additionalReps.length >= MAX_ADDITIONAL_REPS && (
                                    <p className="text-center text-xs text-slate-400 font-bold uppercase tracking-wider">
                                        Maximum representatives reached
                                    </p>
                                )}
                            </div>
                        )}

                        {/* ── STEP 2: DOCUMENTS ── */}
                        {step === 2 && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-500">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-[#1E3A8A] dark:text-white mb-2">Document Upload</h2>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Upload all required documents. Accepted formats: <span className="font-bold">PDF, JPG, PNG</span>. Max 10MB per file.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 gap-6">
                                    {REQUIRED_DOCS.map(doc => (
                                        <div key={doc.id} className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label htmlFor={`assoc-doc-${doc.id}`} className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                                    {doc.label} <span className="text-red-500 ml-0.5">*</span>
                                                </label>
                                                <span className="text-[10px] font-bold uppercase text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">Required</span>
                                            </div>
                                            {doc.note && (
                                                <p className="text-xs text-blue-600 dark:text-blue-400 italic">Note: {doc.note}</p>
                                            )}
                                            <div className={`relative group border-2 border-dashed rounded-2xl transition-all duration-300 ${
                                                formData.documents[doc.id]
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/10'
                                                    : 'border-slate-200 dark:border-slate-700 hover:border-[#2563EB] hover:bg-slate-50 dark:hover:bg-slate-900/30'
                                            }`}>
                                                <input
                                                    id={`assoc-doc-${doc.id}`}
                                                    type="file"
                                                    accept=".pdf,.jpg,.jpeg,.png"
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    onChange={e => handleFileUpload(doc.id, e.target.files?.[0] || null)}
                                                />
                                                <div className="p-6 flex flex-col items-center justify-center text-center">
                                                    {formData.documents[doc.id] ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="size-12 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg">
                                                                <span className="material-symbols-outlined">check</span>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[300px]">
                                                                    {formData.documents[doc.id]?.name}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleFileUpload(doc.id, null)}
                                                                    className="text-xs text-red-500 font-bold hover:underline relative z-20"
                                                                >
                                                                    Remove file
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-[#2563EB] group-hover:text-white transition-all">
                                                                <span className="material-symbols-outlined text-2xl">upload</span>
                                                            </div>
                                                            <p className="text-sm font-bold text-slate-600 dark:text-slate-400">Click to upload or drag and drop</p>
                                                            <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">PDF, JPG, PNG (MAX 10MB)</p>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ── STEP 3: REVIEW & SUBMIT ── */}
                        {step === 3 && (
                            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-500">
                                <h2 className="text-2xl font-bold text-[#1E3A8A] dark:text-white mb-8">Review & Submit</h2>
                                <div className="space-y-6">

                                    {/* Clinic */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">domain</span> Clinic
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                                            {[
                                                { label: 'Clinic Name', value: formData.clinicName },
                                                { label: 'Head Veterinarian', value: selectedClinic?.headVeterinarian ?? '—' },
                                                { label: 'Address', value: selectedClinic?.address ?? '—' },
                                                { label: 'Phone', value: selectedClinic?.phone ?? '—' },
                                                { label: 'Email', value: selectedClinic?.email ?? '—' },
                                            ].map((item, i) => (
                                                <div key={i} className="flex flex-col">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Representatives */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">group</span>
                                            Representatives ({1 + formData.additionalReps.length} total)
                                        </h3>
                                        <div className="space-y-3">
                                            {[formData.primaryRep, ...formData.additionalReps].map((rep, idx) => (
                                                <div key={rep.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <div className={`size-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${idx === 0 ? 'bg-[#2563EB]' : 'bg-slate-500'}`}>{idx + 1}</div>
                                                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{idx === 0 ? 'Primary' : 'Additional'}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                        {[
                                                            { label: 'Name', value: rep.fullName },
                                                            { label: 'Designation', value: rep.designation === 'Others' ? rep.designationOther : rep.designation },
                                                            { label: 'PRC License', value: rep.prcLicenseNo || '—' },
                                                            { label: 'Contact No.', value: rep.contactNo },
                                                            { label: 'Email', value: rep.email },
                                                        ].map((item, i) => (
                                                            <div key={i} className="flex flex-col">
                                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</span>
                                                                <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Documents */}
                                    <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-800">
                                        <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-400 mb-4 flex items-center gap-2">
                                            <span className="material-symbols-outlined text-lg">description</span> Documents Submitted
                                        </h3>
                                        <div className="space-y-3">
                                            {REQUIRED_DOCS.map(doc => (
                                                <div key={doc.id} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 dark:border-slate-800 last:border-0">
                                                    <span className="font-medium text-slate-600 dark:text-slate-400">{doc.label}</span>
                                                    <div className="flex items-center gap-2 text-green-600 font-bold">
                                                        <span className="text-xs truncate max-w-[150px]">{formData.documents[doc.id]?.name}</span>
                                                        <span className="material-symbols-outlined text-base">check_circle</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Fee Notice */}
                                    <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-900/30 rounded-2xl p-6 flex gap-4">
                                        <div className="size-10 shrink-0 rounded-full bg-amber-500 text-white flex items-center justify-center">
                                            <span className="material-symbols-outlined">warning</span>
                                        </div>
                                        <div className="space-y-1">
                                            <h4 className="font-bold text-amber-900 dark:text-amber-400">Application Fee Required</h4>
                                            <p className="text-sm text-amber-800 dark:text-amber-500 leading-relaxed">
                                                A fee of <span className="font-bold text-lg">₱5,000</span> is required upon approval. You will be contacted by PAHA for payment instructions.
                                            </p>
                                        </div>
                                    </div>

                                    {/* Confirmation */}
                                    <label htmlFor="assoc-confirmed" className="flex items-start gap-4 p-5 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl cursor-pointer hover:bg-blue-100/50 transition-colors">
                                        <input
                                            id="assoc-confirmed"
                                            type="checkbox"
                                            className="size-5 rounded border-blue-300 text-[#2563EB] focus:ring-[#2563EB] mt-0.5"
                                            checked={formData.confirmed}
                                            onChange={e => setFormData(prev => ({ ...prev, confirmed: e.target.checked }))}
                                        />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed">
                                            I confirm that all information and documents submitted are true and accurate, and that this representative is legitimately associated with the selected clinic. I understand that any false information may result in rejection.
                                        </span>
                                    </label>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="pt-10 mt-10 border-t border-slate-100 dark:border-slate-800 flex flex-col-reverse sm:flex-row justify-between gap-4">
                            <button
                                type="button"
                                onClick={step === 1 ? () => navigate('/membership/application') : handleBack}
                                className="px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-slate-500 hover:text-[#1E3A8A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">arrow_back</span>
                                {step === 1 ? 'Back to Application' : 'Previous'}
                            </button>

                            {step < LAST_STEP ? (
                                <button
                                    type="button"
                                    onClick={handleNext}
                                    disabled={!validateStep(step)}
                                    className={`px-10 py-4 rounded-xl font-bold text-sm uppercase tracking-widest text-white shadow-xl transition-all flex items-center justify-center gap-2 ${
                                        !validateStep(step)
                                            ? 'bg-slate-300 cursor-not-allowed opacity-50'
                                            : 'bg-[#2563EB] hover:bg-[#1E3A8A] hover:scale-[1.02] shadow-blue-500/30 active:scale-95'
                                    }`}
                                >
                                    Continue
                                    <span className="material-symbols-outlined text-lg">arrow_forward</span>
                                </button>
                            ) : (
                                <button
                                    disabled={!formData.confirmed || isSubmitting}
                                    onClick={handleSubmit}
                                    className={`px-8 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${
                                        formData.confirmed && !isSubmitting
                                            ? 'bg-[#2563EB] text-white shadow-xl shadow-blue-500/30'
                                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>Submit Application <span className="material-symbols-outlined text-sm">send</span></>
                                    )}
                                </button>
                            )}
                        </div>
                    </form>
                </div>

                <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] leading-relaxed">
                    © 2026 Philippine Animal Hospital Association • Excellence in Veterinary Service
                </p>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => { setShowSuccessModal(false); navigate('/membership'); }}
                    ></div>
                    <div className="relative bg-white dark:bg-[#1e293b] w-full max-w-md rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 p-8 text-center">
                        <div className="mb-6 flex justify-center">
                            <div className="size-20 bg-emerald-500/10 rounded-full flex items-center justify-center animate-pulse">
                                <div className="size-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <span className="material-symbols-outlined text-white text-4xl font-bold">check</span>
                                </div>
                            </div>
                        </div>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Application Submitted!</h3>
                        <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                            Your associate membership application has been received. Our team will review your documents and contact you via email.
                        </p>
                        <button
                            onClick={() => { setShowSuccessModal(false); navigate('/membership'); }}
                            className="w-full py-4 bg-[#2563EB] text-white rounded-2xl font-bold uppercase tracking-widest hover:bg-[#1E3A8A] hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-blue-500/20"
                        >
                            Return to Membership
                        </button>
                        <p className="mt-6 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">PAHA Management System v2.1</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssociateMemberApplication;
