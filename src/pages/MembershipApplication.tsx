import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MembershipFormModal from '../components/MembershipFormModal';
import { useAdmin } from '../context/AdminContext';

const testimonials = [
    {
        quote: "Joining PAHA was one of the best decisions we made for our clinic. The network, the seminars, the legal support — everything has helped us grow and stay ahead.",
        name: "Dr. Marilou Santos",
        clinic: "Happy Paws Veterinary Clinic",
        role: "Clinic Owner & Head Veterinarian",
        initials: "MS",
        color: "from-blue-500 to-indigo-600",
    },
    {
        quote: "PAHA has connected us with the best minds in veterinary medicine. The annual conference alone is worth the membership — the CPD units and networking are unmatched.",
        name: "Dr. Ramon Dela Cruz",
        clinic: "Animal Kingdom Veterinary Hospital",
        role: "Head Veterinarian",
        initials: "RD",
        color: "from-emerald-500 to-teal-600",
    },
    {
        quote: "Being accredited by PAHA gave our clients a reason to trust us more. The PAHA badge is not just a sticker — it tells pet owners that we meet the highest standard of care.",
        name: "Dr. Grace Villanueva",
        clinic: "All Pets Veterinary Clinic",
        role: "Clinic Director",
        initials: "GV",
        color: "from-violet-500 to-purple-600",
    },
    {
        quote: "The free legal advice alone has saved us from so many compliance issues. PAHA truly looks after its members beyond just the professional side.",
        name: "Dr. Jose Mercado",
        clinic: "Vets In Practice Animal Hospital",
        role: "Managing Veterinarian",
        initials: "JM",
        color: "from-amber-500 to-orange-600",
    },
    {
        quote: "As a new clinic owner, PAHA gave me mentors, resources, and a community I didn't know I needed. I couldn't imagine growing my practice without them.",
        name: "Dr. Rina Aquino",
        clinic: "Eastwind Veterinary Clinic",
        role: "Founder & Veterinarian",
        initials: "RA",
        color: "from-rose-500 to-pink-600",
    },
    {
        quote: "Hotel discounts, seminar access, round-table discussions — PAHA membership pays for itself every single year. Our entire team benefits from being part of this association.",
        name: "Dr. Paolo Reyes",
        clinic: "Seven Lakes Veterinary Clinic",
        role: "Chief Veterinary Officer",
        initials: "PR",
        color: "from-cyan-500 to-blue-600",
    },
];

const memberNames = [
    "3J's Pet Camp Co. Veterinary Clinic", "A&J Animal Clinic", "A-1 Veterinary Clinic",
    "All Creatures Veterinary Clinic", "All Pets Veterinary Clinic", "Animal House Veterinary Clinic-Aurora",
    "Animal House Veterinary Clinic-Makati", "Animal Kingdom Veterinary Hospital", "Animal Practice Pet Clinic",
    "Animax Veterinary Clinic", "Batinga Animal Medical Center", "Bethlehem Animal Clinic - Antipolo",
    "Bethlehem Animal Clinic - Taytay", "Carlos Veterinary Clinic", "Celestial's Animal Clinic",
    "Cebu Veterinary Doctors", "City Vet Clinic", "D&C Animal Hospital", "DogCity Veterinary Clinic",
    "Eastwind Veterinary Clinic", "Happy Paws Veterinary Clinic", "Makati Dog And Cat Hospital",
    "My Pets Veterinary Clinic", "Peralta Veterinary Center", "Pet Wonders Veterinary Clinic",
    "Pluma Veterinary Clinic", "San Roque Animal Clinic", "Seven Lakes Veterinary Clinic",
    "The Pet Project Veterinary Clinic", "Vets In Practice Animal Hospital", "Wags and Whiskers Veterinary Clinic"
];

