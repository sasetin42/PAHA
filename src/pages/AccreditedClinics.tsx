import React, { useState, useMemo } from 'react';
import { useAdmin } from '../context/AdminContext';

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

const AccreditedClinics: React.FC = () => {
    const { members } = useAdmin();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState('All');

    const accreditedCount = useMemo(() => members.filter(c => c.isAccredited).length, [members]);

    const accreditedClinics = useMemo(() => {
        const queryTerms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
        return members
            .filter(m => m.isAccredited)
            .filter(m => selectedType === 'All' || m.type === selectedType)
            .filter(m =>
                queryTerms.length === 0 || queryTerms.every(term =>
                    m.name.toLowerCase().includes(term) ||
                    m.address.toLowerCase().includes(term) ||
                    (m.headVeterinarian && m.headVeterinarian.toLowerCase().includes(term))
                )
            )
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [members, searchTerm, selectedType]);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-navy font-display text-slate-900 dark:text-white antialiased">

            {/* ── HERO SECTION ── */}
            <div className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10">
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/6816858/pexels-photo-6816858.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Accredited Clinics Background"
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
                                PAHA-Accredited <span className="text-primary">Clinics & Hospitals</span>
                            </h1>
                            
                            <p className="text-slate-350 text-sm md:text-base leading-relaxed max-w-xl font-medium">
                                Every clinic on this list has been evaluated and accredited by PAHA — meeting the highest standards in veterinary care, facility safety, and professional excellence.
                            </p>
                        </div>

                        {/* Right Side: Detailed Features Grid */}
                        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">verified</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">{accreditedCount}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Accredited Centers</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">fact_check</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">100%</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Facility Inspected</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">workspace_premium</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">Tier 1-3</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Certified Standard</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-rose-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">health_and_safety</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">Approved</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Quality Animal Care</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SCROLLING TICKER ── */}
            <div className="bg-gradient-to-br from-primary via-primary to-blue-600 py-5 overflow-hidden">
                <div className="flex whitespace-nowrap" style={{ animation: 'marquee 45s linear infinite' }}>
                    {[...memberNames, ...memberNames].map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-3 text-white/80 text-sm font-medium px-8">
                            <span className="text-white/40">✦</span>{name}
                        </span>
                    ))}
                </div>
                <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
            </div>

            {/* ── ACCREDITED CLINICS GRID ── */}
            <section className="py-20 px-6 bg-slate-50 dark:bg-white/[0.02]">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <p className="text-primary font-bold uppercase tracking-[0.3em] text-xs mb-2">PAHA-Accredited</p>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">
                            Accredited Clinics & Hospitals
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl mx-auto font-medium">
                            Find a PAHA-accredited veterinary clinic near you. Each of these institutions has passed our rigorous evaluation process.
                        </p>
                    </div>

                    {/* Search & Filters */}
                    <div className="max-w-3xl mx-auto mb-10 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="relative w-full">
                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input
                                type="text"
                                id="accredited-search-input"
                                placeholder="Search by name, address, or veterinarian..."
                                className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-white dark:bg-charcoal border border-slate-200 dark:border-white/10 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-slate-900 dark:text-white shadow-sm text-sm"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 w-full md:w-auto flex-shrink-0 justify-center">
                            {['All', 'Hospital', 'Clinic'].map(type => (
                                <button
                                    key={type}
                                    onClick={() => setSelectedType(type)}
                                    className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border ${
                                        selectedType === type
                                            ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                                            : 'bg-white dark:bg-charcoal border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {type}s
                                </button>
                            ))}
                        </div>
                    </div>

                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 text-center font-semibold">
                        {accreditedClinics.length} accredited {accreditedClinics.length === 1 ? 'clinic' : 'clinics'} found
                    </p>

                    {/* Cards Grid */}
                    {accreditedClinics.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                            {accreditedClinics.map(clinic => (
                                <div
                                    key={clinic.id}
                                    className="bg-white dark:bg-charcoal rounded-2xl overflow-hidden shadow-sm hover:shadow-xl border border-slate-200 dark:border-white/10 hover:border-primary/30 transition-all group flex flex-col justify-between"
                                >
                                    <div>
                                        {/* Image */}
                                        <div className="h-48 overflow-hidden bg-slate-100 dark:bg-white/5 relative">
                                            {clinic.image ? (
                                                <img
                                                    src={clinic.image}
                                                    alt={clinic.name}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-blue-100 dark:from-primary/20 dark:to-blue-900/20">
                                                    <span className="material-symbols-outlined text-5xl text-primary/40">local_hospital</span>
                                                </div>
                                            )}
                                            <div className="absolute top-3 right-3 bg-emerald-500 text-white px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
                                                <span className="material-symbols-outlined text-xs">verified</span>
                                                PAHA Accredited
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-6">
                                            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider mb-3">
                                                {clinic.type === 'Hospital' ? (
                                                    <span className="inline-flex items-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-lg">
                                                        <span className="material-symbols-outlined text-sm">corporate_fare</span>
                                                        Hospital
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-teal-500 bg-teal-50 dark:bg-teal-500/10 px-2.5 py-1 rounded-lg">
                                                        <span className="material-symbols-outlined text-sm">medical_services</span>
                                                        Clinic
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug group-hover:text-primary transition-colors">
                                                {clinic.name}
                                            </h3>
                                            <p className="text-sm text-slate-650 dark:text-slate-400 line-clamp-2 flex items-start gap-2 mt-2">
                                                <span className="material-symbols-outlined text-base flex-shrink-0 mt-0.5 text-amber-500">location_on</span>
                                                {clinic.address}
                                            </p>
                                            
                                            {clinic.headVeterinarian && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-purple-500">person</span>
                                                    <span className="font-semibold text-slate-700 dark:text-slate-300">Head Vet:</span> Dr. {clinic.headVeterinarian}
                                                </p>
                                            )}

                                            {clinic.phone && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-cyan-500">call</span>
                                                    <a href={`tel:${clinic.phone}`} className="hover:text-primary transition-colors">{clinic.phone}</a>
                                                </p>
                                            )}

                                            {clinic.email && (
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-2">
                                                    <span className="material-symbols-outlined text-base text-indigo-500">mail</span>
                                                    <a href={`mailto:${clinic.email}`} className="hover:text-primary transition-colors break-all">{clinic.email}</a>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {clinic.lat && clinic.lng && (
                                        <div className="px-6 pb-6 pt-0">
                                            <div className="border-t border-slate-100 dark:border-white/5 pt-4 flex justify-end">
                                                <a
                                                    href={`https://www.google.com/maps/search/?api=1&query=${clinic.lat},${clinic.lng}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 dark:bg-white/5 hover:bg-primary/10 hover:text-primary dark:hover:bg-primary/20 dark:hover:text-primary text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <span className="material-symbols-outlined text-sm text-amber-500">directions</span>
                                                    Get Directions
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16 bg-white dark:bg-charcoal rounded-2xl border border-dashed border-slate-300 dark:border-white/10">
                            <span className="material-symbols-outlined text-5xl text-slate-300 mb-3 block">search_off</span>
                            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-300 mb-1">No clinics found</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-500">Try a different search term or filter category.</p>
                        </div>
                    )}
                </div>
            </section>

        </div>
    );
};

export default AccreditedClinics;
