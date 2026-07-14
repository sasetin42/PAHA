import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import ClinicMap from '../components/ClinicMap';
import { getCoordinates } from '../utils/geocoding';

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

const FindAVet: React.FC = () => {
    const { members } = useAdmin();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
    const [accreditedOnly, setAccreditedOnly] = useState(false);

    // Calculate dynamic stats
    const accreditedCount = useMemo(() => members.filter(c => c.isAccredited).length, [members]);
    const totalCount = members.length;

    const displayClinics = useMemo(() => {
        const queryTerms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
        return members
            .filter(clinic => {
                const matchesSearch = queryTerms.length === 0 || queryTerms.every(term =>
                    clinic.name.toLowerCase().includes(term) ||
                    clinic.address.toLowerCase().includes(term) ||
                    (clinic.headVeterinarian || '').toLowerCase().includes(term)
                );
                const matchesAccredited = !accreditedOnly || clinic.isAccredited;
                return matchesSearch && matchesAccredited;
            })
            .map(clinic => {
                if (clinic.lat && clinic.lng) return { ...clinic };
                return { ...clinic, ...getCoordinates(clinic.address, clinic.id) };
            })
            .sort((a, b) => {
                if (a.isAccredited && !b.isAccredited) return -1;
                if (!a.isAccredited && b.isAccredited) return 1;
                return a.name.localeCompare(b.name);
            });
    }, [members, searchTerm, accreditedOnly]);

    const handleClinicClick = (id: string) => {
        setSelectedClinicId(id);
        if (window.innerWidth < 1024) window.scrollTo({ top: 620, behavior: 'smooth' });
    };



    return (
        <div className="min-h-screen bg-slate-50 dark:bg-background-dark font-display text-slate-900 dark:text-white antialiased">
            
            {/* ── HERO SECTION ── */}
            <div className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10">
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/6816858/pexels-photo-6816858.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Find a Vet Background"
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
                                Connect with a <span className="text-primary">Trusted Vet</span>
                            </h1>
                            
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                                Your pet deserves premium, ethical healthcare. Search, locate, and filter through PAHA-verified animal hospitals and companion clinics near you.
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
            <div className="bg-gradient-to-r from-primary via-primary to-blue-600 py-3.5 overflow-hidden shadow-md">
                <div className="flex whitespace-nowrap" style={{ animation: 'marquee 45s linear infinite' }}>
                    {[...memberNames, ...memberNames].map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-3 text-white/90 text-xs font-semibold px-8 tracking-wide uppercase">
                            <span className="text-white/40">✦</span>{name}
                        </span>
                    ))}
                </div>
                <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
            </div>

            {/* ── WHY CHOOSE PAHA ── */}
            <section className="py-16 px-6 max-w-7xl mx-auto">
                <div className="max-w-5xl mx-auto">
                    <div className="mb-10 text-center md:text-left">
                        <span className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Vetted Quality Standards</span>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mt-1 mb-2 tracking-tight">You deserve more than just a clinic</h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">PAHA members and accredited clinics and hospitals have met rigorous standards in veterinary care, facility safety, and professional excellence.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { icon: 'verified', title: 'Verified Quality Standards', desc: 'Strict compliance with veterinary health, hygiene, and equipment metrics.', color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
                            { icon: 'school', title: 'Credentialed Professionals', desc: 'Active, certified veterinary practitioners committing to ongoing medical training.', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
                            { icon: 'favorite', title: 'Owner Peace of Mind', desc: 'Compassionate, expert medical care from standard vaccines to complex procedures.', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
                        ].map((item, idx) => (
                            <div key={idx} className="flex flex-col items-start gap-4 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-primary/20 hover:shadow-md transition-all group">
                                <div className={`size-12 rounded-xl ${item.color} flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-all`}>
                                    <span className="material-symbols-outlined text-[24px] font-bold select-none">{item.icon}</span>
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base mb-1">{item.title}</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── FIND A PAHA-TRUSTED VET ── */}
            <main className="px-6 max-w-7xl mx-auto pb-20 relative z-10 border-t border-slate-100 dark:border-slate-800 pt-16">

                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">Interactive Directory</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">Every clinic listed below conforms with PAHA rules. Bring your pet to a veterinarian you can fully trust.</p>
                </div>

                {/* Search Bar & Filters */}
                <div className="max-w-2xl mx-auto mb-10 flex flex-col sm:flex-row gap-4 items-center">
                    <div className="relative w-full flex-1">
                        <label htmlFor="directory-search" className="sr-only">Search Directory</label>
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 select-none">search</span>
                        <input
                            id="directory-search"
                            type="text"
                            placeholder="Search by clinic name, doctor, or location..."
                            className="w-full pl-12 pr-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-primary outline-none transition-all text-sm text-slate-900 dark:text-white shadow-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setAccreditedOnly(!accreditedOnly)}
                        className={`px-4 py-3 rounded-xl border text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 w-full sm:w-auto justify-center
                            ${accreditedOnly 
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:border-emerald-900 dark:text-emerald-300' 
                                : 'bg-white border-slate-200 text-slate-600 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-400 hover:border-primary'
                            }
                        `}
                    >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        Accredited Only
                    </button>
                </div>

                {/* Map + Clinic List */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

                    {/* Left: Clinic List */}
                    <div className="lg:col-span-5 flex flex-col gap-4 order-2 lg:order-1 max-h-[800px] overflow-y-auto pr-2 custom-scrollbar">
                        <div className="flex items-center justify-between">
                            <h3 className="font-bold text-sm text-slate-500 uppercase tracking-wider">{displayClinics.length} Locations Found</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-4 p-1">
                            {displayClinics.map(clinic => (
                                <div
                                    key={clinic.id}
                                    className={`bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm hover:shadow-md transition-all border cursor-pointer group ${
                                        selectedClinicId === clinic.id
                                            ? 'border-primary ring-2 ring-primary/5 scale-[1.01]'
                                            : 'border-slate-200 dark:border-slate-800/80'
                                    }`}
                                    onClick={() => handleClinicClick(clinic.id)}
                                >
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-base">local_hospital</span>
                                            {clinic.type || 'Clinic'}
                                        </div>
                                        {clinic.isAccredited && (
                                            <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px] font-bold">verified</span>
                                                Accredited
                                            </div>
                                        )}
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-tight group-hover:text-primary transition-colors">
                                        {clinic.name}
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 line-clamp-2 leading-relaxed">
                                        {clinic.address}
                                    </p>
                                    <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5 mt-auto">
                                        <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                                            {clinic.headVeterinarian && <span className="block">Dr. {clinic.headVeterinarian}</span>}
                                        </div>
                                        <button
                                            className="text-primary text-[10px] font-bold uppercase tracking-wider hover:underline flex items-center gap-1"
                                            onClick={(e) => { e.stopPropagation(); handleClinicClick(clinic.id); }}
                                        >
                                            Locate
                                            <span className="material-symbols-outlined text-sm">my_location</span>
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {displayClinics.length === 0 && (
                                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 select-none">location_off</span>
                                    <h3 className="font-semibold text-slate-800 dark:text-white text-base">No clinics found</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Try searching for a different keyword or toggle the Accredited filter.</p>
                                </div>
                            )}
                        </div>
                        {displayClinics.length > 0 && (
                            <div className="text-center mt-4">
                                <Link
                                    to="/membership/accredited-clinics"
                                    className="inline-flex justify-center items-center px-8 py-3 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-primary/20 hover:scale-105 active:scale-95 gap-2"
                                >
                                    View Accredited Clinics
                                    <span className="material-symbols-outlined text-base">arrow_forward</span>
                                </Link>
                            </div>
                        )}
                    </div>

                    {/* Right: Map */}
                    <div className="lg:col-span-7 order-1 lg:order-2">
                        <div className="sticky top-28 h-[400px] lg:h-[calc(100vh-160px)] rounded-2xl overflow-hidden shadow-xl border border-slate-200 dark:border-slate-800">
                            <ClinicMap
                                clinics={displayClinics.filter(c => c.lat != null && c.lng != null) as any}
                                selectedClinicId={selectedClinicId}
                                onClinicSelect={setSelectedClinicId}
                            />
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
};

export default FindAVet;
