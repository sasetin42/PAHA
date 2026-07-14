import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';

interface Committee {
    id: string;
    name: string;
    shortName: string;
    description: string;
    icon: string;
    color: string;
    bg: string;
    hoverBorder: string;
    badge: string;
    category: 'Organization' | 'Outreach' | 'Standards';
}

const committeesData: Committee[] = [
    {
        id: 'membership',
        name: 'Membership Committee',
        shortName: 'Membership',
        description: 'Oversees member recruitment, retention, and managing member benefits to support our growing companion animal veterinary community.',
        icon: 'group',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-100 dark:border-blue-900/30',
        hoverBorder: 'hover:border-blue-400/40 dark:hover:border-blue-400/30',
        badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
        category: 'Organization'
    },
    {
        id: 'accreditation',
        name: 'Accreditation Committee',
        shortName: 'Accreditation',
        description: 'Evaluates and accredits veterinary clinics and hospitals nationwide, ensuring they meet the highest global companion animal practice standards.',
        icon: 'verified',
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30',
        hoverBorder: 'hover:border-emerald-400/40 dark:hover:border-emerald-400/30',
        badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
        category: 'Standards'
    },
    {
        id: 'csr',
        name: 'Corporate Social Responsibility (CSR) Committee',
        shortName: 'CSR',
        description: 'Drives engaging initiatives, vaccination operations, and community outreach programs to promote animal welfare and public health.',
        icon: 'volunteer_activism',
        color: 'text-orange-600 dark:text-orange-400',
        bg: 'bg-orange-50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30',
        hoverBorder: 'hover:border-orange-400/40 dark:hover:border-orange-400/30',
        badge: 'bg-orange-100 text-orange-850 dark:bg-orange-900/40 dark:text-orange-300',
        category: 'Outreach'
    },
    {
        id: 'cpd',
        name: 'Continuing Professional Development (CPD) Committee',
        shortName: 'CPD',
        description: 'Develops educational programs, national conventions, seminars, and training workshops to continuously elevate veterinary clinical teams.',
        icon: 'school',
        color: 'text-purple-600 dark:text-purple-400',
        bg: 'bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30',
        hoverBorder: 'hover:border-purple-400/40 dark:hover:border-purple-400/30',
        badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
        category: 'Outreach'
    },
    {
        id: 'ethics',
        name: 'Ethics Committee',
        shortName: 'Ethics',
        description: 'Upholds professional integrity, outlines ethical guidelines, and handles resolution cases for practitioner code compliance.',
        icon: 'gavel',
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30',
        hoverBorder: 'hover:border-rose-400/40 dark:hover:border-rose-400/30',
        badge: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300',
        category: 'Standards'
    },
    {
        id: 'technical-standards',
        name: 'Technical Standards Committee',
        shortName: 'Technical Standards',
        description: 'Establishes, reviews, and updates clinical protocols, facility checklists, and requirements for patient care devices.',
        icon: 'fact_check',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900/30',
        hoverBorder: 'hover:border-amber-400/40 dark:hover:border-amber-400/30',
        badge: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
        category: 'Standards'
    }
];

