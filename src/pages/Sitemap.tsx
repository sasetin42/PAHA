import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

interface SitemapItem {
    name: string;
    path: string;
    description: string;
    priority: 'High' | 'Medium' | 'Low';
    icon: string;
    seoFocus: string;
}

interface SitemapCategory {
    title: string;
    description: string;
    color: string;
    bg: string;
    icon: string;
    items: SitemapItem[];
}

const Sitemap: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');

    const categories: SitemapCategory[] = useMemo(() => [
        {
            title: 'Core Public Pages',
            description: 'Main pages accessible to the public highlighting PAHA\'s organization and mission.',
            color: 'text-blue-600 dark:text-blue-400',
            bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30',
            icon: 'home',
            items: [
                { name: 'Home', path: '/', description: 'The main landing page of the Philippine Animal Hospital Association showcasing updates, stats, and key highlights.', priority: 'High', icon: 'home', seoFocus: 'Veterinary Association Philippines, PAHA Home' },
                { name: 'About Us', path: '/about-us', description: 'Detailed look at PAHA\'s history, mission, vision, officers, and historical achievements.', priority: 'High', icon: 'info', seoFocus: 'About PAHA, Vet Association Mission' },
                { name: 'Committees', path: '/committees', description: 'Directory of PAHA standing committees, governing officers, and regional representatives.', priority: 'Medium', icon: 'groups', seoFocus: 'PAHA Committees, Veterinary Leaders' },
                { name: 'Contact Us', path: '/contact', description: 'Contact options, head office location, phone, email, and interactive inquiry form.', priority: 'High', icon: 'mail', seoFocus: 'Contact PAHA, Animal Hospital Association Address' },
            ]
        },
        {
            title: 'Membership & Accreditation',
            description: 'Resources for professional members, associate members, and animal clinic accreditations.',
            color: 'text-emerald-600 dark:text-emerald-400',
            bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
            icon: 'verified',
            items: [
                { name: 'Membership Portal Overview', path: '/membership', description: 'Gateway to member directories, application forms, benefits, and credentials.', priority: 'High', icon: 'workspace_premium', seoFocus: 'PAHA Membership benefits, accredited clinics portal' },
                { name: 'Clinic Directory', path: '/membership/directory', description: 'Public search database of companion animal clinics and professional members in the Philippines.', priority: 'High', icon: 'person_search', seoFocus: 'Philippine Veterinary Directory, Find a Vet Near Me' },
                { name: 'Accredited Clinics', path: '/membership/accredited-clinics', description: 'List of standard-compliant animal clinics accredited by PAHA.', priority: 'High', icon: 'location_on', seoFocus: 'Accredited Animal Hospitals, Certified Vet Clinics' },
                { name: 'Accreditation Requirements', path: '/membership/accreditation-requirements', description: 'Standard criteria, guidelines, and self-evaluation list for clinics seeking accreditation.', priority: 'High', icon: 'fact_check', seoFocus: 'Animal Hospital Accreditation Standards Philippines' },
                { name: 'Membership Benefits', path: '/membership/benefits', description: 'Overview of advocacy, CPI discounts, legal support, and resources for members.', priority: 'Medium', icon: 'featured_play_list', seoFocus: 'PAHA Member Benefits, Veterinary CPI Discounts' },
                { name: 'Membership Application', path: '/membership/application', description: 'Digital application portal to apply for professional membership.', priority: 'High', icon: 'app_registration', seoFocus: 'Apply PAHA Professional Membership' },
                { name: 'Associate Membership Application', path: '/membership/associate-application', description: 'Digital application for associate clinics and hospitals.', priority: 'High', icon: 'playlist_add', seoFocus: 'PAHA Associate Member Application' },
            ]
        },
        {
            title: 'Events & Education',
            description: 'Stay updated with continuing education, seminars, and calendar schedules.',
            color: 'text-purple-600 dark:text-purple-400',
            bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30',
            icon: 'school',
            items: [
                { name: 'Events & Workshops', path: '/events', description: 'Find all upcoming and past PAHA seminars, webinars, and hands-on surgical training programs.', priority: 'High', icon: 'event', seoFocus: 'Veterinary Seminars Philippines, Continuing Professional Education' },
                { name: 'Event Calendar', path: '/calendar', description: 'Interactive visual calendar plotting all upcoming veterinary events and deadlines.', priority: 'Medium', icon: 'calendar_month', seoFocus: 'PAHA Event Calendar, Vet Workshop Schedules' },
                { name: 'My Registrations', path: '/my-registrations', description: 'Quick access for attendees to view registered workshops and access codes.', priority: 'Medium', icon: 'bookmark_added', seoFocus: 'My Registered Vet Events PAHA' },
                { name: 'Archived Events', path: '/my-registrations/archive', description: 'Historical database of concluded webinars and lectures hosted by PAHA.', priority: 'Low', icon: 'history', seoFocus: 'Concluded PAHA Events and Seminars' },
            ]
        },
        {
            title: 'Portals & Accounts',
            description: 'Access portals for administrators and member practitioners.',
            color: 'text-amber-600 dark:text-amber-400',
            bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
            icon: 'login',
            items: [
                { name: 'Member & Clinic Login', path: '/login', description: 'Secure login portal for registered members to access their dashboard.', priority: 'High', icon: 'login', seoFocus: 'PAHA Member Login, Clinic Portal Sign In' },
                { name: 'Admin Portal Access', path: '/admin/login', description: 'Secure login gateway for PAHA administration team and committee heads.', priority: 'Medium', icon: 'admin_panel_settings', seoFocus: 'PAHA Admin Login' },
                { name: 'Members Dashboard', path: '/members', description: 'Private profile management dashboard showing member status and accreditation requests.', priority: 'High', icon: 'dashboard', seoFocus: 'PAHA Member Dashboard, Accreditation Pipeline' },
            ]
        },
        {
            title: 'Legal & Guidelines',
            description: 'Important legal frameworks, compliance, and user terms.',
            color: 'text-rose-600 dark:text-rose-400',
            bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
            icon: 'gavel',
            items: [
                { name: 'Privacy Policy', path: '/privacy-policy', description: 'How PAHA collects, processes, protects, and stores user and clinic information.', priority: 'Low', icon: 'shield', seoFocus: 'PAHA Privacy Policy, Veterinary Data Protection' },
                { name: 'Terms of Service', path: '/terms-of-service', description: 'Official agreement governing website usage, membership codes, and applications.', priority: 'Low', icon: 'gavel', seoFocus: 'PAHA Terms of Service, Legal User Agreement' },
            ]
        }
    ], []);

    const filteredCategories = useMemo(() => {
        if (!searchQuery.trim()) return categories;
        return categories.map(cat => {
            const matchedItems = cat.items.filter(item => 
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.seoFocus.toLowerCase().includes(searchQuery.toLowerCase())
            );
            return { ...cat, items: matchedItems };
        }).filter(cat => cat.items.length > 0);
    }, [categories, searchQuery]);

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-background-dark-black pt-28 pb-20 font-sans">
            <div className="max-w-7xl mx-auto px-6">
                
                {/* Hero / Header Section */}
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        Site Index & SEO Map
                    </span>
                    <h1 id="sitemap-title" className="text-3xl md:text-5xl font-extrabold text-slate-900 dark:text-white mt-6 mb-4 tracking-tight leading-tight">
                        PAHA Website Sitemap
                    </h1>
                    <p className="text-slate-550 dark:text-slate-400 text-sm md:text-base leading-relaxed font-medium">
                        Navigate easily through the Philippine Animal Hospital Association directory, accreditation standards, professional application pipelines, events, and legal guidelines.
                    </p>

                    {/* Interactive Page Filter Search */}
                    <div className="mt-8 relative max-w-md mx-auto">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                        <input
                            id="sitemap-search"
                            type="text"
                            placeholder="Search sitemap links, descriptions, keywords..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 border border-slate-200 dark:border-white/10 rounded-2xl bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white placeholder-slate-400 shadow-sm focus:outline-none focus:border-primary/50 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-650"
                            >
                                <span className="material-symbols-outlined text-sm">close</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Sitemap Grid */}
                <div className="space-y-12">
                    {filteredCategories.length > 0 ? (
                        filteredCategories.map((category) => (
                            <div key={category.title} className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-150 dark:border-white/5 p-6 md:p-8 shadow-sm">
                                
                                {/* Category Header */}
                                <div className="flex gap-4 items-start mb-8 pb-5 border-b border-slate-100 dark:border-white/5">
                                    <div className={`size-12 rounded-2xl ${category.bg} flex items-center justify-center shrink-0`}>
                                        <span className={`material-symbols-outlined text-xl ${category.color}`}>{category.icon}</span>
                                    </div>
                                    <div>
                                        <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white mb-1">{category.title}</h2>
                                        <p className="text-slate-450 dark:text-slate-400 text-xs md:text-sm font-medium">{category.description}</p>
                                    </div>
                                </div>

                                {/* Items Grid */}
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {category.items.map((item) => (
                                        <div key={item.path} className="group flex flex-col justify-between p-5 rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-950/20 hover:border-primary/20 dark:hover:border-primary/20 transition-all duration-300">
                                            <div className="space-y-3">
                                                {/* Header & Icon */}
                                                <div className="flex justify-between items-start gap-2">
                                                    <span className="material-symbols-outlined text-primary text-lg">{item.icon}</span>
                                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                                                        item.priority === 'High' 
                                                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400' 
                                                            : item.priority === 'Medium'
                                                            ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400'
                                                            : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                    }`}>
                                                        Priority: {item.priority}
                                                    </span>
                                                </div>

                                                {/* Details */}
                                                <div>
                                                    <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-snug group-hover:text-primary transition-colors">
                                                        {item.name}
                                                    </h3>
                                                    <p className="text-slate-500 dark:text-slate-450 text-xs leading-relaxed mt-1 line-clamp-3">
                                                        {item.description}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Action Link */}
                                            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono tracking-tight">{item.path}</span>
                                                <Link
                                                    to={item.path}
                                                    {...(item.path === '/login' || item.path === '/admin/login' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-primary group-hover:text-primary-dark transition-all"
                                                >
                                                    Visit Page
                                                    <span className="material-symbols-outlined text-[14px] transition-transform group-hover:translate-x-0.5">chevron_right</span>
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-150 dark:border-white/5">
                            <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700 mb-2">search_off</span>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">No sitemap matching entries found.</p>
                        </div>
                    )}
                </div>

                {/* SEO Simulator Preview Block */}
                <div className="mt-16 bg-[#111827] text-slate-350 rounded-[32px] p-6 md:p-8 border border-white/5 relative overflow-hidden shadow-2xl">
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:24px_24px] opacity-10"></div>
                    <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                        <div className="text-left space-y-3 max-w-xl">
                            <div className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/15 text-[10px] font-bold uppercase tracking-wider">
                                <span className="size-1.5 rounded-full bg-blue-400 animate-pulse"></span> Search Engine Preview
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">Structured SEO Metadata</h2>
                            <p className="text-slate-400 text-xs md:text-sm leading-relaxed">
                                This sitemap is structured semantically to guarantee optimal indexing by search crawlers (Googlebot, Bingbot), boosting PAHA's organic visibility for veterinary standards in the Philippines.
                            </p>
                        </div>
                        <div className="w-full lg:max-w-md rounded-2xl bg-[#1E293B] p-5 shadow-lg border border-slate-750 font-mono text-xs text-left">
                            <div className="flex gap-1.5 mb-3 border-b border-slate-700 pb-2">
                                <div className="size-2.5 rounded-full bg-rose-500"></div>
                                <div className="size-2.5 rounded-full bg-amber-500"></div>
                                <div className="size-2.5 rounded-full bg-emerald-500"></div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-[#60A5FA]">&lt;title&gt;<span className="text-white">PAHA Sitemap | Philippine Animal Hospital Association</span>&lt;/title&gt;</div>
                                <div className="text-[#34D399]">&lt;meta name="description" <span className="text-slate-450">content="Complete site structure of the Philippine Animal Hospital Association (PAHA)..."</span> /&gt;</div>
                                <div className="text-[#A78BFA]">&lt;meta name="keywords" <span className="text-slate-450">content="PAHA sitemap, vet directory, accreditation requirements, animal clinic"</span> /&gt;</div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Sitemap;
