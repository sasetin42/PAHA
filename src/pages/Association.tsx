import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';

const Association: React.FC = () => {
    const { pages, formerOfficers, partners, members } = useAdmin();
    const page = pages['association'];
    
    // Sort years descending
    const availableYears = useMemo(() => {
        const years = formerOfficers.map(o => o.year);
        return Array.from(new Set(years)).sort((a, b) => b - a);
    }, [formerOfficers]);

    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
    const [partnerSearchQuery, setPartnerSearchQuery] = useState('');
    const [activeSection, setActiveSection] = useState('board-trustees');

    const currentOfficers = useMemo(() => {
        return formerOfficers.find(o => o.year === selectedYear);
    }, [formerOfficers, selectedYear]);

    const availableYearsGrouped = useMemo(() => {
        const groups: Record<number, number[]> = {};
        availableYears.forEach(year => {
            const decade = Math.floor(year / 10) * 10;
            if (!groups[decade]) groups[decade] = [];
            groups[decade].push(year);
        });
        return groups;
    }, [availableYears]);

    // Update selectedYear to latest available when data loads
    React.useEffect(() => {
        if (availableYears.length > 0 && (!selectedYear || !availableYears.includes(selectedYear))) {
            setSelectedYear(availableYears[0]);
        }
    }, [availableYears, selectedYear]);

    const filteredPartners = useMemo(() => {
        if (!partnerSearchQuery) return partners;
        const query = partnerSearchQuery.toLowerCase();
        return partners.filter(p => p.name?.toLowerCase().includes(query));
    }, [partnerSearchQuery, partners]);

    if (!page) return null;

    const sections = page.sections.reduce((acc, section) => {
        acc[section.id] = section;
        return acc;
    }, {} as any);

    const getSection = (id: string) => sections[id];

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

            <main className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-20 relative z-10">
                {/* 1. Hero / Intro */}
                {getSection('hero')?.isVisible && (
                    <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5 mb-12">
                        {/* Background Overlay */}
                        <div className="absolute inset-0 z-0">
                            <img
                                src="https://images.pexels.com/photos/6816858/pexels-photo-6816858.jpeg"
                                className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                                alt="About Us Hero Background"
                            />
                            <div className="absolute inset-0 bg-gradient-to-r from-[#232323]/80 via-[#232323]/70 to-[#565656]/30"></div>
                        </div>

                        {/* Content Grid */}
                        <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                            {/* Left Side: Headline & Description */}
                            <div className="lg:col-span-7 space-y-6 text-left">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-white text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                    {getSection('hero')?.content?.tag || 'Our Association'}
                                </div>
                                
                                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                                    {getSection('hero')?.content?.heading?.split(getSection('hero')?.content?.headingHighlight)[0]}
                                    <span className="text-primary">{getSection('hero')?.content?.headingHighlight}</span>
                                    {getSection('hero')?.content?.heading?.split(getSection('hero')?.content?.headingHighlight)[1]}
                                </h1>
                                
                                <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                                    {getSection('hero')?.content?.description}
                                </p>
                            </div>

                            {/* Right Side: Detailed Features Grid */}
                            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">history</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-2xl text-white tracking-tight">{new Date().getFullYear() - 1978} Years</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Founding Legacy</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">groups</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-2xl text-white tracking-tight">{members.length} Clinics</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Vetted PAHA Network</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">handshake</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-2xl text-white tracking-tight">{partners.length} Partners</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Active Affiliations</p>
                                    </div>
                                </div>

                                <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-rose-500/30 transition-all group">
                                    <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 select-none">
                                        <span className="material-symbols-outlined text-[20px] font-bold">workspace_premium</span>
                                    </div>
                                    <div className="mt-3">
                                        <h4 className="font-extrabold text-2xl text-white tracking-tight">{availableYears.length} Terms</h4>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Leadership Eras</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Split Layout Container */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                    {/* Left Sticky Sidebar Menu */}
                    <div className="lg:col-span-4 lg:sticky lg:top-28 space-y-6">
                        {/* Table of Contents Directory */}
                        <div className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-between">
                                <span>On This Page</span>
                                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300 font-semibold">5 Chapters</span>
                            </h3>

                            <nav className="space-y-1">
                                {[
                                    { id: 'board-trustees', title: 'Board of Trustees', icon: 'groups', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/20' },
                                    { id: 'leadership-legacy', title: 'Leadership Legacy', icon: 'history_edu', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20' },
                                    { id: 'mission-vision', title: 'Mission & Vision', icon: 'track_changes', color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/20' },
                                    { id: 'affiliations-partners', title: 'Affiliations & Partners', icon: 'handshake', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/20' },
                                    { id: 'heritage-timeline', title: 'Our Heritage', icon: 'timeline', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/20' }
                                ].map((sec) => (
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
                                        <div className={`w-6 h-6 rounded-lg ${sec.bg} flex items-center justify-center`}>
                                            <span className={`material-symbols-outlined text-[14px] ${sec.color}`}>{sec.icon}</span>
                                        </div>
                                        <span>{sec.title}</span>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        {/* Page Fast Statistics Callout */}
                        <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-900 to-indigo-950 text-white shadow-xl relative overflow-hidden hidden lg:block">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl"></div>
                            <h4 className="text-sm font-semibold tracking-wider uppercase text-blue-200">Established In</h4>
                            <p className="text-4xl font-extrabold mt-1 text-white">1978</p>
                            <p className="text-xs text-blue-200/70 mt-2 leading-relaxed">
                                Supporting veterinary excellence and clinic accreditation standards across the Philippines for over four decades.
                            </p>
                        </div>
                    </div>

                    {/* Right Dynamic Page Chapters */}
                    <div className="lg:col-span-8 space-y-12">
                        
                        {/* Chapter 1: Board of Trustees */}
                        <section id="board-trustees" className="p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm scroll-mt-24">
                            {getSection('board_intro')?.isVisible && (
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 mb-8 border-b border-slate-100 dark:border-white/10 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/20 border flex items-center justify-center">
                                            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">groups</span>
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold tracking-tight">{getSection('board_intro')?.content?.heading}</h2>
                                            <p className="text-xs text-slate-400 mt-0.5">{getSection('board_intro')?.content?.subheading}</p>
                                        </div>
                                    </div>
                                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                        {getSection('board_intro')?.content?.term}
                                    </span>
                                </div>
                            )}

                            {/* President Spotlight Card */}
                            {getSection('president')?.isVisible && (
                                <div className="relative bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white rounded-2xl p-6 md:p-8 overflow-hidden shadow-xl mb-8 flex flex-col md:flex-row gap-6 items-center text-center md:text-left border border-white/5">
                                    <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>

                                    <div className="w-36 h-36 md:w-44 md:h-44 rounded-full border-4 border-white/10 p-1 shrink-0 relative z-10 bg-white/5 flex items-center justify-center">
                                        {getSection('president')?.content?.image ? (
                                            <img
                                                src={getSection('president').content.image}
                                                alt={getSection('president').content.name}
                                                className="w-full h-full object-cover rounded-full grayscale hover:grayscale-0 transition-all duration-550"
                                                onError={(e) => {
                                                    e.currentTarget.style.display = 'none';
                                                }}
                                            />
                                        ) : (
                                            <span className="material-symbols-outlined text-5xl text-white/20 select-none">person</span>
                                        )}
                                        <div className="absolute bottom-2 right-2 bg-primary text-white p-1.5 rounded-full border-4 border-slate-900 select-none">
                                            <span className="material-symbols-outlined text-[16px] block">verified</span>
                                        </div>
                                    </div>

                                    <div className="relative z-10 flex-1">
                                        <span className="bg-primary/20 border border-primary/30 text-primary px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-2 inline-block">
                                            {getSection('president')?.content?.role}
                                        </span>
                                        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white mb-1">{getSection('president')?.content?.name}</h3>
                                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-4">{getSection('president')?.content?.roleSubtitle}</p>
                                        <p className="text-slate-300 italic text-sm leading-relaxed max-w-xl">
                                            "{getSection('president')?.content?.quote}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Officers Grid */}
                            {getSection('officers_grid')?.isVisible && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                                    {[1, 2, 3, 4, 5, 6].map((i) => {
                                        const name = getSection('officers_grid')?.content?.[`v${i}_name`];
                                        const role = getSection('officers_grid')?.content?.[`v${i}_role`];
                                        const img = getSection('officers_grid')?.content?.[`v${i}_img`];
                                        if (!name) return null;
                                        return (
                                            <div key={i} className="group bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 hover:border-primary/20 transition-all hover:bg-white dark:hover:bg-slate-900 shadow-sm">
                                                <div className="aspect-square rounded-xl overflow-hidden mb-4 bg-slate-100 dark:bg-slate-950 flex items-center justify-center text-slate-400">
                                                    {img ? (
                                                        <img 
                                                            src={img} 
                                                            alt={name} 
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500 grayscale group-hover:grayscale-0" 
                                                            onError={(e) => {
                                                                e.currentTarget.style.display = 'none';
                                                            }}
                                                        />
                                                    ) : (
                                                        <span className="material-symbols-outlined text-3xl opacity-20">person</span>
                                                    )}
                                                </div>
                                                <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight mb-1">{name}</h4>
                                                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block">{role}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Administrative Secretariat */}
                            {getSection('secretariat_grid')?.isVisible && (
                                <div className="mt-12 pt-8 border-t border-slate-100 dark:border-white/10">
                                    <h3 className="text-base font-bold mb-6 flex items-center gap-2">
                                        <span className="w-1.5 h-4 bg-primary rounded-full"></span>
                                        {getSection('secretariat_grid')?.content?.heading}
                                    </h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {[1, 2].map((i) => {
                                            const name = getSection('secretariat_grid')?.content?.[`s${i}_name`];
                                            const role = getSection('secretariat_grid')?.content?.[`s${i}_role`];
                                            const img = getSection('secretariat_grid')?.content?.[`s${i}_img`];
                                            if (!name) return null;
                                            return (
                                                <div key={i} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl border border-slate-100 dark:border-slate-800 transition-all hover:bg-white dark:hover:bg-slate-900 shadow-sm">
                                                    <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 border border-slate-200 dark:border-slate-800">
                                                        <img src={img} alt={name} className="w-full h-full object-cover" />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{name}</h4>
                                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5 block">{role}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Chapter 2: Leadership Legacy (Former Officers) */}
                        <section id="leadership-legacy" className="p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm scroll-mt-24">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 mb-8 border-b border-slate-100 dark:border-white/10 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border flex items-center justify-center">
                                        <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">history_edu</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold tracking-tight">Legacy of Leadership</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Honoring our visionary past officers since 1978</p>
                                    </div>
                                </div>

                                {/* Decade / Year Picker Trigger */}
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                                        className={`group flex items-center gap-3 px-4 py-2 rounded-xl border transition-all duration-200 text-xs font-semibold
                                            ${isYearPickerOpen 
                                                ? 'bg-primary border-primary text-white shadow-md' 
                                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:border-primary/40 text-slate-700 dark:text-slate-300'
                                            }
                                        `}
                                    >
                                        <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                                        <span>Term: {selectedYear}</span>
                                        <span className={`material-symbols-outlined text-[16px] transition-transform duration-200 ${isYearPickerOpen ? 'rotate-180' : ''}`}>
                                            expand_more
                                        </span>
                                    </button>

                                    {/* Year Picker Dropdown */}
                                    {isYearPickerOpen && (
                                        <>
                                            <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:bg-transparent" onClick={() => setIsYearPickerOpen(false)}></div>
                                            <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">Timeline Grid</h4>
                                                <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                                                    {Object.keys(availableYearsGrouped).sort((a, b) => Number(b) - Number(a)).map(decade => (
                                                        <div key={decade}>
                                                            <h5 className="text-[9px] font-bold text-primary uppercase tracking-widest mb-1.5">{decade}s</h5>
                                                            <div className="grid grid-cols-3 gap-1.5">
                                                                {availableYearsGrouped[Number(decade)].map(year => (
                                                                    <button
                                                                        key={year}
                                                                        onClick={() => {
                                                                            setSelectedYear(year);
                                                                            setIsYearPickerOpen(false);
                                                                        }}
                                                                        className={`py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                                                            selectedYear === year 
                                                                                ? 'bg-primary text-white' 
                                                                                : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                                        }`}
                                                                    >
                                                                        {year}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {currentOfficers ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {currentOfficers.officers.map((officer, index) => (
                                        <div key={index} className="group bg-slate-50 dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800 hover:border-emerald-500/20 transition-all duration-300">
                                            <div className="flex gap-4 items-center">
                                                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 shrink-0 border border-slate-200 dark:border-slate-800">
                                                    {officer.image ? (
                                                        <img 
                                                            src={officer.image} 
                                                            className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-550" 
                                                            alt={officer.name} 
                                                        />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                            <span className="material-symbols-outlined text-2xl font-light">person</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <div>
                                                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider inline-block mb-1">
                                                        {officer.role}
                                                    </span>
                                                    <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 transition-colors">
                                                        {officer.name}
                                                    </h4>
                                                    <span className="text-[9px] text-slate-400 block mt-0.5">Term {selectedYear}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950/30">
                                    <span className="material-symbols-outlined text-slate-300 text-4xl mb-2">history</span>
                                    <h4 className="font-semibold text-slate-500 text-sm">No Officer Records</h4>
                                    <p className="text-xs text-slate-400 mt-1">No recorded board files for {selectedYear}.</p>
                                </div>
                            )}
                        </section>

                        {/* Chapter 3: Our Mission & Vision */}
                        {getSection('mission')?.isVisible && (
                            <section id="mission-vision" className="p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-900 text-white shadow-sm scroll-mt-24 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="relative z-10 flex gap-4 items-start mb-6">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center shadow-inner">
                                        <span className="material-symbols-outlined text-indigo-400 text-[26px]">track_changes</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold tracking-tight text-white">{getSection('mission')?.content?.heading || 'Our Mission'}</h2>
                                        <span className="text-xs text-indigo-400">Core Objective Statements</span>
                                    </div>
                                </div>
                                <p className="text-slate-300 text-base leading-relaxed pl-2">
                                    {getSection('mission')?.content?.description}
                                </p>
                            </section>
                        )}

                        {/* Chapter 4: Affiliations & Partners */}
                        <section id="affiliations-partners" className="p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm scroll-mt-24">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 mb-8 border-b border-slate-100 dark:border-white/10 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 border flex items-center justify-center">
                                        <span className="material-symbols-outlined text-amber-600 dark:text-amber-400">handshake</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold tracking-tight">Affiliations & Partners</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Collaborations elevating veterinary metrics</p>
                                    </div>
                                </div>

                                {/* Dynamic Partner Search Box */}
                                <div className="relative w-full sm:w-60">
                                    <label htmlFor="partners-search" className="sr-only">Search Partner Organizations</label>
                                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">search</span>
                                    <input
                                        id="partners-search"
                                        type="text"
                                        placeholder="Search partner names..."
                                        value={partnerSearchQuery}
                                        onChange={(e) => setPartnerSearchQuery(e.target.value)}
                                        className="w-full pl-9 pr-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:border-primary text-xs focus:bg-white focus:outline-none transition-all"
                                    />
                                </div>
                            </div>

                            {/* Partners Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                                {filteredPartners.length > 0 ? (
                                    filteredPartners.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0)).map((partner) => (
                                        <a 
                                            key={partner.id}
                                            href={partner.websiteUrl || '#'} 
                                            target={partner.websiteUrl ? "_blank" : "_self"}
                                            rel="noopener noreferrer"
                                            className="group relative flex items-center justify-center p-5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 hover:border-amber-500/40 hover:shadow-md hover:bg-white dark:hover:bg-slate-900 transition-all duration-300"
                                        >
                                            <img 
                                                src={partner.imageUrl} 
                                                alt={partner.name} 
                                                className="h-10 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300" 
                                            />
                                            {partner.websiteUrl && (
                                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <span className="material-symbols-outlined text-amber-500 text-xs">open_in_new</span>
                                                </div>
                                            )}
                                        </a>
                                    ))
                                ) : partnerSearchQuery ? (
                                    <div className="col-span-full text-center py-6">
                                        <p className="text-xs text-slate-400 italic">No partners match "{partnerSearchQuery}"</p>
                                    </div>
                                ) : (
                                    // Fallback to static partners
                                    ['WSAVA', 'FAVA', 'PVMA', 'VPAP'].map((name) => (
                                        <div key={name} className="flex items-center justify-center h-20 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800 opacity-40">
                                            <span className="font-bold text-lg tracking-tighter text-slate-400">{name}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </section>

                        {/* Chapter 5: Historical Timeline */}
                        {getSection('heritage')?.isVisible && (
                            <section id="heritage-timeline" className="p-6 md:p-8 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm scroll-mt-24">
                                <div className="flex items-center gap-3 pb-6 mb-8 border-b border-slate-100 dark:border-white/10">
                                    <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 border flex items-center justify-center">
                                        <span className="material-symbols-outlined text-rose-600 dark:text-rose-400">timeline</span>
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold tracking-tight">{getSection('heritage')?.content?.heading}</h2>
                                        <p className="text-xs text-slate-400 mt-0.5">Historical milestones and achievements</p>
                                    </div>
                                </div>

                                <div className="flex flex-col md:flex-row gap-8 items-center">
                                    <div className="flex-1">
                                        <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">
                                            {getSection('heritage')?.content?.description}
                                        </p>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-2xl text-center border border-blue-100 dark:border-blue-900/30">
                                                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-0.5">{getSection('heritage')?.content?.stat1_val}</div>
                                                <div className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{getSection('heritage')?.content?.stat1_label}</div>
                                            </div>
                                            <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-2xl text-center border border-purple-100 dark:border-purple-900/30">
                                                <div className="text-2xl font-bold text-purple-500 mb-0.5">{getSection('heritage')?.content?.stat2_val}</div>
                                                <div className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{getSection('heritage')?.content?.stat2_label}</div>
                                            </div>
                                            <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-2xl text-center border border-orange-100 dark:border-orange-900/30">
                                                <div className="text-2xl font-bold text-orange-500 mb-0.5">{getSection('heritage')?.content?.stat3_val}</div>
                                                <div className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{getSection('heritage')?.content?.stat3_label}</div>
                                            </div>
                                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl text-center border border-emerald-100 dark:border-emerald-900/30">
                                                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mb-0.5">{getSection('heritage')?.content?.stat4_val}</div>
                                                <div className="text-[9px] font-bold uppercase text-slate-500 dark:text-slate-400 tracking-wider">{getSection('heritage')?.content?.stat4_label}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Association;