const TestimonialsCarousel: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const total = testimonials.length;
    const visible = 3;
    const totalSlides = total - visible + 1;

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setCurrent(prev => (prev + 1) % totalSlides);
        }, 4000);
    };

    useEffect(() => {
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, []);

    const goTo = (idx: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setCurrent(idx);
        startTimer();
    };

    return (
        <section className="py-20 bg-slate-50 dark:bg-white/[0.02] overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                    <div>
                        <span className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                            Member Stories
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">What our members say</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Hear from the clinics that have already made PAHA part of their practice.</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => goTo(Math.max(0, current - 1))} className="size-10 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all">
                            <span className="material-symbols-outlined text-lg">chevron_left</span>
                        </button>
                        <button onClick={() => goTo(Math.min(totalSlides - 1, current + 1))} className="size-10 rounded-xl border border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white hover:border-primary transition-all">
                            <span className="material-symbols-outlined text-lg">chevron_right</span>
                        </button>
                    </div>
                </div>
                <div className="overflow-hidden">
                    <div
                        className="flex transition-transform duration-700 ease-in-out"
                        style={{ transform: `translateX(calc(-${current} * (100% / ${visible})))` }}
                    >
                        {testimonials.map((t, i) => (
                            <div key={i} className="flex-shrink-0 px-3" style={{ width: `${100 / visible}%` }}>
                                <div className="bg-white dark:bg-slate-800/60 rounded-2xl p-6 border border-slate-200/70 dark:border-white/5 shadow-sm h-full flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, s) => (
                                                <span key={s} className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            ))}
                                        </div>
                                        <span className="material-symbols-outlined text-slate-200 dark:text-white/10 text-4xl">format_quote</span>
                                    </div>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed flex-1 italic">"{t.quote}"</p>
                                    <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                                        <div className={`size-10 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm`}>{t.initials}</div>
                                        <div>
                                            <p className="font-bold text-slate-900 dark:text-white text-sm">{t.name}</p>
                                            <p className="text-xs text-primary font-semibold">{t.clinic}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="flex justify-center gap-2 mt-8">
                    {Array.from({ length: totalSlides }).map((_, i) => (
                        <button
                            key={i}
                            onClick={() => goTo(i)}
                            className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'bg-primary w-8' : 'bg-slate-300 dark:bg-white/20 w-2'}`}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
};

const MembershipApplication: React.FC = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const { members } = useAdmin();

    const accreditedCount = useMemo(() => members.filter(m => m.isAccredited).length, [members]);
    const totalCount = members.length;

    const steps = [
        { num: '01', icon: 'check_circle', color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Check Qualifications', desc: 'Must be a licensed veterinarian representing a registered animal clinic or hospital in the Philippines.', btnLabel: 'View Requirements', action: 'link' as const, to: '/accreditation' },
        { num: '02', icon: 'edit_document', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', label: 'Submit Application', desc: 'Fill out the online membership form with your clinic information and attach the required documents.', btnLabel: 'Apply Now', action: 'modal' as const, to: '' },
        { num: '03', icon: 'manage_search', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', label: 'Evaluation & Site Visit', desc: 'Our Board representatives will evaluate your application and conduct a site visit to your clinic.', btnLabel: 'Check Status', action: 'link' as const, to: '/accreditation' },
        { num: '04', icon: 'workspace_premium', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', label: 'Join the Community', desc: 'Receive your PAHA badge, membership ID, and start enjoying all exclusive member benefits.', btnLabel: 'Connect With Us', action: 'link' as const, to: '/contact' },
    ];

    const benefits = [
        { icon: 'calendar_month', color: 'text-blue-500', bg: 'bg-blue-500/10', title: 'Priority Seminar Access', desc: 'First-dibs registration on hands-on CPE workshops, surgical wetlabs, and regional conventions at discounted member rates.' },
        { icon: 'gavel', color: 'text-emerald-500', bg: 'bg-emerald-500/10', title: 'Free Legal Advisory', desc: 'Access directly certified consultants for professional practice regulations, compliance, and client mediation cases.' },
        { icon: 'groups', color: 'text-violet-500', bg: 'bg-violet-500/10', title: 'Professional Directory', desc: 'Get listed in the official PAHA member directory and be discovered by pet owners searching for accredited clinics.' },
        { icon: 'hotel', color: 'text-amber-500', bg: 'bg-amber-500/10', title: 'Hotel & Travel Deals', desc: 'Discounted accommodation rates at partner hotels during PAHA national conventions and regional events.' },
        { icon: 'school', color: 'text-teal-500', bg: 'bg-teal-500/10', title: 'Free Lectures', desc: 'Complimentary CPD-accredited lectures at every membership meeting to keep your skills at the forefront.' },
        { icon: 'workspace_premium', color: 'text-rose-500', bg: 'bg-rose-500/10', title: 'Official PAHA Badge', desc: 'Display your accredited status with the official PAHA plaque and wall sticker — build instant client trust.' },
        { icon: 'campaign', color: 'text-orange-500', bg: 'bg-orange-500/10', title: 'Referral Visibility', desc: 'Emergency and routine referral listings across the PAHA network — your clinic gets seen by more pet owners.' },
        { icon: 'shield', color: 'text-cyan-500', bg: 'bg-cyan-500/10', title: 'RA 10173 Compliance', desc: 'Support and guidance on data privacy compliance aligned to national standards for veterinary operations.' },
    ];

    const requirements = [
        { icon: 'verified_user', color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', label: 'Licensed PRC Veterinarian', detail: 'Valid PRC license as a Veterinarian in the Philippines' },
        { icon: 'store', color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', label: 'Registered Animal Clinic', detail: 'DTI/SEC registered clinic or hospital operating in the Philippines' },
        { icon: 'description', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', label: 'Complete Application Form', detail: 'Fully accomplished PAHA membership application form' },
        { icon: 'badge', color: 'text-violet-500', bg: 'bg-violet-50 dark:bg-violet-500/10', label: 'Valid Government ID', detail: 'Clear copy of any government-issued ID of the applicant' },
        { icon: 'image', color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-500/10', label: 'Clinic Photos', detail: 'Recent photos of clinic interior, exterior, and facilities' },
        { icon: 'payments', color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', label: 'Annual Membership Fee', detail: 'Payment of annual dues upon approval of membership' },
    ];

    return (
        <div className="min-h-screen bg-white dark:bg-slate-950 font-sans text-slate-900 dark:text-white antialiased">
            <MembershipFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            {/* ── HERO SECTION ── */}
            <div className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10">
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/6816858/pexels-photo-6816858.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Membership Application Background"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#232323]/80 via-[#232323]/70 to-[#565656]/30"></div>
                    </div>

                    {/* Content Grid */}
                    <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        {/* Left Side: Headline & Description */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-white text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Philippine Animal Hospital Association
                            </div>
                            
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                                Apply for <span className="text-primary">Membership</span>
                            </h1>
                            
                            <p className="text-slate-350 text-sm md:text-base leading-relaxed max-w-xl font-medium">
                                Elevate your clinic. Expand your network. Stay ahead in veterinary excellence by joining the Philippines' leading veterinary organization.
                            </p>

                            <div className="flex flex-wrap gap-3 pt-2">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-primary/30 hover:scale-105 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                                    Apply for Membership
                                </button>
                                <Link
                                    to="/membership"
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-bold tracking-wide transition-all"
                                >
                                    <span className="material-symbols-outlined text-[18px]">info</span>
                                    Learn More
                                </Link>
                            </div>
                        </div>

                        {/* Right Side: Detailed Features Grid */}
                        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">verified</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">{accreditedCount}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Accredited Hospitals</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">badge</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">{totalCount}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Certified Clinics</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">health_and_safety</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">RA 10173</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Data Privacy Aligned</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-rose-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">emergency</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">24/7 Referrals</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Emergency Standards</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SCROLLING TICKER ── */}
            <div className="bg-primary overflow-hidden py-3">
                <div className="flex whitespace-nowrap" style={{ animation: 'marquee 45s linear infinite' }}>
                    {[...memberNames, ...memberNames].map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-3 text-white/90 text-xs font-bold uppercase tracking-wider px-8">
                            <span className="text-white/40">✦</span>{name}
                        </span>
                    ))}
                </div>
                <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
            </div>

            {/* ── MEMBER BENEFITS ── */}
            <section className="py-20 bg-white dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                        <div>
                            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                                Exclusive Benefits
                            </span>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">Why join PAHA?</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-lg">Exclusive perks designed to support your clinic operations and fuel your professional growth.</p>
                        </div>
                        <button onClick={() => setIsModalOpen(true)} className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-primary/20">
                            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                            Apply Now
                        </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {benefits.map(item => (
                            <div key={item.title} className="group p-6 rounded-2xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/50 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <div className={`size-12 rounded-xl ${item.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                                    <span className={`material-symbols-outlined text-xl ${item.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                </div>
                                <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-2">{item.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW TO JOIN — INTERACTIVE STEPS ── */}
            <section className="py-20 bg-slate-50 dark:bg-slate-900/40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-12">
                        <span className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-3">
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>route</span>
                            How to Join
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">4 simple steps</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">Follow the steps below to begin your PAHA membership journey.</p>
                    </div>

                    {/* Step selector tabs */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        {steps.map((s, i) => (
                            <button
                                key={s.num}
                                onClick={() => setActiveStep(i)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeStep === i ? 'bg-primary text-white shadow-sm shadow-primary/20' : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-primary/30'}`}
                            >
                                <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                                Step {s.num}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                        {steps.map((item, i) => (
                            <div
                                key={item.num}
                                onClick={() => setActiveStep(i)}
                                className={`bg-white dark:bg-slate-800/70 rounded-2xl p-6 border transition-all duration-300 cursor-pointer flex flex-col gap-4 hover:shadow-lg ${activeStep === i ? 'border-primary/40 shadow-md shadow-primary/10' : 'border-slate-200 dark:border-white/5 hover:border-primary/20'}`}
                            >
                                {/* Step number + icon */}
                                <div className="flex items-center justify-between">
                                    <div className={`size-12 rounded-xl ${item.bg} border flex items-center justify-center`}>
                                        <span className={`material-symbols-outlined text-xl ${item.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                    </div>
                                    <span className={`text-4xl font-black ${activeStep === i ? 'text-primary/20' : 'text-slate-200 dark:text-white/5'}`}>{item.num}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm mb-1">{item.label}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                                {item.action === 'modal' ? (
                                    <button onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }} className="mt-auto w-full py-2.5 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-wider hover:bg-primary/90 transition-colors">
                                        {item.btnLabel}
                                    </button>
                                ) : (
                                    <Link to={item.to} className="mt-auto w-full py-2.5 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-white text-xs font-bold uppercase tracking-wider hover:bg-primary hover:text-white transition-colors text-center">
                                        {item.btnLabel}
                                    </Link>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── MEMBERSHIP REQUIREMENTS ── */}
            <section className="py-20 bg-white dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
                        {/* Left */}
                        <div>
                            <span className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4">
                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>checklist</span>
                                Requirements
                            </span>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">What you'll need</h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-8">Before submitting your application, make sure you have the following documents and qualifications ready.</p>
                            <div className="space-y-3">
                                {requirements.map((r, i) => (
                                    <div key={r.label} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/40 hover:border-primary/20 transition-all group">
                                        <div className={`size-10 rounded-xl ${r.bg} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform`}>
                                            <span className={`material-symbols-outlined text-base ${r.color}`} style={{ fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
                                        </div>
                                        <div>
                                            <div className="font-bold text-slate-900 dark:text-white text-sm">{r.label}</div>
                                            <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{r.detail}</div>
                                        </div>
                                        <span className={`ml-auto text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${i < 3 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'}`}>
                                            {i < 3 ? 'Required' : 'Needed'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Right: CTA card + FAQ */}
                        <div className="space-y-6">
                            {/* CTA Card */}
                            <div className="rounded-2xl overflow-hidden border border-primary/20" style={{ background: 'linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%)' }}>
                                <div className="p-8">
                                    <div className="size-14 rounded-2xl bg-primary/20 flex items-center justify-center mb-5">
                                        <span className="material-symbols-outlined text-3xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>how_to_reg</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">Ready to Join?</h3>
                                    <p className="text-white/60 text-sm leading-relaxed mb-6">Start your PAHA membership application today and take the first step toward veterinary excellence.</p>
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold tracking-wide transition-all shadow-lg shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                                        Start Your Application
                                    </button>
                                </div>
                                <div className="border-t border-white/10 px-8 py-4 flex items-center gap-3">
                                    <span className="material-symbols-outlined text-emerald-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                    <span className="text-white/60 text-xs">Free to apply • No hidden fees</span>
                                </div>
                            </div>

                            {/* FAQ Mini */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
                                <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-4 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>help</span>
                                    Frequently Asked Questions
                                </h4>
                                <div className="space-y-4">
                                    {[
                                        { q: 'How long does the approval take?', a: 'Typically 2–4 weeks after a complete application is received.' },
                                        { q: 'Is there a membership fee?', a: 'Yes, annual membership dues apply upon approval. Contact PAHA for current rates.' },
                                        { q: 'Can associates apply?', a: 'Yes! We also accept associate members who are veterinary students or aspiring vets.' },
                                    ].map((faq, i) => (
                                        <div key={i} className="pb-4 border-b border-slate-200 dark:border-white/5 last:border-0 last:pb-0">
                                            <div className="font-semibold text-slate-900 dark:text-white text-xs mb-1">{faq.q}</div>
                                            <div className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{faq.a}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS ── */}
            <TestimonialsCarousel />

            {/* ── CTA BANNER ── */}
            <section className="py-20 bg-white dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1 rounded-full mb-4">
                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
                                Not a PAHA Member Yet?
                            </span>
                            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 leading-tight tracking-tight">
                                Build your network.<br />
                                Connect with industry<br />
                                leaders.
                            </h2>
                            <div className="w-12 h-1 bg-primary rounded-full mb-5" />
                            <p className="text-slate-600 dark:text-slate-400 leading-relaxed mb-8 text-sm">
                                Join PAHA and unlock exclusive discounts, priority access to top-tier seminars, free legal support, and a powerful network of Filipino veterinary professionals — everything you need to elevate your practice.
                            </p>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-sm transition-all shadow-xl shadow-primary/25 hover:scale-105 active:scale-95"
                                >
                                    <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                                    Get Your Membership
                                </button>
                                <Link to="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl font-bold text-sm hover:border-primary/30 hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                    <span className="material-symbols-outlined text-[18px]">mail</span>
                                    Contact Us
                                </Link>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-3">
                                <div className="h-36 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5 group">
                                    <img src="/2.jpg" alt="Veterinary care" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <div className="h-48 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5 group">
                                    <img src="/4.jpg" alt="Veterinary professionals" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <div className="h-36 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5 group">
                                    <img src="/6.jpg" alt="Animal care" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                            </div>
                            <div className="space-y-3 pt-6">
                                <div className="h-48 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5 group">
                                    <img src="/3.jpg" alt="Veterinary clinic" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <div className="h-36 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5 group">
                                    <img src="/5.jpg" alt="PAHA community" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                                <div className="h-48 rounded-2xl overflow-hidden shadow-md border border-slate-100 dark:border-white/5 group">
                                    <img src="/7.jpg" alt="Veterinary excellence" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default MembershipApplication;
