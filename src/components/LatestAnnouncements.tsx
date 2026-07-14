import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { getEventFallbackImage, getEventExcerpt } from '../utils/eventHelpers';

const LatestAnnouncements: React.FC = () => {
    const { events } = useAdmin();

    const pastEvents = events
        .filter(e => e.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const fallbackEvents = [
        {
            id: 'fallback-1',
            title: "Bones, Breaks, and Breakthroughs: Inside PAHA's Orthopedic Trauma Seminar",
            date: '2026-03-26T09:00:00Z',
            location: 'PAHA Center',
            category: 'SEMINAR',
            image: 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=800&auto=format&fit=crop',
            description: 'A comprehensive seminar focusing on the latest advancements, surgical procedures, and clinical techniques in small animal orthopedic trauma management.'
        },
        {
            id: 'fallback-2',
            title: 'Global Standards, Local Impact: WSAVA Continuing Education Comes to Manila',
            date: '2026-03-13T09:00:00Z',
            location: 'Diamond Hotel Manila',
            category: 'SEMINAR',
            image: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?q=80&w=800&auto=format&fit=crop',
            description: 'Bringing global standards to local veterinary clinics. Empowering Filipino veterinarians with the latest updates from the World Small Animal Veterinary Association.'
        },
        {
            id: 'fallback-3',
            title: 'One Shot at a Time – PAHA Joins the Fight for a Rabies-Free Philippines',
            date: '2026-03-12T09:00:00Z',
            location: 'Various Locations Nationwide',
            category: 'SEMINAR',
            image: 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?q=80&w=800&auto=format&fit=crop',
            description: 'PAHA volunteers and local veterinary partners launch vaccination campaigns across multiple barangays to eradicate rabies and promote public animal safety.'
        },
        {
            id: 'fallback-4',
            title: 'PAHA Video Presentation: Over Four Decades of Advocacy & Animal Care',
            date: '2026-03-01T09:00:00Z',
            location: 'PAHA Headquarters',
            category: 'PRESENTATION',
            image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=800&auto=format&fit=crop',
            description: 'A robust historical retrospective showcasing 48 years of veterinary dedication, companion animal hospital standards, and community healthcare milestones.'
        }
    ];

    const combinedEvents = [...pastEvents];
    fallbackEvents.forEach(fb => {
        if (!combinedEvents.some(e => e.title.toLowerCase() === fb.title.toLowerCase())) {
            combinedEvents.push({
                id: fb.id,
                title: fb.title,
                date: fb.date,
                location: fb.location,
                category: fb.category,
                image: fb.image,
                description: fb.description,
                status: 'completed',
                price: 0,
                capacity: 100,
                registeredCount: 100
            });
        }
    });

    // We display exactly 4 events total in the slider
    const displayEvents = combinedEvents.slice(0, 4);
    const [currentIndex, setCurrentIndex] = useState(0);

    // Dynamic responsive sizing hook
    const [viewport, setViewport] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 640) {
                setViewport('mobile');
            } else if (window.innerWidth < 1024) {
                setViewport('tablet');
            } else {
                setViewport('desktop');
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // maxIndex defines the maximum index we can translate to
    // Desktop: 0 (all 4 visible)
    // Tablet: 2 (indices 0 and 2)
    // Mobile: 3 (indices 0, 1, 2, 3)
    const maxIndex = viewport === 'desktop' ? 0 : viewport === 'tablet' ? 2 : 3;

    // Slide step:
    // Tablet: steps by 2
    // Mobile: steps by 1
    const slideStep = viewport === 'tablet' ? 2 : 1;

    const handleNext = () => {
        if (maxIndex === 0) return;
        setCurrentIndex(prev => {
            const next = prev + slideStep;
            return next > maxIndex ? 0 : next;
        });
    };

    const handlePrev = () => {
        if (maxIndex === 0) return;
        setCurrentIndex(prev => {
            const next = prev - slideStep;
            return next < 0 ? maxIndex : next;
        });
    };

    useEffect(() => {
        if (maxIndex === 0) {
            setCurrentIndex(0);
            return;
        }
        const interval = setInterval(() => {
            handleNext();
        }, 6000);
        return () => clearInterval(interval);
    }, [maxIndex]);

    return (
        <section id="articles" className="py-16 bg-slate-50/40 dark:bg-background-dark-black border-t border-slate-100 dark:border-white/5 overflow-hidden">
            <div className="max-w-7xl mx-auto px-6">
                {/* Section Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="h-1 w-10 bg-[#1e4b8a] rounded-full"></div>
                            <span className="text-[#1e4b8a] font-semibold text-xs uppercase tracking-widest">Stay Informed</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 dark:text-white leading-tight">
                            Latest Veterinary Updates
                        </h2>
                        <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-2 max-w-2xl font-medium">
                            Keep up with the latest seminars, webinars, community outreach programs, and orthopedic trauma workshops hosted by PAHA.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Slide Control Buttons */}
                        {maxIndex > 0 && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrev}
                                    className="size-10 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-metallic hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"
                                    aria-label="Previous events"
                                >
                                    <span className="material-symbols-outlined text-base">chevron_left</span>
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="size-10 rounded-full border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-600 dark:text-metallic hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm"
                                    aria-label="Next events"
                                >
                                    <span className="material-symbols-outlined text-base">chevron_right</span>
                                </button>
                            </div>
                        )}
                        <Link
                            to="/events"
                            className="group flex items-center gap-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:text-primary transition-colors uppercase tracking-wider bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 px-4 py-2 rounded-full shadow-sm"
                        >
                            View All
                            <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </Link>
                    </div>
                </div>

                {combinedEvents.length > 0 ? (
                    <div className="relative w-full overflow-hidden">
                        {/* Slider Track Wrapper */}
                        <div 
                            className="flex transition-transform duration-500 ease-in-out gap-6"
                            style={{ 
                                width: viewport === 'desktop' ? '100%' : viewport === 'tablet' ? '200%' : '400%',
                                transform: `translateX(-${currentIndex * 25}%)`
                            }}
                        >
                            {displayEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    to={`/events/${event.id}`}
                                    className="group bg-white dark:bg-slate-900 rounded-[24px] overflow-hidden border border-slate-200 dark:border-white/10 hover:border-primary/50 hover:shadow-xl transition-all duration-500 flex flex-col no-underline transform hover:-translate-y-1"
                                    style={{ width: viewport === 'desktop' ? `calc(25% - 18px)` : viewport === 'tablet' ? `calc(25% - 18px)` : `calc(25% - 18px)` }}
                                >
                                    {/* Image */}
                                    <div className="relative aspect-[4/3] w-full overflow-hidden flex-none bg-slate-100 dark:bg-slate-950">
                                        <img
                                            src={event.image && event.image.startsWith('http') ? event.image : getEventFallbackImage(event.title, event.category)}
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = getEventFallbackImage(event.title, event.category);
                                            }}
                                            alt={event.title}
                                            className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover:scale-105"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/20 to-black/10"></div>
                                        
                                        {/* Date badge */}
                                        <div className="absolute top-4 left-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center shadow-md px-3 py-1.5 z-10 border border-slate-150 dark:border-white/5">
                                            <span className="text-primary text-lg font-black leading-none">{new Date(event.date).getDate()}</span>
                                            <span className="text-slate-400 text-[8px] font-black uppercase tracking-tighter mt-0.5">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                        </div>

                                        {/* Category badge */}
                                        <div className="absolute top-4 right-4 z-10">
                                            <span className="px-2.5 py-1 rounded-lg bg-primary/95 backdrop-blur-md text-white text-[9px] font-black uppercase tracking-wider">
                                                {event.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 flex flex-col flex-1 gap-2">
                                        <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-snug group-hover:text-primary transition-colors line-clamp-2 min-h-[36px]">
                                            {event.title}
                                        </h3>
                                        <p className="text-[#565656] dark:text-slate-400 text-[11px] font-medium leading-relaxed line-clamp-3 min-h-[44px]">
                                            {getEventExcerpt(event.description, 15)}
                                        </p>
                                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-auto">
                                            <span className="material-symbols-outlined text-sm text-primary">location_on</span>
                                            <span className="truncate">{event.location}</span>
                                        </div>
                                        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-white/5 items-center justify-between">
                                            <span className="text-[9px] text-emerald-500 font-extrabold uppercase bg-emerald-500/10 px-2.5 py-0.5 rounded-[100px] border border-emerald-500/10 flex items-center gap-1">
                                                <span className="size-1 rounded-full bg-emerald-500 animate-pulse"></span>
                                                Concluded
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>

                        {/* Navigation dots */}
                        {maxIndex > 0 && (
                            <div className="flex items-center justify-center gap-2 mt-8">
                                {Array.from({ length: viewport === 'tablet' ? 2 : 4 }).map((_, i) => {
                                    const stepIndex = viewport === 'tablet' ? i * 2 : i;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => setCurrentIndex(stepIndex)}
                                            className={`rounded-full transition-all duration-300 ${
                                                stepIndex === currentIndex
                                                    ? 'bg-primary w-6 h-2'
                                                    : 'bg-gray-300 dark:bg-white/20 hover:bg-primary/50 w-2 h-2'
                                            }`}
                                        />
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm text-center py-10">No past events yet.</p>
                )}
            </div>
        </section>
    );
};

export default LatestAnnouncements;
