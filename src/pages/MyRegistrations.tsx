import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';
import { getRegistrations, archiveEvent, type Registration } from '../utils/eventStorage';

const MyRegistrations: React.FC = () => {
    const [registrations, setRegistrations] = useState<Registration[]>([]);

    useEffect(() => {
        setRegistrations(getRegistrations());
    }, []);

    const handleArchive = (event: Registration) => {
        archiveEvent(event);
        setRegistrations(getRegistrations()); // Refresh list
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
                        My Registrations
                    </h1>
                    <p className="text-blue-900/70 dark:text-silver/60 text-sm md:text-base leading-relaxed">
                        Manage your upcoming event registrations and view your history.
                    </p>
                </div>

                {/* Navigation Tabs (Keeping consistent with Events page) */}
                <div className="max-w-2xl mx-auto mb-16">
                    <div className="flex h-16 items-center justify-center rounded-2xl bg-charcoal border border-silver/10 p-1.5 w-full shadow-lg">
                        <Link to="/events" className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl px-2 text-silver/60 text-sm font-semibold transition-all hover:bg-white/5 hover:text-white">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">event</span>
                                Upcoming Events
                            </span>
                        </Link>
                        <div className="w-px h-8 bg-white/5 mx-1"></div>
                        <Link to="/my-registrations" className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl px-2 bg-primary text-white text-sm font-semibold transition-all shadow-md">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">how_to_reg</span>
                                My Registrations
                            </span>
                        </Link>
                        <div className="w-px h-8 bg-white/5 mx-1"></div>
                        <Link to="/my-registrations/archive" className="flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-xl px-2 text-silver/60 text-sm font-semibold transition-all hover:bg-white/5 hover:text-white">
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">history</span>
                                Archive
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Registrations List */}
                <div className="flex flex-col gap-6 max-w-4xl mx-auto">
                    {registrations.length > 0 ? (
                        registrations.map(event => (
                            <div key={event.id} className="bg-white dark:bg-charcoal border border-silver/20 dark:border-silver/10 rounded-2xl p-6 flex flex-col md:flex-row gap-6 shadow-lg hover:shadow-xl transition-all group">
                                <div className="w-full md:w-48 h-32 rounded-xl overflow-hidden shrink-0 relative">
                                    <img src={event.image} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                                </div>
                                <div className="flex-1 flex flex-col justify-center">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-xl font-semibold text-blue-950 dark:text-white">{event.title}</h3>
                                        <span className={`px - 3 py - 1 rounded - full text - xs font - bold uppercase tracking - wider ${event.status === 'Confirmed'
                                            ? 'bg-green-500/10 text-green-600 dark:text-green-500 border border-green-500/20'
                                            : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 border border-yellow-500/20'
                                            } `}>
                                            {event.status}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-blue-900/60 dark:text-silver/60 text-sm mb-4">
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-lg text-primary">calendar_today</span>
                                            {event.date}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <span className="material-symbols-outlined text-lg text-primary">location_on</span>
                                            {event.location}
                                        </span>
                                    </div>
                                    <div className="flex gap-3 mt-auto">
                                        <button className="flex-1 bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-primary/20">
                                            View Ticket
                                        </button>
                                        <button className="px-4 py-2 rounded-lg border border-silver/20 dark:border-silver/10 text-blue-950 dark:text-white hover:bg-silver/10 transition-colors text-sm font-semibold">
                                            Event Details
                                        </button>
                                        <button
                                            onClick={() => handleArchive(event)}
                                            className="px-4 py-2 rounded-lg border border-silver/20 dark:border-silver/10 text-silver/60 hover:bg-silver/10 hover:text-blue-950 dark:hover:text-white transition-colors text-sm font-semibold flex items-center justify-center"
                                            title="Archive Event"
                                        >
                                            <span className="material-symbols-outlined text-lg">archive</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 bg-charcoal/30 rounded-3xl border border-silver/5">
                            <span className="material-symbols-outlined text-6xl text-silver/20 mb-4">event_busy</span>
                            <h3 className="text-xl font-semibold text-white mb-2">No Registrations Found</h3>
                            <p className="text-silver/60">You haven't registered for any events yet.</p>
                            <Link to="/events" className="inline-block mt-6 text-primary font-semibold hover:underline">
                                Browse Upcoming Events
                            </Link>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MyRegistrations;
