import React from 'react';
import { Link } from 'react-router-dom';

const stages = [
    {
        step: '01',
        icon: 'description',
        title: 'Letter of Intent (LOI)',
        desc: 'Submit a formal Letter of Intent to the PAHA Accreditation Committee expressing your clinic\'s desire to pursue accreditation. Include your clinic name, address, and contact details.',
    },
    {
        step: '02',
        icon: 'assignment',
        title: 'Self-Assessment',
        desc: 'Complete the PAHA Self-Assessment Checklist covering facility, equipment, staff credentials, medical records, infection control, and safety protocols. This gives you a clear picture of your readiness.',
    },
    {
        step: '03',
        icon: 'manage_search',
        title: 'Documentary Requirements',
        desc: 'Prepare and submit all required documents: Business/Mayor\'s permit, PRC licenses of all veterinarians, Clinic floor plan, equipment inventory, staff list, and completed self-assessment form.',
    },
    {
        step: '04',
        icon: 'home_work',
        title: 'On-Site Inspection',
        desc: 'A team of PAHA-accredited evaluators will conduct an on-site visit to assess your facility, review records, observe protocols, and verify compliance with PAHA standards.',
    },
    {
        step: '05',
        icon: 'rule',
        title: 'Compliance & Remediation',
        desc: 'Evaluators submit their findings. If deficiencies are found, the clinic is given a remediation period to address and correct non-compliant areas before re-evaluation.',
    },
    {
        step: '06',
        icon: 'admin_panel_settings',
        title: 'Administrative Review',
        desc: 'The PAHA Accreditation Committee reviews all evaluation reports and documentary submissions. A final deliberation is conducted to determine accreditation status.',
    },
    {
        step: '07',
        icon: 'payments',
        title: 'Accreditation Fee Payment',
        desc: 'Upon approval, the clinic is issued an official billing for the accreditation fee. Payment must be completed before the certificate is released.',
    },
    {
        step: '08',
        icon: 'verified',
        title: 'Accredited',
        desc: 'Congratulations! Your clinic is now officially PAHA-Accredited. Receive your certificate and seal, valid for a renewable term, recognizing your commitment to veterinary excellence.',
    },
];

const requirements = [
    {
        category: 'Legal & Business Documents',
        icon: 'gavel',
        items: [
            'Valid Mayor\'s Permit / Business Permit',
            'DTI or SEC Registration',
            'BIR Certificate of Registration',
            'Barangay Clearance',
        ],
    },
    {
        category: 'Professional Licenses',
        icon: 'badge',
        items: [
            'PRC License of all veterinarians on staff',
            'PRC License of veterinary technicians (if applicable)',
            'Proof of PAHA membership (active)',
            'CPD compliance certificates',
        ],
    },
    {
        category: 'Facility Standards',
        icon: 'home_work',
        items: [
            'Clinic floor plan (to scale)',
            'Proper reception, examination, and surgical areas',
            'Adequate ventilation, lighting, and sanitation',
            'Separate areas for surgical, recovery, and isolation',
        ],
    },
    {
        category: 'Equipment & Supplies',
        icon: 'medical_services',
        items: [
            'Complete equipment inventory list',
            'Calibration records for diagnostic equipment',
            'Emergency drug kit and crash cart',
            'Sterile surgical instruments and autoclave',
        ],
    },
    {
        category: 'Medical Records & Protocols',
        icon: 'folder_open',
        items: [
            'Systematic patient medical record system',
            'Written infection control and biosecurity protocols',
            'Medication log and controlled drug records',
            'Staff training and orientation records',
        ],
    },
    {
        category: 'Safety & Waste Management',
        icon: 'health_and_safety',
        items: [
            'Proper medical waste disposal documentation',
            'Fire safety certificate and extinguishers',
            'Personal protective equipment (PPE) availability',
            'Emergency evacuation plan posted on-site',
        ],
    },
];

