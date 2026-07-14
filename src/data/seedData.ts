
export const SEED_EVENTS = [
    {
        title: '30th Annual PAHA Conference',
        date: 'Sept 2-4, 2025',
        location: 'Fili Hotel, NUSTAR Cebu',
        image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=2070&auto=format&fit=crop',
        description: 'Join the biggest gathering of veterinary professionals in the country. Featuring international speakers and workshops.',
        category: 'Conference',
        price: 3500,
        capacity: 500,
        registeredCount: 0,
        status: 'upcoming' as const
    },
    {
        title: 'Advanced Small Animal Surgery Workshop',
        date: 'October 15, 2025',
        location: 'PAHA Training Center, Manila',
        image: 'https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=2080&auto=format&fit=crop',
        description: 'A hands-on workshop focused on advanced surgical techniques for small animals. CPD units applied.',
        category: 'Workshop',
        price: 5000,
        capacity: 30,
        registeredCount: 0,
        status: 'upcoming' as const
    },
    {
        title: 'Veterinary Practice Management Seminar',
        date: 'November 10, 2025',
        location: 'Grand Hyatt, BGC',
        image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070&auto=format&fit=crop',
        description: 'Learn effective strategies to manage your clinic, improve staff retention, and enhance client satisfaction.',
        category: 'Seminar',
        price: 2500,
        capacity: 100,
        registeredCount: 0,
        status: 'upcoming' as const
    }
];

export const SEED_ANNOUNCEMENTS = [
    {
        title: 'Project SNAP Coron: Mission Success',
        date: 'Recent Update',
        category: 'Outreach',
        summary: 'PAHA volunteers, AKF team, and partners brought huge smiles and veterinary care to the community of Coron.',
        image: 'https://images.unsplash.com/photo-1548767797-d8c844163c4c?q=80&w=2670&auto=format&fit=crop',
        link: 'https://www.facebook.com/share/p/17Ad5ST2kW/'
    },
    {
        title: 'Emergency & Critical Care Workshop',
        date: 'Education',
        category: 'Workshop',
        summary: 'Highlights from our recent hands-on workshop focused on emergency protocols and critical care management.',
        image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?q=80&w=2670&auto=format&fit=crop',
        link: 'https://www.facebook.com/share/p/1E8DLX1kjb/'
    },
    {
        title: 'FASAVA 2025 Delegates',
        date: 'Global Event',
        category: 'International',
        summary: 'Proudly representing the Philippines at the FASAVA 2025 Congress in Daegu, South Korea.',
        image: 'https://images.unsplash.com/photo-1551818255-e6e10975bc17?q=80&w=2573&auto=format&fit=crop',
        link: 'https://www.facebook.com/share/p/1BkTTjx7vj/'
    }
];
