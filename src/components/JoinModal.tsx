import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import { useAdmin } from '../context/AdminContext';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, setPersistence, browserLocalPersistence, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import MembershipFormModal from './MembershipFormModal';
import { getEmbeddableUrl } from '../utils/portalUrl';

const ADMIN_EMAILS = ['admin@paha.ph', 'admin@gmail.com', 'support@paha.ph', 'cesartrongcoso@gmail.com', 'admin@paha.com', 'john@paha.com'];

interface JoinModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const JoinModal: React.FC<JoinModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const { siteConfig } = useAdmin();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPass, setShowPass] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setUnverifiedEmail(null);
        if (!email || !password) { setError('Please enter email and password.'); return; }
        setLoading(true);
        try {
            await setPersistence(auth, browserLocalPersistence);
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const user = cred.user;
            const uid = user.uid;
            const emailLower = (user.email || '').toLowerCase();
            if (ADMIN_EMAILS.includes(emailLower)) {
                await firebaseSignOut(auth);
                setError('Admin accounts must use the Admin Portal.');
                setLoading(false); return;
            }
            const profileSnap = await getDoc(doc(db, 'users', uid));
            const data = profileSnap.data();
            if (data?.adminRole === 'admin' || data?.adminRole === 'viewer') {
                await firebaseSignOut(auth);
                setError('Admin accounts must use the Admin Portal.');
                setLoading(false); return;
            }

            // Step 1: Check email verification
            if (!user.emailVerified) {
                await firebaseSignOut(auth);
                setUnverifiedEmail(email);
                setError('Please verify your email first. Check your inbox and click the verification link.');
                setLoading(false); return;
            }


            const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
            try {
                await setDoc(doc(db, 'users', uid), { isLoggedIn: true, sessionToken }, { merge: true });
            } catch { /* ignore */ }
            localStorage.setItem('paha_session_token', sessionToken);
            onClose();
            navigate('/members');
        } catch (err: any) {
            const code = err.code || '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError('Invalid email or password.');
            } else if (code === 'auth/too-many-requests') {
                setError('Too many attempts. Try again later.');
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } finally { setLoading(false); }
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            gsap.fromTo('.join-modal-backdrop',
                { opacity: 0 },
                { opacity: 1, duration: 0.3 }
            );
            gsap.fromTo('.join-modal-content',
                { y: 50, opacity: 0, scale: 0.95 },
                { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.2)', delay: 0.1 }
            );
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    if (showApplicationForm) {
        return (
            <MembershipFormModal
                isOpen={true}
                onClose={() => setShowApplicationForm(false)}
            />
        );
    }

    return (
        <>
            <div className="fixed inset-0 z-[10000] join-modal-root">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm join-modal-backdrop"
                    onClick={onClose}
                />

                {/* Scrollable Layer */}
                <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4 sm:p-6 no-scrollbar pointer-events-none">

                    <div className="join-modal-content relative w-full max-w-4xl bg-white dark:bg-charcoal rounded-[2rem] shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col md:flex-row pointer-events-auto">

                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 z-20 group size-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-white/20 backdrop-blur-md text-white border border-white/20 transition-all duration-300 active:scale-90"
                            aria-label="Close"
                        >
                            <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                            <div className="absolute inset-0 rounded-2xl border border-white/40 scale-110 opacity-0 group-hover:scale-100 group-hover:opacity-100 transition-all duration-300" />
                        </button>

                        {/* ── LEFT: Video Guide ── */}
                        <div className="w-full md:w-1/2 bg-slate-900 border-b md:border-b-0 md:border-r border-white/10 relative p-6 flex flex-col justify-center min-h-[380px]">
                            <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1576086213369-97a306d36557?q=80&w=2080&auto=format&fit=crop')] bg-cover bg-center" />
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div>
                                    <div className="flex items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="inline-block px-2.5 py-0.5 bg-primary/20 text-primary border border-primary/30 rounded-full text-[10px] font-semibold uppercase tracking-wider shadow-sm">
                                                Application Guide
                                            </span>
                                            <div className="px-2.5 py-0.5 bg-green-500/10 text-green-500 border border-green-500/30 rounded-full text-[9px] font-semibold uppercase tracking-tighter flex items-center gap-1 shadow-sm">
                                                <span className="material-symbols-outlined text-[10px]">verified_user</span>
                                                Secure
                                            </div>
                                        </div>
                                        {siteConfig.applicationVideoUrl && (
                                            <a 
                                                href={siteConfig.applicationVideoUrl} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="text-[10px] text-primary hover:underline flex items-center gap-1 transition-all duration-300"
                                            >
                                                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                                Open Video
                                            </a>
                                        )}
                                    </div>
                                    <h3 className="text-xl font-semibold text-white mb-1 leading-tight">Watch How to Apply</h3>
                                    <p className="text-gray-400 text-xs mb-3">Follow this quick step-by-step video guide to register your clinic successfully.</p>
                                    <div className="relative aspect-[4/3] bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-pointer">
                                        <div className="absolute inset-0 w-[150%] h-[150%] scale-[0.6667] origin-top-left">
                                            {(() => {
                                                const rawUrl = getEmbeddableUrl(siteConfig.applicationVideoUrl || '');
                                                const embedUrl = rawUrl ? rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'autoplay=1&mute=1' : '';
                                                return isOpen && embedUrl ? (
                                                    <iframe
                                                        className="w-full h-full"
                                                        src={embedUrl}
                                                        title="How to Apply"
                                                        frameBorder="0"
                                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                        allowFullScreen
                                                    />
                                                ) : null;
                                            })()}
                                        </div>
                                        <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/50 rounded-2xl transition-all pointer-events-none" />
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-white/10">
                                    <h4 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">Incredible Benefits of Joining PAHA:</h4>
                                    <ul className="grid grid-cols-1 gap-1.5 text-[11px] text-gray-300">
                                        <li className="flex items-start gap-1.5">
                                            <span className="material-symbols-outlined text-green-400 text-[13px] mt-0.5">check_circle</span>
                                            <span>Discounted rates for all trainings, workshops, seminars, and conventions</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="material-symbols-outlined text-green-400 text-[13px] mt-0.5">check_circle</span>
                                            <span>Priority registration for events & free lectures during meetings</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="material-symbols-outlined text-green-400 text-[13px] mt-0.5">check_circle</span>
                                            <span>Round table discussions with top-notch speakers</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <span className="material-symbols-outlined text-green-400 text-[13px] mt-0.5">check_circle</span>
                                            <span>PAHA badge & discounted rates on vaccination cards</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT: Clinic Portal Login ── */}
                        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-center bg-gray-50 dark:bg-background-dark">
                            <div className="w-full max-w-sm mx-auto">
                                {/* Header */}
                                <div className="text-center mb-4">
                                    <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">Clinic Portal</h2>
                                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-1">Sign in to your PAHA member account</p>
                                </div>

                                {/* Error */}
                                {error && (
                                    <div className="mb-5">
                                        <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-semibold bg-red-50 border border-red-200 text-red-700">
                                            <span className="material-symbols-outlined text-lg flex-shrink-0 mt-0.5">error</span>
                                            <span>{error}</span>
                                        </div>
                                        {unverifiedEmail && (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    try {
                                                        await sendEmailVerification(auth.currentUser!);
                                                        alert('Verification email resent! Please check your inbox and spam folder.');
                                                        setUnverifiedEmail(null);
                                                        setError('');
                                                    } catch {
                                                        alert('Could not resend email. Please try again or contact PAHA support.');
                                                    }
                                                }}
                                                className="mt-3 w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-center"
                                                style={{ background: '#1a5276', color: 'white' }}
                                            >
                                                Resend Verification Email
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Form */}
                                <form onSubmit={handleLogin} className="space-y-5">
                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <label htmlFor="join-email" className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                                        <div className="relative">
                                            <span
                                                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors"
                                                style={{ color: focusedField === 'email' ? '#1a5276' : '#94a3b8' }}
                                            >mail</span>
                                            <input
                                                id="join-email"
                                                name="join-email"
                                                type="email"
                                                autoComplete="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onFocus={() => setFocusedField('email')}
                                                onBlur={() => setFocusedField(null)}
                                                placeholder="name@clinic.com"
                                                className="w-full pl-11 pr-5 py-3.5 text-sm rounded-xl text-slate-900 outline-none transition-all"
                                                style={{
                                                    background: '#f8fafc',
                                                    border: focusedField === 'email' ? '2px solid #1a5276' : '2px solid #f1f5f9',
                                                    boxShadow: focusedField === 'email' ? '0 0 0 4px rgba(26,82,118,0.08)' : 'none',
                                                }}
                                            />
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1.5">
                                        <div className="flex justify-between items-center">
                                            <label htmlFor="join-password" className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Password</label>
                                            <a href="#" className="text-xs font-semibold hover:underline" style={{ color: '#1a5276' }}>Forgot password?</a>
                                        </div>
                                        <div className="relative">
                                            <span
                                                className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors"
                                                style={{ color: focusedField === 'password' ? '#1a5276' : '#94a3b8' }}
                                            >lock</span>
                                            <input
                                                id="join-password"
                                                name="join-password"
                                                type={showPass ? 'text' : 'password'}
                                                autoComplete="current-password"
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                onFocus={() => setFocusedField('password')}
                                                onBlur={() => setFocusedField(null)}
                                                placeholder="••••••••••••"
                                                className="w-full pl-11 pr-12 py-3.5 text-sm rounded-xl text-slate-900 outline-none transition-all"
                                                style={{
                                                    background: '#f8fafc',
                                                    border: focusedField === 'password' ? '2px solid #1a5276' : '2px solid #f1f5f9',
                                                    boxShadow: focusedField === 'password' ? '0 0 0 4px rgba(26,82,118,0.08)' : 'none',
                                                    letterSpacing: showPass ? 'normal' : '0.12em',
                                                }}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPass(!showPass)}
                                                tabIndex={-1}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-lg">{showPass ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Keep signed in */}
                                    <label className="flex items-center gap-3 cursor-pointer select-none">
                                        <input type="checkbox" id="join-remember" name="join-remember" className="w-4 h-4 rounded accent-blue-900" />
                                        <span className="text-sm text-slate-500 font-semibold">Keep me signed in</span>
                                    </label>

                                    {/* Submit */}
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full py-4 rounded-xl text-white text-sm font-semibold uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                                        style={{
                                            background: loading
                                                ? 'linear-gradient(135deg, #5d8298 0%, #7a9db5 100%)'
                                                : 'linear-gradient(135deg, #0a2240 0%, #1a5276 60%, #2e86c1 100%)',
                                            boxShadow: loading ? 'none' : '0 8px 24px rgba(10,34,64,0.30)',
                                        }}
                                    >
                                        {loading ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                </svg>
                                                Signing In…
                                            </>
                                        ) : (
                                            <>
                                                Login to Account
                                                <span className="material-symbols-outlined text-lg">login</span>
                                            </>
                                        )}
                                    </button>
                                </form>

                                {/* Divider */}
                                <div className="flex items-center gap-4 my-6">
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Register</span>
                                    <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
                                </div>

                                {/* Register CTA */}
                                <p className="text-sm text-center text-slate-500 font-semibold">
                                    Not yet a member?{' '}
                                    <button
                                        type="button"
                                        onClick={() => setShowApplicationForm(true)}
                                        className="font-semibold hover:underline transition-colors"
                                        style={{ color: '#1a5276' }}
                                    >
                                        Create an account
                                    </button>
                                </p>
                            </div>
                        </div>

                    </div>
                </div>
            </div>

        </>
    );
};

export default JoinModal;
