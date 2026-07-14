import React, { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { collection, addDoc, doc, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile, signOut, sendEmailVerification } from 'firebase/auth';

type MembershipType = 'Regular' | 'Associate' | 'Institutional' | 'Affiliate';
type BusinessStructure = 'Sole Proprietorship' | 'Partnership' | 'Corporation' | 'Veterinary Teaching Hospital' | 'University-affiliated teaching hospital';

interface FormState {
    membershipType: MembershipType;
    clinicName: string;
    ownerName: string;
    clinicAddress: string;
    email: string;
    phone: string;
    businessStructure: BusinessStructure | '';
    representativeName: string;
    prcLicenseNo: string;
    password: string;
    confirmPassword: string;
    confirmed: boolean;
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

const MembershipFormModal: React.FC<Props> = ({ isOpen, onClose }) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [formData, setFormData] = useState<FormState>({
        membershipType: 'Regular',
        clinicName: '',
        ownerName: '',
        clinicAddress: '',
        email: '',
        phone: '',
        businessStructure: '',
        representativeName: '',
        prcLicenseNo: '',
        password: '',
        confirmPassword: '',
        confirmed: false
    });

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setErrorMsg(null);
        } else {
            document.body.style.overflow = '';
            setShowSuccess(false);
            setErrorMsg(null);
            setFormData({
                membershipType: 'Regular',
                clinicName: '',
                ownerName: '',
                clinicAddress: '',
                email: '',
                phone: '',
                businessStructure: '',
                representativeName: '',
                prcLicenseNo: '',
                password: '',
                confirmPassword: '',
                confirmed: false
            });
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        if (!formData.confirmed) return;
        if (formData.password.length < 6) {
            setErrorMsg('Password must be at least 6 characters.');
            return;
        }
        if (formData.password !== formData.confirmPassword) {
            setErrorMsg('Passwords do not match. Please re-type your password.');
            return;
        }
        setIsSubmitting(true);
        try {
            // 1) Create the PAHA login account (Firebase Auth)
            const cred = await createUserWithEmailAndPassword(auth, formData.email.trim(), formData.password);
            const user = cred.user;
            try { await updateProfile(user, { displayName: formData.ownerName }); } catch { /* non-fatal */ }

            // 2) Send Firebase email verification — continue URL goes directly to payment
            await sendEmailVerification(user, {
                url: `${window.location.origin}/membership/payment`,
                handleCodeInApp: false,
            });

            // 3) Create the user profile document with hasPaid=false (dashboard locked until payment)
            const { password, confirmed, ...profileData } = formData;
            void password; void confirmed;
            await setDoc(doc(db, 'users', user.uid), {
                ...profileData,
                displayName: formData.ownerName,
                fullName: formData.representativeName || formData.ownerName,
                clinicName: formData.clinicName,
                clinicAddress: formData.clinicAddress,
                address: formData.clinicAddress,
                phone: formData.phone ? `+63${formData.phone}` : '',
                prcLicense: formData.prcLicenseNo,
                role: 'member',
                isAdmin: false,
                isLoggedIn: false,
                isAccredited: false,
                hasPaid: false,
                membershipStatus: 'pending',
                isActive: false,
                businessType: formData.businessStructure === 'Sole Proprietorship' ? 'sole_proprietorship'
                    : formData.businessStructure === 'Partnership' || formData.businessStructure === 'Corporation' ? 'partnership_corporation'
                    : formData.businessStructure === 'Veterinary Teaching Hospital' || formData.businessStructure === 'University-affiliated teaching hospital' ? 'teaching_hospital'
                    : '',
                createdAt: serverTimestamp(),
            });

            // 3b) Seed the Clinic Representatives list with the representative
            // named during signup, so the dashboard isn't empty on first login.
            if (formData.representativeName.trim()) {
                const repsSnap = await getDocs(collection(db, 'users', user.uid, 'representatives'));
                if (repsSnap.empty) {
                    await addDoc(collection(db, 'users', user.uid, 'representatives'), {
                        name: formData.representativeName.trim(),
                        designation: 'Primary Representative',
                        prc: formData.prcLicenseNo || '',
                        contact: formData.phone ? `+63${formData.phone}` : '',
                        email: formData.email.trim(),
                        isPrimary: true,
                        status: 'active',
                        image: '',
                        createdAt: serverTimestamp(),
                    });
                }
            }

            // 4) File the membership application for admin tracking
            const nameParts = formData.ownerName.trim().split(/\s+/);
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            const applicationId = `APP-${Date.now()}`;
            await addDoc(collection(db, 'membership_applications'), {
                applicationId,
                uid: user.uid,
                ...profileData,
                // Store the normalized email that Firebase auth uses, so the
                // member dashboard can reliably match this application by email
                // (the raw form value may carry stray whitespace/casing).
                email: formData.email.trim(),
                firstName,
                lastName,
                ownerName: formData.ownerName,
                fullName: formData.ownerName,
                businessType: formData.businessStructure === 'Sole Proprietorship' ? 'sole_proprietorship'
                    : formData.businessStructure === 'Partnership' || formData.businessStructure === 'Corporation' ? 'partnership_corporation'
                    : formData.businessStructure === 'Veterinary Teaching Hospital' || formData.businessStructure === 'University-affiliated teaching hospital' ? 'teaching_hospital'
                    : '',
                type: formData.membershipType,
                hospitalName: formData.clinicName,
                clinicName: formData.clinicName,
                clinicAddress: formData.clinicAddress,
                address: formData.clinicAddress,
                mobile: formData.phone ? `+63${formData.phone}` : '',
                createdAt: serverTimestamp(),
                date: new Date().toISOString(),
                status: 'pending'
            });

            // 4b) Notify the admin dashboard (must run before signOut — writes require auth)
            await addDoc(collection(db, 'admin_notifications'), {
                type: 'application',
                title: 'New Membership Application',
                body: `${formData.ownerName} (${formData.clinicName}) applied as ${formData.membershipType} member.`,
                link: 'applications',
                read: false,
                createdAt: serverTimestamp(),
            }).catch(() => { /* non-fatal */ });

            // 5) Sign out — user cannot access dashboard until email is verified AND payment is made
            await signOut(auth);

            setShowSuccess(true);
        } catch (error: any) {
            const code = error.code || '';
            if (code === 'auth/email-already-in-use') {
                setErrorMsg('An account with this email already exists. Please log in instead.');
            } else if (code === 'auth/invalid-email') {
                setErrorMsg('Please enter a valid email address.');
            } else if (code === 'auth/weak-password') {
                setErrorMsg('Password is too weak. Use at least 6 characters.');
            } else {
                setErrorMsg(`Failed to create account (${code || 'error'}): ${error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const inputCls = "w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-slate-900 text-sm";
    const labelCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5";

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-5xl max-h-[92vh] rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row bg-white">

                {/* ── LEFT PANEL — Info ── */}
                <div className="hidden md:flex md:w-[38%] bg-[#0b1629] flex-col justify-between p-10 text-white flex-shrink-0">
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-2">Philippine Animal Hospital Association</p>
                        <h2 className="text-xl md:text-2xl font-bold leading-tight mb-3 whitespace-nowrap">Membership Application</h2>
                        <p className="text-slate-400 text-sm leading-relaxed mb-8">
                            Join the country's leading network of veterinary institutions. Elevate your practice standards and connect with the best.
                        </p>

                        <div className="space-y-4">
                            {[
                                { icon: 'school', title: 'CPD Seminars & Conventions', desc: 'Discounted rates for all members' },
                                { icon: 'verified', title: 'Hospital Accreditation', desc: 'Earn the PAHA quality seal' },
                                { icon: 'gavel', title: 'Legal Representation', desc: 'Policy and regulatory advocacy' },
                                { icon: 'groups', title: 'Nationwide Network', desc: 'Connect with 200+ veterinary clinics' },
                            ].map((b, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
                                        <span className="material-symbols-outlined text-sm text-primary-light">{b.icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-white">{b.title}</p>
                                        <p className="text-[10px] text-slate-500">{b.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/10">
                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                            <span className="material-symbols-outlined text-amber-400 text-xl flex-shrink-0">payments</span>
                            <div>
                                <p className="text-xs font-bold text-amber-300 mb-0.5">Application Fee</p>
                                <p className="text-[10px] text-amber-400/70 leading-snug">₱5,000 upon approval. PAHA will contact you with payment instructions.</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── RIGHT PANEL — Form ── */}
                <div className="flex-1 bg-white flex flex-col overflow-hidden">

                    {/* Header */}
                    <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 flex-shrink-0">
                        <div>
                            <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-0.5 md:hidden">PAHA Membership</p>
                            <h3 className="text-lg font-bold text-slate-900">{showSuccess ? 'Submission Confirmation' : 'Clinic Information'}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="size-10 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 hover:bg-red-100 hover:text-red-600 transition-all flex-shrink-0"
                            aria-label="Close"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    {/* Scrollable Content Container */}
                    <div className="overflow-y-auto flex-1 px-8 py-6">

                        {showSuccess ? (
                            <div className="space-y-6 py-4">
                                <div className="text-center">
                                    <div className="size-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                                        <span className="material-symbols-outlined text-emerald-500 text-4xl">mark_email_unread</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2">Check Your Email!</h3>
                                    <p className="text-slate-500 text-sm leading-relaxed max-w-md mx-auto">
                                        We have initiated the onboarding process for <strong className="text-slate-800">{formData.clinicName}</strong>. A verification link has been sent to:
                                        <br />
                                        <strong className="text-primary text-base block mt-1">{formData.email}</strong>
                                    </p>
                                </div>

                                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 space-y-4 max-w-xl mx-auto">
                                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block border-b border-slate-200 pb-2">Next Steps Checklist</h4>
                                    
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="size-6 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</div>
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800">Email Verification Link Sent</h5>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                    Check your inbox (and spam folder) and click the link to verify your email.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="size-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">2</div>
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800">Settle Membership Application Fee</h5>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                    Once verified, you can access your dashboard directly and settle the ₱5,000 application fee under your membership tab.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="size-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">3</div>
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800">Submit Compliance Documents</h5>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                    Upload required licenses (SEC/DTI, PRC License, BAI permit, etc.) in the Accreditation page of your dashboard.
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-4">
                                            <div className="size-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">4</div>
                                            <div>
                                                <h5 className="text-xs font-bold text-slate-800">Board Review & Final Approval</h5>
                                                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                                                    The PAHA Board of Directors will review your complete application and notify you of your active membership seal.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="text-center max-w-xl mx-auto">
                                    <button onClick={onClose} className="px-10 py-3.5 bg-primary text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-primary/90 transition-all shadow-xl shadow-primary/20">
                                        Got it, Close
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Error Banner (Replaces Browser Alerts) */}
                                {errorMsg && (
                                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-800 animate-fade-in relative">
                                        <span className="material-symbols-outlined text-red-500 text-lg flex-shrink-0">error</span>
                                        <div className="flex-1 text-xs leading-relaxed font-semibold pr-6">
                                            {errorMsg}
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => setErrorMsg(null)}
                                            className="absolute top-4 right-4 text-red-400 hover:text-red-650 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm font-bold">close</span>
                                        </button>
                                    </div>
                                )}

                                {/* Section 1 — Clinic Info */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="size-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold flex-shrink-0">1</span>
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Basic Information</h4>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="m-clinicName" className={labelCls}>Clinic Name</label>
                                            <input id="m-clinicName" name="clinicName" type="text" required placeholder="Enter clinic name" className={inputCls}
                                                value={formData.clinicName} onChange={e => setFormData({ ...formData, clinicName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label htmlFor="m-ownerName" className={labelCls}>Owner Name</label>
                                            <input id="m-ownerName" name="ownerName" type="text" required placeholder="Full legal name" className={inputCls}
                                                value={formData.ownerName} onChange={e => setFormData({ ...formData, ownerName: e.target.value })} />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label htmlFor="m-clinicAddress" className={labelCls}>Clinic Address</label>
                                            <textarea id="m-clinicAddress" name="clinicAddress" required placeholder="Full business address" rows={2}
                                                className={inputCls + ' resize-none'}
                                                value={formData.clinicAddress} onChange={e => setFormData({ ...formData, clinicAddress: e.target.value })} />
                                        </div>
                                        <div>
                                            <label htmlFor="m-email" className={labelCls}>Email Address</label>
                                            <input id="m-email" name="email" type="email" required placeholder="email@example.com" className={inputCls}
                                                value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                                        </div>
                                         <div>
                                             <label htmlFor="m-phone" className={labelCls}>Phone Number</label>
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
                                                     id="m-phone" 
                                                     name="phone" 
                                                     type="text" 
                                                     required 
                                                     placeholder="9XX XXX XXXX" 
                                                     className={inputCls + ' pl-16'}
                                                     value={formData.phone ? (formData.phone.startsWith('+63') ? formData.phone.slice(3) : formData.phone.startsWith('63') && formData.phone.length === 12 ? formData.phone.slice(2) : formData.phone.startsWith('0') && formData.phone.length === 11 ? formData.phone.slice(1) : formData.phone) : ''} 
                                                     onChange={e => {
                                                         const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                         setFormData({ ...formData, phone: cleaned });
                                                     }}
                                                 />
                                             </div>
                                         </div>
                                    </div>
                                </div>

                                {/* Section 2 — Representative & License */}
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <span className="size-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold flex-shrink-0">2</span>
                                        <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Representative & License</h4>
                                    </div>
                                    <div className="flex flex-col gap-4">
                                        {/* Business Structure — full width */}
                                        <div>
                                            <label htmlFor="m-businessStructure" className={labelCls}>Business Structure</label>
                                            <select id="m-businessStructure" name="businessStructure" required className={inputCls + ' appearance-none cursor-pointer'}
                                                value={formData.businessStructure} onChange={e => setFormData({ ...formData, businessStructure: e.target.value as BusinessStructure })}>
                                                <option value="" disabled>Select structure</option>
                                                <option value="Sole Proprietorship">Sole Proprietorship</option>
                                                <option value="Partnership">Partnership</option>
                                                <option value="Corporation">Corporation</option>
                                                <option value="Veterinary Teaching Hospital">Veterinary Teaching Hospital</option>
                                                <option value="University-affiliated teaching hospital">University-affiliated teaching hospital</option>
                                            </select>
                                        </div>
                                        {/* Representative Name | PRC License */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="m-representativeName" className={labelCls}>Representative Name</label>
                                                <input id="m-representativeName" name="representativeName" type="text" required placeholder="Full name" className={inputCls}
                                                    value={formData.representativeName} onChange={e => setFormData({ ...formData, representativeName: e.target.value })} />
                                            </div>
                                            <div>
                                                <label htmlFor="m-prcLicenseNo" className={labelCls}>PRC License No.</label>
                                                <input 
                                                    id="m-prcLicenseNo" 
                                                    name="prcLicenseNo" 
                                                    type="text" 
                                                    required 
                                                    placeholder="License number" 
                                                    className={inputCls}
                                                    value={formData.prcLicenseNo} 
                                                    onChange={e => {
                                                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                        setFormData({ ...formData, prcLicenseNo: cleaned });
                                                    }}
                                                    onBlur={() => {
                                                        if (formData.prcLicenseNo && formData.prcLicenseNo.length < 6) {
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                prcLicenseNo: prev.prcLicenseNo.padStart(6, '0')
                                                            }));
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        {/* Password | Re-type Password */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label htmlFor="m-password" className={labelCls}>Password</label>
                                                <div className="relative">
                                                    <input id="m-password" name="password" type={showPassword ? "text" : "password"} required placeholder="Enter password" className={inputCls + ' pr-10'}
                                                        value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPassword(!showPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            {showPassword ? 'visibility_off' : 'visibility'}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                            <div>
                                                <label htmlFor="m-confirmPassword" className={labelCls}>Re-type Password</label>
                                                <div className="relative">
                                                    <input
                                                        id="m-confirmPassword"
                                                        name="confirmPassword"
                                                        type={showConfirmPassword ? "text" : "password"}
                                                        required
                                                        placeholder="Confirm password"
                                                        className={inputCls + ' pr-10' + (formData.confirmPassword && formData.confirmPassword !== formData.password ? ' border-red-400 focus:border-red-400' : '')}
                                                        value={formData.confirmPassword}
                                                        onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">
                                                            {showConfirmPassword ? 'visibility_off' : 'visibility'}
                                                        </span>
                                                    </button>
                                                </div>
                                                {formData.confirmPassword && formData.confirmPassword !== formData.password && (
                                                    <p className="text-xs text-red-500 mt-1">Passwords do not match.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Note: required documents are uploaded later during the Accreditation → Compliance stage */}
                                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                                    <span className="material-symbols-outlined text-blue-500 text-lg flex-shrink-0">info</span>
                                    <p className="text-xs text-blue-800 leading-relaxed">
                                        After your account is approved, you'll upload your business and license documents (SEC, Business Permit, BAI, BIR, PTR, PRC ID, etc.) in the <span className="font-bold">Accreditation → Compliance</span> stage of your member dashboard.
                                    </p>
                                </div>

                                {/* Confirmation */}
                                <label className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-2xl cursor-pointer hover:bg-primary/10 transition-colors">
                                    <input type="checkbox" id="m-confirmed" name="confirmed" className="size-4 rounded border-primary/30 text-primary focus:ring-primary mt-0.5 flex-shrink-0"
                                        checked={formData.confirmed} onChange={e => setFormData({ ...formData, confirmed: e.target.checked })} />
                                    <span className="text-sm text-slate-700 leading-relaxed">
                                        I confirm that all information and documents submitted are true and accurate. I understand that any false information may result in the rejection of my application.
                                    </span>
                                </label>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={!formData.confirmed || isSubmitting}
                                    className={`w-full py-4 rounded-2xl font-bold uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
                                        formData.confirmed && !isSubmitting
                                            ? 'bg-primary text-white shadow-xl shadow-primary/30 hover:bg-primary/90 hover:scale-[1.01] active:scale-[0.99]'
                                            : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                    }`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4"></span>
                                            Submitting...
                                        </>
                                    ) : (
                                        <>Submit Application <span className="material-symbols-outlined text-base">send</span></>
                                    )}
                                </button>

                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MembershipFormModal;
