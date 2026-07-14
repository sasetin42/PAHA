import React, { useState, useMemo } from 'react';

interface PolicySection {
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

const PrivacyPolicy: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState('sec-1');

    const sections: PolicySection[] = useMemo(() => [
        {
            id: 'sec-1',
            number: '1',
            title: 'Introduction',
            icon: 'info',
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30',
            badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
            keywords: ['introduction', 'paha', 'welcome', 'overview', 'disagree', 'protect'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        The Philippine Animal Hospital Association ("PAHA", "we", "us", or "our") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at <strong className="text-blue-900 dark:text-blue-300">paha.ph</strong> and use our services.
                    </p>
                    <p className="leading-relaxed">
                        Please read this policy carefully. By accessing or using our services, you acknowledge that you have read, understood, and agree to the terms described in this policy. If you disagree with any terms in this policy, please discontinue use of the site immediately.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-2',
            number: '2',
            title: 'Information We Collect',
            icon: 'database',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
            badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
            keywords: ['collect', 'data', 'identity', 'contact', 'membership', 'license', 'payment', 'phone'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        We may collect personal information that you voluntarily provide to us when you apply for membership, register for events, or contact us. The categories of information we collect include:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Identity & Credentials</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Full name, title, professional license number (PRC), and specialization details.</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Contact Information</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Email address, primary phone number, mobile number, and clinic/hospital addresses.</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Membership & Events</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">Clinic name, membership tier, accreditation status, dietary preferences for events, and payment receipts.</span>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">Technical Analytics</span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">IP addresses, browser type, device information, and anonymous usage records collected via analytics tools.</span>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'sec-3',
            number: '3',
            title: 'How We Use Your Information',
            icon: 'settings_suggest',
            color: 'text-indigo-600 dark:text-indigo-400',
            bg: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/30',
            badge: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300',
            keywords: ['use', 'purpose', 'process', 'membership', 'newsletters', 'announcements', 'directory'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">PAHA uses the collected information for specific, legitimate, and transparent purposes:</p>
                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-2">
                        {[
                            'Process and verify membership applications and annual renewals.',
                            'Manage event registrations, track attendance, and provide dietary setups.',
                            'Send legal notices, newsletters, and veterinary announcements.',
                            'Respond to support inquiries and website contact form submissions.',
                            'Publish details in the Member Directory and update accreditation records.',
                            'Improve performance and interface through aggregated website analytics.'
                        ].map((purpose, i) => (
                            <li key={i} className="flex items-start gap-2.5 text-sm">
                                <span className="material-symbols-outlined text-indigo-500 text-lg mt-0.5 select-none">check_circle</span>
                                <span>{purpose}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )
        },
        {
            id: 'sec-4',
            number: '4',
            title: 'Data Sharing and Disclosure',
            icon: 'share',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
            badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
            keywords: ['share', 'disclosure', 'third-parties', 'firebase', 'google', 'payment', 'law'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        We strictly respect your privacy. <strong className="text-slate-800 dark:text-white">We do not sell, rent, trade, or share your personal data with third parties for commercial or marketing purposes.</strong> Disclosure is limited to:
                    </p>
                    <div className="space-y-3">
                        <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl mt-1 select-none">cloud</span>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Trusted Infrastructure Services</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Google Firebase hosting, authentication, and secure database services. Google processes this data strictly under standard data processing terms.</p>
                            </div>
                        </div>
                        <div className="flex gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                            <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-2xl mt-1 select-none">gavel</span>
                            <div>
                                <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Legal & Compliance Mandates</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">When required under the laws of the Republic of the Philippines, court subpoenas, or to respond to legitimate regulatory and police requests.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'sec-5',
            number: '5',
            title: 'Data Retention',
            icon: 'history',
            color: 'text-cyan-600 dark:text-cyan-400',
            bg: 'bg-cyan-50 dark:bg-cyan-950/20 border-cyan-100 dark:border-cyan-900/30',
            badge: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300',
            keywords: ['retention', 'years', 'duration', 'preserve', 'records', 'delete'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        We preserve your information only for the minimum period necessary for the purposes outlined in this policy. Active membership accounts and professional records are kept during active membership status, and for up to <strong className="text-slate-800 dark:text-white">7 years</strong> after membership termination for compliance, auditing, and tax purposes.
                    </p>
                    <p className="leading-relaxed text-sm bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 p-3 rounded-lg">
                        <strong>Contact Messages:</strong> Communications submitted via our Contact Form are held for a maximum of 2 years to ensure complete follow-up resolution, after which they are securely deleted.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-6',
            number: '6',
            title: 'Your Rights',
            icon: 'verified_user',
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30',
            badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
            keywords: ['rights', 'data-privacy-act', 'republic-act-10173', 'access', 'correct', 'erasure', 'portability'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        Under the <strong className="text-slate-800 dark:text-white">Data Privacy Act of 2012 (Republic Act No. 10173)</strong>, you retain full rights over your personal data. These rights include:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
                        {[
                            { name: 'Right to Be Informed', desc: 'Know why and how your data is collected and processed.' },
                            { name: 'Right to Access', desc: 'Request a copy of all personal information PAHA stores about you.' },
                            { name: 'Right to Rectification', desc: 'Request corrections to inaccurate, outdated, or incomplete data.' },
                            { name: 'Right to Erasure (Blocking)', desc: 'Demand removal of data, subject to regulatory retention mandates.' },
                            { name: 'Right to Object', desc: 'Refuse data processing or withdraw previously given consents.' },
                            { name: 'Right to Portability', desc: 'Obtain copy of your personal data in a structured, electronic format.' }
                        ].map((right, idx) => (
                            <div key={idx} className="flex gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800/70 bg-white/40 dark:bg-slate-900/30">
                                <span className="font-semibold text-purple-600 dark:text-purple-400 text-sm mt-0.5">{idx + 1}.</span>
                                <div>
                                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{right.name}</h5>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{right.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )
        },
        {
            id: 'sec-7',
            number: '7',
            title: 'Cookies and Tracking',
            icon: 'cookie',
            color: 'text-orange-600 dark:text-orange-400',
            bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30',
            badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
            keywords: ['cookies', 'tracking', 'opt-out', 'google-analytics', 'preferences'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        We utilize cookies and micro-tracking metrics to ensure secure login sessions, remember preferences, and analyze generic visitor patterns. You can change your preferences at any time through your browser's options or using the site's default cookie consent banner.
                    </p>
                    <p className="leading-relaxed">
                        For traffic monitoring, we utilize Google Analytics. Google Analytics uses cookies to generate reports. To prevent your data from being recorded by Google, you can install the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold inline-flex items-center gap-1">Google Opt-Out Tool <span className="material-symbols-outlined text-[14px]">open_in_new</span></a>.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-8',
            number: '8',
            title: 'Security Measures',
            icon: 'security',
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
            badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
            keywords: ['security', 'protect', 'https', 'ssl', 'encryption', 'firebase', 'firewall'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        PAHA employs multi-layered structural, electronic, and physical defenses to protect your personal details:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-center mt-2">
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <span className="material-symbols-outlined text-rose-500 text-3xl mb-2 select-none">lock</span>
                            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">SSL/HTTPS Encryption</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All database and portal transmissions are encrypted.</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <span className="material-symbols-outlined text-rose-500 text-3xl mb-2 select-none">admin_panel_settings</span>
                            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Role-Based Access</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Data is accessible only to approved PAHA officers.</p>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50">
                            <span className="material-symbols-outlined text-rose-500 text-3xl mb-2 select-none">cloud_done</span>
                            <h5 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Firebase Compliance</h5>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Backed by Google's global cloud security architecture.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'sec-9',
            number: '9',
            title: "Children's Privacy",
            icon: 'child_care',
            color: 'text-teal-600 dark:text-teal-400',
            bg: 'bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900/30',
            badge: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
            keywords: ['children', 'minors', 'under-18', 'age', 'inadvertent'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        Our platform is designed strictly for licensed professionals and adult clinic owners. We do not intentionally compile or request data from children under the age of 18. If we verify that a minor has submitted personal files, we will delete the files instantly from our records.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-10',
            number: '10',
            title: 'Policy Revisions',
            icon: 'update',
            color: 'text-violet-600 dark:text-violet-400',
            bg: 'bg-violet-50 dark:bg-violet-950/20 border-violet-100 dark:border-violet-900/30',
            badge: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
            keywords: ['changes', 'updates', 'modify', 'revision', 'acceptance'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        We reserve the right to modify this Privacy Policy at any time. Any changes will be posted on this page with an updated revision date.
                    </p>
                    <p className="leading-relaxed text-sm bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg">
                        We recommend checking this page periodically to stay informed about how we safeguard your information. Your continued use of the website following changes implies consent to the revised terms.
                    </p>
                </div>
            )
        },
        {
            id: 'sec-11',
            number: '11',
            title: 'Contact Information',
            icon: 'contact_support',
            color: 'text-pink-600 dark:text-pink-400',
            bg: 'bg-pink-50 dark:bg-pink-950/20 border-pink-100 dark:border-pink-900/30',
            badge: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
            keywords: ['contact', 'email', 'phone', 'address', 'inquiries', 'paha_members@yahoo.com'],
            content: (
                <div className="space-y-4">
                    <p className="leading-relaxed">
                        For any questions regarding this policy, to exercise your data rights, or to submit feedback, please reach out to us:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm flex gap-3">
                            <span className="material-symbols-outlined text-pink-500 text-2xl mt-0.5 select-none">mail</span>
                            <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm block">Email Contacts</span>
                                <a href="mailto:paha_members@yahoo.com" className="text-primary hover:underline text-sm font-medium">paha_members@yahoo.com</a>
                                <span className="text-xs text-slate-400 block mt-0.5">Secretariat & Membership inquiries</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm flex gap-3">
                            <span className="material-symbols-outlined text-pink-500 text-2xl mt-0.5 select-none">phone_in_talk</span>
                            <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm block">Call Support</span>
                                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">0906-252 5627</span>
                                <span className="text-xs text-slate-400 block mt-0.5">Mon - Fri: 9:00 AM - 5:00 PM</span>
                            </div>
                        </div>
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm flex gap-3 sm:col-span-2">
                            <span className="material-symbols-outlined text-pink-500 text-2xl mt-0.5 select-none">location_on</span>
                            <div>
                                <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm block">Main Headquarters</span>
                                <span className="text-slate-700 dark:text-slate-300 text-sm">46 Pres. Quezon St., Brgy. Industrial Valley Complex, Marikina City, Philippines</span>
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
                            <span className="text-primary font-bold text-xs uppercase tracking-widest">Legal Framework</span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
                            Privacy <span className="text-primary">Policy</span>
                        </h1>
                        <p className="text-slate-500 dark:text-silver/50 mt-2 text-sm">
                            Last revised: May 2025 • Highlighting compliance with the PH Data Privacy Act of 2012
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
                        { icon: 'shield_lock', title: 'Data Control', desc: 'Aligned with RA 10173 regulations.', color: 'from-blue-500 to-cyan-500' },
                        { icon: 'share_off', title: 'Zero Commercial Sale', desc: 'We never sell or trade your details.', color: 'from-emerald-500 to-teal-500' },
                        { icon: 'cloud_done', title: 'Secure Infrastructure', desc: 'Encrypted via Firebase Cloud.', color: 'from-indigo-500 to-purple-500' },
                        { icon: 'history', title: 'Retention Mandate', desc: 'Up to 7 years for official logs.', color: 'from-amber-500 to-orange-500' }
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
                            <label htmlFor="privacy-search" className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                                Search Policy Sections
                            </label>
                            <div className="relative">
                                <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[20px] select-none">search</span>
                                <input
                                    id="privacy-search"
                                    type="text"
                                    placeholder="Search keywords (e.g. rights, email)..."
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

                    {/* Right Policy Body Details */}
                    <div className="lg:col-span-8 space-y-8">
                        {filteredSections.length === 0 ? (
                            <div className="text-center py-16 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900">
                                <span className="material-symbols-outlined text-slate-400 text-5xl mb-3 select-none">find_in_page</span>
                                <h3 className="font-semibold text-slate-800 dark:text-white text-base">No sections found</h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">No policy sections match your current keyword search of "{searchQuery}".</p>
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

export default PrivacyPolicy;
