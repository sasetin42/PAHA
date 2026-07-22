import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import MembershipFormModal from '../components/MembershipFormModal';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

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

const testimonials = [
    {
        quote: "Joining PAHA was one of the best decisions we made for our clinic. The network, the seminars, the legal support — everything has helped us grow and stay ahead.",
        name: "Dr. Marilou Santos",
        clinic: "Happy Paws Veterinary Clinic",
        role: "Clinic Owner & Head Veterinarian",
        initials: "MS",
    },
    {
        quote: "PAHA has connected us with the best minds in veterinary medicine. The annual conference alone is worth the membership — the CPD units and networking are unmatched.",
        name: "Dr. Ramon Dela Cruz",
        clinic: "Animal Kingdom Veterinary Hospital",
        role: "Head Veterinarian",
        initials: "RD",
    },
    {
        quote: "Being accredited by PAHA gave our clients a reason to trust us more. The PAHA badge is not just a sticker — it tells pet owners that we meet the highest standard of care.",
        name: "Dr. Grace Villanueva",
        clinic: "All Pets Veterinary Clinic",
        role: "Clinic Director",
        initials: "GV",
    },
    {
        quote: "The free legal advice alone has saved us from so many compliance issues. PAHA truly looks after its members beyond just the professional side.",
        name: "Dr. Jose Mercado",
        clinic: "Vets In Practice Animal Hospital",
        role: "Managing Veterinarian",
        initials: "JM",
    },
    {
        quote: "As a new clinic owner, PAHA gave me mentors, resources, and a community I didn't know I needed. I couldn't imagine growing my practice without them.",
        name: "Dr. Rina Aquino",
        clinic: "Eastwind Veterinary Clinic",
        role: "Founder & Veterinarian",
        initials: "RA",
    },
    {
        quote: "Hotel discounts, seminar access, round-table discussions — PAHA membership pays for itself every single year. Our entire team benefits from being part of this association.",
        name: "Dr. Paolo Reyes",
        clinic: "Seven Lakes Veterinary Clinic",
        role: "Chief Veterinary Officer",
        initials: "PR",
    },
];

