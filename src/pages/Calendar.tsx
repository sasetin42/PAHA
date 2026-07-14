import React, { useState } from 'react';

import { Link } from 'react-router-dom';
import { useAdmin, type Event } from '../context/AdminContext';

const Calendar: React.FC = () => {
    const { events } = useAdmin();
    const [currentDate, setCurrentDate] = useState(new Date(2026, 0, 1)); // Start at Jan 2026
    const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ];

    const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
    const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay();

    const daysInMonth = getDaysInMonth(year, month);
    const startDay = getFirstDayOfMonth(year, month); // 0 = Sunday

    const handlePrevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    // Generate calendar grid
    const renderCalendarDays = () => {
        const days = [];

        // Empty slots for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-24 md:h-32 bg-white/5 border border-silver/5 rounded-xl opacity-50"></div>);
        }

        // Actual days
        for (let d = 1; d <= daysInMonth; d++) {
            const currentDayDate = new Date(year, month, d);
            const isToday = new Date().toDateString() === currentDayDate.toDateString();

            // Find events for this day
            const daysEvents = events.filter(event => {
                const eventStart = new Date(event.date); // Use .date as fallback for startDate
                const eventEnd = event.endDate ? new Date(event.endDate) : eventStart;
                
                const checkDate = new Date(year, month, d);
                const s = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
                const e = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

                return checkDate >= s && checkDate <= e;
            });

            days.push(
                <div
                    key={`day-${d}`}
                    className={`h-24 md:h-32 bg-white dark:bg-charcoal border ${isToday ? 'border-primary' : 'border-silver/10 dark:border-white/5'} rounded-xl p-2 relative hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group overflow-hidden`}
                >
                    <span className={`text-sm font-semibold ${isToday ? 'text-primary' : 'text-slate-500 dark:text-silver/60'}`}>{d}</span>

                    <div className="mt-1 flex flex-col gap-1 overflow-y-auto max-h-[calc(100%-24px)] custom-scrollbar">
                        {daysEvents.map(event => (
                            <button
                                key={event.id}
                                onClick={() => setSelectedEvent(event)}
                                className={`text-[10px] text-left px-1.5 py-0.5 rounded truncate font-medium transition-transform hover:scale-[1.02] border ${event.category === 'Conference' ? 'bg-purple-500/20 text-purple-300 border-purple-500/20' :
                                    event.category === 'Workshop' ? 'bg-primary/20 text-primary border-primary/20' :
                                        'bg-orange-500/20 text-orange-300 border-orange-500/20'
                                    }`}
                                title={event.title}
                            >
                                {event.title}
                            </button>
                        ))}
                    </div>

                    {isToday && (
                        <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full shadow-[0_0_10px_rgba(43,140,238,0.8)]"></span>
                    )}
                </div>
            );
        }
        return days;
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-black font-display text-blue-950 dark:text-white selection:bg-primary/30 pb-24">
            <header className="sticky top-0 z-50">

            </header>

            <main className="max-w-7xl mx-auto pt-[120px] lg:pt-[136px] px-4 sm:px-6 lg:px-8 relative">
                {/* Header */}
                <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <Link to="/events" className="inline-flex items-center gap-2 text-silver/60 hover:text-primary transition-colors text-sm font-semibold mb-4">
                            <span className="material-symbols-outlined text-lg">arrow_back</span>
                            Back to Events
                        </Link>
                        <h1 className="text-3xl md:text-5xl font-semibold text-blue-950 dark:text-white drop-shadow-sm">
                            Event Calendar
                        </h1>
                        <p className="text-blue-900/70 dark:text-silver/60 mt-2">
                            View all upcoming seminars, workshops, and conferences.
                        </p>
                    </div>
                </div>

                {/* Calendar Container */}
                <div className="bg-white dark:bg-charcoal border border-slate-200 dark:border-silver/10 rounded-3xl p-6 shadow-2xl backdrop-blur-sm">
                    {/* Controls */}
                    <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
                        <div className="flex items-center gap-4">
                            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white min-w-[200px] text-center sm:text-left">
                                {monthNames[month]} {year}
                            </h2>
                            <div className="flex gap-2">
                                <button onClick={handlePrevMonth} className="size-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-silver/10 flex items-center justify-center text-slate-500 dark:text-silver/60 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all">
                                    <span className="material-symbols-outlined">chevron_left</span>
                                </button>
                                <button onClick={handleNextMonth} className="size-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-silver/10 flex items-center justify-center text-slate-500 dark:text-silver/60 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all">
                                    <span className="material-symbols-outlined">chevron_right</span>
                                </button>
                                <button onClick={handleToday} className="px-4 h-10 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-silver/10 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-silver/60 hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-all ml-2">
                                    Today
                                </button>
                            </div>
                        </div>

                        {/* Legend */}
                        <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-silver/40">
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span> Workshop</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-purple-500"></span> Conference</div>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500"></span> Other</div>
                        </div>
                    </div>

                    {/* Day Names */}
                    <div className="grid grid-cols-7 gap-4 mb-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-center text-silver/40 text-xs font-semibold uppercase tracking-widest">{day}</div>
                        ))}
                    </div>

                    {/* Days Grid */}
                    <div className="grid grid-cols-7 gap-2 md:gap-4">
                        {renderCalendarDays()}
                    </div>
                </div>

                {/* Event Details Modal */}
                {selectedEvent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedEvent(null)}></div>
                        <div className="bg-white dark:bg-charcoal border border-slate-200 dark:border-silver/20 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 relative z-10">
                            {selectedEvent.image && (
                                <div className="h-40 w-full relative">
                                    <img src={selectedEvent.image} alt={selectedEvent.title} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-white via-transparent dark:from-charcoal dark:to-transparent"></div>
                                    <button
                                        onClick={() => setSelectedEvent(null)}
                                        className="absolute top-4 right-4 size-8 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-black/70 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            )}
                            <div className="p-6">
                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider mb-3 ${selectedEvent.category === 'Conference' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/20' :
                                    selectedEvent.category === 'Workshop' ? 'bg-primary/20 text-primary border border-primary/20' :
                                        'bg-orange-500/20 text-orange-300 border border-orange-500/20'
                                    }`}>
                                    {selectedEvent.category}
                                </span>
                                <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{selectedEvent.title}</h3>

                                <div className="flex flex-col gap-3 py-4">
                                    <div className="flex items-center gap-3 text-silver/70 text-sm">
                                        <span className="material-symbols-outlined text-primary text-lg">event</span>
                                        {selectedEvent.date}
                                    </div>
                                    <div className="flex items-center gap-3 text-silver/70 text-sm">
                                        <span className="material-symbols-outlined text-primary text-lg">location_on</span>
                                        {selectedEvent.location}
                                    </div>
                                    {selectedEvent.description && (
                                        <div className="flex items-center gap-3 text-silver/70 text-sm">
                                            <span className="material-symbols-outlined text-primary text-lg">info</span>
                                            {selectedEvent.description}
                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 pt-4 border-t border-silver/10 flex gap-3">
                                    <Link
                                        to={`/events/${selectedEvent.id}/register`}
                                        className="flex-1 bg-primary hover:bg-primary-dark text-white py-2.5 rounded-xl text-center text-sm font-semibold shadow-lg shadow-primary/20 transition-all block"
                                    >
                                        Register Details
                                    </Link>
                                    {!selectedEvent.image && (
                                        <button
                                            onClick={() => setSelectedEvent(null)}
                                            className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-silver/20 text-slate-600 dark:text-silver/60 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-sm font-semibold"
                                        >
                                            Close
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Calendar;
