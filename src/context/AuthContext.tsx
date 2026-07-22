import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    onAuthStateChanged,
    type User,
    signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const SUPER_ADMIN_EMAILS = [
    'admin@paha.ph',
    'admin@gmail.com',
    'support@paha.ph',
    'cesartrongcoso@gmail.com',
    'admin@paha.com',
    'john@paha.com'
];

export type AdminRole = 'super_admin' | 'admin' | 'viewer';

export const ALL_SECTIONS = [
    { id: 'dashboard',       label: 'Dashboard' },
    { id: 'messages',        label: 'Inquiries' },
    { id: 'inbox',           label: 'Inbox' },
    { id: 'applications',    label: 'Applications' },
    { id: 'accreditation',   label: 'Accreditation' },
    { id: 'events',          label: 'Events Hub' },
    { id: 'announcements',   label: 'Broadcasts' },
    { id: 'members',         label: 'Members' },
    { id: 'accredited',      label: 'Clinics' },
    { id: 'cms',             label: 'Editor' },
    { id: 'partners',        label: 'Partners' },
    { id: 'committees',      label: 'Committees' },
    { id: 'former_officers', label: 'Archives' },
];

interface AuthContextType {
    user: User | null;
    profile: any | null;
    loading: boolean;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    adminRole: AdminRole | null;
    allowedSections: string[];
    canEdit: boolean;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [adminRole, setAdminRole] = useState<AdminRole | null>(null);
    const [allowedSections, setAllowedSections] = useState<string[]>([]);
    const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Tracks whether this uid's profile doc has ever successfully loaded, so we
    // can tell "brand-new signup, doc not created yet" (never had one) apart
    // from "account was just deleted out from under an active session" (had
    // one, now it's gone) — only the latter should force an immediate sign-out.
    const hadProfileRef = useRef(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
            setUser(firebaseUser);

            if (firebaseUser) {
                const isSuper = firebaseUser.email
                    ? SUPER_ADMIN_EMAILS.includes(firebaseUser.email.toLowerCase())
                    : false;
                setIsSuperAdmin(isSuper);

                if (isSuper) {
                    setIsAdmin(true);
                    setAdminRole('super_admin');
                    setAllowedSections(ALL_SECTIONS.map(s => s.id));
                }

                hadProfileRef.current = false;
                const profileRef = doc(db, 'users', firebaseUser.uid);
                const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
                    if (docSnap.exists()) {
                        hadProfileRef.current = true;
                        const data = docSnap.data();
                        setProfile(data);

                        if (isSuper) {
                            setAdminRole('super_admin');
                            setAllowedSections(ALL_SECTIONS.map(s => s.id));
                            setIsAdmin(true);
                        } else {
                            const role: AdminRole = data.adminRole || (data.role === 'admin' ? 'admin' : null);
                            setAdminRole(role);
                            const sections: string[] = data.allowedSections || [];
                            setAllowedSections(sections);
                            setIsAdmin(role === 'admin' || role === 'viewer' || data.isAdmin === true);
                        }
                    } else {
                        setProfile(null);
                        if (!isSuper) {
                            setAdminRole(null);
                            setAllowedSections([]);
                            setIsAdmin(false);
                        }
                        if (hadProfileRef.current && !isSuper) {
                            // The account had a valid profile before and it just
                            // vanished — an admin deletion mid-session. Force
                            // this browser tab to log out immediately instead of
                            // leaving them stuck on a dead dashboard with a live
                            // Auth session.
                            firebaseSignOut(auth).catch(() => {});
                        } else if (!isSuper) {
                            // Ambiguous case on first load: either a brand-new
                            // signup (the profile doc is written moments after
                            // account creation) or a page reload for an account
                            // that was deleted earlier. Give the signup flow a
                            // grace period to finish writing the doc; if it still
                            // hasn't appeared, treat it as deleted and sign out.
                            const uidAtCheck = firebaseUser.uid;
                            setTimeout(() => {
                                if (!hadProfileRef.current && auth.currentUser?.uid === uidAtCheck) {
                                    firebaseSignOut(auth).catch(() => {});
                                }
                            }, 5000);
                        }
                    }
                    setLoading(false);
                }, (error) => {
                    if (error?.code !== 'permission-denied') {
                        console.warn("Profile fetch error:", error?.code || error);
                    }
                    setIsAdmin(isSuper);
                    setLoading(false);
                });

                return () => unsubscribeProfile();
            } else {
                setProfile(null);
                setIsAdmin(false);
                setIsSuperAdmin(false);
                setAdminRole(null);
                setAllowedSections([]);
                setLoading(false);
            }
        });

        return () => unsubscribeAuth();
    }, []);

    // ── Inactivity auto-logout (member accounts only) ──────────────────────
    useEffect(() => {
        if (!user || isAdmin) return;

        const resetTimer = () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            inactivityTimer.current = setTimeout(async () => {
                try {
                    await updateDoc(doc(db, 'users', user.uid), { isLoggedIn: false, sessionToken: null });
                } catch (_) {}
                localStorage.removeItem('paha_session_token');
                await firebaseSignOut(auth);
            }, INACTIVITY_TIMEOUT_MS);
        };

        const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
        events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
        resetTimer();

        return () => {
            if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
            events.forEach(e => window.removeEventListener(e, resetTimer));
        };
    }, [user, isAdmin]);

    const signOut = async () => {
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), { isLoggedIn: false, sessionToken: null });
            } catch (e) {
                // ignore if doc doesn't exist
            }
        }
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('paha_session_token');
        await firebaseSignOut(auth);
    };

    const canEdit = adminRole === 'super_admin' || adminRole === 'admin';

    return (
        <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSuperAdmin, adminRole, allowedSections, canEdit, signOut }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