const TestimonialsCarousel: React.FC = () => {
    const [current, setCurrent] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const total = testimonials.length;
    const visible = Math.min(3, total);
    const totalSlides = total - visible + 1;

    const startTimer = () => {
        timerRef.current = setInterval(() => {
            setCurrent(prev => (prev + 1) % totalSlides);
        }, 5000);
    };

    useEffect(() => {
        startTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [totalSlides]);

    const goTo = (idx: number) => {
        if (timerRef.current) clearInterval(timerRef.current);
        setCurrent(idx);
        startTimer();
    };

    return (
        <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-white/5 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="mb-12 text-center md:text-left">
                    <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">Member Stories</p>
                    <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">What our members say</h2>
                    <p className="text-slate-550 dark:text-slate-400 text-sm font-medium">Hear from the clinics that have already made PAHA part of their practice.</p>
                </div>

                <div className="overflow-hidden">
                    <div
                        className="flex transition-transform duration-700 ease-in-out gap-0"
                        style={{ transform: `translateX(calc(-${current} * (100% / ${visible})))` }}
                    >
                        {testimonials.map((t, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 px-3 w-full sm:w-1/2 lg:w-1/3"
                            >
                                <div className="bg-slate-50/50 dark:bg-slate-950/40 rounded-3xl p-7 border border-slate-200/55 dark:border-white/5 shadow-sm h-full flex flex-col justify-between">
                                    <div className="space-y-4">
                                        {/* Stars */}
                                        <div className="flex gap-0.5">
                                            {[...Array(5)].map((_, s) => (
                                                <span key={s} className="material-symbols-outlined text-amber-400 text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                                            ))}
                                        </div>
                                        {/* Quote */}
                                        <p className="text-slate-650 dark:text-slate-350 text-xs md:text-sm leading-relaxed italic">
                                            "{t.quote}"
                                        </p>
                                    </div>
                                    {/* Author */}
                                    <div className="flex items-center gap-3 pt-4 mt-6 border-t border-slate-100 dark:border-white/5">
                                        <div className="size-9 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                                            {t.initials}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800 dark:text-white text-xs">{t.name}</p>
                                            <p className="text-[10px] text-primary font-bold">{t.clinic}</p>
                                            <p className="text-[10px] text-slate-400 font-medium">{t.role}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Dots */}
                {totalSlides > 1 && (
                    <div className="flex justify-center gap-2 mt-8">
                        {Array.from({ length: totalSlides }).map((_, i) => (
                            <button
                                key={i}
                                onClick={() => goTo(i)}
                                className={`h-2 rounded-full transition-all duration-300 ${i === current ? 'bg-primary w-6' : 'bg-slate-300 dark:bg-white/20 w-2'}`}
                                aria-label={`Go to slide ${i + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

const Membership: React.FC = () => {
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const { user } = useAuth();

  // Load membership applications. Match by BOTH email and uid and merge — an
  // application's stored `email` may differ from the normalized auth email, so
  // email-only lookups silently missed some accounts' rejected applications.
  useEffect(() => {
    if (!user?.uid && !user?.email) return;
    const byEmail: Record<string, any> = {};
    const byUid: Record<string, any> = {};
    const emit = () => setMyApplications(Object.values({ ...byEmail, ...byUid }));
    const unsubs: (() => void)[] = [];
    if (user?.email) {
      const qEmail = query(collection(db, 'membership_applications'), where('email', '==', user.email));
      unsubs.push(onSnapshot(qEmail, (snap) => {
        Object.keys(byEmail).forEach(k => delete byEmail[k]);
        snap.docs.forEach(d => { byEmail[d.id] = { id: d.id, ...d.data() }; });
        emit();
      }, (err) => {
        console.error('[Membership] App by email error:', err);
      }));
    }
    if (user?.uid) {
      const qUid = query(collection(db, 'membership_applications'), where('uid', '==', user.uid));
      unsubs.push(onSnapshot(qUid, (snap) => {
        Object.keys(byUid).forEach(k => delete byUid[k]);
        snap.docs.forEach(d => { byUid[d.id] = { id: d.id, ...d.data() }; });
        emit();
      }, (err) => {
        console.error('[Membership] App by uid error:', err);
      }));
    }
    return () => unsubs.forEach(u => u());
  }, [user?.uid, user?.email]);

  // Check for rejected applications
  const rejectedApp = myApplications.find(app => app.status === 'rejected');
  const rejectionReason = rejectedApp?.rejectionReason || '';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [clinicSearch, setClinicSearch] = useState('');
    const { members } = useAdmin();



    const filteredClinics = useMemo(() =>
        members
            .filter(m =>
                m.name.toLowerCase().includes(clinicSearch.toLowerCase()) ||
                (m.address || '').toLowerCase().includes(clinicSearch.toLowerCase())
            )
            .sort((a, b) => {
                if (a.isAccredited && !b.isAccredited) return -1;
                if (!a.isAccredited && b.isAccredited) return 1;
                return a.name.localeCompare(b.name);
            })
            .slice(0, 10),
        [members, clinicSearch]
    );


  return (
    <div className="min-h-screen bg-white dark:bg-background-dark-black font-sans text-slate-900 dark:text-white antialiased transition-colors duration-300">
      {rejectedApp && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500 p-4">
          <div className="max-w-7xl mx-auto px-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-rose-500 mt-1">error</span>
            <div className="flex-1">
              <h3 className="font-bold text-sm text-rose-800 dark:text-rose-200 uppercase tracking-wider">Membership Application Not Approved</h3>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                <strong>Reason:</strong> {rejectionReason || 'Insufficient documents'}
              </p>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                Fix the issue above — e.g., re-upload a corrected document below — then{' '}
                <Link to="/membership-application" className="font-semibold text-primary hover:underline">resubmit your application</Link> for another review.
              </p>
            </div>
            <button
              onClick={() => setMyApplications(prev => prev.filter(a => a.id !== rejectedApp.id))}
              className="text-slate-400 hover:text-rose-500"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>
        </div>
      )}
      <MembershipFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            {/* ── HERO SECTION ── */}
            <div className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10">
                <div className="relative rounded-[32px] overflow-hidden bg-slate-950 text-white min-h-[400px] md:min-h-[45vh] flex items-center p-8 md:p-12 shadow-2xl border border-white/5">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/6816858/pexels-photo-6816858.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Membership Background"
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
                                Professional <span className="text-primary">Development</span>
                            </h1>
                            
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl font-medium">
                                Build relationships, exchange ideas, and grow together in a community committed to companion animal health and welfare.
                            </p>
                        </div>

                        {/* Right Side: Detailed Features Grid */}
                        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">calendar_month</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">5 Active</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Upcoming Seminars</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">history</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">4 Held</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Past Highlights</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">workspace_premium</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">CPD Units</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">PRC Accredited</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-rose-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">vaccines</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-[15px] text-white tracking-tight">Hands-on</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Practical Workshops</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SCROLLING MARQUEE OF MEMBERS ── */}
            <div className="bg-primary overflow-hidden py-3 shadow-sm">
                <div className="flex whitespace-nowrap" style={{ animation: 'marquee 45s linear infinite' }}>
                    {[...memberNames, ...memberNames].map((name, i) => (
                        <span key={i} className="inline-flex items-center gap-3 text-white/90 text-xs font-bold uppercase tracking-wider px-8">
                            <span className="text-white/40">✦</span>
                            {name}
                        </span>
                    ))}
                </div>
                <style>{`@keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
            </div>


            {/* ── WHY JOIN ── */}
            <section className="py-24 bg-white dark:bg-slate-950">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Section header */}
                    <div className="mb-14 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <div>
                            <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-full mb-4">
                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>stars</span>
                                Exclusive Benefits
                            </span>
                            <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                                Be part of <span className="text-primary">the pack</span>
                            </h2>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-3 max-w-lg">
                                Exclusive perks designed to support your clinic operations and fuel your professional growth.
                            </p>
                        </div>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="flex-shrink-0 inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl text-sm font-bold transition-all shadow-md shadow-primary/20 hover:scale-[1.02]"
                        >
                            <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                            Join Now
                        </button>
                    </div>

                    {/* Cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                        {[
                            {
                                icon: 'calendar_month',
                                title: 'Priority Seminar Access',
                                desc: 'First-dibs registration on hands-on CPE workshops, surgical wetlabs, and regional conventions at discounted member rates.',
                                from: '#3b82f6', to: '#6366f1',
                                iconBg: 'from-blue-500 to-indigo-600',
                                glow: 'group-hover:shadow-blue-500/20',
                                tag: 'CPD Accredited',
                            },
                            {
                                icon: 'gavel',
                                title: 'Free Legal Advisory',
                                desc: 'Access certified consultants for professional practice regulations, compliance, and client mediation cases — at no extra cost.',
                                from: '#10b981', to: '#14b8a6',
                                iconBg: 'from-emerald-500 to-teal-500',
                                glow: 'group-hover:shadow-emerald-500/20',
                                tag: 'Members Only',
                            },
                            {
                                icon: 'groups',
                                title: 'Professional Directory',
                                desc: 'Be listed in the official PAHA registry — discoverable by pet owners searching for trusted, accredited clinics nationwide.',
                                from: '#8b5cf6', to: '#ec4899',
                                iconBg: 'from-violet-500 to-pink-500',
                                glow: 'group-hover:shadow-violet-500/20',
                                tag: 'Public Visibility',
                            },
                            {
                                icon: 'hotel',
                                title: 'Exclusive Hotel Deals',
                                desc: 'Enjoy discounted hotel rates and partner lodging packages at PAHA national summits and conventions across the Philippines.',
                                from: '#f43f5e', to: '#f97316',
                                iconBg: 'from-rose-500 to-orange-500',
                                glow: 'group-hover:shadow-rose-500/20',
                                tag: 'Partner Perks',
                            },
                            {
                                icon: 'school',
                                title: 'CPE Certification Support',
                                desc: 'Complimentary lectures, downloadable resources, and PRC-accredited CPD units at every regular membership meeting.',
                                from: '#f59e0b', to: '#ef4444',
                                iconBg: 'from-amber-500 to-red-500',
                                glow: 'group-hover:shadow-amber-500/20',
                                tag: 'PRC Approved',
                            },
                            {
                                icon: 'workspace_premium',
                                title: 'Official PAHA Badge',
                                desc: 'Receive the official PAHA physical plaque, wall sticker, and digital badge to display your accredited status and build client trust.',
                                from: '#06b6d4', to: '#3b82f6',
                                iconBg: 'from-cyan-500 to-blue-500',
                                glow: 'group-hover:shadow-cyan-500/20',
                                tag: 'Recognition',
                            },
                        ].map((item, idx) => (
                            <div
                                key={item.title}
                                className={`group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/5 p-6 hover:border-transparent hover:shadow-2xl ${item.glow} transition-all duration-300 hover:-translate-y-1.5 overflow-hidden flex flex-col gap-5`}
                            >
                                {/* Subtle corner glow */}
                                <div
                                    className="absolute -top-10 -right-10 size-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl"
                                    style={{ background: `radial-gradient(circle, ${item.from}40, transparent)` }}
                                />

                                {/* Top row: icon + number */}
                                <div className="flex items-start justify-between">
                                    <div className={`size-14 rounded-2xl bg-gradient-to-br ${item.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 group-hover:shadow-xl transition-all duration-300`}>
                                        <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                                    </div>
                                    <span className="text-4xl font-black text-slate-100 dark:text-white/5 select-none leading-none mt-1 group-hover:text-slate-200/70 dark:group-hover:text-white/10 transition-colors">
                                        {String(idx + 1).padStart(2, '0')}
                                    </span>
                                </div>

                                {/* Content */}
                                <div className="flex-1">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-base mb-2 group-hover:text-primary dark:group-hover:text-blue-400 transition-colors">
                                        {item.title}
                                    </h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
                                        {item.desc}
                                    </p>
                                </div>

                                {/* Bottom: tag + arrow */}
                                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
                                    <span
                                        className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                                        style={{ background: `${item.from}18`, color: item.from }}
                                    >
                                        {item.tag}
                                    </span>
                                    <div className="size-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                                        <span className="material-symbols-outlined text-sm text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-all">arrow_forward</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ── INTERACTIVE TIER COMPARISON TOOL ── */}
            <section className="py-24 bg-slate-50 dark:bg-slate-900/30">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

                    {/* Section header */}
                    <div className="mb-14 text-center">
                        <span className="inline-flex items-center gap-2 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-[0.2em] px-4 py-1.5 rounded-full mb-4">
                            <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>compare</span>
                            Comparison
                        </span>
                        <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mt-2 mb-3">
                            Membership vs. <span className="text-primary">Accreditation</span>
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xl mx-auto">
                            Understand client-facing standards and member privileges before submitting your application.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto">
                        {/* Tier header cards */}
                        <div className="grid grid-cols-3 gap-3 mb-4 pl-[44%]">
                            <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-500/20 p-4 text-center">
                                <div className="size-10 rounded-xl bg-blue-500 flex items-center justify-center mx-auto mb-2 shadow-sm shadow-blue-500/20">
                                    <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
                                </div>
                                <div className="font-black text-blue-700 dark:text-blue-400 text-sm">Regular</div>
                                <div className="text-blue-500/70 dark:text-blue-400/60 text-[10px] font-semibold uppercase tracking-wider">Member</div>
                            </div>
                            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-500/20 p-4 text-center">
                                <div className="size-10 rounded-xl bg-emerald-500 flex items-center justify-center mx-auto mb-2 shadow-sm shadow-emerald-500/20">
                                    <span className="material-symbols-outlined text-white text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                                </div>
                                <div className="font-black text-emerald-700 dark:text-emerald-400 text-sm">Accredited</div>
                                <div className="text-emerald-500/70 dark:text-emerald-400/60 text-[10px] font-semibold uppercase tracking-wider">Clinic</div>
                            </div>
                        </div>

                        {/* Table card */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden shadow-sm">

                            {/* Column labels row */}
                            <div className="grid grid-cols-3 bg-slate-50 dark:bg-white/[0.03] border-b border-slate-200 dark:border-white/5 px-6 py-3">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Privilege / Feature</div>
                                <div className="text-[10px] font-bold text-blue-500 uppercase tracking-wider text-center">Regular Member</div>
                                <div className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider text-center">Accredited Clinic</div>
                            </div>

                            {/* Rows */}
                            {[
                                { name: 'CPE Workshop Access', icon: 'calendar_month', iconColor: 'text-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-500/10', regular: true, accredited: true },
                                { name: 'National Convention Discount', icon: 'confirmation_number', iconColor: 'text-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-500/10', regular: true, accredited: true },
                                { name: 'Free Meeting Lectures', icon: 'school', iconColor: 'text-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-500/10', regular: true, accredited: true },
                                { name: 'Legal Protection Advice', icon: 'gavel', iconColor: 'text-teal-500', iconBg: 'bg-teal-50 dark:bg-teal-500/10', regular: true, accredited: true },
                                { name: 'Official Plaque & Wall Sticker', icon: 'workspace_premium', iconColor: 'text-rose-500', iconBg: 'bg-rose-50 dark:bg-rose-500/10', regular: false, accredited: true },
                                { name: 'Public Clinic Referral Visibility', icon: 'location_on', iconColor: 'text-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-500/10', regular: false, accredited: true },
                                { name: 'Emergency Hotline Advisory Support', icon: 'emergency', iconColor: 'text-red-500', iconBg: 'bg-red-50 dark:bg-red-500/10', regular: false, accredited: true },
                            ].map((tier, idx) => (
                                <div
                                    key={tier.name}
                                    className={`grid grid-cols-3 px-6 py-4 border-b border-slate-100 dark:border-white/[0.04] last:border-0 items-center transition-colors hover:bg-slate-50/70 dark:hover:bg-white/[0.02] ${idx % 2 === 0 ? '' : 'bg-slate-50/30 dark:bg-white/[0.01]'}`}
                                >
                                    {/* Feature name */}
                                    <div className="flex items-center gap-3">
                                        <div className={`size-8 rounded-lg ${tier.iconBg} flex items-center justify-center flex-shrink-0`}>
                                            <span className={`material-symbols-outlined text-sm ${tier.iconColor}`} style={{ fontVariationSettings: "'FILL' 1" }}>{tier.icon}</span>
                                        </div>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{tier.name}</span>
                                    </div>

                                    {/* Regular member */}
                                    <div className="flex justify-center">
                                        {tier.regular ? (
                                            <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-3 py-1 rounded-full border border-blue-200/60 dark:border-blue-500/20">
                                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                                Included
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-slate-300 dark:text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-white/5">
                                                <span className="material-symbols-outlined text-xs">remove</span>
                                                Not Included
                                            </span>
                                        )}
                                    </div>

                                    {/* Accredited clinic */}
                                    <div className="flex justify-center">
                                        {tier.accredited ? (
                                            <span className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-3 py-1 rounded-full border border-emerald-200/60 dark:border-emerald-500/20">
                                                <span className="material-symbols-outlined text-xs" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
                                                Included
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-slate-300 dark:text-slate-600 text-[10px] font-bold px-3 py-1 rounded-full border border-slate-200 dark:border-white/5">
                                                <span className="material-symbols-outlined text-xs">remove</span>
                                                Not Included
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Bottom CTA strip */}
                            <div className="px-6 py-5 bg-gradient-to-r from-slate-50 to-blue-50/50 dark:from-white/[0.03] dark:to-primary/5 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <div className="font-bold text-slate-800 dark:text-white text-sm">Ready to upgrade your clinic's standing?</div>
                                    <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Start with membership, then apply for full accreditation.</div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(true)}
                                    className="flex-shrink-0 inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm shadow-primary/20 hover:scale-[1.02]"
                                >
                                    <span className="material-symbols-outlined text-sm">how_to_reg</span>
                                    Apply for Membership
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>


            {/* ── MEMBERS' CLINIC NETWORK ── */}
            <section className="py-20 bg-white dark:bg-slate-900 border-t border-slate-150 dark:border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-10 text-center">
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight">Members' Clinic Network</h2>
                        <p className="text-slate-550 dark:text-slate-400 text-sm font-semibold mt-1">Search through verified professional companion animal medical clinics.</p>
                    </div>

                    <div className="relative mb-8 max-w-lg mx-auto">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-lg select-none">search</span>
                        <input
                            id="member-clinicSearch"
                            type="text"
                            placeholder="Filter members by name or address location..."
                            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-xs font-semibold focus:ring-2 focus:ring-primary/40 outline-none transition-all shadow-sm"
                            value={clinicSearch}
                            onChange={e => setClinicSearch(e.target.value)}
                        />
                    </div>

                    <div className="overflow-hidden rounded-3xl border border-slate-150 dark:border-white/5 shadow-sm bg-white dark:bg-slate-900">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/10">
                                    <th className="text-left px-6 py-4 font-bold uppercase tracking-wider text-slate-450 dark:text-slate-555">Clinic Name</th>
                                    <th className="text-left px-6 py-4 font-bold uppercase tracking-wider text-slate-455 dark:text-slate-555 hidden md:table-cell">Location</th>
                                    <th className="text-left px-6 py-4 font-bold uppercase tracking-wider text-slate-455 dark:text-slate-555">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {filteredClinics.map((clinic) => (
                                    <tr key={clinic.id} className="hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-800 dark:text-white">{clinic.name}</td>
                                        <td className="px-6 py-4 text-slate-500 dark:text-slate-400 hidden md:table-cell font-medium">{clinic.address}</td>
                                        <td className="px-6 py-4">
                                            {clinic.isAccredited ? (
                                                <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                    <span className="material-symbols-outlined text-[12px] font-black select-none">verified</span>Accredited
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                                    Member
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {filteredClinics.length === 0 && (
                                    <tr>
                                        <td colSpan={3} className="px-6 py-10 text-center text-slate-400 dark:text-slate-600 font-semibold italic">No members match search query.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    <div className="text-center mt-8">
                        <Link
                            to="/membership/directory"
                            className="inline-flex justify-center items-center px-8 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-md hover:scale-105 active:scale-95 gap-1.5"
                        >
                            Open Directory Map
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── HOW TO JOIN — 4 SIMPLE STEPS ── */}
            <section className="py-20 bg-slate-50/50 dark:bg-slate-950/20 border-t border-slate-150 dark:border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="mb-14 text-center md:text-left">
                        <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs mb-2">How to Join</p>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 tracking-tight">4 simple steps</h2>
                        <p className="text-slate-550 dark:text-slate-400 text-sm font-medium">Follow the steps below to begin your PAHA membership journey.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                            {
                                num: '1',
                                label: 'Check the Qualifications',
                                desc: 'Must be a licensed vet representing a registered animal clinic or hospital.',
                                btnLabel: 'Qualifications',
                                btnTo: '/membership/accreditation-requirements',
                                gradient: 'from-blue-500 to-indigo-650 shadow-blue-500/20'
                            },
                            {
                                num: '2',
                                label: 'Submit Application',
                                desc: 'Fill out the online form and submit required documents.',
                                btnLabel: 'Apply Now',
                                btnTo: '',
                                gradient: 'from-emerald-500 to-teal-650 shadow-emerald-500/20'
                            },
                            {
                                num: '3',
                                label: 'Evaluation & Approval',
                                desc: 'Have your clinic visited and accredited by our Board representatives.',
                                btnLabel: 'Accreditation Status',
                                btnTo: '/login',
                                gradient: 'from-purple-500 to-pink-650 shadow-purple-500/20'
                            },
                            {
                                num: '4',
                                label: 'Join the Community',
                                desc: 'Get your PAHA badge and start enjoying exclusive member benefits.',
                                btnLabel: 'Connect With Us',
                                btnTo: '/contact',
                                gradient: 'from-rose-500 to-red-650 shadow-rose-500/20'
                            },
                        ].map(item => (
                            <div key={item.num} className="bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-150 dark:border-white/5 shadow-sm flex flex-col items-center text-center gap-5 hover:shadow-xl hover:border-primary/30 transition-all group">
                                <div className={`size-12 rounded-full flex items-center justify-center shadow-lg text-white font-extrabold text-sm bg-gradient-to-br ${item.gradient} transform group-hover:scale-110 transition-transform`}>
                                    <span>{item.num}</span>
                                </div>
                                <div className="space-y-1.5 flex-grow">
                                    <h3 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider leading-snug">{item.label}</h3>
                                    <p className="text-slate-500 dark:text-slate-450 text-[11px] leading-relaxed font-medium">{item.desc}</p>
                                </div>
                                {item.btnTo ? (
                                    <Link
                                        to={item.btnTo}
                                        className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-extrabold uppercase tracking-widest hover:bg-primary-dark transition-all text-center mt-4 shadow-sm"
                                    >
                                        {item.btnLabel}
                                    </Link>
                                ) : (
                                    <button
                                        onClick={() => setIsModalOpen(true)}
                                        className="w-full py-2.5 rounded-xl bg-primary text-white text-[10px] font-extrabold uppercase tracking-widest hover:bg-primary-dark transition-all text-center mt-4 shadow-sm"
                                    >
                                        {item.btnLabel}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TESTIMONIALS CAROUSEL ── */}
            <TestimonialsCarousel />

            {/* ── NOT A PAHA MEMBER YET? ── */}
            <section className="py-20 bg-slate-50 dark:bg-slate-950/20 border-t border-slate-150 dark:border-white/5">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Left: Text */}
                    <div className="space-y-6">
                        <p className="text-primary font-bold uppercase tracking-[0.2em] text-xs">Join Today</p>
                        <h2 className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white leading-tight tracking-tight">
                            Build your network. Connect with industry leaders.
                        </h2>
                        <div className="w-16 h-1 bg-primary rounded-full"></div>
                        <p className="text-slate-550 dark:text-slate-400 leading-relaxed text-sm font-medium">
                            Join PAHA and unlock exclusive discounts, priority access to top-tier seminars, free legal support, and a powerful network of companion animal veterinary professionals in the Philippines.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className="inline-flex justify-center items-center px-8 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all shadow-md hover:scale-105 active:scale-95 group gap-1.5"
                        >
                            Get Membership Access
                            <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-0.5">arrow_forward</span>
                        </button>
                    </div>

                    {/* Right: Image Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-3">
                            <div className="h-32 rounded-2xl overflow-hidden shadow-sm border border-slate-150 dark:border-white/5 group">
                                <img src="/assets/veterinary_practitioner.png" alt="Veterinary care" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                            <div className="h-44 rounded-2xl overflow-hidden shadow-sm border border-slate-150 dark:border-white/5 group">
                                <img src="/assets/dog_checkup.png" alt="Veterinary professionals" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                            <div className="h-32 rounded-2xl overflow-hidden shadow-sm border border-slate-150 dark:border-white/5 group">
                                <img src="/assets/cat_care.png" alt="Animal care" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                        </div>
                        <div className="space-y-3 pt-6">
                            <div className="h-44 rounded-2xl overflow-hidden shadow-sm border border-slate-150 dark:border-white/5 group">
                                <img src="/assets/laboratory_diagnostics.png" alt="Veterinary clinic" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                            <div className="h-32 rounded-2xl overflow-hidden shadow-sm border border-slate-150 dark:border-white/5 group">
                                <img src="/assets/pet_examination.png" alt="PAHA community" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                            <div className="h-44 rounded-2xl overflow-hidden shadow-sm border border-slate-150 dark:border-white/5 group">
                                <img src="/assets/veterinary_surgery.png" alt="Veterinary excellence" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── FOOTER REGISTER BANNER ── */}
            <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 py-16 text-center border-t border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:32px_32px] opacity-10"></div>
                <div className="max-w-3xl mx-auto relative z-10 space-y-6 px-4">
                    <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">Is your clinic not on the accredited list?</h2>
                    <p className="text-slate-400 text-sm font-semibold">Apply for PAHA membership and get your clinic accredited today.</p>
                    <Link
                        to="/membership/accreditation-requirements"
                        className="inline-flex justify-center items-center px-8 py-3.5 bg-white text-slate-900 hover:bg-slate-50 rounded-xl font-bold uppercase text-xs tracking-wider transition-all hover:scale-105 active:scale-95 shadow-md gap-1.5"
                    >
                        Get Accredited
                        <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                    </Link>
                </div>
            </section>

        </div>
    );
};

export default Membership;
