import React, { useEffect, useRef, useState } from 'react';
import { useAdmin } from '../context/AdminContext';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { sortEventsByDate } from '../utils/dateUtils';
import { getEventFallbackImage } from '../utils/eventHelpers';

const UpcomingEvents: React.FC = () => {
    const { events } = useAdmin();
    const sliderRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Get 3 latest upcoming events
    const latestEvents = sortEventsByDate(
        events.filter(e => e.status === 'upcoming' || e.status === 'ongoing')
    ).slice(0, 3);

    useEffect(() => {
        if (!sliderRef.current || latestEvents.length === 0) return;

        const slides = sliderRef.current.querySelectorAll('.event-slide');
        gsap.set(slides, { opacity: 0, x: 50, display: 'none' });
        gsap.set(slides[currentIndex], { opacity: 1, x: 0, display: 'block' });
    }, [latestEvents.length]); // Only reset on length change

    const goToSlide = (index: number) => {
        if (isAnimating || index === currentIndex || latestEvents.length === 0) return;

        setIsAnimating(true);
        const slides = sliderRef.current?.querySelectorAll('.event-slide');
        if (!slides) return;

        const outgoingSlide = slides[currentIndex];
        const incomingSlide = slides[index];
        const direction = index > currentIndex ? 1 : -1;

        const tl = gsap.timeline({
            onComplete: () => {
                setCurrentIndex(index);
                setIsAnimating(false);
            }
        });

        tl.to(outgoingSlide, {
            opacity: 0,
            x: -50 * direction,
            duration: 0.5,
            ease: 'power2.inOut',
            onComplete: () => {
                gsap.set(outgoingSlide, { display: 'none' });
            }
        })
        .set(incomingSlide, { display: 'block', x: 50 * direction, opacity: 0 })
        .to(incomingSlide, {
            opacity: 1,
            x: 0,
            duration: 0.6,
            ease: 'power3.out'
        });
    };

    const nextSlide = () => {
        const nextIndex = (currentIndex + 1) % latestEvents.length;
        goToSlide(nextIndex);
    };

    const prevSlide = () => {
        const prevIndex = (currentIndex - 1 + latestEvents.length) % latestEvents.length;
        goToSlide(prevIndex);
    };

    if (latestEvents.length === 0) return null;

    return (
        <section className="py-24 bg-white dark:bg-charcoal/30 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3">
                            <div className="h-1 w-12 bg-primary rounded-full"></div>
                            <span className="text-primary font-semibold text-xs uppercase tracking-[0.2em]">Not a PAHA Member Yet?</span>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-semibold text-gray-900 dark:text-white leading-tight">
                            Build your network. <br className="hidden md:block" />
                            Connect with industry leaders. <br className="hidden md:block" />
                            Grow your practice.
                        </h2>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <Link
                            to="/events"
                            className="group flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-primary transition-colors pr-4 border-r border-gray-200 dark:border-white/10"
                        >
                            View All
                            <span className="material-symbols-outlined text-lg transition-transform group-hover:translate-x-1">arrow_forward</span>
                        </Link>
                        
                        {/* Navigation Arrows */}
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={prevSlide}
                                className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-90"
                                disabled={isAnimating || latestEvents.length <= 1}
                            >
                                <span className="material-symbols-outlined">chevron_left</span>
                            </button>
                            <button 
                                onClick={nextSlide}
                                className="w-10 h-10 rounded-full border border-gray-200 dark:border-white/10 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white hover:border-primary transition-all active:scale-90"
                                disabled={isAnimating || latestEvents.length <= 1}
                            >
                                <span className="material-symbols-outlined">chevron_right</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Slider Container */}
                <div ref={sliderRef} className="relative min-h-[500px] lg:min-h-[450px]">
                    {latestEvents.map((event) => (
                        <div
                            key={event.id}
                            className="event-slide absolute inset-0 w-full h-full"
                        >
                            <div className="bg-white dark:bg-charcoal rounded-[2rem] border border-gray-100 dark:border-white/5 shadow-2xl shadow-primary/5 overflow-hidden group/card h-full">
                                <div className="grid grid-cols-1 lg:grid-cols-5 h-full">
                                    {/* Image Column */}
                                    <div className="lg:col-span-2 relative overflow-hidden h-64 lg:h-auto">
                                        <img 
                                            src={event.image && event.image.startsWith('http') ? event.image : getEventFallbackImage(event.title, event.category)} 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = getEventFallbackImage(event.title, event.category);
                                            }}
                                            alt={event.title} 
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" 
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-black/20 to-transparent"></div>
                                        
                                        {/* Category Badge */}
                                        <div className="absolute top-6 left-6">
                                            <span className="px-4 py-2 bg-white/10 backdrop-blur-md border border-white/20 text-white rounded-full text-[10px] font-semibold uppercase tracking-widest">
                                                {event.category}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Column */}
                                    <div className="lg:col-span-3 p-8 md:p-12 lg:p-16 flex flex-col justify-center bg-gray-50/50 dark:bg-transparent">
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl">
                                                <span className="text-2xl font-semibold text-primary leading-none">
                                                    {event.date.match(/\d+/)?.[0] || '??'}
                                                </span>
                                                <span className="text-[10px] font-semibold text-primary/60 uppercase">
                                                    {event.date.split(' ')[0]?.substring(0, 3) || 'TBA'}
                                                </span>
                                            </div>
                                            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                                <div className="flex items-center gap-1.5 mb-1">
                                                    <span className="material-symbols-outlined text-base">location_on</span>
                                                    {event.location}
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="material-symbols-outlined text-base">calendar_today</span>
                                                    {event.date}
                                                </div>
                                            </div>
                                        </div>

                                        <h3 className="text-3xl md:text-4xl font-semibold text-gray-900 dark:text-white mb-6 leading-tight group-hover/card:text-primary transition-colors">
                                            {event.title}
                                        </h3>
                                        
                                        <p className="text-gray-600 dark:text-gray-300 mb-10 leading-relaxed line-clamp-3 text-lg">
                                            {event.description}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-4">
                                            <Link 
                                                to={`/events/${event.id}`} 
                                                className="px-8 py-4 bg-primary text-white font-semibold rounded-2xl text-xs uppercase tracking-widest transition-all shadow-xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:scale-95 flex items-center gap-2"
                                            >
                                                Details & Registration
                                                <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                            </Link>
                                            <Link 
                                                to={`/events/${event.id}`} 
                                                className="px-8 py-4 bg-white dark:bg-white/5 text-gray-900 dark:text-white font-semibold rounded-2xl text-xs uppercase tracking-widest transition-all border border-gray-200 dark:border-white/10 hover:border-primary/50 flex items-center gap-2"
                                            >
                                                Learn More
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination Indicators */}
                {latestEvents.length > 1 && (
                    <div className="flex justify-center gap-3 mt-12">
                        {latestEvents.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => goToSlide(index)}
                                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    index === currentIndex 
                                    ? 'bg-primary w-10' 
                                    : 'bg-gray-200 dark:bg-white/10 hover:bg-gray-400'
                                }`}
                                aria-label={`Go to slide ${index + 1}`}
                            />
                        ))}
                    </div>
                )}
            </div>
        </section>
    );
};

export default UpcomingEvents;
