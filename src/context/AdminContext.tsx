import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { db, functions, auth } from '../config/firebase';
import {
    collection,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    setDoc,
    query,
    orderBy,
    where,
    getDoc,
    getDocs
} from 'firebase/firestore';
import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from './AuthContext';
import { notifyAdmin } from '../utils/notify';

// ... existing imports ...

// Define Types
export interface ContactMessage {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    message: string;
    date: string;
    status?: 'unread' | 'read' | 'replied';
}

export interface MembershipApplicationData {
    id: string;
    type: string;
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    prcLicense?: string;
    prcExpiryDate?: string; // New
    specialization?: string; // New
    vetSchool?: string;
    hospitalName?: string;
    clinicAddress?: string; // New
    region?: string; // New
    description?: string; // New
    facilityMedia?: { url: string; path: string }[]; // New
    attachment?: { url: string; path: string }; // New
    date: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface MemberProfile {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    type: string;
    isAccredited: boolean;
    image: string;
    headVeterinarian?: string;
    representativeName?: string;
    deactivated?: boolean;
    lat?: number;
    lng?: number;
    createdAt?: string;
    joinedAt?: string;
}

export interface Event {
    id: string;
    title: string;
    date: string;
    endDate?: string;
    location: string;
    image: string;
    description: string;
    category: string;
    price: number;
    memberPrice?: number;
    nonMemberPrice?: number;
    priceTiers?: { label: string; price: number }[];
    capacity: number;
    registeredCount: number;
    speakers?: { name: string; role: string; image: string; bio?: string }[];
    agenda?: { time: string; activity: string; description?: string }[];
    requirements?: string[];
    highlightsVideoURL?: string | null;
    highlightsVideoPath?: string | null;
    galleryImages?: { url: string; path: string; uploadedAt: any }[];
    videoUrl?: string; // Legacy
    galleryUrls?: string[]; // Legacy
    status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
    registrationLink?: string;
    createdAt?: any;
    updatedAt?: any;
}

export interface EventRegistration {
    id: string;
    eventId: string;
    eventTitle: string;
    attendeeName: string;
    attendeeEmail: string;
    attendeePhone: string;
    prcLicense: string;
    specialization?: string;
    paymentMethod: 'credit_card' | 'e_wallet' | 'bank_transfer';
    paymentStatus: 'pending' | 'paid' | 'refunded';
    registrationDate: string;
    paymentReference?: string;
    dietaryRestrictions?: string;
    ticketLabel?: string;
    ticketPrice?: number;
}

export interface Announcement {
    id: string;
    title: string;
    date: string;
    category: string;
    summary: string;
    image: string;
    link?: string;
}

export interface CommitteeMember {
    id: string;
    committeeId: string;
    name: string;
    clinic: string;
    role: string;
    image: string;
    displayOrder: number;
}

export interface FormerOfficer {
    id: string;
    year: number;
    officers: { name: string; role: string; image?: string }[];
}

export type PartnerCategory = 'Silver' | 'Gold' | 'Platinum';

export interface PartnerLogo {
    id: string;
    name: string;
    imageUrl: string;
    imagePath?: string;
    websiteUrl?: string; // Optional
    orderIndex: number;
    category?: PartnerCategory;
}

export interface SectionStyle {
    backgroundColor?: string;
    textColor?: string;
    fontSize?: string;
    padding?: string;
}

export interface PageSection {
    id: string;
    title: string;
    content: any;
    style: SectionStyle;
    type: 'hero' | 'text' | 'features' | 'list' | 'custom' | 'grid';
    isVisible: boolean;
}

export interface PageContent {
    id: string;
    title: string;
    sections: PageSection[];
}

interface SiteConfig {
    colors: {
        primary: string;
        secondary: string;
        background: string;
        text: string;
    };
    fonts: {
        baseSize: string;
        headingFont: string;
        bodyFont: string;
    };
    applicationVideoUrl: string;
}

export interface AdminNotification {
    id: string;
    type: 'application' | 'accreditation' | 'message' | 'registration' | 'member_update';
    title: string;
    body: string;
    read: boolean;
    createdAt: any;
    link?: string;
}

export interface AccreditationSubmission {
    id: string;
    referenceNo: string;
    clinicName: string;
    applicantName: string;
    checkedItems: Record<string, boolean>;
    categoryResults: {
        id: string;
        title: string;
        score: number;
        passingScore: number;
        passed: boolean;
    }[];
    uploadedFiles: Record<string, string[]>;
    createdAt: any;
}

interface AdminContextType {
    messages: ContactMessage[];
    applications: MembershipApplicationData[];
    accreditationSubmissions: AccreditationSubmission[];
    siteConfig: SiteConfig;
    pages: Record<string, PageContent>;
    events: Event[];
    announcements: Announcement[];
    registrations: EventRegistration[];
    updatePage: (pageId: string, updates: Partial<PageContent>) => void;
    addMessage: (msg: Omit<ContactMessage, 'id' | 'date'>) => Promise<void>;
    addApplication: (app: Omit<MembershipApplicationData, 'id' | 'date' | 'status'>) => Promise<void>;
    updateSiteConfig: (config: Partial<SiteConfig>) => Promise<void>;
    updateApplicationStatus: (id: string, status: 'pending' | 'approved' | 'rejected', rejectionReason?: string) => Promise<void>;
    deleteApplication: (id: string) => Promise<void>;
    updatePageSection: (pageId: string, sectionId: string, updates: Partial<PageSection>) => Promise<void>;
    members: MemberProfile[];
    addMember: (member: Omit<MemberProfile, 'id'>) => Promise<void>;
    updateMember: (id: string, updates: Partial<MemberProfile>) => Promise<void>;
    deleteMember: (id: string) => Promise<void>;
    toggleMemberActive: (id: string, deactivate: boolean) => Promise<void>;
    addEvent: (event: Omit<Event, 'id'> & { id?: string }) => Promise<void>;
    updateEvent: (id: string, updates: Partial<Event>) => Promise<void>;
    updateEventPartial: (id: string, updates: Partial<Event>) => Promise<void>;
    deleteEvent: (id: string) => Promise<void>;
    deleteFile: (path: string) => Promise<void>;
    getNewEventId: () => string;
    addAnnouncement: (announcement: Omit<Announcement, 'id'>) => Promise<void>;
    updateAnnouncement: (id: string, updates: Partial<Announcement>) => Promise<void>;
    deleteAnnouncement: (id: string) => Promise<void>;
    addEventRegistration: (reg: Omit<EventRegistration, 'id' | 'registrationDate' | 'paymentStatus'>) => Promise<string>;
    updateEventRegistrationPaymentStatus: (id: string, status: 'pending' | 'paid' | 'refunded') => Promise<void>;
    updateEventRegistration: (id: string, updates: Partial<EventRegistration>) => Promise<void>;
    deleteEventRegistration: (id: string) => Promise<void>;
    uploadImage: (file: File) => Promise<string>;
    uploadFile: (file: File, path: string, onProgress?: (progress: number) => void) => Promise<{ url: string; path: string }>;
    processFileForUpload: (file: File) => Promise<File>;
    resetPageToDefault: (pageId: string) => Promise<void>;
    committeeMembers: CommitteeMember[];
    addCommitteeMember: (member: Omit<CommitteeMember, 'id'>) => Promise<void>;
    updateCommitteeMember: (id: string, updates: Partial<CommitteeMember>) => Promise<void>;
    deleteCommitteeMember: (id: string) => Promise<void>;
    committeeCovers: Record<string, string>;
    updateCommitteeCover: (committeeId: string, imageUrl: string) => Promise<void>;
    formerOfficers: FormerOfficer[];
    addFormerOfficer: (officer: Omit<FormerOfficer, 'id'>) => Promise<void>;
    updateFormerOfficer: (id: string, updates: Partial<FormerOfficer>) => Promise<void>;
    deleteFormerOfficer: (id: string) => Promise<void>;
    partners: PartnerLogo[];
    addPartner: (partner: Omit<PartnerLogo, 'id'>) => Promise<void>;
    updatePartner: (id: string, updates: Partial<PartnerLogo>) => Promise<void>;
    deletePartner: (id: string) => Promise<void>;
    syncStatus: Record<string, 'syncing' | 'synced' | 'error'>;
    notifications: AdminNotification[];
    unreadNotificationCount: number;
    markNotificationRead: (id: string) => Promise<void>;
    markAllNotificationsRead: () => Promise<void>;
    addAdminNotification: (n: Omit<AdminNotification, 'id' | 'read' | 'createdAt'>) => Promise<void>;
    accreditationApplications: import('../types/accreditation').AccreditationApplication[];
}

// Default Configuration
const defaultSiteConfig: SiteConfig = {
    colors: {
        primary: '#0ea5e9',
        secondary: '#64748b',
        background: '#ffffff',
        text: '#0f172a'
    },
    fonts: {
        baseSize: '16px',
        headingFont: 'Inter, sans-serif',
        bodyFont: 'Inter, sans-serif'
    },
    applicationVideoUrl: 'https://drive.google.com/file/d/1Fhs-3OXkao_sgu0rIoIBaEbuETt1FsuM/preview'
};

const defaultPages: Record<string, PageContent> = {
    'home': {
        id: 'home',
        title: 'Home Page',
        sections: [
            {
                id: 'hero',
                title: 'Hero Section',
                type: 'hero',
                isVisible: true,
                style: { textColor: '#ffffff', backgroundColor: '#000000' },
                content: {
                    heading: 'Uplifting the Veterinary Profession',
                    subheading: 'Leads the veterinary community in building globally aligned standards, empowered clinical teams, and highest standard of patient care',
                    buttonText: 'BECOME A MEMBER'
                }
            },
            {
                id: 'features',
                title: 'Key Features',
                type: 'features',
                isVisible: true,
                style: {},
                content: { title: 'Why Join PAHA?' }
            },
            {
                id: 'partners',
                title: 'Industry Partners',
                type: 'list',
                isVisible: true,
                style: {},
                content: { title: 'Our Industry Partners' }
            }
        ]
    },
    'association': {
        id: 'association',
        title: 'About Us',
        sections: [
            {
                id: 'hero',
                title: 'Hero / Intro Section',
                type: 'hero',
                isVisible: true,
                style: {},
                content: {
                    tag: 'The Organization',
                    heading: 'About Our Association',
                    headingHighlight: 'Association',
                    description: "Founded in 1978, the Philippine Animal Hospital Association (PAHA) stands as the pillar of veterinary excellence, uniting professionals to elevate the standard of animal care nationwide."
                }
            },
            {
                id: 'board_intro',
                title: 'Board of Trustees Header',
                type: 'text',
                isVisible: true,
                style: {},
                content: {
                    heading: 'PAHA Board of Trustees',
                    subheading: 'The stewards of our mission for the term 2026–2027.',
                    term: 'Term 2026-2027'
                }
            },
            {
                id: 'president',
                title: 'President Highlight',
                type: 'hero',
                isVisible: true,
                style: {},
                content: {
                    name: 'Dr. Luchi Orlanda',
                    role: 'President',
                    roleSubtitle: 'DVM, PAHA Board President',
                    quote: "Our collective mission is to foster a culture of excellence and innovation in veterinary medicine, ensuring the highest standards of care for every patient we serve.",
                    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=2070&auto=format&fit=crop'
                }
            },
            {
                id: 'officers_grid',
                title: 'Officers & Directors Grid',
                type: 'grid',
                isVisible: true,
                style: {},
                content: {
                    v1_name: 'Dr. Benedick Macaraeg', v1_role: 'Vice President', v1_img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?q=80&w=1964&auto=format&fit=crop',
                    v2_name: 'Dr. Maricris Alcantara', v2_role: 'Secretary', v2_img: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?q=80&w=1974&auto=format&fit=crop',
                    v3_name: 'Dr. Sheryl Belen', v3_role: 'Treasurer', v3_img: 'https://images.unsplash.com/photo-1551836022-d5d88e9218df?q=80&w=2070&auto=format&fit=crop',
                    v4_name: 'Dr. Marcelo Evangelista', v4_role: 'Auditor', v4_img: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?q=80&w=2070&auto=format&fit=crop',
                    v5_name: 'Dr. Pretextato Chua III', v5_role: 'Board of Director', v5_img: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?q=80&w=2070&auto=format&fit=crop',
                    v6_name: 'Dr. Mitzi Padrinao', v6_role: 'Immediate Past President', v6_img: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop'
                }
            },
            {
                id: 'secretariat_grid',
                title: 'Administrative Secretariat',
                type: 'grid',
                isVisible: true,
                style: {},
                content: {
                    heading: 'Administrative Secretariat',
                    s1_name: 'Diwatal Andres', s1_role: 'Administrative Secretary', s1_img: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1976&auto=format&fit=crop',
                    s2_name: 'Mart Joed S. Estrella', s2_role: 'Administrative Secretary', s2_img: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=1974&auto=format&fit=crop'
                }
            },
            {
                id: 'mission',
                title: 'Mission Statement',
                type: 'text',
                isVisible: true,
                style: {},
                content: {
                    heading: 'Our Mission',
                    description: "To lead the development of the veterinary hospital industry through accreditation, continuing education, and legislative advocacy, ensuring the welfare of both the profession and the animals we care for."
                }
            },
            {
                id: 'heritage',
                title: 'Heritage & Stats',
                type: 'text',
                isVisible: true,
                style: {},
                content: {
                    heading: 'Our Heritage',
                    description: "From a small group of six visionaries in 1978 to a nationwide network of hundreds of hospitals today, PAHA's journey is a testament to the resilience and dedication of the Filipino veterinarian.",
                    stat1_val: '1978',
                    stat1_label: 'Founded',
                    stat2_val: '45+',
                    stat2_label: 'Years of Service',
                    stat3_val: '300+',
                    stat3_label: 'Member Hospitals',
                    stat4_val: 'Top 1',
                    stat4_label: 'Standard Setter'
                }
            }
        ]
    },
    'events': {
        id: 'events',
        title: 'Events & Seminars',
        sections: [
            {
                id: 'hero',
                title: 'Events Hero',
                type: 'hero',
                isVisible: true,
                style: { textColor: '#ffffff' },
                content: {
                    heading: 'Upcoming Events & CPD',
                    subheading: 'Join our latest seminars and conferences.'
                }
            },
            {
                id: 'convention',
                title: 'Annual Convention Banner',
                type: 'hero',
                isVisible: true,
                style: {},
                content: {
                    year: '2026',
                    heading: 'Annual National Convention',
                    subheading: 'Save the Date',
                    dateRange: 'May 15-17, 2026',
                    location: 'SMX Convention Center, Manila',
                    buttonText: 'Get Early Bird Access',
                    backgroundImage: 'https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=2669&auto=format&fit=crop'
                }
            },
            {
                id: 'workshops',
                title: 'Workshops Formatting',
                type: 'text',
                isVisible: true,
                style: {},
                content: {
                    heading: 'Past Workshops & Seminars',
                    subheading: 'A look back at our specialized hands-on training sessions.',
                    upcomingHeading: 'Upcoming Workshops',
                    upcomingSubheading: 'Select a workshop to view details.'
                }
            },
            {
                id: 'archive',
                title: 'Archive Section',
                type: 'text',
                isVisible: true,
                style: {},
                content: {
                    heading: 'Past Highlights',
                    linkText: 'View All'
                }
            }
        ]
    },
    'membership': {
        id: 'membership',
        title: 'Membership',
        sections: [
            {
                id: 'hero',
                title: 'Hero Section',
                type: 'hero',
                isVisible: true,
                style: { textColor: '#ffffff' },
                content: {
                    heading: 'Join Our Community',
                    subheading: 'Be part of the largest network of veterinary professionals.'
                }
            }
        ]
    },
    'contact': {
        id: 'contact',
        title: 'Contact Us',
        sections: [
            {
                id: 'hero',
                title: 'Hero Section',
                type: 'hero',
                isVisible: true,
                style: { textColor: '#ffffff' },
                content: {
                    heading: 'Get in Touch',
                    subheading: 'We would love to hear from you.'
                }
            }
        ]
    }
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { isAdmin } = useAuth();
    // State
    const [messages, setMessages] = useState<ContactMessage[]>([]);
    const [applications, setApplications] = useState<MembershipApplicationData[]>([]);
    const [accreditationSubmissions, setAccreditationSubmissions] = useState<AccreditationSubmission[]>([]);
    const [members, setMembers] = useState<MemberProfile[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
    const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
    const [committeeCovers, setCommitteeCovers] = useState<Record<string, string>>({});
    const [formerOfficers, setFormerOfficers] = useState<FormerOfficer[]>([]);
    const [partners, setPartners] = useState<PartnerLogo[]>([]);
    const [siteConfig, setSiteConfig] = useState<SiteConfig>(defaultSiteConfig);
    const [pages, setPages] = useState<Record<string, PageContent>>(defaultPages);
    const [syncStatus, setSyncStatus] = useState<Record<string, 'syncing' | 'synced' | 'error'>>({});
    const [notifications, setNotifications] = useState<AdminNotification[]>([]);
    const [accreditationApplications, setAccreditationApplications] = useState<import('../types/accreditation').AccreditationApplication[]>([]);

    const updateSyncStatus = (id: string, status: 'syncing' | 'synced' | 'error') => {
        setSyncStatus(prev => ({ ...prev, [id]: status }));
        if (status === 'synced') {
            setTimeout(() => {
                setSyncStatus(prev => {
                    if (prev[id] === 'synced') {
                        const next = { ...prev };
                        delete next[id];
                        return next;
                    }
                    return prev;
                });
            }, 2000);
        }
    };

    // --- Firestore Subscriptions ---

    // Messages
    useEffect(() => {
        if (!isAdmin) {
            setMessages([]);
            return;
        }
        const q = query(collection(db, 'contact_messages'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ContactMessage));
            setMessages(data);
        }, (err) => {
            console.error('[AdminContext] Messages snapshot error:', err);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Applications
    useEffect(() => {
        if (!isAdmin) {
            setApplications([]);
            return;
        }
        const q = query(collection(db, 'membership_applications'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MembershipApplicationData));
            setApplications(data);
        }, (err) => {
            console.error('[AdminContext] Applications snapshot error:', err);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Accreditation Submissions
    useEffect(() => {
        if (!isAdmin) {
            setAccreditationSubmissions([]);
            return;
        }
        const q = query(collection(db, 'accreditation_submissions'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccreditationSubmission));
            setAccreditationSubmissions(data);
        }, (err) => {
            console.error('[AdminContext] Accreditation submissions snapshot error:', err);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Accreditation Applications (pipeline)
    useEffect(() => {
        if (!isAdmin) {
            setAccreditationApplications([]);
            return;
        }
        const q = query(collection(db, 'accreditation_applications'), orderBy('submittedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as import('../types/accreditation').AccreditationApplication));
            setAccreditationApplications(data);
        }, (err) => {
            console.error('[AdminContext] Accreditation applications snapshot error:', err);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Admin Notifications
    useEffect(() => {
        if (!isAdmin) {
            setNotifications([]);
            return;
        }
        const q = query(collection(db, 'admin_notifications'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AdminNotification));
            setNotifications(data);
        }, (err) => {
            console.error('[AdminContext] Notifications snapshot error:', err);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Members
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'members'), (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MemberProfile));
            setMembers(data);
        }, (err) => {
            console.error('[AdminContext] Members snapshot error:', err);
        });
        return () => unsubscribe();
    }, []);

    // Events
    useEffect(() => {
        const q = query(collection(db, 'events')); // You might want to sort by date later
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Event));
            setEvents(data);
        }, (err) => {
            console.error('[AdminContext] Events snapshot error:', err);
        });
        return () => unsubscribe();
    }, []);

    // Announcements
    useEffect(() => {
        const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Announcement));
            setAnnouncements(data);
        }, (err) => {
            console.error('[AdminContext] Announcements snapshot error:', err);
        });
        return () => unsubscribe();
    }, []);

