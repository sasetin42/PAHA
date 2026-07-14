import React, { useState, useMemo } from 'react';

interface TOSSection {
    id: string;
    number: string;
    title: string;
    icon: string;
    color: string;
    bg: string;
    badge: string;
    content: React.ReactNode;
    keywords: string[];
}

const TermsOfService: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState('sec-1');

    const sections: TOSSection[] = useMemo(() => [
        {
            id: 'sec-1',
            number: '1',
            title: 'Acceptance of Terms',
            icon: 'fact_check',
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30',
            badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
            keywords: ['acceptance', 'agree', 'bound', 'disagree', 'use', 'terms', 'privacy-policy'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        By accessing and using the PAHA website at <strong className="text-blue-900 dark:text-blue-300">paha.ph</strong>, you accept and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use this website.
                    </p>
                    <p className="leading-relaxed">
                        These terms govern all access to and use of PAHA's official digital portals, registration systems, and databases. We advise keeping a copy of these terms for your records.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-2',
            number: '2',
            title: 'About PAHA',
            icon: 'domain',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
            badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
            keywords: ['about', 'veterinary', 'practitioners', 'accreditation', 'activities', 'organization'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        The Philippine Animal Hospital Association (PAHA) is a professional organization of veterinary practitioners in the Philippines. The website provides information about membership, events, accreditation, and organizational activities.
                    </p>
                    <p className="leading-relaxed">
                        Our primary objective is to advance veterinary hospital standards and clinical training in companion animal medicine throughout the Philippines.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-3',
            number: '3',
            title: 'Membership',
            icon: 'card_membership',
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30',
            badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
            keywords: ['membership', 'rules', 'ethics', 'bylaws', 'fees', 'application', 'terminate'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        Membership in PAHA is subject to approval by the Board of Directors. By submitting a membership application, you agree to:
                    </p>
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-2">
                        {[
                            'Provide accurate, complete, and current information.',
                            'Abide by PAHA’s Code of Ethics and organizational bylaws.',
                            'Pay all applicable membership and renewal fees on time.',
                            'Notify PAHA of any material changes to your veterinary clinic.'
                        ].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-2.5 text-sm">
                                <span className="material-symbols-outlined text-indigo-500 text-lg mt-0.5 select-none">check_circle</span>
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                    <p className="leading-relaxed text-sm bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        PAHA reserves the right to accept or reject any membership application and to terminate membership for violations of these terms or organizational bylaws.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-4',
            number: '4',
            title: 'Event Registration and Payments',
            icon: 'payments',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
            badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
            keywords: ['events', 'payments', 'registration', 'non-refundable', 'promotional', 'cancel'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        Event registrations are subject to availability. By registering for a PAHA event, workshop, or convention, you agree that:
                    </p>
                    <div className="space-y-3">
                        <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl mt-1 select-none">cancel_presentation</span>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Refund Policy</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Fees are non-refundable unless PAHA officially cancels the event. Substitutions may be allowed with prior written notice.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl mt-1 select-none">photo_camera</span>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Promotional Recordings</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">PAHA may use photographs or recordings from events for educational, reporting, and promotional purposes.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'sec-5',
            number: '5',
            title: 'Accreditation',
            icon: 'verified',
            color: 'text-cyan-600 dark:text-cyan-400',
            bg: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30',
            badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
            keywords: ['accreditation', 'discretion', 'standards', 'marks', 'clinics'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        PAHA accreditation is granted at the sole discretion of the Accreditation Committee. Accreditation status may be withdrawn at any time for failure to maintain required professional standards.
                    </p>
                    <p className="leading-relaxed">
                        Display of PAHA accreditation marks, stickers, or certificates is permitted only by currently accredited clinics. Unauthorized display of PAHA credentials constitutes a violation of these terms.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-6',
            number: '6',
            title: 'User Accounts',
            icon: 'manage_accounts',
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30',
            badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
            keywords: ['accounts', 'credentials', 'password', 'confidentiality', 'unauthorized', 'login'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        If you create an account on our website, you are responsible for maintaining the confidentiality of your login credentials and for all activities under your account.
                    </p>
                    <p className="leading-relaxed">
                        Notify us immediately of any unauthorized use or security breaches of your account at <strong className="text-slate-800 dark:text-white">paha_members@yahoo.com</strong>. PAHA is not liable for losses caused by unauthorized use of your credentials.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-7',
            number: '7',
            title: 'Intellectual Property',
            icon: 'copyright',
            color: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30',
            badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
            keywords: ['intellectual', 'property', 'copyright', 'graphics', 'logos', 'reproduce'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        All content on this website — including text, graphics, logos, images, vectors, code, and software — is the property of PAHA or its content suppliers and is protected by Philippine and international copyright laws.
                    </p>
                    <p className="leading-relaxed">
                        You may not reproduce, distribute, modify, display, or create derivative works from our content without prior written permission from PAHA.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-8',
            number: '8',
            title: 'Prohibited Conduct',
            icon: 'block',
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
            badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
            keywords: ['prohibited', 'unlawful', 'fraudulent', 'interfere', 'impersonate', 'hack'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">You agree not to use the website or services for any of the following prohibited activities:</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
                        {[
                            { name: 'Unlawful Use', desc: 'Engaging in or promoting any illegal activities.' },
                            { name: 'False Information', desc: 'Submitting fraudulent PRC licenses or fake clinic coordinates.' },
                            { name: 'Hacking & Penetration', desc: 'Attempting to gain unauthorized access to databases or backend APIs.' },
                            { name: 'Impersonation', desc: 'Pretending to be a PAHA officer, administrator, or another vet.' }
                        ].map((conduct, idx) => (
                            <div key={idx} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/70 bg-white/40 dark:bg-slate-900/30">
                                <span className="font-semibold text-rose-600 dark:text-rose-400 text-sm mt-0.5">{idx + 1}.</span>
                                <div>
                                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{conduct.name}</h5>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{conduct.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: 'sec-9',
            number: '9',
            title: 'Disclaimer of Warranties',
            icon: 'warning',
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30',
            badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
            keywords: ['disclaimer', 'warranties', 'as-is', 'uninterrupted', 'educational'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        This website is provided <strong className="text-slate-800 dark:text-white">"as is"</strong> and <strong className="text-slate-800 dark:text-white">"as available"</strong> without any warranties, express or implied. PAHA does not warrant that the website will be uninterrupted, error-free, or free of viruses.
                    </p>
                    <p className="leading-relaxed text-sm bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                        <strong>General Information Only:</strong> Veterinary resources, articles, and recommendations on this website are for general educational purposes only and do not constitute formal professional clinical advice.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-10',
            number: '10',
            title: 'Limitation of Liability',
            icon: 'gavel',
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/30',
            badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
            keywords: ['liability', 'indirect', 'incidental', 'damages', 'consequential'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        To the fullest extent permitted by Philippine law, PAHA shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of this website or reliance on its content.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-11',
            number: '11',
            title: 'Governing Law',
            icon: 'balance',
            color: 'text-pink-600 dark:text-pink-400',
            bg: 'bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30',
            badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
            keywords: ['governing', 'law', 'philippines', 'disputes', 'metro-manila', 'jurisdiction'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        These Terms of Service are governed by and construed in accordance with the laws of the Republic of the Philippines.
                    </p>
                    <p className="leading-relaxed">
                        Any disputes arising from these terms or the use of our services shall be subject to the exclusive jurisdiction of the competent courts of Metro Manila, Philippines.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-12',
            number: '12',
            title: 'Changes to Terms',
            icon: 'update',
            color: 'text-slate-600 dark:text-slate-400',
            bg: 'bg-slate-100 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800/30',
            badge: 'bg-slate-200 text-slate-800 dark:bg-slate-800/40 dark:text-slate-300',
            keywords: ['changes', 'terms', 'modify', 'revision', 'acceptance'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        PAHA reserves the right to modify these terms at any time. Changes are effective immediately upon posting to the website.
                    </p>
                    <p className="leading-relaxed text-sm bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg">
                        Your continued use of the website following the posting of changes constitutes your acceptance of the revised terms.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-13',
            number: '13',
            title: 'Contact',
            icon: 'contact_support',
            color: 'text-sky-600 dark:text-sky-400',
            bg: 'bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30',
            badge: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
            keywords: ['contact', 'email', 'phone', 'address', 'inquiries', 'paha_members@yahoo.com'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        If you have any questions about these Terms of Service, please feel free to reach out to our team:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm flex gap-3">
                            <span className="material-symbols-outlined text-sky-500 text-2xl mt-0.5 select-none">mail</span>
                            <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm block">Email Secretariat</span>
                                <a href="mailto:paha_members@yahoo.com" className="text-primary hover:underline text-sm font-medium">paha_members@yahoo.com</a>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm flex gap-3">
                            <span className="material-symbols-outlined text-sky-500 text-2xl mt-0.5 select-none">location_on</span>
                            <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm block">Headquarters</span>
                                <span className="text-slate-700 dark:text-slate-300 text-sm">46 Pres. Quezon St., Industrial Valley, Marikina</span>
                            </div>
                        </div>
                    </div>
                </div>
            )
        }
    ], []);

    const filteredSections = useMemo(() => {
        if (!searchQuery) return sections;
        const query = searchQuery.toLowerCase();
        return sections.filter(sec =>
            sec.title.toLowerCase().includes(query) ||
            sec.keywords.some(k => k.includes(query))
        );
    }, [searchQuery, sections]);

    const scrollToSection = (id: string) => {
        setActiveSection(id);
        const element = document.getElementById(id);
        if (element) {
            const navbarOffset = 90; // Adjust for fixed navigation bar
            const elementPosition = element.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - navbarOffset;
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-white relative">
            {/* Ambient Background Glows */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-0 right-0 w-[40vw] h-[40vh] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                <div className="absolute bottom-0 left-0 w-[30vw] h-[30vh] bg-blue-500/5 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2"></div>
            </div>

            <main className="hero-pt px-6 max-w-7xl mx-auto pb-20 relative z-10">
                {/* Header Title Section */}
                <div className="border-b border-slate-100 dark:border-white/10 pb-8 mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            <span className="text-primary font-bold text-xs uppercase tracking-widest">Legal Agreement</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                            Terms of <span className="text-primary">Service</span>
                        </h1>
                        <p className="text-slate-500 dark:text-silver/50 mt-2 text-sm">
                            Last revised: May 2025 • Governing official PAHA membership & portal utilities
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-sm font-semibold transition-all duration-200"
                        >
                            <span className="material-symbols-outlined text-[18px]">print</span>
                            Print Document
                        </button>
                    </div>
                </div>

                {/* Key Quick Summaries Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                    {[
                        { icon: 'gavel', title: 'Governing Bylaws', desc: 'Governed by PH civil legislation.', color: 'from-blue-500 to-cyan-500' },
                        { icon: 'verified', title: 'Accreditation Rules', desc: 'Valid for active, compliant clinics.', color: 'from-emerald-500 to-teal-500' },
                        { icon: 'account_box', title: 'Account Integrity', desc: 'Users are liable for credentials.', color: 'from-indigo-500 to-purple-500' },
                        { icon: 'copyright', title: 'IP Protection', desc: 'All graphics & code are copyrighted.', color: 'from-amber-500 to-orange-500' }
                    ].map((summary, idx) => (
                        <div key={idx} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm flex items-start gap-4">
                            <div className={`p-2.5 rounded-xl bg-gradient-to-br ${summary.color} text-white flex items-center justify-center shadow-md select-none`}>
                                <span className="material-symbols-outlined text-[20px]">{summary.icon}</span>
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white text-sm">{summary.title}</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{summary.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Interactive Area: Split Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Left Sticky Sidebar & Interactive Search */}
                    <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
                        {/* Search Card */}
                        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <label htmlFor="tos-search" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                Search Terms
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] select-none">search</span>
                                <input
                                    id="tos-search"
                                    type="text"
                                    placeholder="Search keywords (e.g. hack, fees)..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-primary focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all duration-200 text-sm"
                                />
                            </div>
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="text-xs text-primary hover:underline font-semibold mt-2 flex items-center gap-1"
                                >
                                    Clear search filter
                                </button>
                            )}
                        </div>

                        {/* Document Outline Directory */}
                        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hidden lg:block">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-between">
                                <span>Table of Contents</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-semibold">{filteredSections.length} Articles</span>
                            </h3>

                            <nav className="space-y-1 max-h-[420px] overflow-y-auto custom-scrollbar pr-1">
                                {filteredSections.map((sec) => (
                                    <button
                                        key={sec.id}
                                        onClick={() => scrollToSection(sec.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-3
                                            ${activeSection === sec.id
                                                ? 'bg-primary/5 text-primary border-l-4 border-primary pl-2'
                                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                                            }
                                        `}
                                    >
                                        <div className={`w-6 h-6 rounded-lg ${sec.bg.split(' ')[0]} flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined text-[14px] ${sec.color}`}>{sec.icon}</span>
                                        </div>
                                        <span className="truncate">{sec.number}. {sec.title}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </div>

                    {/* Right TOS Body Details */}
                    <div className="lg:col-span-8 space-y-8">
                        {filteredSections.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <span className="material-symbols-outlined text-slate-400 text-5xl mb-3 select-none">find_in_page</span>
                                <h3 className="font-semibold text-slate-800 dark:text-white text-base">No sections found</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">No terms sections match your current keyword search of "{searchQuery}".</p>
                            </div>
                        ) : (
                            filteredSections.map((sec) => (
                                <section
                                    key={sec.id}
                                    id={sec.id}
                                    className={`p-6 md:p-8 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all duration-300 relative group
                                        ${activeSection === sec.id
                                            ? 'border-primary/30 ring-2 ring-primary/5'
                                            : 'border-slate-100 dark:border-slate-800'
                                        }
                                    `}
                                >
                                    {/* Article Number Badge */}
                                    <div className="absolute top-6 right-6 select-none">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${sec.badge}`}>
                                            Article {sec.number}
                                        </span>
                                    </div>

                                    {/* Section Heading */}
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className={`w-12 h-12 rounded-2xl ${sec.bg} border flex items-center justify-center shadow-inner`}>
                                            <span className={`material-symbols-outlined text-[24px] ${sec.color} select-none`}>{sec.icon}</span>
                                        </div>
                                        <div>
                                            <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">{sec.title}</h2>
                                            <span className="text-xs text-slate-400 dark:text-slate-500">PAHA Compliance Standard</span>
                                        </div>
                                    </div>

                                    {/* Content Detail Body */}
                                    <div className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed space-y-4">
                                        {sec.content}
                                    </div>
                                </section>
                            ))
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default TermsOfService;
