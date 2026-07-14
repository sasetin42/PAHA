import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

import { useAdmin } from '../context/AdminContext';
import EventRegistrationModal from '../components/EventRegistrationModal';

const EventDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { events } = useAdmin();
    const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
    const [selectedTierIndex, setSelectedTierIndex] = useState<number | null>(null);
    
    // Simulate auth check for member pricing
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const isMember = localStorage.getItem('userType') === 'clinic_member' || isLoggedIn;

    const event = events.find(e => e.id === id);

    if (!event) {
        return (
            <div className="min-h-screen bg-background-light dark:bg-background-dark-black font-display text-blue-950 dark:text-white flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-semibold mb-4">Event Not Found</h2>
                    <button onClick={() => navigate('/events')} className="text-primary hover:underline font-semibold uppercase tracking-widest text-xs">Return to Events</button>
                </div>
            </div>
        );
    }

    const isFull = (event.registeredCount || 0) >= (event.capacity || 0);

    const progress = Math.min(100, ((event.registeredCount || 0) / (event.capacity || 1)) * 100);
    const nonMemberPrice = event.nonMemberPrice ?? event.price!;
    const memberPrice = event.memberPrice ?? event.price! * 0.7;

    const tiers = (event.priceTiers && event.priceTiers.length > 0)
        ? event.priceTiers
        : [
            { label: 'Clinic Member Rate', price: memberPrice },
            { label: 'Public Regular', price: nonMemberPrice },
        ];
    const defaultTierIndex = isMember
        ? tiers.findIndex(t => /member/i.test(t.label) && !/non/i.test(t.label))
        : tiers.findIndex(t => /non.?member/i.test(t.label));
    const activeTierIndex = selectedTierIndex !== null ? selectedTierIndex : (defaultTierIndex >= 0 ? defaultTierIndex : 0);
    const activeTier = tiers[activeTierIndex] || tiers[0];

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-background-dark-black font-display text-slate-900 dark:text-white pb-24 selection:bg-primary/30">
            {/* Immersive Hero Section */}
            <section className="relative min-h-[85vh] flex flex-col justify-end overflow-hidden">
                {/* Background Layer (Blurred & Static) */}
                <div className="absolute inset-0 z-0">
                    {event.image ? (
                        <>
                            <img src={event.image} className="w-full h-full object-cover scale-105 blur-sm opacity-40 dark:opacity-20" alt="" />
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#F8FAFC]/80 to-[#F8FAFC] dark:via-background-dark-black/60 dark:to-background-dark-black"></div>
                        </>
                    ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5"></div>
                    )}
                </div>

                {/* Floating Breadcrumb */}
                <div className="absolute top-32 left-0 right-0 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <Link to="/events" className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 dark:bg-white/5 backdrop-blur-xl border border-white/30 dark:border-white/10 text-slate-700 dark:text-white/80 text-xs font-semibold uppercase tracking-widest hover:bg-primary hover:text-white transition-all group shadow-xl">
                            <span className="material-symbols-outlined text-[18px] group-hover:-translate-x-1 transition-transform">arrow_back</span>
                            Back to Events
                        </Link>
                    </div>
                </div>

                {/* Content Layer */}
                <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pb-16 md:pb-24">
                    <div className="max-w-4xl">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <span className="px-3 py-1 rounded-lg bg-primary text-white text-[10px] font-semibold uppercase tracking-[0.2em] shadow-lg shadow-primary/20">
                                {event.category}
                            </span>
                            <span className={`px-3 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-[0.2em] border shadow-sm ${
                                event.status === 'upcoming' 
                                ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                                : 'bg-red-500/10 text-red-600 border-red-500/20'
                            }`}>
                                {event.status}
                            </span>
                        </div>
                        
                        <h1 className="text-[50px] font-semibold text-blue-950 dark:text-white mb-8 tracking-tight leading-[1.1] drop-shadow-sm">
                            {event.title}
                        </h1>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex items-center gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/40 dark:border-white/5 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-silver/40 tracking-widest">Date</p>
                                    <p className="text-sm font-semibold text-blue-950 dark:text-white">{new Date(event.date).toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/40 dark:border-white/10 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                                    <span className="material-symbols-outlined text-[20px]">schedule</span>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-silver/40 tracking-widest">Starts At</p>
                                    <p className="text-sm font-semibold text-blue-950 dark:text-white">{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                            </div>
                            <div className="sm:col-span-2 flex items-center gap-4 bg-white/40 dark:bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/40 dark:border-white/10 shadow-sm">
                                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                                    <span className="material-symbols-outlined text-[20px]">pin_drop</span>
                                </div>
                                <div className="flex-1 truncate">
                                    <p className="text-[10px] uppercase font-semibold text-slate-500 dark:text-silver/40 tracking-widest">Venue</p>
                                    <p className="text-sm font-semibold text-blue-950 dark:text-white truncate">{event.location}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-12 relative z-20">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12">
                    {/* Left Column: Extensive Content */}
                    <div className="lg:col-span-2 space-y-12 min-w-0">
                        {/* Event Content Card */}
                        <div className="bg-white dark:bg-charcoal rounded-[2.5rem] p-8 md:p-12 border border-slate-200 dark:border-silver/5 shadow-2xl relative overflow-hidden group">
                            {/* Decorative Accent */}
                            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-bl-full pointer-events-none group-hover:scale-110 transition-transform duration-1000"></div>
                            
                            <div className="relative z-10">
                                <h2 className="text-3xl font-semibold text-blue-950 dark:text-white mb-10 flex items-center gap-4">
                                    <span className="w-2.5 h-10 bg-gradient-to-b from-primary to-blue-400 rounded-full shadow-[0_4px_15_rgba(30,96,163,0.3)]"></span>
                                    Event Overview
                                </h2>

                                {/* Dynamic Secondary Image */}
                                {event.image && (
                                    <div className="mb-12 relative group/img cursor-zoom-in">
                                        <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-transparent to-blue-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover/img:opacity-100 transition-opacity duration-1000"></div>
                                        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white dark:border-white/5 aspect-video">
                                            <img 
                                                src={event.image} 
                                                className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover/img:scale-105" 
                                                alt={event.title} 
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="relative">
                                    <div className="absolute -left-6 top-0 bottom-0 w-[2px] bg-gradient-to-b from-primary/30 via-primary/5 to-transparent hidden md:block"></div>
                                    <div 
                                        className="prose prose-lg dark:prose-invert max-w-none w-full break-words whitespace-normal overflow-hidden 
                                                   prose-p:text-slate-600 dark:prose-p:text-silver/70 prose-p:leading-relaxed prose-p:mb-6
                                                   prose-headings:text-blue-950 dark:prose-headings:text-white prose-headings:font-semibold
                                                   prose-strong:text-primary dark:prose-strong:text-blue-400
                                                   prose-ul:list-disc prose-ul:pl-6 prose-li:mb-2
                                                   text-base md:text-lg font-medium selection:bg-primary/20"
                                        dangerouslySetInnerHTML={{ __html: event.description || '' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Interactive Agenda Section */}
                        {event.agenda && event.agenda.length > 0 && (
                            <section className="bg-white/50 dark:bg-charcoal/50 backdrop-blur-xl rounded-[2.5rem] p-8 md:p-12 border border-slate-200 dark:border-white/10 shadow-xl">
                                <h2 className="text-3xl font-semibold text-blue-950 dark:text-white mb-12 flex items-center gap-4">
                                    <span className="w-2.5 h-10 bg-blue-500 rounded-full"></span>
                                    Schedule & Activity
                                </h2>
                                <div className="space-y-12 relative">
                                    {/* Timeline Connector Line */}
                                    <div className="absolute left-[39px] top-6 bottom-6 w-0.5 bg-gradient-to-b from-primary via-slate-200 dark:via-white/10 to-transparent"></div>

                                    {event.agenda.map((item: any, idx: number) => {
                                        const isBreak = item.activity.toLowerCase().includes('break') || item.activity.toLowerCase().includes('lunch');
                                        return (
                                            <div key={idx} className="flex gap-10 group relative pl-0 transition-all duration-300">
                                                {/* Timeline Marker */}
                                                <div className={`relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border transition-transform group-hover:scale-110 ${
                                                    isBreak 
                                                    ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20 text-amber-500' 
                                                    : 'bg-white dark:bg-charcoal border-slate-100 dark:border-white/5 text-primary'
                                                }`}>
                                                    <span className="material-symbols-outlined text-[28px]">
                                                        {isBreak ? 'restaurant' : 'clinical_notes'}
                                                    </span>
                                                </div>

                                                <div className="flex-1 pb-8 border-b border-slate-100 dark:border-white/5 group-last:border-0 group-last:pb-0">
                                                    <p className="text-primary font-semibold uppercase tracking-widest text-[11px] mb-2">{item.time}</p>
                                                    <h4 className="text-xl font-semibold text-blue-950 dark:text-white mb-3 group-hover:text-primary transition-colors">{item.activity}</h4>
                                                    {item.description && (
                                                        <p className="text-slate-500 dark:text-silver/50 text-sm leading-relaxed">{item.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </section>
                        )}

                        {/* Speaker Profiles */}
                        {event.speakers && event.speakers.length > 0 && (
                            <section>
                                <h2 className="text-3xl font-semibold text-blue-950 dark:text-white mb-10 flex items-center gap-4">
                                    <span className="w-2.5 h-10 bg-purple-500 rounded-full"></span>
                                    Expert Panelists
                                </h2>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    {event.speakers.map((speaker: any, idx: number) => (
                                        <div key={idx} className="bg-white dark:bg-charcoal rounded-3xl p-8 border border-slate-200 dark:border-silver/10 shadow-lg hover:border-primary/40 transition-all group/card">
                                            <div className="flex items-center gap-6 mb-6">
                                                <div className="relative">
                                                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full scale-0 group-hover/card:scale-110 transition-transform duration-500"></div>
                                                    <img src={speaker.image} className="relative z-10 w-24 h-24 rounded-full object-cover border-4 border-white dark:border-white/5 shadow-xl transition-all group-hover/card:rotate-6" alt={speaker.name} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-semibold text-blue-950 dark:text-white mb-1">{speaker.name}</h3>
                                                    <span className="inline-block px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-widest">{speaker.role}</span>
                                                </div>
                                            </div>
                                            <p className="text-slate-500 dark:text-silver/60 text-sm leading-relaxed line-clamp-3">{speaker.bio}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    {/* Right Column: High-Conversion Widget */}
                    <aside className="lg:col-span-1">
                        <div className="sticky top-[140px] space-y-8">
                            <div className="bg-white/80 dark:bg-charcoal/90 backdrop-blur-2xl rounded-[2.5rem] p-10 border border-white dark:border-white/10 shadow-2xl relative overflow-hidden group">
                                {/* Trust Glow */}
                                <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 blur-[60px] group-hover:scale-125 transition-transform duration-1000"></div>
                                
                                <div className="relative z-10">
                                    <h3 className="text-blue-950 dark:text-white text-2xl font-semibold mb-8 leading-tight">Secure Your Attendance</h3>
                                    
                                    {/* Advanced Pricing Display */}
                                    <div className="space-y-4 mb-10">
                                        {tiers.map((tier, idx) => {
                                            const isActive = idx === activeTierIndex;
                                            const isMemberTier = /member/i.test(tier.label) && !/non/i.test(tier.label);
                                            return (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => setSelectedTierIndex(idx)}
                                                    className={`w-full text-left p-6 rounded-3xl border transition-all duration-500 relative overflow-hidden ${isActive ? 'bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border-primary shadow-lg ring-4 ring-primary/5' : 'bg-slate-50 dark:bg-black/20 border-slate-100 dark:border-white/5 opacity-80 hover:opacity-100'}`}
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className={`text-[10px] font-semibold uppercase tracking-widest mb-2 flex items-center gap-1.5 ${isActive ? 'text-primary' : 'text-slate-400'}`}>
                                                                {isMemberTier && <span className="material-symbols-outlined text-[16px]">verified</span>}
                                                                {tier.label}
                                                            </p>
                                                            <p className="text-4xl font-semibold dark:text-white tracking-tight">₱{tier.price.toLocaleString()}</p>
                                                        </div>
                                                        {isActive && (
                                                            <span className="bg-primary text-white text-[9px] font-semibold px-3 py-1.5 rounded-full shadow-lg">SELECTED</span>
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                        {!isMember && (
                                            <div className="p-6 rounded-3xl border-transparent">
                                                <Link to="/membership/application" className="w-full inline-flex items-center justify-center gap-2 p-3 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-widest transition-all">
                                                    Save by Joining PAHA Today
                                                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                                                </Link>
                                            </div>
                                        )}
                                    </div>

                                    {/* High Fidelity Progress */}
                                    <div className="mb-10 p-6 bg-slate-50 dark:bg-black/20 rounded-3xl border border-slate-100 dark:border-white/5">
                                        <div className="flex justify-between items-end mb-4">
                                            <div>
                                                <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-silver/40 mb-1">Live Availability</p>
                                                {isFull && (
                                                    <p className="text-sm font-semibold text-red-500">Event Fully Booked</p>
                                                )}
                                            </div>
                                            <span className="text-xs font-semibold text-slate-500">{event.registeredCount} Registered</span>
                                        </div>
                                        <div className="h-3 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                                            <div 
                                                className={`h-full rounded-full transition-all duration-1000 relative ${isFull ? 'bg-red-500' : 'bg-gradient-to-r from-primary to-blue-500'}`}
                                                style={{ width: `${progress}%` }}
                                            >
                                                <div className="absolute inset-0 bg-white/20 animate-shimmer scale-y-150"></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Integrated Feature Pack */}
                                    <div className="grid grid-cols-1 gap-5 mb-10">
                                        {[
                                            { icon: 'military_tech', title: 'CPD Accreditation', desc: 'Valid PRC Credits' },
                                            { icon: 'coffee', title: 'Full Catering', desc: 'Gourmet Meals Included' },
                                            { icon: 'description', title: 'Digital Handouts', desc: 'Post-event Resources' }
                                        ].map((f, i) => (
                                            <div key={i} className="flex gap-4 group/item">
                                                <div className="w-10 h-10 rounded-xl bg-primary/5 dark:bg-primary/20 flex items-center justify-center text-primary group-hover/item:bg-primary group-hover/item:text-white transition-all duration-300">
                                                    <span className="material-symbols-outlined text-[20px]">{f.icon}</span>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-blue-950 dark:text-white">{f.title}</p>
                                                    <p className="text-[11px] text-slate-500 dark:text-silver/50 tracking-wide">{f.desc}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Primary CTA */}
                                    {event.registrationLink && !isFull && event.status === 'upcoming' ? (
                                        <a
                                            href={event.registrationLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full relative group/btn py-6 px-8 rounded-2xl overflow-hidden shadow-2xl transition-all active:scale-95 flex"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#1A365D] via-[#1E60A3] to-[#00A1E0] group-hover/btn:scale-110 transition-transform duration-500"></div>
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                            <span className="relative z-10 flex items-center justify-center gap-3 text-white text-base font-semibold tracking-widest uppercase w-full">
                                                <span className="material-symbols-outlined">payments</span>Reserve Slot Now
                                            </span>
                                        </a>
                                    ) : (
                                        <button
                                            onClick={() => setIsRegistrationOpen(true)}
                                            disabled={isFull || event.status !== 'upcoming'}
                                            className="w-full relative group/btn py-6 px-8 rounded-2xl overflow-hidden shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                                        >
                                            <div className="absolute inset-0 bg-gradient-to-r from-[#1A365D] via-[#1E60A3] to-[#00A1E0] group-hover/btn:scale-110 transition-transform duration-500"></div>
                                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                                            <span className="relative z-10 flex items-center justify-center gap-3 text-white text-base font-semibold tracking-widest uppercase">
                                                {isFull ? (
                                                    <><span className="material-symbols-outlined">block</span>Sold Out</>
                                                ) : (
                                                    <><span className="material-symbols-outlined">payments</span>Reserve Slot Now</>
                                                )}
                                            </span>
                                        </button>
                                    )}

                                    {/* Trust Badges */}
                                    <div className="mt-8 flex flex-col items-center gap-4">
                                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-400">Guaranteed Secure Checkout</p>
                                        <div className="flex flex-wrap justify-center gap-4 opacity-50 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500">
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e6/GCash_logo.svg" className="h-4" alt="GCash" />
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" alt="Visa" />
                                            <img src="https://upload.wikimedia.org/wikipedia/commons/a/a4/Mastercard_2019_logo.svg" className="h-5" alt="Mastercard" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            <EventRegistrationModal
                isOpen={isRegistrationOpen}
                onClose={() => setIsRegistrationOpen(false)}
                event={event}
                ticketLabel={activeTier.label}
                ticketPrice={activeTier.price}
            />
        </div>
    );
};

export default EventDetail;
