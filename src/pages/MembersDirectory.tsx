import React, { useState } from 'react';


// Mock Data for Directory
import { useAdmin } from '../context/AdminContext';
import { useMemo } from 'react';


const MembersDirectory: React.FC = () => {
    const { members } = useAdmin();
    const [searchTerm, setSearchTerm] = useState("");
    const [filterType, setFilterType] = useState("All");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 9; // Increased for better layout with more members

    // Use Firestore members
    const displayData = members;

    const filteredMembers = useMemo(() => {
        const queryTerms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
        return displayData
            .filter(member => {
                const matchesSearch = queryTerms.length === 0 || queryTerms.every(term =>
                    member.name.toLowerCase().includes(term) ||
                    member.address.toLowerCase().includes(term) ||
                    (member.headVeterinarian && member.headVeterinarian.toLowerCase().includes(term))
                );
                const matchesFilter = filterType === "All" || member.type === filterType;
                return matchesSearch && matchesFilter;
            })
            .sort((a, b) => (b.isAccredited ? 1 : 0) - (a.isAccredited ? 1 : 0));
    }, [displayData, searchTerm, filterType]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentMembers = filteredMembers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);

    const handlePageChange = (pageNumber: number) => {
        setCurrentPage(pageNumber);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const categories = ["All", "Hospital", "Clinic", "Center"];

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-navy font-display text-slate-900 dark:text-white antialiased pb-20">


            <main className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10">
                {/* ── HERO SECTION ── */}
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5 mb-12">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/101808/pexels-photo-101808.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Members Directory Background"
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
                                Member <span className="text-primary">Directory</span>
                            </h1>
                            
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                                Find accredited veterinary hospitals and clinics committed to providing the highest standards of animal care in the Philippines.
                            </p>
                        </div>

                        {/* Right Side: Detailed Features Grid */}
                        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">verified</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">
                                        {members.filter(m => m.isAccredited).length} Centers
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Accredited Hospitals</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">groups</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">{members.length} Clinics</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Registered Members</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">fact_check</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">100% Verified</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">PAHA Approved</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-rose-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">travel_explore</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">Nationwide</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Active Regions</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Search and Filter */}
                <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white dark:border-white/5 mb-16 flex flex-col xl:flex-row gap-8 items-end justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                    
                    <div className="relative z-10 space-y-4 w-full xl:max-w-xl">
                        <div>
                            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight uppercase">Registry Oversight</h2>
                            <p className="text-slate-500 dark:text-silver/40 text-[10px] font-semibold uppercase tracking-[0.3em]">Querying Verified Veterinary Institutions</p>
                        </div>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                            <div className="relative flex items-center bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden focus-within:border-primary/50 transition-all shadow-inner">
                                <label htmlFor="directory-search" className="sr-only">Search members directory</label>
                                <span className="material-symbols-outlined pl-5 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                                <input
                                    id="directory-search"
                                    name="directory-search"
                                    type="text"
                                    placeholder="SCAN REGISTRY BY NAME OR LOCATION..."
                                    className="w-full bg-transparent border-none py-4 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:ring-0"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <div className="pr-4 flex items-center gap-1.5 opacity-40">
                                     <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                     <span className="text-[10px] font-semibold uppercase text-primary">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-2 w-full xl:w-auto">
                        <p className="text-[8px] font-semibold text-slate-400 dark:text-white/20 uppercase tracking-[0.4em] ml-1">Facility Classification</p>
                        <div className="flex bg-slate-900 dark:bg-white/[0.05] p-1.5 rounded-2xl shadow-xl shadow-black/10 border border-white/5 overflow-x-auto scrollbar-hide">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setFilterType(cat)}
                                    className={`px-5 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all whitespace-nowrap ${
                                        filterType === cat
                                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                            : 'text-slate-400 dark:text-white/30 hover:text-white hover:bg-white/5'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Directory Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {currentMembers.map(member => (
                        <div key={member.id} className="bg-white dark:bg-charcoal rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all border border-slate-200 dark:border-white/5 group">
                            <div className="relative h-48 overflow-hidden">
                                <img src={member.image} alt={member.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                <div className="absolute top-4 right-4">
                                    {member.isAccredited && (
                                        <div className="bg-white/90 dark:bg-black/80 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                                            <span className="material-symbols-outlined text-green-500 text-sm">verified</span>
                                            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-800 dark:text-white">Accredited</span>
                                        </div>
                                    )}
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                                    <span className="text-white/90 text-xs font-semibold uppercase tracking-wider bg-primary/80 px-2 py-0.5 rounded-md backdrop-blur-sm">
                                        {member.type}
                                    </span>
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-lg font-semibold text-blue-950 dark:text-white mb-1 group-hover:text-primary transition-colors leading-tight">{member.name}</h3>
                                {member.headVeterinarian && (
                                    <div className="flex items-center gap-2 mb-4 text-primary font-semibold text-sm">
                                        <span className="material-symbols-outlined text-[18px]">person</span>
                                        <span>{member.headVeterinarian}</span>
                                    </div>
                                )}
                                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400 mt-2">
                                    <div className="flex items-start gap-2">
                                        <span className="material-symbols-outlined text-primary text-[18px] mt-0.5">location_on</span>
                                        <span className="leading-snug">{member.address}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[18px]">call</span>
                                        <span>{member.phone}</span>
                                    </div>
                                    {member.email && member.email !== "N/A" && (
                                        <div className="flex items-center gap-2">
                                            <span className="material-symbols-outlined text-primary text-[18px]">mail</span>
                                            <a href={`mailto:${member.email}`} className="hover:text-primary hover:underline truncate">{member.email}</a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="px-6 pb-6 pt-2 border-t border-slate-100 dark:border-white/5">
                                <button className="w-full py-3 rounded-xl border border-primary text-primary font-semibold text-sm hover:bg-primary hover:text-white transition-colors">
                                    View Profile
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Controls */}
                {filteredMembers.length > 0 && (
                    <div className="flex justify-center items-center gap-4 mb-12">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="px-4 py-2 rounded-lg border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-white/5 transition-colors flex items-center gap-2"
                        >
                            <span className="material-symbols-outlined text-sm">arrow_back</span>
                            Previous
                        </button>

                        <div className="flex gap-2">
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
                                <button
                                    key={number}
                                    onClick={() => handlePageChange(number)}
                                    className={`w-10 h-10 rounded-lg font-semibold transition-colors flex items-center justify-center ${currentPage === number
                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                        : 'bg-white dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:border-primary/50'
                                        }`}
                                >
                                    {number}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                            className="px-6 py-2 rounded-lg bg-primary text-white font-semibold shadow-lg shadow-primary/25 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-all hover:-translate-y-0.5 flex items-center gap-2"
                        >
                            Next
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </button>
                    </div>
                )}

                {filteredMembers.length === 0 && (
                    <div className="text-center py-20">
                        <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">search_off</span>
                        <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300">No members found</h3>
                        <p className="text-slate-500 dark:text-slate-500">Try adjusting your search or filters.</p>
                    </div>
                )}
            </main>
        </div>
    );
};

export default MembersDirectory;
