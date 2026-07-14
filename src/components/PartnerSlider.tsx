import React, { useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import type { PartnerCategory } from '../context/AdminContext';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Category styling helpers
const CATEGORY_STYLES: Record<PartnerCategory, { border: string; glow: string; badge: string; label: string }> = {
    Platinum: {
        border: '#7dd3fc,transparent_60deg,transparent_120deg,#38bdf8,transparent_180deg,transparent_240deg,#7dd3fc',
        glow: 'from-sky-400/20 to-blue-400/10',
        badge: 'bg-sky-400/10 text-sky-400 border-sky-400/40',
        label: '💎 Platinum',
    },
    Gold: {
        border: '#fbbf24,transparent_60deg,transparent_120deg,#f59e0b,transparent_180deg,transparent_240deg,#fbbf24',
        glow: 'from-yellow-400/20 to-amber-400/10',
        badge: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/40',
        label: '🥇 Gold',
    },
    Silver: {
        border: '#94a3b8,transparent_60deg,transparent_120deg,#64748b,transparent_180deg,transparent_240deg,#94a3b8',
        glow: 'from-slate-400/10 to-slate-300/5',
        badge: 'bg-slate-400/10 text-slate-400 border-slate-400/30',
        label: '🥈 Silver',
    },
};

const PartnerSlider: React.FC = () => {
    const { partners } = useAdmin();
    const sectionRef = useRef<HTMLElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const [activeFilter, setActiveFilter] = useState<PartnerCategory | 'All'>('All');

    useGSAP(() => {
        if (!sectionRef.current || !headerRef.current) return;

        gsap.from(headerRef.current.children, {
            y: 30,
            opacity: 0,
            duration: 1,
            stagger: 0.2,
            ease: "power3.out",
            scrollTrigger: {
                trigger: sectionRef.current,
                start: "top 80%",
            }
        });
    }, { scope: sectionRef });

    if (partners.length === 0) return null;

    const filteredPartners = activeFilter === 'All' 
        ? partners 
        : partners.filter(p => (p.category || 'Silver') === activeFilter);

    // Duplicate for seamless infinite loop to ensure it looks good even with few items
    const displayRepeats = Math.max(8, Math.ceil(15 / Math.max(1, filteredPartners.length)));
    const displayPartners = Array(displayRepeats).fill(filteredPartners).flat();

    // Reset animation when changing filters to prevent jank
    const animationKey = `slider-${activeFilter}-${filteredPartners.length}`;

    return (
        <section ref={sectionRef} className="py-6 md:py-8 relative overflow-hidden bg-white/50 dark:bg-black/40 backdrop-blur-3xl border-y border-slate-200/60 dark:border-white/5">
            {/* Background Decorative Blobs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] pointer-events-none"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

            {/* Section Header */}
            <div ref={headerRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12 text-center">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-primary/5 border border-primary/20 mb-6 font-display">
                    <span className="size-2 rounded-full bg-primary animate-pulse"></span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Global Partnership Network</span>
                </div>
                <h2 className="text-[32px] md:text-[45px] font-semibold tracking-tight text-slate-900 dark:text-white uppercase leading-none mb-6">
                    Our Industry <span className="text-primary">Partners</span>
                </h2>
                <div className="flex items-center justify-center gap-4 mb-6">
                    <div className="h-px w-12 bg-slate-200 dark:bg-white/10"></div>
                    <div className="w-3 h-3 rounded-full border-2 border-primary rotate-45"></div>
                    <div className="h-px w-12 bg-slate-200 dark:bg-white/10"></div>
                </div>
                {/* Category Filter Buttons */}
                <div className="flex items-center justify-center gap-3 md:gap-4 flex-wrap">
                    {([
                        { id: 'All', label: '🌐 All', badge: 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-400 dark:border-slate-500 shadow-sm' },
                        { id: 'Platinum', label: CATEGORY_STYLES['Platinum'].label, badge: 'bg-sky-50 dark:bg-sky-400/20 text-sky-600 dark:text-sky-300 border-sky-400 shadow-sky-400/20 shadow-md' },
                        { id: 'Gold', label: CATEGORY_STYLES['Gold'].label, badge: 'bg-yellow-50 dark:bg-yellow-400/20 text-yellow-700 dark:text-yellow-400 border-yellow-400 shadow-yellow-400/20 shadow-md' },
                        { id: 'Silver', label: CATEGORY_STYLES['Silver'].label, badge: 'bg-slate-100 dark:bg-slate-400/20 text-slate-600 dark:text-slate-300 border-slate-400 shadow-slate-400/20 shadow-md' }
                    ]).map(cat => {
                        const isActive = activeFilter === cat.id;
                        const count = cat.id === 'All' ? partners.length : partners.filter(p => (p.category || 'Silver') === cat.id).length;
                        return (
                            <button
                                key={cat.id}
                                onClick={() => setActiveFilter(cat.id as PartnerCategory | 'All')}
                                className={`inline-flex items-center gap-2 px-5 md:px-6 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-semibold uppercase tracking-widest border-2 transition-all duration-300 active:scale-95 ${isActive ? cat.badge : 'border-transparent bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-600 dark:hover:text-white'}`}
                            >
                                {cat.label}
                                <span className={`px-2 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-black/10 dark:bg-white/20' : 'bg-slate-200 dark:bg-white/10'}`}>{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Centered Slider with Edge Fade */}
            <div className="relative w-full py-4 md:py-8 flex justify-center">
                <div className="w-full max-w-[1600px] overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
                    <div 
                        key={animationKey} 
                        className="flex animate-scroll-ultra-fast hover:[animation-play-state:paused] w-max"
                        style={{ animationDuration: activeFilter === 'All' ? '90s' : '40s' }}
                    >
                        {displayPartners.length === 0 ? (
                            <div className="w-full text-center py-8 opacity-50 font-semibold tracking-wider uppercase text-sm">No partners in this category</div>
                        ) : displayPartners.map((partner, index) => {
                            const cat: PartnerCategory = partner.category || 'Silver';
                            const style = CATEGORY_STYLES[cat];
                            return (
                                <div
                                    key={`${partner.id}-${index}`}
                                    className="flex-shrink-0 mx-3 md:mx-4 group/logo"
                                >
                                    <div className="relative p-[2px] rounded-3xl overflow-hidden group/card transition-all duration-700 hover:scale-105 active:scale-95 shadow-lg bg-slate-200/30 dark:bg-white/5">
                                        {/* Category-colored Rotating Border */}
                                        <div
                                            className="absolute inset-[-200%] animate-rotate-border opacity-30 group-hover/card:opacity-100 transition-opacity duration-700"
                                            style={{ background: `conic-gradient(from 0deg, ${style.border})` }}
                                        ></div>

                                        <div className="relative h-20 md:h-28 w-40 md:w-56 bg-white/95 dark:bg-slate-900/90 backdrop-blur-3xl rounded-[1.4rem] flex flex-col items-center justify-center p-2 border border-transparent transition-all duration-700 overflow-hidden">
                                            {/* Category Badge — top left */}
                                            <span className={`absolute top-2 left-2 z-20 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-semibold uppercase tracking-widest border ${style.badge} opacity-0 group-hover/card:opacity-100 transition-opacity duration-500`}>
                                                {cat}
                                            </span>

                                            {/* Logo Image */}
                                            <a
                                                href={partner.websiteUrl || '#'}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={`block w-full h-full relative z-10 transition-all duration-700 group-hover/card:scale-110 flex items-center justify-center ${!partner.websiteUrl && 'pointer-events-none'}`}
                                            >
                                                <img
                                                    src={partner.imageUrl}
                                                    alt={partner.name}
                                                    className="w-full h-full object-contain filter drop-shadow-xl p-1"
                                                />
                                            </a>

                                            {/* Category Glow */}
                                            <div className={`absolute inset-0 bg-gradient-to-br ${style.glow} opacity-0 group-hover/card:opacity-100 transition-opacity duration-700`}></div>

                                            {/* Hover Shine */}
                                            <div className="absolute inset-0 opacity-0 group-hover/card:opacity-100 transition-opacity duration-1000">
                                                <div className="absolute top-0 -left-[100%] w-1/2 h-full bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-[35deg] animate-shine"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Partner name below card */}
                                    <p className="mt-2 text-center text-[9px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500">
                                        {partner.name}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scroll-ultra-fast {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(calc(-100% / 5)); }
                }
                .animate-scroll-ultra-fast {
                    animation: scroll-ultra-fast 30s linear infinite;
                }
                @keyframes rotate-border {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-rotate-border {
                    animation: rotate-border 3s linear infinite;
                }
                @keyframes shine {
                    0% { left: -100%; }
                    100% { left: 200%; }
                }
                .animate-shine {
                    animation: shine 1.5s infinite;
                }
            `}</style>
        </section>
    );
};

export default PartnerSlider;
