export interface Registration {
    id: number;
    title: string;
    date: string;
    location: string;
    status: string;
    image: string;
}

const DEFAULT_REGISTRATIONS: Registration[] = [
    {
        id: 1,
        title: "Advanced Abdominal Ultrasound",
        date: "Jan 15, 2026",
        location: "Manila Hotel",
        status: "Confirmed",
        image: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&auto=format&fit=crop&q=60"
    },
    {
        id: 2,
        title: "Veterinary Dentistry: Level 2",
        date: "Mar 10, 2026",
        location: "Seda Hotel, BGC",
        status: "Pending Payment",
        image: "https://images.unsplash.com/photo-1588776814546-1b04750b66fa?w=800&auto=format&fit=crop&q=60"
    }
];

const DEFAULT_ARCHIVED: Registration[] = [
    {
        id: 3, // Unique ID to avoid conflicts
        title: "PAHA Annual Conference 2024",
        date: "Sept 25, 2024",
        location: "SMX Convention Center",
        status: "Archived",
        image: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop&q=60"
    }
];

export const getRegistrations = (): Registration[] => {
    const data = localStorage.getItem('my_registrations');
    return data ? JSON.parse(data) : DEFAULT_REGISTRATIONS;
};

export const getArchivedEvents = (): Registration[] => {
    const data = localStorage.getItem('archived_events');
    return data ? JSON.parse(data) : DEFAULT_ARCHIVED;
};

export const archiveEvent = (event: Registration) => {
    const registrations = getRegistrations().filter(r => r.id !== event.id);
    const archived = getArchivedEvents();

    // Check if checks already exists (shouldn't happen with this logic but safe guard)
    if (!archived.find(a => a.id === event.id)) {
        archived.push({ ...event, status: 'Archived' });
    }

    localStorage.setItem('my_registrations', JSON.stringify(registrations));
    localStorage.setItem('archived_events', JSON.stringify(archived));
};

export const unarchiveEvent = (event: Registration) => {
    const archived = getArchivedEvents().filter(a => a.id !== event.id);
    const registrations = getRegistrations();

    if (!registrations.find(r => r.id === event.id)) {
        // Restore original status if possible, otherwise default to Confirmed
        const originalStatus = event.title.includes("Dentistry") ? "Pending Payment" : "Confirmed";
        registrations.push({ ...event, status: originalStatus });
    }

    localStorage.setItem('archived_events', JSON.stringify(archived));
    localStorage.setItem('my_registrations', JSON.stringify(registrations));
};

export const addRegistration = (event: Registration) => {
    const registrations = getRegistrations();
    if (!registrations.find(r => r.id === event.id)) {
        registrations.push(event);
        localStorage.setItem('my_registrations', JSON.stringify(registrations));
    }
};