    // Event Registrations
    useEffect(() => {
        if (!isAdmin) {
            setRegistrations([]);
            return;
        }
        const q = query(collection(db, 'event_registrations'), orderBy('registrationDate', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventRegistration));
            setRegistrations(data);
        }, (err) => {
            console.error('[AdminContext] Event registrations snapshot error:', err);
        });
        return () => unsubscribe();
    }, [isAdmin]);

    // Site Config
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'siteConfig'), (snapshot) => {
            if (snapshot.exists()) {
                setSiteConfig(snapshot.data() as SiteConfig);
            } else {
                // Initialize if missing
                setDoc(doc(db, 'settings', 'siteConfig'), defaultSiteConfig);
            }
        }, (err) => {
            console.error('[AdminContext] Site config error:', err);
        });
        return () => unsubscribe();
    }, []);

    // Pages
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'pages'), (snapshot) => {
            const pagesData: Record<string, PageContent> = {};
            snapshot.docs.forEach(doc => {
                pagesData[doc.id] = doc.data() as PageContent;
            });
            // Note: We used to seed defaults here, but now we strictly use what is in Firestore.
            // If empty, the UI will handle it.
            setPages(pagesData);
        }, (err) => {
            console.error('[AdminContext] Pages error:', err);
        });
        return () => unsubscribe();
    }, []);

    // Committee Members
    useEffect(() => {
        const q = query(collection(db, 'committee_members'), orderBy('displayOrder', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommitteeMember));
            setCommitteeMembers(data);
        }, (error) => {
            console.error("Error fetching committee_members:", error);
        });
        return () => unsubscribe();
    }, []);

    // Committee Cover Photos (group photos, keyed by committeeId)
    useEffect(() => {
        const unsubscribe = onSnapshot(doc(db, 'settings', 'committeeCovers'), (snapshot) => {
            setCommitteeCovers(snapshot.exists() ? (snapshot.data() as Record<string, string>) : {});
        }, (error) => {
            console.error("Error fetching committeeCovers:", error);
        });
        return () => unsubscribe();
    }, []);

    // Former Officers
    useEffect(() => {
        const q = query(collection(db, 'former_officers'), orderBy('year', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FormerOfficer));
            setFormerOfficers(data);
        }, (error) => {
            console.error("Error fetching former_officers:", error);
        });
        return () => unsubscribe();
    }, []);

    // Partners
    useEffect(() => {
        const q = query(collection(db, 'partners'), orderBy('orderIndex', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PartnerLogo));
            setPartners(data);
        }, (error) => {
            console.error("Error fetching partners:", error);
        });
        return () => unsubscribe();
    }, []);

    // Actions
    // --- Actions ---

    const addMessage = async (msg: Omit<ContactMessage, 'id' | 'date'>) => {
        const newMessage = {
            ...msg,
            date: new Date().toISOString()
        };
        await addDoc(collection(db, 'contact_messages'), newMessage);
        await notifyAdmin({
            type: 'message',
            title: 'New Contact Message',
            body: `${msg.firstName} ${msg.lastName} sent a message: "${msg.message?.slice(0, 80) || 'No content'}"`,
            link: 'messages',
        });
    };

    const addApplication = async (app: Omit<MembershipApplicationData, 'id' | 'date' | 'status'>) => {
        const appFullName = (app as any).fullName || (app as any).ownerName || `${app.firstName || ''} ${app.lastName || ''}`.trim() || 'A new';
        const newApp = {
            ...app,
            date: new Date().toISOString(),
            status: 'pending'
        };
        await addDoc(collection(db, 'membership_applications'), newApp);
        await addDoc(collection(db, 'admin_notifications'), {
            type: 'application',
            title: 'New Membership Application',
            body: `${appFullName} applied as ${app.type} member.`,
            link: 'applications',
            read: false,
            createdAt: serverTimestamp(),
        });
    };

    const updateSiteConfig = async (config: Partial<SiteConfig>) => {
        const newConfig = { ...siteConfig, ...config };
        setSiteConfig(newConfig); // Optimistic update
        await setDoc(doc(db, 'settings', 'siteConfig'), newConfig, { merge: true });

        if (config.colors?.primary) {
            document.documentElement.style.setProperty('--color-primary', config.colors.primary);
        }
    };

    const updateApplicationStatus = async (id: string, status: 'pending' | 'approved' | 'rejected', rejectionReason?: string) => {
        const updateFields: any = { status };
        if (status === 'approved') {
            updateFields.paymentStatus = 'paid';
            updateFields.approvedAt = serverTimestamp();
            if (rejectionReason) {
                updateFields.adminRemarks = rejectionReason;
            }
        }
        if (status === 'rejected') {
            updateFields.rejectionReason = rejectionReason || '';
            updateFields.adminRemarks = rejectionReason || '';
            updateFields.rejectedAt = serverTimestamp();
        }
        await updateDoc(doc(db, 'membership_applications', id), updateFields);

        if (status === 'rejected') {
            try {
                const appSnap = await getDoc(doc(db, 'membership_applications', id));
                const appData = appSnap.data() as any;
                if (appData) {
                    const applicantUid = appData.uid;
                    if (applicantUid) {
                        await updateDoc(doc(db, 'users', applicantUid), {
                            membershipStatus: 'rejected',
                            ...(rejectionReason ? { adminRemarks: rejectionReason } : {})
                        }).catch(() => {});
                    }

                    await addDoc(collection(db, 'member_notifications'), {
                        uid: appData.uid || null,
                        clinicId: appData.uid || null,
                        email: appData.email || null,
                        link: 'membership',
                        type: 'membership_rejected',
                        title: 'Membership Application Not Approved',
                        body: rejectionReason
                            ? `Your PAHA membership application was not approved. Remarks: ${rejectionReason}`
                            : 'Your PAHA membership application was not approved.',
                        read: false,
                        createdAt: serverTimestamp(),
                    });

                    // Admin-side audit notification — mirrors the "Membership Approved"
                    // notification below so rejections show up in the admin feed too.
                    const rejectedFullName = (appData as any).fullName || (appData as any).ownerName
                        || `${appData.firstName || ''} ${appData.lastName || ''}`.trim() || 'An applicant';
                    await addDoc(collection(db, 'admin_notifications'), {
                        type: 'application',
                        title: 'Membership Rejected',
                        body: rejectionReason
                            ? `${rejectedFullName}'s membership application was rejected. Reason: ${rejectionReason}`
                            : `${rejectedFullName}'s membership application was rejected.`,
                        link: 'applications',
                        read: false,
                        createdAt: serverTimestamp(),
                    }).catch(() => {});
                }
            } catch (err) {
                console.error('[AdminContext] Error sending rejection notification:', err);
            }
        }

        if (status === 'approved') {
            try {
                const appRef = doc(db, 'membership_applications', id);
                const appSnap = await getDoc(appRef);
                if (appSnap.exists()) {
                    const appData = appSnap.data() as MembershipApplicationData;
                    
                    const fullName = (appData as any).fullName || (appData as any).ownerName || `${appData.firstName || ''} ${appData.lastName || ''}`.trim();
                    const memberData = {
                        name: fullName,
                        email: appData.email,
                        phone: (appData as any).mobile || (appData as any).phone || '',
                        address: appData.clinicAddress || (appData as any).clinicAddress || '',
                        type: appData.type || 'Regular',
                        headVeterinarian: appData.hospitalName || (appData as any).clinicName || '',
                        joinedAt: new Date().toISOString()
                    };

                    const membersRef = collection(db, 'members');
                    const qMembers = query(membersRef, where('email', '==', appData.email));
                    const memberSnap = await getDocs(qMembers);

                    if (memberSnap.empty) {
                        await addDoc(membersRef, memberData);
                    } else {
                        const existingDocId = memberSnap.docs[0].id;
                        await updateDoc(doc(db, 'members', existingDocId), {
                            name: fullName,
                            phone: (appData as any).mobile || (appData as any).phone || '',
                            address: appData.clinicAddress || (appData as any).clinicAddress || '',
                            type: appData.type || 'Regular',
                            headVeterinarian: appData.hospitalName || (appData as any).clinicName || ''
                        });
                    }

                    // Set user profile's hasPaid = true and isCertifiedMember = true so they are certified
                    const applicantUid = (appData as any).uid;
                    if (applicantUid) {
                        await updateDoc(doc(db, 'users', applicantUid), {
                            hasPaid: true,
                            paidAt: new Date().toISOString(),
                            isCertifiedMember: true,
                            membershipStatus: 'approved',
                            role: 'PAHA Member',
                            ...(rejectionReason ? { adminRemarks: rejectionReason } : {})
                        });
                    }

                    // Notify the member that their application was approved
                    await addDoc(collection(db, 'member_notifications'), {
                        uid: applicantUid || null,
                        clinicId: applicantUid || null,
                        email: appData.email || null,
                        type: 'membership_approved',
                        title: 'Membership Application Approved 🎉',
                        body: rejectionReason
                            ? `Congratulations! Your PAHA membership application has been approved as a Certified Member. Remarks: ${rejectionReason}`
                            : 'Congratulations! Your PAHA membership application has been approved. Welcome to PAHA as a Certified Member.',
                        link: 'membership',
                        read: false,
                        createdAt: serverTimestamp(),
                    }).catch(() => {});
                    
                    // Notify admin
                    await addDoc(collection(db, 'admin_notifications'), {
                        type: 'application',
                        title: 'Membership Approved',
                        body: `${fullName}'s membership application has been approved.`,
                        link: 'applications',
                        read: false,
                        createdAt: serverTimestamp(),
                    }).catch(() => {});
                }
            } catch (err) {
                console.error('[AdminContext] Error copying approved applicant to members:', err);
            }
        }
    };

    const deleteApplication = async (id: string) => {
        const appSnap = await getDoc(doc(db, 'membership_applications', id));
        const appData = appSnap.data() as any;
        const uid = appData?.uid;
        const email = appData?.email;
        const memberDocId = id;

        if (uid || email) {
            const idToken = await auth.currentUser?.getIdToken() ?? null;
            const deleteAccount = httpsCallable(functions, 'deleteMemberAccount');
            await deleteAccount({ uid, email, idToken, memberDocId });
        }

        await deleteDoc(doc(db, 'membership_applications', id)).catch(() => {});
    };

    const updatePageSection = async (pageId: string, sectionId: string, updates: Partial<PageSection>) => {
        const page = pages[pageId];
        if (!page) return;

        const syncKey = `${pageId}-${sectionId}`;
        try {
            updateSyncStatus(syncKey, 'syncing');
            
            const updatedSections = page.sections.map(sec =>
                sec.id === sectionId ? { ...sec, ...updates, style: { ...sec.style, ...updates.style }, content: { ...sec.content, ...updates.content } } : sec
            );

            const updatedPage = { ...page, sections: updatedSections };
            await setDoc(doc(db, 'pages', pageId), updatedPage);
            updateSyncStatus(syncKey, 'synced');
        } catch (err) {
            console.error(err);
            updateSyncStatus(syncKey, 'error');
        }
    };

    const updatePage = async (pageId: string, updates: Partial<PageContent>) => {
        await updateDoc(doc(db, 'pages', pageId), updates);
    };

    const addMember = async (member: Omit<MemberProfile, 'id'>) => {
        await addDoc(collection(db, 'members'), {
            ...member,
            joinedAt: new Date().toISOString(),
            createdAt: new Date().toISOString()
        });
    };

    const updateMember = async (id: string, updates: Partial<MemberProfile>) => {
        await updateDoc(doc(db, 'members', id), updates);
    };

    // Resolves the linked auth uid + email for a `members` doc, since the
    // member directory entry doesn't always store the uid directly.
    const resolveMemberAccount = async (id: string): Promise<{ uid?: string; email?: string }> => {
        let uid: string | undefined;
        let email: string | undefined;
        try {
            const memberSnap = await getDoc(doc(db, 'members', id));
            const memberData = memberSnap.data() as any;
            email = memberData?.email;
            uid = memberData?.uid;

            if (!uid && email) {
                const appSnap = await getDocs(query(collection(db, 'membership_applications'), where('email', '==', email)));
                uid = appSnap.docs[0]?.data()?.uid;
            }
            // members docs created via the paycools webhook use the uid as the doc id
            if (!uid) {
                const userSnap = await getDoc(doc(db, 'users', id));
                if (userSnap.exists()) uid = id;
            }
        } catch (err) {
            console.error('[AdminContext] Error resolving linked account:', err);
        }
        return { uid, email };
    };

    const toggleMemberActive = async (id: string, deactivate: boolean) => {
        const { uid } = await resolveMemberAccount(id);
        await updateDoc(doc(db, 'members', id), { deactivated: deactivate });
        if (uid) {
            await updateDoc(doc(db, 'users', uid), {
                accountStatus: deactivate ? 'deactivated' : 'active',
            });
            await addDoc(collection(db, 'member_notifications'), {
                uid,
                clinicId: uid,
                type: deactivate ? 'membership_deactivated' : 'membership_reactivated',
                title: deactivate ? 'Account Deactivated' : 'Account Reactivated',
                body: deactivate
                    ? 'Your PAHA membership account has been deactivated by an administrator. Contact PAHA support for assistance.'
                    : 'Your PAHA membership account has been reactivated. Welcome back!',
                link: 'membership',
                read: false,
                createdAt: serverTimestamp(),
            }).catch(() => {});
        }
    };

    const deleteMember = async (id: string) => {
        const { uid, email } = await resolveMemberAccount(id);
        console.log('[AdminContext] deleteMember called for', { id, uid, email });

        if (!uid && !email) {
            throw new Error('Could not resolve member account - no uid or email found');
        }

        if (uid || email) {
            const idToken = await auth.currentUser?.getIdToken() ?? null;
            try {
                const deleteAccount = httpsCallable(functions, 'deleteMemberAccount');
                const result = await deleteAccount({ uid, email, idToken, memberDocId: id });
                console.log('[AdminContext] Cloud Function delete result:', result);
            } catch (err) {
                console.error('[AdminContext] Cloud Function permanent deletion failed:', err);
                throw err;
            }
        }

        // Remove the directory entry regardless (no-op if the CF already deleted it)
        await deleteDoc(doc(db, 'members', id)).catch(() => {});
        
        // Also ensure the user profile is deleted if uid was resolved
        if (uid) {
            await deleteDoc(doc(db, 'users', uid)).catch(() => {});
        }
    };


    const addEvent = async (event: Omit<Event, 'id'> & { id?: string }) => {
        const { id, ...data } = event;
        const eventData = {
            ...data,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };
        
        if (id) {
            await setDoc(doc(db, 'events', id), eventData);
        } else {
            await addDoc(collection(db, 'events'), eventData);
        }
    };

    const updateEvent = async (id: string, updates: Partial<Event>) => {
        const eventData = {
            ...updates,
            updatedAt: serverTimestamp(),
        };
        await updateDoc(doc(db, 'events', id), eventData);
    };

    const updateEventPartial = async (id: string, updates: Partial<Event>) => {
        await setDoc(doc(db, 'events', id), updates, { merge: true });
    };

    const deleteFile = async (path: string) => {
        try {
            const fileRef = ref(storage, path);
            await deleteObject(fileRef);
        } catch (error) {
            console.error("Error deleting file:", error);
        }
    };

    const getNewEventId = () => {
        return doc(collection(db, 'events')).id;
    };

    const deleteEvent = async (id: string) => {
        try {
            const event = events.find(e => e.id === id);
            
            // 1. Delete associated files
            if (event) {
                // If there's an image string that resembles a firebase path, we ideally delete it.
                // But specifically we have galleryImages, highlightsVideoPath, videoUrl.
                if (event.highlightsVideoPath) await deleteFile(event.highlightsVideoPath);
                if (event.galleryImages) {
                    for (const img of event.galleryImages) {
                        if (img.path) await deleteFile(img.path);
                    }
                }
            }

            // 2. Delete all related event registrations
            const eventRegistrations = registrations.filter(r => r.eventId === id);
            for (const reg of eventRegistrations) {
                await deleteDoc(doc(db, 'event_registrations', reg.id));
            }

            // 3. Delete the event itself
            await deleteDoc(doc(db, 'events', id));
        } catch (error) {
            console.error("Error completely deleting event:", error);
            throw error;
        }
    };

    const addAnnouncement = async (announcement: Omit<Announcement, 'id'>) => {
        await addDoc(collection(db, 'announcements'), announcement);
    };

    const updateAnnouncement = async (id: string, updates: Partial<Announcement>) => {
        await updateDoc(doc(db, 'announcements', id), updates);
    };

    const deleteAnnouncement = async (id: string) => {
        await deleteDoc(doc(db, 'announcements', id));
    };



    const addEventRegistration = async (reg: Omit<EventRegistration, 'id' | 'registrationDate' | 'paymentStatus'> & { paymentReference?: string }): Promise<string> => {
        const newReg = {
            ...reg,
            registrationDate: new Date().toISOString(),
            paymentStatus: 'pending'
        };
        const docRef = await addDoc(collection(db, 'event_registrations'), newReg);

        const event = events.find(e => e.id === reg.eventId);
        if (event) {
            await updateDoc(doc(db, 'events', event.id), {
                registeredCount: (event.registeredCount || 0) + 1
            });
        }

        await notifyAdmin({
            type: 'registration',
            title: 'New Event Registration',
            body: `${reg.attendeeName || reg.attendeeEmail || 'Someone'} registered for "${event?.title || 'an event'}".`,
            link: 'events',
        });

        return docRef.id;
    };

    const updateEventRegistrationPaymentStatus = async (id: string, status: 'pending' | 'paid' | 'refunded') => {
        await updateDoc(doc(db, 'event_registrations', id), { paymentStatus: status });
    };

    const updateEventRegistration = async (id: string, updates: Partial<EventRegistration>) => {
        await updateDoc(doc(db, 'event_registrations', id), updates);
    };

    const deleteEventRegistration = async (id: string) => {
        const registration = registrations.find(r => r.id === id);
        if (registration) {
            const event = events.find(e => e.id === registration.eventId);
            if (event) {
                await updateDoc(doc(db, 'events', event.id), {
                    registeredCount: Math.max(0, (event.registeredCount || 1) - 1)
                });
            }
        }
        await deleteDoc(doc(db, 'event_registrations', id));
    };

    // Helper: Optimize File for Storage Upload (returns File object)
    const processFileForUpload = async (file: File): Promise<File> => {
        if (!file.type.startsWith('image/')) return file; // Only images for now

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1920; // Full HD max
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp";
                            resolve(new File([blob], newName, { type: 'image/webp' }));
                        } else {
                            resolve(file); // Fallback to original
                        }
                    }, 'image/webp', 0.85); // High quality for storage
                };
                img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
    };

    const uploadImage = async (file: File): Promise<string> => {
        try {
            const result = await uploadFile(file, 'images');
            return result.url;
        } catch (error) {
            console.error("Error uploading image to storage:", error);
            throw new Error("Failed to upload image");
        }
    };

    const uploadFile = async (file: File, path: string, onProgress?: (progress: number) => void): Promise<{ url: string; path: string }> => {
        // Automatically optimize images before upload
        const optimizedFile = await processFileForUpload(file);
        
        return new Promise((resolve, reject) => {
            const fullPath = `${path}/${Date.now()}_${optimizedFile.name}`;
            const storageRef = ref(storage, fullPath);
            const uploadTask = uploadBytesResumable(storageRef, optimizedFile);

            uploadTask.on(
                'state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    if (onProgress) onProgress(progress);
                },
                (error) => {
                    console.error("Upload failed:", error);
                    reject(error);
                },
                async () => {
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    resolve({ url: downloadURL, path: fullPath });
                }
            );
        });
    };

    const resetPageToDefault = async (pageId: string) => {
        if (defaultPages[pageId]) {
            if (confirm(`Are you sure you want to reset the "${defaultPages[pageId].title}" page layout to default? This will overwrite your current content changes for this page.`)) {
                try {
                    await setDoc(doc(db, 'pages', pageId), defaultPages[pageId]);
                    console.log(`Page ${pageId} reset to default.`);
                    alert(`Successfully reset ${pageId}!`);
                } catch (error: any) {
                    console.error("Reset failed:", error);
                    alert("Failed to reset: " + (error?.message || "Unknown database error"));
                }
            }
        }
    };

    const addCommitteeMember = async (member: Omit<CommitteeMember, 'id'>) => {
        await addDoc(collection(db, 'committee_members'), member);
    };

    const updateCommitteeMember = async (id: string, updates: Partial<CommitteeMember>) => {
        await updateDoc(doc(db, 'committee_members', id), updates);
    };

    const deleteCommitteeMember = async (id: string) => {
        await deleteDoc(doc(db, 'committee_members', id));
    };

    const updateCommitteeCover = async (committeeId: string, imageUrl: string) => {
        await setDoc(doc(db, 'settings', 'committeeCovers'), { [committeeId]: imageUrl }, { merge: true });
    };


    const addFormerOfficer = async (officer: Omit<FormerOfficer, 'id'>) => {
        await addDoc(collection(db, 'former_officers'), officer);
    };

    const updateFormerOfficer = async (id: string, updates: Partial<FormerOfficer>) => {
        await updateDoc(doc(db, 'former_officers', id), updates);
    };

    const deleteFormerOfficer = async (id: string) => {
        await deleteDoc(doc(db, 'former_officers', id));
    };

    const addPartner = async (partner: Omit<PartnerLogo, 'id'>) => {
        await addDoc(collection(db, 'partners'), partner);
    };

    const updatePartner = async (id: string, updates: Partial<PartnerLogo>) => {
        await updateDoc(doc(db, 'partners', id), updates);
    };

    const deletePartner = async (id: string) => {
        const partner = partners.find(p => p.id === id);
        if (partner?.imagePath) {
            await deleteFile(partner.imagePath);
        }
        await deleteDoc(doc(db, 'partners', id));
    };

    const addAdminNotification = async (n: Omit<AdminNotification, 'id' | 'read' | 'createdAt'>) => {
        await addDoc(collection(db, 'admin_notifications'), {
            ...n,
            read: false,
            createdAt: serverTimestamp(),
        });
    };

    const markNotificationRead = async (id: string) => {
        await updateDoc(doc(db, 'admin_notifications', id), { read: true });
    };

    const markAllNotificationsRead = async () => {
        const unread = notifications.filter(n => !n.read);
        await Promise.all(unread.map(n => updateDoc(doc(db, 'admin_notifications', n.id), { read: true })));
    };

    const unreadNotificationCount = notifications.filter(n => !n.read).length;

    return (
        <AdminContext.Provider value={{
            messages, applications, accreditationSubmissions, siteConfig, pages, members, events, announcements, registrations,
            committeeMembers, committeeCovers,
            addMessage, addApplication, updateSiteConfig, updateApplicationStatus, deleteApplication, updatePageSection, updatePage,
            addMember, updateMember, deleteMember, toggleMemberActive,
            addEvent, updateEvent, deleteEvent,
            addAnnouncement, updateAnnouncement, deleteAnnouncement,
            addEventRegistration, updateEventRegistrationPaymentStatus, 
            updateEventRegistration, deleteEventRegistration,
            uploadImage, uploadFile, processFileForUpload,
            updateEventPartial, deleteFile, getNewEventId, resetPageToDefault,
            addCommitteeMember, updateCommitteeMember, deleteCommitteeMember, updateCommitteeCover,
            formerOfficers, addFormerOfficer, updateFormerOfficer, deleteFormerOfficer,
            partners, addPartner, updatePartner, deletePartner,
            syncStatus,
            notifications, unreadNotificationCount, markNotificationRead, markAllNotificationsRead, addAdminNotification,
            accreditationApplications,
            }}>
            {children}
        </AdminContext.Provider>
    );
};

export const useAdmin = () => {
    const context = useContext(AdminContext);
    if (!context) {
        throw new Error('useAdmin must be used within an AdminProvider');
    }
    return context;
};
