import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';

interface EventRegistrationModalProps {
    isOpen: boolean;
    onClose: () => void;
    event: any;
    ticketLabel?: string;
    ticketPrice?: number;
}

const EventRegistrationModal: React.FC<EventRegistrationModalProps> = ({ isOpen, onClose, event, ticketLabel, ticketPrice }) => {
    const price = ticketPrice ?? event?.price ?? 0;
    const label = ticketLabel || 'Regular Ticket';
    const { addEventRegistration, uploadImage } = useAdmin();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingRef, setBookingRef] = useState<string>('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    // New State for features
    const [promoCode, setPromoCode] = useState('');
    const [discount, setDiscount] = useState(0);
    const [promoMessage, setPromoMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const [proofFile, setProofFile] = useState<File | null>(null);

    const [formData, setFormData] = useState({
        designation: '',
        fullName: '',
        email: '',
        phone: '',
        prcLicense: '',
        specialization: '',
        clinicName: '',
        clinicAddress: '',
        dietary: '',
        paymentMethod: 'credit_card' as 'credit_card' | 'e_wallet' | 'bank_transfer',
        agreedToTerms: false
    });

    useEffect(() => {
        if (!isOpen) {
            // Reset state when closed
            setTimeout(() => {
                setStep(1);
                setFormData({
                    designation: '',
                    fullName: '',
                    email: '',
                    phone: '',
                    prcLicense: '',
                    specialization: '',
                    clinicName: '',
                    clinicAddress: '',
                    dietary: '',
                    paymentMethod: 'credit_card',
                    agreedToTerms: false
                });
                setBookingRef('');
                setDiscount(0);
                setPromoCode('');
                setPromoMessage(null);
                setProofFile(null);
                setErrors({});
            }, 300);
        }
    }, [isOpen]);

    if (!isOpen || !event) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            setFormData(prev => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setProofFile(e.target.files[0]);
        }
    };

    const validateStep = (currentStep: number) => {
        const newErrors: { [key: string]: string } = {};
        let isValid = true;

        if (currentStep === 1) {
            if (!formData.designation) newErrors.designation = 'Required';
            if (!formData.fullName.trim()) newErrors.fullName = 'Full Name is required';
            if (!formData.email.trim()) newErrors.email = 'Email is required';
            else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
            if (!formData.phone.trim()) newErrors.phone = 'Phone number is required';
            else if (formData.phone.length !== 10) newErrors.phone = 'Phone number must be exactly 10 digits';
        }

        if (currentStep === 2) {
            if (!formData.prcLicense.trim()) newErrors.prcLicense = 'PRC License is required';
            if (!formData.clinicName.trim()) newErrors.clinicName = 'Clinic/Org Name is required';
        }

        if (currentStep === 3) {
            if (formData.paymentMethod === 'bank_transfer' && !proofFile) {
                // Optional logic: Require proof for bank transfer? Let's make it optional but recommended for now, or require it. 
                // Let's require it for "fully functional" feel, or just warn.
                // let's make it optional for this demo to avoid friction, but show UI
            }
            if (!formData.agreedToTerms) {
                newErrors.agreedToTerms = 'You must agree to the terms';
            }
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            isValid = false;
        }

        return isValid;
    };

    const handleNext = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateStep(step)) {
            setStep(prev => prev + 1);
        }
    };

    const handleBack = () => {
        setStep(prev => prev - 1);
    };

    const handleApplyPromo = () => {
        if (promoCode.toUpperCase() === 'PAHA2025') {
            setDiscount(price * 0.10); // 10% off
            setPromoMessage({ type: 'success', text: '10% Discount Applied!' });
        } else {
            setDiscount(0);
            setPromoMessage({ type: 'error', text: 'Invalid Promo Code' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateStep(3)) return;

        setIsSubmitting(true);

        try {
            // Process proof of payment if exists
            let paymentReference = '';
            if (proofFile) {
                try {
                    paymentReference = await uploadImage(proofFile);
                } catch (error) {
                    console.error("Failed to upload proof of payment:", error);
                    // Continue anyway or throw? Let's throw for reliability
                    throw new Error("Failed to process proof of payment. Please try again.");
                }
            }

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 800));

            const ref = await addEventRegistration({
                eventId: event.id,
                eventTitle: event.title,
                attendeeName: `${formData.designation} ${formData.fullName}`,
                attendeeEmail: formData.email,
                attendeePhone: formData.phone ? `+63${formData.phone}` : '',
                prcLicense: formData.prcLicense,
                specialization: formData.specialization,
                paymentMethod: formData.paymentMethod,
                dietaryRestrictions: formData.dietary,
                paymentReference: paymentReference,
                ticketLabel: label,
                ticketPrice: price
            });

            setBookingRef(ref);
            setStep(4); // Success Step
        } catch (error) {
            console.error("Registration failed:", error);
            alert("Failed to register. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const totalAmount = price - discount;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-6 font-display">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-gray-900/40 dark:bg-black/70 backdrop-blur-md transition-opacity animate-fade-in"
                onClick={onClose}
            ></div>

            {/* Modal Container */}
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#1A1C23] border border-gray-200 dark:border-white/10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-scale-in transition-all max-h-[90vh] flex flex-col">

                {/* Modal Header with Inline Steps */}
                <div className="p-6 md:p-8 border-b border-gray-100 dark:border-white/5 sticky top-0 bg-white/95 dark:bg-[#1A1C23]/95 backdrop-blur-xl z-20">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex-1">
                            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-semibold uppercase tracking-widest mb-3">
                                Event Checkout
                            </span>
                            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white line-clamp-1 pr-4">{event.title}</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="size-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all flex-shrink-0"
                            aria-label="Close"
                        >
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>

                    {/* Inline Progress Indicators */}
                    {step < 4 && (
                        <div className="flex items-center gap-2 relative">
                            {[1, 2, 3].map((s, idx) => (
                                <React.Fragment key={s}>
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all border flex-shrink-0 ${step >= s
                                                ? 'bg-gradient-to-tr from-primary to-[#00A1E0] border-transparent text-white shadow-lg shadow-primary/20'
                                                : 'bg-gray-50 dark:bg-[#15171c] border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500'
                                            }`}>
                                            {step > s ? <span className="material-symbols-outlined text-[18px]">check</span> : s}
                                        </div>
                                        <span className={`text-xs font-semibold uppercase tracking-widest transition-colors ${step >= s ? 'text-primary dark:text-white' : 'text-gray-400 dark:text-gray-600'
                                            }`}>
                                            {s === 1 ? 'Personal' : s === 2 ? 'Details' : 'Checkout'}
                                        </span>
                                    </div>
                                    {idx < 2 && (
                                        <div className={`h-0.5 flex-1 rounded-full transition-colors ${step > s ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10'
                                            }`}></div>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    )}
                </div>

                {/* Content - Scrollable */}
                <div className="p-6 md:p-8 overflow-y-auto overflow-x-hidden custom-scrollbar bg-gray-50/50 dark:bg-[#1A1C23] relative">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/5 blur-[120px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>

                    <div className="relative z-10">
                        {step === 4 ? (
                            // Success Screen
                            <div className="text-center py-16 flex flex-col items-center justify-center min-h-[450px]">
                                <div className="w-28 h-28 bg-gradient-to-tr from-green-500 to-emerald-400 rounded-full flex items-center justify-center mb-8 shadow-[0_10px_30px_rgba(16,185,129,0.3)] animate-scale-in border-4 border-green-100 dark:border-green-900/30">
                                    <span className="material-symbols-outlined text-6xl text-white">check</span>
                                </div>
                                <h2 className="text-4xl font-semibold text-gray-900 dark:text-white mb-4 tracking-tight">Registration Confirmed!</h2>
                                <p className="text-gray-600 dark:text-gray-400 mb-10 max-w-sm mx-auto leading-relaxed text-lg">
                                    You're all set! A confirmation email with your ticket has been sent to <span className="text-gray-900 dark:text-white font-semibold">{formData.email}</span>.
                                </p>

                                <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-3xl p-8 w-full max-w-sm mx-auto mb-10 text-left relative overflow-hidden group shadow-lg">
                                    <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors duration-700"></div>

                                    <p className="text-[11px] uppercase tracking-widest text-gray-400 font-semibold mb-4">Booking Reference</p>
                                    <div className="flex justify-between items-center mb-6 bg-gray-50 dark:bg-black/20 p-4 rounded-xl border border-gray-100 dark:border-white/5">
                                        <code className="text-2xl font-mono text-primary font-semibold tracking-wider">{bookingRef || 'REF-12345'}</code>
                                        <button className="text-gray-400 hover:text-primary transition-colors bg-white dark:bg-white/5 p-2 rounded-lg border border-gray-100 dark:border-white/5 shadow-sm" title="Copy">
                                            <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        </button>
                                    </div>
                                    <div className="pt-5 border-t border-gray-100 dark:border-white/10 space-y-4 text-sm text-gray-500 dark:text-gray-400">
                                        <div className="flex justify-between items-center">
                                            <span>Amount Paid</span>
                                            <span className="font-semibold text-gray-900 dark:text-white text-base">₱{totalAmount.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span>Payment Method</span>
                                            <span className="capitalize text-gray-900 dark:text-white font-medium bg-gray-100 dark:bg-white/10 px-3 py-1 rounded-lg text-xs">{formData.paymentMethod.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                </div>

                                <button onClick={onClose} className="w-full max-w-sm bg-gray-900 dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-gray-100 rounded-xl font-semibold text-base py-4 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 active:scale-[0.98]">
                                    Return to Event
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={step === 3 ? handleSubmit : handleNext} className="space-y-6 animate-fade-in pb-4">

                                {/* Step 1: Personal Info */}
                                {step === 1 && (
                                    <div className="space-y-5">
                                        <div className="grid grid-cols-4 gap-4">
                                            <div className="col-span-1 space-y-1.5">
                                                <label htmlFor="reg-designation" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Title</label>
                                                <div className="relative">
                                                    <select
                                                        id="reg-designation"
                                                        name="designation"
                                                        value={formData.designation}
                                                        onChange={handleChange}
                                                        className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.designation ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl px-3 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all appearance-none cursor-pointer hover:border-primary/30`}
                                                    >
                                                        <option value="">Select</option>
                                                        <option value="Dr.">Dr.</option>
                                                        <option value="DVM">DVM</option>
                                                        <option value="Mr.">Mr.</option>
                                                        <option value="Ms.">Ms.</option>
                                                    </select>
                                                    <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[20px]">expand_more</span>
                                                </div>
                                            </div>
                                            <div className="col-span-3 space-y-1.5">
                                                <label htmlFor="reg-fullName" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Full Name</label>
                                                <input
                                                    id="reg-fullName"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    type="text"
                                                    className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.fullName ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm`}
                                                    placeholder="Juan Dela Cruz"
                                                />
                                                {errors.fullName && <p className="text-red-500 text-[10px] uppercase font-semibold tracking-wider">{errors.fullName}</p>}
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="reg-email" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Email Address</label>
                                            <input
                                                id="reg-email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                type="email"
                                                className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.email ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm`}
                                                placeholder="juan@example.com"
                                            />
                                            {errors.email && <p className="text-red-500 text-[10px] uppercase font-semibold tracking-wider">{errors.email}</p>}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="reg-phone" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Phone Number</label>
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
                                                    id="reg-phone"
                                                    name="phone"
                                                    value={formData.phone ? (formData.phone.startsWith('+63') ? formData.phone.slice(3) : formData.phone.startsWith('63') && formData.phone.length === 12 ? formData.phone.slice(2) : formData.phone.startsWith('0') && formData.phone.length === 11 ? formData.phone.slice(1) : formData.phone) : ''}
                                                    onChange={(e) => {
                                                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setFormData(prev => ({ ...prev, phone: cleaned }));
                                                        if (errors.phone) {
                                                            setErrors(prev => ({ ...prev, phone: '' }));
                                                        }
                                                    }}
                                                    type="tel"
                                                    className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.phone ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl pl-16 pr-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm`}
                                                    placeholder="917 123 4567"
                                                />
                                            </div>
                                            {errors.phone && <p className="text-red-500 text-[10px] uppercase font-semibold tracking-wider">{errors.phone}</p>}
                                        </div>
                                    </div>
                                )}

                                {/* Step 2: Details */}
                                {step === 2 && (
                                    <div className="space-y-5">
                                        <div className="space-y-1.5">
                                            <label htmlFor="reg-prcLicense" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">PRC License No.</label>
                                            <input
                                                id="reg-prcLicense"
                                                name="prcLicense"
                                                value={formData.prcLicense}
                                                onChange={(e) => {
                                                    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                                                    setFormData(prev => ({ ...prev, prcLicense: cleaned }));
                                                    if (errors.prcLicense) {
                                                        setErrors(prev => ({ ...prev, prcLicense: '' }));
                                                    }
                                                }}
                                                onBlur={() => {
                                                    if (formData.prcLicense && formData.prcLicense.length < 6) {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            prcLicense: prev.prcLicense.padStart(6, '0')
                                                        }));
                                                    }
                                                }}
                                                type="text"
                                                className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.prcLicense ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm`}
                                                placeholder="0123456"
                                            />
                                            {errors.prcLicense && <p className="text-red-500 text-[10px] uppercase font-semibold tracking-wider">{errors.prcLicense}</p>}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <label htmlFor="reg-clinicName" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Clinic / Organization</label>
                                                <input
                                                    id="reg-clinicName"
                                                    name="clinicName"
                                                    value={formData.clinicName}
                                                    onChange={handleChange}
                                                    type="text"
                                                    className={`w-full bg-slate-50 dark:bg-white/5 border ${errors.clinicName ? 'border-red-500/50' : 'border-slate-200 dark:border-white/10'} rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm`}
                                                    placeholder="Happy Pets Clinic"
                                                />
                                                {errors.clinicName && <p className="text-red-500 text-[10px] uppercase font-semibold tracking-wider">{errors.clinicName}</p>}
                                            </div>
                                            <div className="space-y-1.5">
                                                <label htmlFor="reg-specialization" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Specialization</label>
                                                <input
                                                    id="reg-specialization"
                                                    name="specialization"
                                                    value={formData.specialization}
                                                    onChange={handleChange}
                                                    type="text"
                                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm"
                                                    placeholder="Surgery, Derma..."
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="reg-clinicAddress" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Clinic Address</label>
                                            <input
                                                id="reg-clinicAddress"
                                                name="clinicAddress"
                                                value={formData.clinicAddress}
                                                onChange={handleChange}
                                                type="text"
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm"
                                                placeholder="Unit 101, Business Center, Makati City"
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label htmlFor="reg-dietary" className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Dietary Restrictions</label>
                                            <input
                                                id="reg-dietary"
                                                name="dietary"
                                                value={formData.dietary}
                                                onChange={handleChange}
                                                type="text"
                                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-4 text-slate-900 dark:text-white focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-400 dark:placeholder:text-gray-600 hover:border-primary/30 shadow-sm"
                                                placeholder="Vegetarian, Halal..."
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Step 3: Payment & Review */}
                                {step === 3 && (
                                    <div className="space-y-6">
                                        <div className="bg-[#15171c] border border-white/10 rounded-2xl p-5 space-y-4">
                                            <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                                                <span className="material-symbols-outlined text-primary">receipt_long</span>
                                                Order Summary
                                            </h3>

                                            <div className="space-y-3">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-gray-400">{label}</span>
                                                    <span className="text-white">₱{price.toLocaleString()}</span>
                                                </div>
                                                {discount > 0 && (
                                                    <div className="flex justify-between items-center text-sm text-green-400">
                                                        <span>Discount</span>
                                                        <span>-₱{discount.toLocaleString()}</span>
                                                    </div>
                                                )}
                                                <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                                    <span className="text-sm font-semibold text-white">Total Amount</span>
                                                    <span className="text-xl font-semibold text-primary">₱{totalAmount.toLocaleString()}</span>
                                                </div>
                                            </div>

                                            {/* Promo Code Input */}
                                            <div className="pt-3 border-t border-white/5">
                                                <div className="flex gap-2">
                                                    <label htmlFor="reg-promoCode" className="sr-only">Promo Code</label>
                                                    <input
                                                        id="reg-promoCode"
                                                        name="promoCode"
                                                        type="text"
                                                        value={promoCode}
                                                        onChange={(e) => setPromoCode(e.target.value)}
                                                        placeholder="Enter Promo Code"
                                                        className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-3 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-primary/50 placeholder:text-slate-400 dark:placeholder:text-gray-700 uppercase"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={handleApplyPromo}
                                                        className="px-5 py-3 bg-white dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-white transition-all shadow-sm active:scale-95"
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                                {promoMessage && (
                                                    <p className={`text-[10px] mt-2 font-semibold uppercase tracking-wide ${promoMessage.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                                        {promoMessage.text}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <label className="text-[11px] font-semibold uppercase tracking-widest text-slate-500 dark:text-silver/50">Payment Method</label>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                {[
                                                    { id: 'credit_card', icon: 'credit_card', label: 'Credit Card' },
                                                    { id: 'e_wallet', icon: 'account_balance_wallet', label: 'E-Wallet (GCash/Msaya)' },
                                                    { id: 'bank_transfer', icon: 'account_balance', label: 'Bank Transfer' }
                                                ].map((method) => (
                                                    <label key={method.id} className={`cursor-pointer rounded-[1.5rem] border p-6 flex flex-col items-center justify-center gap-4 transition-all duration-500 relative overflow-hidden group/item ${formData.paymentMethod === method.id
                                                        ? 'bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/50 text-primary dark:text-white shadow-[0_12px_24px_rgba(30,96,163,0.1)] ring-2 ring-primary/20'
                                                        : 'bg-white dark:bg-[#15171c] border-slate-200 dark:border-white/10 text-slate-400 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-[#1a1d23] hover:border-primary/30 hover:shadow-lg'
                                                        }`}>
                                                        {formData.paymentMethod === method.id && (
                                                            <div className="absolute top-4 right-4 w-4 h-4 rounded-full bg-primary shadow-[0_0_15px_rgba(30,96,163,0.5)] flex items-center justify-center">
                                                                <span className="material-symbols-outlined text-white text-[10px] font-semibold">check</span>
                                                            </div>
                                                        )}
                                                        <input
                                                            type="radio"
                                                            id={`pm-${method.id}`}
                                                            name="paymentMethod"
                                                            value={method.id}
                                                            className="hidden"
                                                            onChange={handleChange}
                                                            checked={formData.paymentMethod === method.id}
                                                        />
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${formData.paymentMethod === method.id ? 'bg-primary text-white scale-110 shadow-lg' : 'bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-gray-600 group-hover/item:bg-primary/10 group-hover/item:text-primary'}`}>
                                                            <span className="material-symbols-outlined text-[32px]">{method.icon}</span>
                                                        </div>
                                                        <span className={`text-[11px] font-semibold uppercase tracking-wider text-center transition-colors ${formData.paymentMethod === method.id ? 'text-primary dark:text-white' : 'text-slate-500 dark:text-gray-500'}`}>{method.label}</span>
                                                    </label>

                                                ))}
                                            </div>
                                        </div>

                                        {/* Proof of Payment Upload for Bank Transfer */}
                                        {formData.paymentMethod === 'bank_transfer' && (
                                            <div className="animate-fade-in bg-primary/5 border border-primary/20 rounded-[1.5rem] p-8 shadow-sm relative overflow-hidden group/upload">
                                                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 blur-3xl rounded-full pointer-events-none transition-transform duration-1000 group-hover/upload:scale-150"></div>
                                                
                                                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
                                                    <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary shadow-inner">
                                                        <span className="material-symbols-outlined text-[32px]">upload_file</span>
                                                    </div>
                                                    <div className="flex-1 text-center sm:text-left">
                                                        <p className="text-lg font-semibold text-slate-900 dark:text-white mb-1">Upload Proof of Payment</p>
                                                        <p className="text-xs text-slate-500 dark:text-silver/50 mb-6 leading-relaxed max-w-sm">Please attach a clear screenshot or PDF of your confirmed bank transfer transaction.</p>

                                                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4">
                                                            <div className="relative">
                                                                <input
                                                                    type="file"
                                                                    id="proofUpload"
                                                                    className="hidden"
                                                                    onChange={handleFileChange}
                                                                    accept="image/*,.pdf"
                                                                />
                                                                <label
                                                                    htmlFor="proofUpload"
                                                                    className="flex items-center gap-3 px-6 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-semibold uppercase tracking-widest cursor-pointer transition-all w-fit shadow-lg shadow-primary/25 active:scale-95"
                                                                >
                                                                    <span className="material-symbols-outlined text-[20px]">publish</span>
                                                                    {proofFile ? 'Change File' : 'Select File'}
                                                                </label>
                                                            </div>
                                                            {proofFile && (
                                                                <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/10 px-4 py-3 rounded-xl border border-slate-200 dark:border-white/10 animate-fade-in">
                                                                    <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                                                                    <span className="text-xs text-slate-700 dark:text-silver/80 font-semibold truncate max-w-[150px]">{proofFile.name}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="flex items-start gap-4 pt-4 border-t border-gray-100 dark:border-white/5 mt-6">
                                            <div className="relative flex items-center pt-0.5">
                                                <input
                                                    type="checkbox"
                                                    name="agreedToTerms"
                                                    id="agreedToTerms"
                                                    checked={formData.agreedToTerms}
                                                    onChange={handleChange}
                                                    className="w-5 h-5 bg-white dark:bg-[#15171c] border border-gray-300 dark:border-white/20 rounded focus:ring-primary text-primary cursor-pointer appearance-none checked:bg-primary checked:border-primary shadow-sm transition-all"
                                                />
                                                <span className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 checked:opacity-100 text-white leading-none">
                                                    <span className="material-symbols-outlined text-[14px] font-semibold">check</span>
                                                </span>
                                            </div>
                                            <label htmlFor="agreedToTerms" className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed cursor-pointer select-none">
                                                I agree to the <span className="text-primary dark:text-white font-medium hover:underline">Terms of Service</span> and <span className="text-primary dark:text-white font-medium hover:underline">Privacy Policy</span>. I understand that my registration is non-refundable.
                                            </label>
                                        </div>
                                        {errors.agreedToTerms && <p className="text-red-500 text-[10px] uppercase font-semibold tracking-wider pl-9 opacity-90">{errors.agreedToTerms}</p>}

                                    </div>
                                )}

                                {/* Navigation Buttons */}
                                <div className="pt-8 mt-6 border-t border-slate-200 dark:border-white/5 flex gap-4">
                                    {step > 1 && (
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="px-8 py-5 rounded-2xl text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all flex items-center gap-2 group border border-transparent hover:border-slate-300 dark:hover:border-white/10"
                                        >
                                            <span className="material-symbols-outlined text-[20px] group-hover:-translate-x-1.5 transition-transform duration-300">arrow_back</span>
                                            Back
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 bg-gradient-to-r from-[#1A365D] via-[#1E60A3] to-[#00A1E0] hover:from-[#1e40af] hover:via-[#2563eb] hover:to-[#3b82f6] text-white py-5.5 rounded-2xl text-base font-semibold uppercase tracking-widest shadow-[0_12px_30px_-5px_rgba(30,96,163,0.4)] hover:shadow-[0_15px_35px_-5px_rgba(30,96,163,0.5)] transition-all duration-500 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-4 group relative overflow-hidden"
                                    >
                                        {/* Shimmer Effect */}
                                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer pointer-events-none"></div>
                                        
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                                        {isSubmitting ? (
                                            <span className="relative z-10 flex items-center gap-3">
                                                <span className="size-6 border-4 border-white/20 border-t-white rounded-full animate-spin"></span>
                                                <span className="animate-pulse">Processing...</span>
                                            </span>
                                        ) : (
                                            <span className="relative z-10 flex items-center gap-3">
                                                {step === 3 ? 'Confirm Order & Pay' : 'Continue to Next Step'}
                                                <span className="material-symbols-outlined text-[22px] group-hover:translate-x-2 transition-transform duration-500">arrow_forward</span>
                                            </span>
                                        )}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EventRegistrationModal;
