import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { signInWithEmailAndPassword, signOut as firebaseSignOut, setPersistence, browserLocalPersistence, sendEmailVerification } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAppearance } from '../hooks/useAppearance';
import { useAdmin } from '../context/AdminContext';
import { getEmbeddableUrl } from '../utils/portalUrl';
import MembershipFormModal from '../components/MembershipFormModal';

const ADMIN_EMAILS = [
    'admin@paha.ph', 'admin@gmail.com', 'support@paha.ph',
    'cesartrongcoso@gmail.com', 'admin@paha.com', 'john@paha.com'
];



// ─── Features ──────────────────────────────────────────────────────
const features = [
    { icon: 'dashboard', label: 'Member Dashboard', desc: 'Manage your clinic profile and data' },
    { icon: 'calendar_month', label: 'Event Access', desc: 'Register for CPD seminars & events' },
    { icon: 'card_membership', label: 'Membership Portal', desc: 'Track membership status & renewals' },
];

// ─── Main Component ────────────────────────────────────────────────
const MemberLogin: React.FC = () => {
    const navigate = useNavigate();
    const { logoUrl } = useAppearance();
    const { siteConfig } = useAdmin();
    const [searchParams] = useSearchParams();
    const nextUrl = searchParams.get('next') || '';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [showApplicationForm, setShowApplicationForm] = useState(false);
    const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
    const [videoPlaying, setVideoPlaying] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setUnverifiedEmail(null);

        if (!email || !password) {
            setError('Please enter both email and password.');
            return;
        }

        setLoading(true);
        try {
            await setPersistence(auth, browserLocalPersistence);
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const user = cred.user;
            const uid = user.uid;
            const emailLower = (user.email || '').toLowerCase();

            // Block admin/super-admin accounts from using the member portal
            if (ADMIN_EMAILS.includes(emailLower)) {
                await firebaseSignOut(auth);
                setError('Admin accounts must use the Admin Portal, not the Member Portal.');
                setLoading(false);
                return;
            }
            const profileSnap = await getDoc(doc(db, 'users', uid));
            const data = profileSnap.data();
            if (data?.adminRole === 'admin' || data?.adminRole === 'viewer') {
                await firebaseSignOut(auth);
                setError('Admin accounts must use the Admin Portal, not the Member Portal.');
                setLoading(false);
                return;
            }

            // Step 1: Check email verification
            if (!user.emailVerified) {
                await firebaseSignOut(auth);
                setUnverifiedEmail(email);
                setError('Please verify your email first. Check your inbox and click the verification link.');
                setLoading(false);
                return;
            }

            // Step 2: All checks passed — mark session
            const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
            try {
                await setDoc(doc(db, 'users', uid), { isLoggedIn: true, sessionToken }, { merge: true });
            } catch { /* ignore */ }
            localStorage.setItem('paha_session_token', sessionToken);

            // Route directly to dashboard (or next URL) even if payment is pending
            if (nextUrl && nextUrl.startsWith('/')) {
                navigate(nextUrl);
            } else {
                navigate('/members');
            }
        } catch (err: unknown) {
            const code = (err as { code?: string }).code ?? '';
            if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
                setError('Invalid email or password. Please try again.');
            } else if (code === 'auth/too-many-requests') {
                setError('Too many failed attempts. Please try again later.');
            } else if (code === 'auth/invalid-email') {
                setError('Please enter a valid email address.');
            } else {
                setError('Login failed. Please check your credentials.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (showApplicationForm) {
        return (
            <MembershipFormModal
                isOpen={true}
                onClose={() => setShowApplicationForm(false)}
            />
        );
    }

    return (
        <div className="min-h-screen w-full flex font-display overflow-hidden" style={{ fontFamily: "'Inter', 'Outfit', sans-serif" }}>

            {/* ── LEFT PANEL ─────────────────────────────────────────── */}
            <div
                className="hidden lg:flex flex-col w-[52%] relative overflow-hidden"
                style={{
                    background: 'linear-gradient(145deg, #0a2240 0%, #0d3260 35%, #1a5276 65%, #0a2240 100%)',
                }}
            >
                {/* Animated mesh background */}
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div style={{
                        position: 'absolute', top: '-15%', left: '-10%',
                        width: '600px', height: '600px',
                        background: 'radial-gradient(circle, rgba(26,160,220,0.18) 0%, transparent 70%)',
                        borderRadius: '50%',
                        animation: 'floatBlob 8s ease-in-out infinite',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '-20%', right: '-15%',
                        width: '700px', height: '700px',
                        background: 'radial-gradient(circle, rgba(14,90,170,0.22) 0%, transparent 70%)',
                        borderRadius: '50%',
                        animation: 'floatBlob 10s ease-in-out infinite reverse',
                    }} />
                    {/* Grid overlay */}
                    <div style={{
                        position: 'absolute', inset: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '40px 40px',
                    }} />
                </div>

                <div className="relative z-10 flex flex-col h-full px-10 py-12">

                    {/* Logo & Title in one line with description underneath title */}
                    <div className="flex items-start gap-4 mb-10">
                        <img
                            src={logoUrl || "/paha-logo-light.png"}
                            alt="PAHA Logo"
                            className="h-16 w-auto object-contain drop-shadow-lg shrink-0"
                            style={{ filter: 'brightness(0) invert(1)' }}
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/paha-logo.png';
                            }}
                        />
                        <div className="flex flex-col">
                            <h1 className="text-2xl font-bold text-white leading-tight">
                                Philippine Animal Hospital <span style={{ color: '#5dade2' }}>Association, Inc.</span>
                            </h1>
                            <p className="text-blue-200 text-xs md:text-sm leading-relaxed max-w-xl opacity-90 mt-1">
                                Uplifting the veterinary profession through continuing education and community service across the Philippines.
                            </p>
                        </div>
                    </div>


                    {/* Video Guide Section */}
                    {siteConfig.applicationVideoUrl && (
                        <div className="mb-6 space-y-2">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-semibold text-white tracking-wider uppercase">Application Guide</h3>
                                <a 
                                    href={siteConfig.applicationVideoUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className="text-[10px] text-blue-300 hover:text-white flex items-center gap-1 transition-all duration-300"
                                >
                                    <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                                    Open Video
                                </a>
                            </div>
                            <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-xl border border-white/10 group">
                                {videoPlaying ? (
                                    /* Active iframe with autoplay=1 */
                                    (() => {
                                        const rawUrl = getEmbeddableUrl(siteConfig.applicationVideoUrl || '');
                                        const embedUrl = rawUrl ? rawUrl + (rawUrl.includes('?') ? '&' : '?') + 'autoplay=1&mute=0&rel=0' : '';
                                        return embedUrl ? (
                                            <iframe
                                                className="absolute inset-0 w-full h-full"
                                                src={embedUrl}
                                                title="How to Apply"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                                allowFullScreen
                                            />
                                        ) : null;
                                    })()
                                ) : (
                                    /* Thumbnail poster with play button */
                                    <button
                                        onClick={() => setVideoPlaying(true)}
                                        className="absolute inset-0 w-full h-full group/play cursor-pointer"
                                        aria-label="Play application guide video"
                                    >
                                        {/* Thumbnail image */}
                                        <img
                                            src="/video-thumbnail.png"
                                            alt="Application Guide Video"
                                            className="absolute inset-0 w-full h-full object-cover"
                                        />
                                        {/* Dark overlay */}
                                        <div className="absolute inset-0 bg-black/40 group-hover/play:bg-black/30 transition-all duration-300" />
                                        {/* Play button */}
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/60 flex items-center justify-center group-hover/play:scale-110 group-hover/play:bg-white/30 transition-all duration-300 shadow-2xl">
                                                <span className="material-symbols-outlined text-white text-3xl ml-1">play_arrow</span>
                                            </div>
                                        </div>
                                        {/* Label badge */}
                                        <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
                                            <span className="material-symbols-outlined text-red-400 text-sm">smart_display</span>
                                            <span className="text-white text-[10px] font-semibold tracking-wide">Watch: How to Apply</span>
                                        </div>
                                    </button>
                                )}
                                <div className="absolute inset-0 border-2 border-transparent group-hover:border-blue-400/50 rounded-xl transition-all pointer-events-none" />
                            </div>
                        </div>
                    )}

                    {/* Features */}
                    <div className="grid grid-cols-3 gap-3 mb-auto">
                        {features.map((f) => (
                            <div key={f.label} className="flex flex-col items-center text-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(93,173,226,0.15)' }}
                                >
                                    <span className="material-symbols-outlined text-blue-300 text-base">{f.icon}</span>
                                </div>
                                <div>
                                    <p className="text-white text-xs font-semibold leading-tight">{f.label}</p>
                                    <p className="text-blue-300 text-[10px] opacity-70 mt-0.5 leading-tight">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>


                </div>
            </div>

            {/* ── RIGHT PANEL ────────────────────────────────────────── */}
            <div
                className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden"
                style={{ background: '#f8fafc' }}
            >
                {/* Subtle background shapes */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div style={{
                        position: 'absolute', top: '-10%', right: '-10%',
                        width: '400px', height: '400px',
                        background: 'radial-gradient(circle, rgba(10,34,64,0.055) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '-5%', left: '-5%',
                        width: '300px', height: '300px',
                        background: 'radial-gradient(circle, rgba(26,82,118,0.05) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }} />
                </div>

                {/* Increased max-width for the form container */}
                <div className="relative z-10 w-full max-w-[460px]">

                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <img
                            src={logoUrl || "/paha-logo.png"}
                            alt="PAHA Logo"
                            className="h-14 w-auto object-contain"
                        />
                    </div>

                    {/* Card */}
                    <div
                        className="rounded-3xl p-10"
                        style={{
                            background: '#ffffff',
                            boxShadow: '0 10px 50px rgba(10,34,64,0.12), 0 2px 6px rgba(10,34,64,0.04)',
                            border: '1px solid rgba(10,34,64,0.06)',
                        }}
                    >
                        {/* Header (Removed Icon) */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Clinic Portal</h2>
                            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                                Sign in to your PAHA member account
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                className="mb-6"
                            >
                                <div
                                    className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                                    style={{
                                        background: '#fff5f5',
                                        border: '1px solid #fed7d7',
                                        color: '#c53030',
                                    }}
                                >
                                    <span className="material-symbols-outlined text-lg flex-shrink-0 mt-0.5">error</span>
                                    <span>{error}</span>
                                </div>
                                {unverifiedEmail && (
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            try {
                                                const cred = await signInWithEmailAndPassword(auth, email, password);
                                                await sendEmailVerification(cred.user);
                                                await firebaseSignOut(auth);
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
                        <form onSubmit={handleLogin} className="space-y-6">

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-600 uppercase tracking-wider ml-1">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <span
                                        className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors"
                                        style={{ color: focusedField === 'email' ? '#1a5276' : '#94a3b8' }}
                                    >
                                        mail
                                    </span>
                                    <input
                                        id="login-email"
                                        name="login-email"
                                        type="email"
                                        autoComplete="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        onFocus={() => setFocusedField('email')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="name@clinic.com"
                                        className="w-full pl-11 pr-5 py-3.5 text-base rounded-xl text-slate-900 outline-none transition-all"
                                        style={{
                                            background: '#f8fafc',
                                            border: focusedField === 'email'
                                                ? '2px solid #1a5276'
                                                : '2px solid #f1f5f9',
                                            boxShadow: focusedField === 'email'
                                                ? '0 0 0 4px rgba(26,82,118,0.08)'
                                                : 'none',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Password</label>
                                    <a
                                        href="#"
                                        className="text-xs font-semibold transition-colors hover:underline"
                                        style={{ color: '#1a5276' }}
                                    >
                                        Forgot password?
                                    </a>
                                </div>
                                <div className="relative">
                                    <span
                                        className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors"
                                        style={{ color: focusedField === 'password' ? '#1a5276' : '#94a3b8' }}
                                    >
                                        lock
                                    </span>
                                    <input
                                        id="login-password"
                                        name="login-password"
                                        type={showPassword ? 'text' : 'password'}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="••••••••••••"
                                        className="w-full pl-11 pr-12 py-3.5 text-base rounded-xl text-slate-900 outline-none transition-all"
                                        style={{
                                            background: '#f8fafc',
                                            border: focusedField === 'password'
                                                ? '2px solid #1a5276'
                                                : '2px solid #f1f5f9',
                                            boxShadow: focusedField === 'password'
                                                ? '0 0 0 4px rgba(26,82,118,0.08)'
                                                : 'none',
                                            letterSpacing: showPassword ? 'normal' : '0.12em',
                                        }}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 transition-colors"
                                        style={{ color: '#94a3b8' }}
                                        tabIndex={-1}
                                    >
                                        <span className="material-symbols-outlined text-lg">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Remember me */}
                            <label className="flex items-center gap-3 cursor-pointer select-none ml-1">
                                <input type="checkbox" id="remember-me" name="remember-me" className="w-4 h-4 rounded accent-blue-900" />
                                <span className="text-sm text-slate-500 font-semibold">Keep me signed in</span>
                            </label>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 mt-2 rounded-xl text-white text-base font-semibold transition-all relative overflow-hidden flex items-center justify-center gap-3 uppercase tracking-widest"
                                style={{
                                    background: loading
                                        ? 'linear-gradient(135deg, #5d8298 0%, #7a9db5 100%)'
                                        : 'linear-gradient(135deg, #0a2240 0%, #1a5276 60%, #2e86c1 100%)',
                                    boxShadow: loading ? 'none' : '0 10px 30px rgba(10,34,64,0.35)',
                                }}
                            >
                                {loading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                        <div className="flex items-center gap-4 my-8">
                            <div className="flex-1 h-px bg-slate-100" />
                            <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">Register</span>
                            <div className="flex-1 h-px bg-slate-100" />
                        </div>

                        {/* Register CTA */}
                        <div className="text-center font-semibold">
                            <p className="text-sm text-slate-500">
                                Not yet a member?{' '}
                                <button
                                    type="button"
                                    onClick={() => setShowApplicationForm(true)}
                                    className="font-semibold transition-colors hover:underline"
                                    style={{ color: '#1a5276' }}
                                >
                                    Create an account
                                </button>
                            </p>
                        </div>
                    </div>

                    {/* Back to site */}
                    <div className="text-center mt-8">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-slate-800 transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Return to Website
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CSS Animations ──────────────────────────────────── */}
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                @keyframes floatBlob {
                    0%, 100% { transform: translateY(0) scale(1); }
                    50%       { transform: translateY(-30px) scale(1.04); }
                }
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
                .animate-spin {
                    animation: spin 0.8s linear infinite;
                }
                input::placeholder { color: #cbd5e1; }
            `}</style>

            {/* Membership Application Form */}
            <MembershipFormModal
                isOpen={showApplicationForm}
                onClose={() => setShowApplicationForm(false)}
            />
        </div>
    );
};

export default MemberLogin;
