export interface CalendarEvent {
    id: number;
    title: string;
    date: string; // Display string, e.g., "Jan 15, 2026"
    startDate: Date; // Actual date object for logic
    endDate?: Date;
    location: string;
    category: 'Conference' | 'Workshop' | 'Seminar' | 'Webinar';
    details?: string;
    image?: string;
}

export const CALENDAR_EVENTS: CalendarEvent[] = [
    {
        id: 1,
        title: "Veterinary Dentistry: Level 2",
        date: "Jan 15, 2026",
        startDate: new Date(2026, 0, 15), // Jan 15, 2026
        location: "Manila Hotel",
        category: "Workshop",
        details: "Masterclass",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2670&auto=format&fit=crop"
    },
    {
        id: 2,
        title: "Clinical Pathology Essentials",
        date: "Feb 20-21, 2026",
        startDate: new Date(2026, 1, 20),
        endDate: new Date(2026, 1, 21),
        location: "Virtual + On-site",
        category: "Workshop",
        details: "Certification",
        image: "https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=2670&auto=format&fit=crop"
    },
    {
        id: 3,
        title: "Advanced Abdominal Ultrasound",
        date: "Dec 05-06, 2025",
        startDate: new Date(2025, 11, 5),
        endDate: new Date(2025, 11, 6),
        location: "PAHA Training Center, QC",
        category: "Workshop",
        details: "Hands-on",
        image: "https://images.unsplash.com/photo-1551076805-e1869033e561?q=80&w=2664&auto=format&fit=crop"
    },
    {
        id: 4,
        title: "30th Annual PAHA Conference",
        date: "Sept 2-4, 2025",
        startDate: new Date(2025, 8, 2),
        endDate: new Date(2025, 8, 4),
        location: "Fili Hotel, Cebu",
        category: "Conference",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2670&auto=format&fit=crop"
    },
    {
        id: 5,
        title: "29th Annual PAHA Conference",
        date: "Oct 3, 2024",
        startDate: new Date(2024, 9, 3),
        location: "Pasay City",
        category: "Conference"
    },
    {
        id: 6,
        title: "PAHA 2026 Annual National Convention",
        date: "May 15-17, 2026",
        startDate: new Date(2026, 4, 15),
        endDate: new Date(2026, 4, 17),
        location: "SMX Convention Center, Manila",
        category: "Conference",
        image: "https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2669&auto=format&fit=crop"
    }
];