const Committees: React.FC = () => {
    const { committeeMembers } = useAdmin();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<'All' | 'Organization' | 'Outreach' | 'Standards'>('All');

    // Filtered committees based on category and search
    const filteredCommittees = useMemo(() => {
        return committeesData.filter(com => {
            const matchesCategory = selectedCategory === 'All' || com.category === selectedCategory;
            const matchesSearch = com.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                com.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                com.shortName.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [searchQuery, selectedCategory]);

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-background-dark-black pb-24 font-sans antialiased transition-colors duration-300">
            
            {/* ── HERO SECTION ── */}
            <div className="pt-28 lg:pt-32 px-6 max-w-7xl mx-auto pb-8 relative z-10">
                <div className="relative rounded-[32px] overflow-hidden bg-slate-950 text-white min-h-[380px] md:min-h-[42vh] flex items-center p-8 md:p-12 shadow-2xl border border-white/5">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/3183150/pexels-photo-3183150.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Committees Background"
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
                            
                            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight text-white">
                                Dedicated <span className="text-primary">Committees</span>
                            </h1>
                            
                            <p className="text-slate-350 text-sm md:text-base leading-relaxed max-w-xl font-medium">
                                Discover the specialized committees working behind the scenes to audit companion animal hospitals, lead continuing education workshops, and safeguard veterinary practice standards in the Philippines.
                            </p>
                        </div>

                        {/* Right Side: Detailed Features Grid */}
                        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between hover:border-blue-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none shadow-inner">
                                    <span className="material-symbols-outlined text-[18px]">groups</span>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">{committeesData.length} Panels</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Governing Bodies</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between hover:border-emerald-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none shadow-inner">
                                    <span className="material-symbols-outlined text-[18px]">supervised_user_circle</span>
                                </div>
                                <div className="mt-4">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">{committeeMembers.length} Vets</h4>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5 tracking-wider">Appointed Officers</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── FILTER & SEARCH PANEL ── */}
            <div className="max-w-7xl mx-auto px-6 mt-8">
                <div className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-white/5 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
                    {/* Category Filter Tabs */}
                    <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
                        {(['All', 'Organization', 'Outreach', 'Standards'] as const).map(tab => (
                            <button
                                key={tab}
                                onClick={() => setSelectedCategory(tab)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                    selectedCategory === tab
                                        ? 'bg-primary text-white shadow-md'
                                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                }`}
                            >
                                {tab === 'All' ? 'All Panels' : tab}
                            </button>
                        ))}
                    </div>

                    {/* Search Input */}
                    <div className="relative w-full md:max-w-xs shrink-0">
                        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                        <input
                            type="text"
                            placeholder="Filter committees..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 border border-slate-200 dark:border-white/10 rounded-xl bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-primary/50"
                        />
                    </div>
                </div>
            </div>

            {/* ── COMMITTEES GRID ── */}
            <div className="max-w-7xl mx-auto px-6 mt-8 md:mt-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCommittees.map((committee) => (
                        <Link
                            key={committee.id}
                            to={`/committees/${committee.id}`}
                            className={`bg-white dark:bg-slate-900 rounded-3xl shadow-sm border border-slate-150 dark:border-white/5 p-7 flex flex-col justify-between group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${committee.hoverBorder}`}
                        >
                            <div className="space-y-5">
                                {/* Icon Header */}
                                <div className="flex justify-between items-start">
                                    <div className={`w-12 h-12 rounded-2xl ${committee.bg} flex items-center justify-center shadow-inner`}>
                                        <span className={`material-symbols-outlined text-2xl ${committee.color}`}>
                                            {committee.icon}
                                        </span>
                                    </div>
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${committee.badge}`}>
                                        {committee.category}
                                    </span>
                                </div>
                                
                                <div className="space-y-2">
                                    <h3 className="text-lg font-bold text-slate-800 dark:text-white group-hover:text-primary transition-colors leading-snug">
                                        {committee.name}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed font-medium">
                                        {committee.description}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-primary font-bold text-xs">
                                <span className="text-[10px] text-slate-400 font-normal">Active Panel Details</span>
                                <span className="inline-flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                    Learn More
                                    <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* ── COMMITTEE MEMBERS DETAILED LIST ── */}
            <div className="max-w-7xl mx-auto px-6 mt-16 md:mt-24">
                <div className="text-center mb-10 md:mb-16">
                    <span className="text-primary font-bold text-xs uppercase tracking-widest bg-primary/10 px-3 py-1.5 rounded-full border border-primary/20">
                        Association Leaders
                    </span>
                    <h2 className="text-2xl md:text-3.5xl font-black text-slate-900 dark:text-white mt-6 mb-2">PAHA Committee Officers</h2>
                    <div className="h-1 w-16 bg-primary rounded-full mx-auto"></div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {filteredCommittees.map((committee) => {
                        const members = committeeMembers.filter(m => m.committeeId === committee.id)
                            .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));

                        return (
                            <div key={committee.id} className="bg-white dark:bg-slate-900 rounded-[28px] p-6 md:p-8 shadow-sm border border-slate-150 dark:border-white/5">
                                <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100 dark:border-white/5">
                                    <div className={`w-10 h-10 rounded-xl ${committee.bg} flex items-center justify-center shrink-0`}>
                                        <span className={`material-symbols-outlined text-lg ${committee.color}`}>
                                            {committee.icon}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">{committee.name}</h3>
                                </div>

                                <div className="space-y-3">
                                    {members.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic">No appointed officers added yet.</p>
                                    ) : (
                                        members.map((member, idx) => (
                                            <div key={idx} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-white/5 border border-transparent hover:border-slate-100 dark:hover:border-white/5 transition-all duration-300">
                                                <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border-2 border-primary/10 shadow-sm">
                                                    <img 
                                                        src={member.image || '/avatar-placeholder.png'} 
                                                        alt={member.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-white leading-tight mb-0.5">{member.name}</p>
                                                    <p className="text-[11px] text-slate-650 dark:text-slate-400 font-semibold mb-0.5">{member.clinic}</p>
                                                    <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-lg ${
                                                        member.role.toLowerCase().includes('chairperson') || member.role.toLowerCase().includes('head')
                                                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400'
                                                            : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
                                                    }`}>
                                                        {member.role}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Committees;