const AccreditationRequirements: React.FC = () => {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-navy font-display text-slate-900 dark:text-white antialiased pb-20">
            <main className="hero-pt pb-20">

                {/* Hero Section */}
                <section className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10">
                    <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5">
                        {/* Background Overlay */}
                        <div className="absolute inset-0 z-0">
                            <img
                                src="https://images.pexels.com/photos/6816858/pexels-photo-6816858.jpeg"
                                className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                                alt="Accreditation Background"
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
                                    Accreditation <span className="text-primary">Requirements</span>
                                </h1>
                                
                                <p className="text-slate-350 text-sm md:text-base leading-relaxed max-w-xl font-medium">
                                    Achieving PAHA Accreditation is a mark of excellence that distinguishes your clinic as meeting the highest standards in Philippine veterinary practice. Learn the requirements and self-assessment steps.
                                </p>
                            </div>

                            {/* Right Side: Detailed Features Grid */}
                            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">insights</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-2xl text-white tracking-tight">8 Stages</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Accreditation Journey</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">fact_check</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-2xl text-white tracking-tight">6 Categories</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Evaluation Checklist</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">badge</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-[15px] text-white tracking-tight">Licensed Vets</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">PRC Certified staff</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-rose-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">home_work</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-[15px] text-white tracking-tight">Facility Rules</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Safety Standards</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Accreditation Process — Step-by-Step */}
                <section className="px-4 sm:px-6 lg:px-8 mb-16 md:mb-28 max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-primary font-semibold uppercase tracking-widest text-xs mb-2 block">Step-by-Step Process</span>
                        <h2 className="text-2xl md:text-4xl font-semibold text-blue-950 dark:text-white">The 8-Stage Accreditation Journey</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto text-sm">
                            From submission to certification, the PAHA accreditation process is transparent, structured, and designed to help you succeed.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stages.map((stage, i) => (
                            <div
                                key={i}
                                className="flex gap-5 p-6 bg-white dark:bg-charcoal rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                            >
                                <div className="flex-shrink-0 flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                        <span className="material-symbols-outlined text-2xl">{stage.icon}</span>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 tracking-widest">{stage.step}</span>
                                </div>
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{stage.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{stage.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Documentary Requirements */}
                <section className="px-4 sm:px-6 lg:px-8 mb-16 md:mb-28 max-w-7xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-primary font-semibold uppercase tracking-widest text-xs mb-2 block">Checklist</span>
                        <h2 className="text-2xl md:text-4xl font-semibold text-blue-950 dark:text-white">Documentary Requirements</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-3 max-w-xl mx-auto text-sm">
                            Organize your documents in advance to streamline the accreditation review process.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {requirements.map((req, i) => (
                            <div key={i} className="bg-white dark:bg-charcoal p-7 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all group">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-primary mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-2xl">{req.icon}</span>
                                </div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-4">{req.category}</h3>
                                <ul className="space-y-2">
                                    {req.items.map((item, j) => (
                                        <li key={j} className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                                            <span className="material-symbols-outlined text-base text-primary mt-0.5 flex-shrink-0">check_circle</span>
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Eligibility Banner */}
                <section className="px-4 sm:px-6 lg:px-8 mb-16 md:mb-28 max-w-6xl mx-auto">
                    <div className="bg-slate-900 rounded-[1.5rem] md:rounded-[3rem] p-8 sm:p-12 md:p-16 relative overflow-hidden">
                        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_60%_50%,#1e60a3,transparent_70%)]"></div>
                        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                            <div className="w-20 h-20 rounded-3xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                                <span className="material-symbols-outlined text-4xl text-primary-light">workspace_premium</span>
                            </div>
                            <div className="text-center md:text-left">
                                <h3 className="text-2xl md:text-3xl font-semibold text-white mb-3">Who Can Apply?</h3>
                                <p className="text-slate-400 leading-relaxed max-w-2xl">
                                    Any veterinary clinic or animal hospital in the Philippines owned or operated by a licensed veterinarian who is an <strong className="text-white">active PAHA member in good standing</strong> is eligible to apply for accreditation. Clinics must have been in operation for at least <strong className="text-white">one (1) year</strong> prior to application.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Benefits of Accreditation */}
                <section className="px-4 sm:px-6 lg:px-8 mb-16 md:mb-28 max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-primary font-semibold uppercase tracking-widest text-xs mb-2 block">Why Get Accredited</span>
                        <h2 className="text-5xl font-semibold text-blue-950 dark:text-white">Benefits of PAHA Accreditation</h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            { icon: 'verified', title: 'Official Recognition', desc: 'Display the PAHA Accredited seal — a trusted mark recognized by pet owners nationwide.' },
                            { icon: 'diversity_3', title: 'Referral Network', desc: 'Join the PAHA referral network and be listed in the official directory of accredited clinics.' },
                            { icon: 'trending_up', title: 'Practice Excellence', desc: 'Structured evaluation helps identify gaps and drives continuous improvement in your practice.' },
                            { icon: 'handshake', title: 'Industry Credibility', desc: 'Gain credibility with insurance companies, pet owners, and government regulatory bodies.' },
                        ].map((b, i) => (
                            <div key={i} className="bg-white dark:bg-charcoal p-6 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm text-center hover:shadow-lg hover:-translate-y-1 transition-all group">
                                <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-primary mx-auto mb-5 group-hover:scale-110 transition-transform">
                                    <span className="material-symbols-outlined text-3xl">{b.icon}</span>
                                </div>
                                <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2">{b.title}</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">{b.desc}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* FAQ */}
                <section className="px-4 sm:px-6 lg:px-8 mb-16 md:mb-28 max-w-3xl mx-auto">
                    <div className="text-center mb-12">
                        <span className="text-primary font-semibold uppercase tracking-widest text-xs mb-2 block">Common Questions</span>
                        <h2 className="text-5xl font-semibold text-blue-950 dark:text-white">Frequently Asked Questions</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            {
                                q: 'How long does the accreditation process take?',
                                a: 'The typical process from LOI submission to certificate issuance takes 2–4 months, depending on clinic readiness and document completeness.',
                            },
                            {
                                q: 'How long is an accreditation certificate valid?',
                                a: 'PAHA Accreditation certificates are valid for two (2) years and are subject to renewal evaluation.',
                            },
                            {
                                q: 'Can a solo practice veterinary clinic apply?',
                                a: 'Yes. Both solo practice clinics and multi-doctor hospitals are eligible, provided all eligibility requirements are met.',
                            },
                            {
                                q: 'What happens if we fail the on-site inspection?',
                                a: 'Clinics that do not meet minimum standards are given a remediation period to correct deficiencies and request a re-inspection.',
                            },
                            {
                                q: 'Is PAHA membership required?',
                                a: 'Yes. The clinic owner or primary veterinarian must be an active PAHA member in good standing at the time of application.',
                            },
                        ].map((faq, i) => (
                            <div key={i} className="bg-white dark:bg-charcoal rounded-2xl border border-slate-100 dark:border-white/5 p-6 shadow-sm">
                                <h4 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2 flex items-start gap-3">
                                    <span className="material-symbols-outlined text-primary text-xl mt-0.5 flex-shrink-0">help</span>
                                    {faq.q}
                                </h4>
                                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed pl-8">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="text-center px-6">
                    <h2 className="text-3xl md:text-5xl font-semibold text-blue-950 dark:text-white mb-4">Ready to Get Accredited?</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-xl mx-auto">
                        Log in to your PAHA Member Portal to submit your Letter of Intent and begin the accreditation process today.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link
                            to="/members"
                            className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">rocket_launch</span>
                            Go to Member Portal
                        </Link>
                        <Link
                            to="/membership/application"
                            className="px-8 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl font-semibold transition-all hover:bg-slate-50 dark:hover:bg-white/10 flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined">person_add</span>
                            Join PAHA First
                        </Link>
                    </div>
                </section>

            </main>
        </div>
    );
};

export default AccreditationRequirements;
