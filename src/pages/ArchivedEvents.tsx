import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';
import { getArchivedEvents, unarchiveEvent, type Registration } from '../utils/eventStorage';

const ArchivedEvents: React.FC = () => {
    const [archivedEvents, setArchivedEvents] = useState<Registration[]>([]);

    useEffect(() => {
        setArchivedEvents(getArchivedEvents());
    }, []);

    const handleUnarchive = (event: Registration) => {
        unarchiveEvent(event);
        setArchivedEvents(getArchivedEvents()); // Refresh list
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-black font-display text-blue-950 dark:text-white selection:bg-primary/30 pb-24">
            {/* Top Navigation Bar */}
            <header className="sticky top-0 z-50">

            </header>

            <main className="max-w-7xl mx-auto pb-24 pt-[120px] lg:pt-[136px] px-4 sm:px-6 lg:px-8">
                {/* Header Section */}
                <div className="mb-10 text-center max-w-2xl mx-auto">
                    <h1 className="text-3xl md:text-5xl font-semibold text-blue-950 dark:text-white mb-4 drop-shadow-sm">
                        Archived Events
                    </h1>
                    <p className="text-blue-900/70 dark:text-silver/60 text-sm md:text-base leading-relaxed">
                        View your archived event registrations and history.
                    </p>
                </div>

                {/* Navigation Tabs */}
                <div className="max-w-2xl mx-auto mb-16">
                    <div className="flex h-16 items-center justify-center rounded-2xl bg-charcoal border border-silver/10 p-1.5 w-full shadow-lg">
                        <Link to="/events" className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl px-2 text-silver/60 text-sm font-semibold transition-all hover:bg-white/5 hover:text-white">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">event</span>
                                Upcoming Events
                            </span>
                        </Link>
                        <div className="w-px h-8 bg-white/5 mx-1"></div>
                        <Link to="/my-registrations" className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl px-2 text-silver/60 text-sm font-semibold transition-all hover:bg-white/5 hover:text-white">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                                My Registrations
                            </span>
                        </Link>
                        <div className="w-px h-8 bg-white/5 mx-1"></div>
                        <Link to="/my-registrations/archive" className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl px-2 bg-primary text-white text-sm font-semibold transition-all shadow-md">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">history</span>
                                Archive
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Archived Events List */}
                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    {archivedEvents.length > 0 ? (
                        archivedEvents.map(event => (
                            <div key={event.id} className="bg-white dark:bg-charcoal border border-silver/20 dark:border-silver/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 shadow-lg hover:shadow-xl transition-all group">
                                <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0 relative">
                                    <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 grayscale" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xl font-semibold text-silver/60 dark:text-silver/60 line-through decoration-silver/40">{event.title}</h3>
                                        <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-silver/10 text-silver/60 border border-silver/20">
                                            {event.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-silver/40 dark:text-silver/40 text-sm mb-4">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-lg">calendar_today</span>
                                            {event.date}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-lg">location_on</span>
                                            {event.location}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 mt-auto">
                                        <button
                                            onClick={() => handleUnarchive(event)}
                                            className="flex-1 px-4 py-2 rounded-lg border border-silver/20 dark:border-silver/10 text-silver/60 dark:text-silver/60 hover:bg-silver/10 hover:text-blue-950 dark:hover:text-white transition-colors text-sm font-semibold flex items-center justify-center gap-2"
                                        >
                                            <span className="material-symbols-outlined text-lg">unarchive</span>
                                            Unarchive
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-charcoal/30 rounded-3xl border border-silver/5">
                            <span className="material-symbols-outlined text-6xl text-silver/20 mb-4">history_toggle_off</span>
                            <h3 className="text-xl font-semibold text-white mb-2">No Archived Events</h3>
                            <p className="text-silver/60">You haven't archived any events yet.</p>
                            <Link to="/my-registrations" className="inline-block mt-6 text-primary font-semibold hover:underline">
                                Go to My Registrations
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ArchivedEvents;
