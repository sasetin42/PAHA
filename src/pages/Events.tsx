import React from 'react';
import { Link } from 'react-router-dom';
import { useAdmin } from '../context/AdminContext';
import { getEventFallbackImage, getEventExcerpt } from '../utils/eventHelpers';

const Events: React.FC = () => {
    const { pages, events } = useAdmin();
    const eventsPage = pages['events'];
    const heroSection = eventsPage?.sections.find(s => s.id === 'hero');
    const workshopsSection = eventsPage?.sections.find(s => s.id === 'workshops');
    const archiveSection = eventsPage?.sections.find(s => s.id === 'archive');


    const [selectedWorkshop, setSelectedWorkshop] = React.useState(0);
    const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
    const [selectedStatus, setSelectedStatus] = React.useState<string>('All');
    const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
    const [_currentHeroIndex, setCurrentHeroIndex] = React.useState(0);
    const [searchTerm, setSearchTerm] = React.useState("");

    // Derive unique categories from all events
    const eventCategories = React.useMemo(() => {
        const cats = events.map(e => e.category).filter(Boolean);
        return ['All', ...Array.from(new Set(cats))];
    }, [events]);

    const statuses = ['All', 'upcoming', 'ongoing'];

    // Filter for Slider (Independent of filters)
    const sliderEvents = events
        .filter(e => ['upcoming', 'ongoing'].includes(e.status?.toLowerCase()))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 5);

    // Filter Dynamic Events (Affected by filters)
    const filteredEventsList = events
        .filter(e => {
            if (selectedStatus === 'All') {
                return ['upcoming', 'ongoing'].includes(e.status?.toLowerCase());
            }
            return e.status?.toLowerCase() === selectedStatus.toLowerCase();
        })
        .filter(e => selectedCategory === 'All' || e.category === selectedCategory)
        .filter(e => {
            const queryTerms = searchTerm.trim().toLowerCase().split(/\s+/).filter(Boolean);
            return queryTerms.length === 0 || queryTerms.every(term => 
                e.title.toLowerCase().includes(term) || 
                e.location.toLowerCase().includes(term) ||
                e.category.toLowerCase().includes(term)
            );
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
        .slice(0, 12);

    // Filter for Archive
    const pastHighlightsList = events
        .filter(e => e.status === 'completed')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 6);

    const workshopEvents = events
        .filter(e => e.category.toLowerCase().includes('workshop') && e.status === 'upcoming')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const displayWorkshops = workshopEvents.length > 0 ? workshopEvents : [];

    // Slider effect
    React.useEffect(() => {
        if (sliderEvents.length <= 1) return;
        const interval = setInterval(() => {
            setCurrentHeroIndex(prev => (prev + 1) % sliderEvents.length);
        }, 5000);
        return () => clearInterval(interval);
    }, [sliderEvents.length]);

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-black font-display text-slate-900 selection:bg-primary/30 pb-24">

            {/* ── HERO SECTION ── */}
            <div className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10" style={heroSection?.isVisible === false ? { display: 'none' } : {}}>
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/5733420/pexels-photo-5733420.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Events Background"
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
                            
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                                Build relationships, exchange ideas, and grow together in a community committed to companion animal health and welfare.
                            </p>
                        </div>

                        {/* Right Side: Detailed Features Grid */}
                        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">event</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">
                                        {events.filter(e => ['upcoming', 'ongoing'].includes(e.status?.toLowerCase())).length} Active
                                    </h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Upcoming Seminars</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">history</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-2xl text-white tracking-tight">
                                        {events.filter(e => e.status?.toLowerCase() === 'completed').length} Held
                                    </h4>
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
                                    <span className="material-symbols-outlined text-[20px] font-bold">medical_services</span>
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

            <main className="max-w-7xl mx-auto pb-24 pt-12 px-4 sm:px-6 lg:px-8">

                <div className="space-y-20">


                    {/* Upcoming Events Grid Section */}
                    <section id="upcoming-events" className="scroll-mt-32">
                        <div className="flex flex-col xl:flex-row xl:items-end justify-between mb-8 md:mb-12 gap-6 p-4 sm:p-6 md:p-8 rounded-[1.5rem] md:rounded-[2.5rem] bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white dark:border-white/5 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                            
                            <div className="relative z-10 space-y-4">
                                <div>
                                    <h2 className="text-3xl font-semibold text-slate-900 dark:text-white tracking-tight uppercase">Operational Intelligence</h2>
                                    <p className="text-slate-500 dark:text-silver/40 text-[10px] font-semibold uppercase tracking-[0.3em]">Querying Active & Incoming Veterinary Missions</p>
                                </div>
                                <div className="relative group max-w-md">
                                    <div className="absolute inset-0 bg-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
                                    <div className="relative flex items-center bg-white dark:bg-black/40 border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden focus-within:border-primary/50 transition-all shadow-inner">
                                        <label htmlFor="events-search" className="sr-only">Search events</label>
                                        <span className="material-symbols-outlined pl-5 text-slate-400 group-focus-within:text-primary transition-colors">search</span>
                                        <input 
                                            id="events-search"
                                            name="events-search"
                                            type="text" 
                                            placeholder="SCAN DATABASE FOR MISSIONS..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full bg-transparent border-none py-4 px-4 text-[10px] font-semibold uppercase tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/20 focus:ring-0"
                                        />
                                        <div className="pr-4 flex items-center gap-1.5 opacity-40">
                                             <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></div>
                                             <span className="text-[10px] font-semibold uppercase text-primary">Live</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="relative z-10 flex flex-wrap items-center gap-6">
                                {/* Filters Toolbar */}
                                <div className="space-y-2">
                                    <p className="text-[8px] font-semibold text-slate-400 dark:text-white/20 uppercase tracking-[0.4em] ml-1">Status Filter</p>
                                    <div className="flex bg-slate-900 dark:bg-white/[0.05] p-1.5 rounded-2xl shadow-xl shadow-black/10 border border-white/5">
                                        {statuses.map(status => (
                                            <button
                                                key={status}
                                                onClick={() => setSelectedStatus(status)}
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${
                                                    selectedStatus === status
                                                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                                        : 'text-slate-400 dark:text-white/30 hover:text-white hover:bg-white/5'
                                                }`}
                                            >
                                                {status === 'upcoming' ? 'Incoming' : status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-[8px] font-semibold text-slate-400 dark:text-white/20 uppercase tracking-[0.4em] ml-1">Sector Class</p>
                                    <div className="relative">
                                        <button
                                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                            className="h-[52px] px-6 bg-slate-900 dark:bg-white/[0.05] border border-white/5 rounded-2xl text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-white/70 hover:text-white transition-all shadow-xl flex items-center gap-4 group"
                                        >
                                            <span className="material-symbols-outlined text-lg text-primary">category</span>
                                            {selectedCategory === 'All' ? 'Global Sectors' : selectedCategory}
                                            <span className={`material-symbols-outlined transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
                                        </button>
                                        {isDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                                                <div className="absolute right-0 top-full mt-4 w-64 bg-slate-900 dark:bg-charcoal border border-white/10 rounded-[2rem] shadow-2xl z-50 overflow-hidden p-2 backdrop-blur-2xl ring-1 ring-white/5">
                                                    {eventCategories.map(cat => (
                                                        <button
                                                            key={cat}
                                                            onClick={() => { setSelectedCategory(cat); setIsDropdownOpen(false); }}
                                                            className={`w-full text-left px-5 py-4 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all ${
                                                                selectedCategory === cat 
                                                                ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                                                : 'text-slate-400 dark:text-white/40 hover:bg-white/5 hover:text-white'
                                                            }`}
                                                        >
                                                            {cat === 'All' ? 'Global Access' : cat}
                                                        </button>
                                                    ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Events Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {filteredEventsList.length > 0 ? (
                                filteredEventsList.map((event: any) => (
                                    <div key={event.id} className="group bg-white dark:bg-charcoal border border-slate-200 dark:border-silver/10 rounded-[2rem] p-4 flex flex-col gap-4 hover:border-primary/40 transition-all shadow-xl hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden">
                                        {/* Image/Date Header */}
                                        <div className="relative h-48 rounded-[1.5rem] overflow-hidden bg-slate-50 dark:bg-background-dark-black border border-slate-100 dark:border-white/5 shadow-inner">
                                            <img 
                                                src={event.image || getEventFallbackImage(event.title, event.category)} 
                                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                                alt={event.title} 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                                            
                                            {/* Floating Date Badge */}
                                            <div className="absolute top-4 left-4 bg-white/95 dark:bg-charcoal/95 backdrop-blur-md size-16 rounded-2xl flex flex-col items-center justify-center shadow-2xl border border-white/20">
                                                <span className="text-primary text-2xl font-semibold leading-none">{new Date(event.date).getDate()}</span>
                                                <span className="text-slate-500 dark:text-silver/60 text-[10px] font-semibold uppercase tracking-widest">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                            </div>
 
                                            {/* Price Tag */}
                                            <div className="absolute bottom-4 right-4 bg-primary text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-lg">
                                                {event.price === 0 ? 'FREE' : `₱${event.price.toLocaleString()}`}
                                            </div>
                                        </div>
 
                                        {/* Content */}
                                        <div className="flex-1 flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="px-2.5 py-0.5 rounded-lg text-[9px] font-semibold uppercase tracking-widest bg-primary/10 text-primary border border-primary/10">{event.category}</span>
                                            </div>
                                            <h4 className="text-base font-semibold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors line-clamp-2 min-h-[32px]">
                                                {event.title}
                                            </h4>
                                            
                                            <p className="text-[#565656] dark:text-silver/70 text-xs leading-relaxed line-clamp-3 min-h-[48px]">
                                                {getEventExcerpt(event.description, 15)}
                                            </p>
                                            
                                            <div className="space-y-3 mt-auto pt-2 border-t border-slate-100 dark:border-white/5">
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-silver/60">
                                                    <span className="material-symbols-outlined text-[16px] text-primary/70">location_on</span>
                                                    <span className="truncate">{event.location}</span>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-silver/60">
                                                    <span className="material-symbols-outlined text-[16px] text-primary/70">schedule</span>
                                                    <span>{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <div className="flex items-center justify-between pt-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="flex -space-x-2">
                                                            {[1,2,3].map(i => (
                                                                <div key={i} className="size-6 rounded-full border-2 border-white dark:border-charcoal bg-slate-200 dark:bg-silver/10 flex items-center justify-center">
                                                                    <span className="material-symbols-outlined text-[10px] text-slate-400">person</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-silver/40">{event.registeredCount} going</span>
                                                    </div>
                                                    {event.capacity > 0 && (
                                                        <span className={`text-[10px] font-semibold uppercase tracking-widest ${event.capacity - event.registeredCount <= 5 ? 'text-orange-500 animate-pulse' : 'text-green-500'}`}>
                                                            {Math.max(0, event.capacity - event.registeredCount)} Spots
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Action */}
                                        <Link 
                                            to={`/events/${event.id}`}
                                            className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 hover:bg-primary text-slate-900 dark:text-white hover:text-white py-4 rounded-2xl text-[11px] font-semibold uppercase tracking-widest transition-all active:scale-95 group/btn"
                                        >
                                            View Full Details <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                        </Link>
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-white/5 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-white/5">
                                    <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-white/5 mb-4">calendar_today</span>
                                    <p className="text-slate-400 dark:text-silver/40 font-semibold uppercase tracking-widest">No events found matching your criteria</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Archive Section */}
                    {archiveSection?.isVisible !== false && (
                        <section className="bg-slate-50 dark:bg-white/[0.02] rounded-[1.5rem] md:rounded-[3rem] p-5 sm:p-8 md:p-16">
                            <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 md:mb-12 gap-4 md:gap-6">
                                <div>
                                    <h2 className="text-3xl font-semibold text-blue-950 dark:text-white tracking-tight mb-2">{archiveSection?.content?.heading || 'Past Highlights'}</h2>
                                    <p className="text-blue-900/60 dark:text-silver/50 text-sm">A look back at our successfully concluded veterinary seminars and events.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {pastHighlightsList.map(event => (
                                    <Link
                                        key={event.id}
                                        to={`/events/${event.id}`}
                                        className="bg-white dark:bg-charcoal border border-slate-200 dark:border-silver/10 rounded-3xl overflow-hidden flex flex-col hover:shadow-2xl hover:border-primary/30 transition-all group cursor-pointer no-underline"
                                    >
                                        {/* Featured Image */}
                                        <div className="relative h-44 overflow-hidden bg-slate-100 dark:bg-background-dark-black flex-none">
                                            <img 
                                                src={event.image || getEventFallbackImage(event.title, event.category)} 
                                                alt={event.title} 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                                            {/* Date badge */}
                                            <div className="absolute top-3 left-3 bg-white/95 dark:bg-charcoal/95 backdrop-blur-md size-14 rounded-2xl flex flex-col items-center justify-center shadow-lg border border-white/20">
                                                <span className="text-primary text-lg font-semibold leading-none">{new Date(event.date).getDate()}</span>
                                                <span className="text-slate-400 dark:text-silver/60 text-[9px] font-semibold uppercase tracking-tighter">{new Date(event.date).toLocaleString('default', { month: 'short' })}</span>
                                            </div>
                                            {/* Open icon */}
                                            <div className="absolute top-3 right-3 size-9 flex items-center justify-center rounded-xl bg-black/30 backdrop-blur-sm text-white group-hover:bg-primary transition-all shadow-sm">
                                                <span className="material-symbols-outlined text-base">open_in_new</span>
                                            </div>
                                        </div>
                                        {/* Content */}
                                        <div className="p-5 flex-1 flex flex-col gap-3">
                                            <h5 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2">{event.title}</h5>
                                            <p className="text-slate-500 dark:text-silver/50 text-xs leading-relaxed line-clamp-2">
                                                {getEventExcerpt(event.description, 15)}
                                            </p>
                                            <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-white/5">
                                                <span className="text-[8px] text-green-500 font-semibold uppercase bg-green-500/10 px-2 py-0.5 rounded-md">Concluded</span>
                                                <span className="text-[8px] text-slate-400 font-semibold uppercase">{event.category}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Workshops Component */}
                    {workshopsSection?.isVisible !== false && (
                        <section className="space-y-12">
                            <div className="text-center max-w-2xl mx-auto">
                                <h2 className="text-3xl font-semibold text-blue-950 dark:text-white tracking-tight mb-3">{workshopsSection?.content?.upcomingHeading || 'Intensive Workshops'}</h2>
                                <p className="text-blue-900/60 dark:text-silver/50 text-sm">Hands-on technical training sessions with limited slots for specialized learning.</p>
                            </div>

                            {displayWorkshops.length > 0 && (
                                <div className="space-y-8">
                                    {/* Workshop Selector */}
                                    <div className="max-w-md mx-auto relative">
                                        <label htmlFor="events-workshop" className="sr-only">Select workshop</label>
                                        <select
                                            id="events-workshop"
                                            onChange={(e) => setSelectedWorkshop(Number(e.target.value))}
                                            className="w-full pl-12 pr-10 py-4 bg-white dark:bg-charcoal border border-slate-200 dark:border-silver/10 rounded-2xl text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/50 cursor-pointer appearance-none font-semibold text-sm shadow-xl"
                                            value={selectedWorkshop}
                                        >
                                            {displayWorkshops.map((workshop, idx) => (
                                                <option key={workshop.id} value={idx}>{workshop.title}</option>
                                            ))}
                                        </select>
                                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">school</span>
                                        <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">expand_more</span>
                                    </div>

                                    {/* Workshop Spotlight */}
                                    {displayWorkshops[selectedWorkshop] && (
                                        <div className="bg-white dark:bg-charcoal border border-slate-200 dark:border-silver/10 rounded-[1.5rem] md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row h-full md:h-[450px]">
                                            <div className="md:w-1/2 h-52 sm:h-64 md:h-full relative overflow-hidden">
                                                <img
                                                    src={displayWorkshops[selectedWorkshop].image || getEventFallbackImage(displayWorkshops[selectedWorkshop].title, displayWorkshops[selectedWorkshop].category)}
                                                    alt={displayWorkshops[selectedWorkshop].title}
                                                    className="w-full h-full object-cover transition-transform duration-1000 hover:scale-110"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent"></div>
                                            </div>
                                            <div className="md:w-1/2 p-6 sm:p-8 md:p-16 flex flex-col justify-center">
                                                <span className="text-primary font-semibold uppercase tracking-[0.3em] text-[10px] mb-3 md:mb-4">Advanced Training</span>
                                                <h3 className="text-xl sm:text-2xl md:text-3xl font-semibold text-slate-900 dark:text-white mb-4 md:mb-6 leading-tight">
                                                    {displayWorkshops[selectedWorkshop].title}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-6 mb-10">
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary">calendar_today</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest">Date</span>
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-silver">{displayWorkshops[selectedWorkshop].date}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="material-symbols-outlined text-primary">currency_ruble</span>
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-widest">Rate</span>
                                                            <span className="text-sm font-semibold text-slate-700 dark:text-silver">₱{displayWorkshops[selectedWorkshop].price.toLocaleString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <Link 
                                                    to={`/events/${displayWorkshops[selectedWorkshop].id}`} 
                                                    className="inline-flex items-center justify-center gap-3 bg-primary text-white py-5 rounded-2xl text-sm font-semibold uppercase tracking-[0.2em] shadow-xl shadow-primary/30 hover:scale-105 transition-all active:scale-95"
                                                >
                                                    Register Now <span className="material-symbols-outlined">arrow_forward</span>
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </section>
                    )}

                    {/* 4 Simple Steps */}
                    <section className="py-4">
                        <div className="text-center mb-12">
                            <span className="text-primary font-semibold uppercase tracking-widest text-sm block mb-3">How It Works</span>
                            <h2 className="text-5xl font-semibold text-blue-950 dark:text-white tracking-tight mb-3">4 Simple Steps</h2>
                            <p className="text-slate-500 dark:text-silver/50 max-w-xl mx-auto text-sm">Joining a PAHA event is quick and straightforward. Here's all you need to do.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
                            {/* Connector line on desktop */}
                            <div className="absolute top-8 left-[12.5%] right-[12.5%] h-0.5 bg-primary/20 hidden lg:block" />

                            {[
                                {
                                    step: '01',
                                    icon: 'search',
                                    title: 'Browse Events',
                                    desc: 'Explore our upcoming conferences, workshops, and seminars. Find the ones relevant to your practice.'
                                },
                                {
                                    step: '02',
                                    icon: 'app_registration',
                                    title: 'Register Online',
                                    desc: 'Click "Secure Your Spot" on the event page and fill out the registration form in minutes.'
                                },
                                {
                                    step: '03',
                                    icon: 'payments',
                                    title: 'Complete Payment',
                                    desc: 'Pay via bank transfer or online payment. Upload your proof of payment to confirm your slot.'
                                },
                                {
                                    step: '04',
                                    icon: 'school',
                                    title: 'Attend & Earn CPD',
                                    desc: 'Join the event and earn Continuing Professional Development (CPD) units for your license.'
                                }
                            ].map((item, idx) => (
                                <div key={idx} className="relative flex flex-col items-center text-center bg-white dark:bg-charcoal rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-white/5 hover:shadow-xl hover:border-primary/20 transition-all group">
                                    {/* Step number */}
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 size-8 bg-primary text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg shadow-primary/30 z-10">
                                        {item.step}
                                    </div>
                                    <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-5 mt-3 group-hover:bg-primary group-hover:scale-110 transition-all">
                                        <span className="material-symbols-outlined text-primary text-3xl group-hover:text-white transition-colors">{item.icon}</span>
                                    </div>
                                    <h3 className="font-semibold text-blue-950 dark:text-white text-lg mb-2">{item.title}</h3>
                                    <p className="text-slate-500 dark:text-silver/50 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* CTA Banner */}
                    <section className="relative overflow-hidden rounded-3xl bg-primary px-8 py-14 text-center text-white">
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.12),_transparent_60%)]" />
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(0,0,0,0.15),_transparent_60%)]" />
                        <div className="relative z-10 max-w-2xl mx-auto">
                            <span className="uppercase tracking-widest text-xs font-semibold text-white/70 block mb-4">Join the PAHA Community</span>
                            <h2 className="text-5xl font-semibold mb-4 tracking-tight">Build your network.<br />Connect with industry leaders.<br />Grow your practice.</h2>
                            <p className="text-white/70 mb-8 text-sm leading-relaxed">
                                PAHA events are the premier gathering of veterinary professionals in the Philippines. Don't miss out on world-class education and networking opportunities.
                            </p>
                            <Link
                                to="/membership/application"
                                className="inline-flex items-center gap-2 bg-white text-primary font-bold px-8 py-4 rounded-2xl hover:bg-white/90 hover:scale-105 transition-all shadow-xl shadow-black/10 uppercase tracking-widest text-sm"
                            >
                                Become a Member <span className="material-symbols-outlined">arrow_forward</span>
                            </Link>
                        </div>
                    </section>

                </div>
            </main>

            {/* Aesthetic Decor */}
            <div className="fixed top-0 left-0 w-1.5 h-full bg-gradient-to-b from-primary/20 via-transparent to-primary/20 pointer-events-none z-50"></div>
            <div className="fixed top-0 right-0 w-1.5 h-full bg-gradient-to-b from-primary/20 via-transparent to-primary/20 pointer-events-none z-50"></div>
        </div>
    );
};

export default Events;
