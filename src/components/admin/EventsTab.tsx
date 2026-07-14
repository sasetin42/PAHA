import React from 'react';
import type { Event } from '../../context/AdminContext';
import { getEventFallbackImage } from '../../utils/eventHelpers';

interface EventsTabProps {
    events: Event[];
    onAdd: () => void;
    onEdit: (event: Event) => void;
    onDelete: (id: string) => void;
    onViewRegistrations: (event: Event) => void;
    canEdit?: boolean;
}

const EventsTab: React.FC<EventsTabProps> = ({ events, onAdd, onEdit, onDelete, onViewRegistrations, canEdit = true }) => {
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-semibold">Events Management</h2>
                {canEdit && (
                    <button
                        onClick={onAdd}
                        className="bg-primary text-white px-4 py-2 rounded-[10px] font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Add Event
                    </button>
                )}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-[10px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Image</th>
                            <th className="p-4 font-semibold">Title</th>
                            <th className="p-4 font-semibold">Details</th>
                            <th className="p-4 font-semibold">Status</th>
                            <th className="p-4 font-semibold">Registrations</th>
                            <th className="p-4 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                        {events.length === 0 ? (
                            <tr><td colSpan={6} className="p-5 text-center text-slate-500">No events found.</td></tr>
                        ) : (
                            [...events].sort((a, b) => {
                                const parseDate = (d: string) => {
                                    if (!d) return 0;
                                    // Handle "Month DD-DD, YYYY" or "Month DD, YYYY"
                                    const cleaned = d.replace(/(\d+)-(\d+)/, '$1'); // "Sept 2-4" -> "Sept 2"
                                    const parsed = new Date(cleaned);
                                    return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
                                };
                                return parseDate(a.date) - parseDate(b.date);
                            }).map(event => (
                                <tr key={event.id} className={`hover:bg-slate-50 dark:hover:bg-white/5 transition-colors ${(() => { const parseDate = (d: string) => { if (!d) return null; const cleaned = d.replace(/(\d+)-(\d+)/, '$1'); const parsed = new Date(cleaned); return isNaN(parsed.getTime()) ? null : parsed; }; const eventDate = parseDate(event.date); return eventDate && eventDate.getTime() < Date.now() ? 'opacity-40 pointer-events-none' : ''; })()}`}>
                                    <td className="p-4">
                                        <img 
                                            src={event.image && event.image.startsWith('http') ? event.image : getEventFallbackImage(event.title, event.category)} 
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = getEventFallbackImage(event.title, event.category);
                                            }}
                                            alt={event.title} 
                                            className="w-16 h-16 object-cover rounded-[10px]" 
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold">{event.title}</div>
                                        <div className="text-xs text-slate-500">{event.category}</div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                            <span className="material-symbols-outlined text-sm">calendar_today</span>
                                            {event.date}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <span className="material-symbols-outlined text-sm">location_on</span>
                                            {event.location}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${event.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                                            event.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                                                event.status === 'completed' ? 'bg-slate-100 text-slate-700' :
                                                    'bg-red-100 text-red-700'
                                            }`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold">{event.registeredCount || 0} registered</div>
                                    </td>
                                    <td className="p-4 flex gap-2">
                                        <button
                                            onClick={() => onViewRegistrations(event)}
                                            className="bg-emerald-50 dark:bg-white/10 text-emerald-600 p-1 rounded hover:bg-emerald-600 hover:text-white transition-colors"
                                            title="View Registrations"
                                        >
                                            <span className="material-symbols-outlined text-sm">how_to_reg</span>
                                        </button>
                                        {canEdit && (
                                            <>
                                                <button
                                                    onClick={() => onEdit(event)}
                                                    className="bg-blue-50 dark:bg-white/10 text-primary p-1 rounded hover:bg-primary hover:text-white transition-colors"
                                                    title="Edit"
                                                >
                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm('Delete this event?')) {
                                                            onDelete(event.id);
                                                        }
                                                    }}
                                                    className="bg-red-50 dark:bg-white/10 text-red-500 p-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                    title="Delete"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default EventsTab;
