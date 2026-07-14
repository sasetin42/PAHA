import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut as firebaseSignOut, setPersistence, browserLocalPersistence } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useAuth } from '../context/AuthContext';
import { useAppearance } from '../hooks/useAppearance';
import gsap from 'gsap';

const SUPER_ADMIN_EMAILS = [
    'admin@paha.ph', 'admin@gmail.com', 'support@paha.ph',
    'cesartrongcoso@gmail.com', 'admin@paha.com', 'john@paha.com'
];

// ─── Admin Stats (Mimics Member Portal style) ──────────────────────
const adminStats = [
    { icon: 'shield', label: 'Security Matrix', value: 'Alpha-Seven' },
    { icon: 'admin_panel_settings', label: 'Access Tier', value: 'Level 4 Admin' },
    { icon: 'lock', label: 'Gate Status', value: 'Secured' },
    { icon: 'dns', label: 'Uptime', value: '99.98%' },
];

// ─── Admin Features (Mimics Member Portal style) ───────────────────
const adminFeatures = [
    { icon: 'query_stats', label: 'Metric Oversight', desc: 'Real-time clinic statistics' },
    { icon: 'verified', label: 'Compliance Audit', desc: 'Verify accreditation docs' },
    { icon: 'outgoing_mail', label: 'Unified Comms', desc: 'Broadcast network alerts' },
];

const AdminLogin: React.FC = () => {
    const navigate = useNavigate();
    const { isAdmin, user, loading: authLoading } = useAuth();
    const { logoUrl } = useAppearance();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resetSent, setResetSent] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    // Entry Animation
    useEffect(() => {
        if (cardRef.current) {
            gsap.fromTo(cardRef.current, 
                { y: 40, opacity: 0 },
                { y: 0, opacity: 1, duration: 0.8, ease: 'power4.out' }
            );
        }
    }, []);

    // Redirect if already admin
    useEffect(() => {
        if (!authLoading && user && isAdmin) {
            navigate('/admin');
        }
    }, [user, isAdmin, authLoading, navigate]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await setPersistence(auth, browserLocalPersistence);
            const cred = await signInWithEmailAndPassword(auth, email, password);
            const uid = cred.user.uid;
            const emailLower = (cred.user.email || '').toLowerCase();

            // Check if this account has admin access
            const isSuperAdmin = SUPER_ADMIN_EMAILS.includes(emailLower);
            const profileSnap = await getDoc(doc(db, 'users', uid));
            const data = profileSnap.data();

            if (!isSuperAdmin) {
                const hasAdminRole = data?.adminRole === 'admin' || data?.adminRole === 'viewer' || data?.isAdmin === true;
                if (!hasAdminRole) {
                    await firebaseSignOut(auth);
                    setError('This account does not have admin access. Use the Member Portal instead.');
                    setLoading(false);
                    return;
                }
            }

            // Mark session as active
            const sessionToken = Math.random().toString(36).slice(2) + Date.now().toString(36);
            try {
                await setDoc(doc(db, 'users', uid), { isLoggedIn: true, sessionToken }, { merge: true });
            } catch (_) {
                // ignore
            }
            localStorage.setItem('paha_session_token', sessionToken);
        } catch (err: any) {
            console.error("Login Error:", err);
            if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Invalid administrative credentials.');
            } else if (err.code === 'auth/invalid-email') {
                setError('Please provide a valid administrative email.');
            } else {
                setError('Authentication service unavailable.');
            }
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Enter your admin email to receive a reset link.');
            return;
        }
        try {
            await setResetSent(false);
            await sendPasswordResetEmail(auth, email);
            setResetSent(true);
            setError('');
        } catch (err: any) {
            setError('Failed to transmit reset instructions.');
        }
    };

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
                                Nationwide animal healthcare coordination and secure administrative auditing protocols.
                            </p>
                        </div>
                    </div>
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-10">
                        {adminStats.map((s) => (
                            <div
                                key={s.label}
                                className="rounded-xl p-4 flex items-center gap-4"
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.10)',
                                }}
                            >
                                <div
                                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(93,173,226,0.20)' }}
                                >
                                    <span className="material-symbols-outlined text-blue-300 text-lg">{s.icon}</span>
                                </div>
                                <div>
                                    <p className="text-white text-lg font-semibold leading-none">{s.value}</p>
                                    <p className="text-blue-300 text-xs opacity-80 mt-1">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Features */}
                    <div className="space-y-4 mb-auto">
                        {adminFeatures.map((f) => (
                            <div key={f.label} className="flex items-center gap-4">
                                <div
                                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                                    style={{ background: 'rgba(93,173,226,0.15)' }}
                                >
                                    <span className="material-symbols-outlined text-blue-300 text-base">{f.icon}</span>
                                </div>
                                <div>
                                    <p className="text-white text-sm font-semibold leading-none">{f.label}</p>
                                    <p className="text-blue-300 text-xs opacity-70 mt-1">{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer info */}
                    <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(255,255,255,0.10)' }}>
                        <div className="flex items-start gap-3 mb-3">
                            <span className="material-symbols-outlined text-blue-300 text-sm mt-0.5">location_on</span>
                            <p className="text-blue-200 text-xs opacity-80 leading-relaxed">
                                48 Pres. Quezon St. Brgy. Industrial Valley Complex,<br />Marikina City, Philippines
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="material-symbols-outlined text-blue-300 text-sm">mail</span>
                            <p className="text-blue-200 text-xs opacity-80">paha_members@yahoo.com</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── RIGHT PANEL (Dark Vibes) ────────────────────────────── */}
            <div
                className="flex-1 flex flex-col items-center justify-center px-6 py-8 relative overflow-hidden"
                style={{ background: '#050a14' }}
            >
                {/* Subtle background shapes */}
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    <div style={{
                        position: 'absolute', top: '-10%', right: '-10%',
                        width: '400px', height: '400px',
                        background: 'radial-gradient(circle, rgba(93,173,226,0.1) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }} />
                    <div style={{
                        position: 'absolute', bottom: '-5%', left: '-5%',
                        width: '300px', height: '300px',
                        background: 'radial-gradient(circle, rgba(26,82,118,0.08) 0%, transparent 70%)',
                        borderRadius: '50%',
                    }} />
                </div>

                <div ref={cardRef} className="relative z-10 w-full max-w-[460px]">

                    {/* Mobile logo */}
                    <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
                        <img
                            src={logoUrl || "/paha-logo-light.png"}
                            alt="PAHA Logo"
                            className="h-14 w-auto object-contain"
                            style={logoUrl ? {} : { filter: 'brightness(0) invert(1)' }}
                        />
                    </div>

                    {/* Card */}
                    <div
                        className="rounded-3xl p-10"
                        style={{
                            background: '#0b1322',
                            boxShadow: '0 20px 80px rgba(0,0,0,0.5), 0 2px 6px rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.08)',
                        }}
                    >
                        {/* Header */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-semibold text-white tracking-tight">Admin Portal</h2>
                            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                                Sign in to your administrative account
                            </p>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="mb-6">
                                <div
                                    className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-semibold animate-shake"
                                    style={{
                                        background: 'rgba(239,68,68,0.1)',
                                        border: '1px solid rgba(239,68,68,0.3)',
                                        color: '#ef4444',
                                    }}
                                >
                                    <span className="material-symbols-outlined text-lg flex-shrink-0 mt-0.5">error</span>
                                    <span>{error}</span>
                                </div>
                            </div>
                        )}

                        {/* Reset Password Sent Notice */}
                        {resetSent && (
                            <div className="mb-6">
                                <div
                                    className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                                    style={{
                                        background: 'rgba(34,197,94,0.1)',
                                        border: '1px solid rgba(34,197,94,0.3)',
                                        color: '#22c55e',
                                    }}
                                >
                                    <span className="material-symbols-outlined text-lg flex-shrink-0 mt-0.5">check_circle</span>
                                    <span>Password reset link dispatched to inbox.</span>
                                </div>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleLogin} className="space-y-6">

                            {/* Email */}
                            <div className="space-y-1.5">
                                <label htmlFor="login-email" className="block text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                                    Identity / Email
                                </label>
                                <div className="relative">
                                    <span
                                        className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors"
                                        style={{ color: focusedField === 'email' ? '#5dade2' : '#64748b' }}
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
                                        placeholder="admin@paha.ph"
                                        className="w-full pl-11 pr-5 py-3.5 text-base rounded-xl text-white outline-none transition-all placeholder:text-slate-600"
                                        style={{
                                            background: '#0d1726',
                                            border: focusedField === 'email'
                                                ? '2px solid #5dade2'
                                                : '2px solid rgba(255,255,255,0.08)',
                                            boxShadow: focusedField === 'email'
                                                ? '0 0 0 4px rgba(93,173,226,0.15)'
                                                : 'none',
                                        }}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-1.5">
                                <div className="flex justify-between items-center ml-1">
                                    <label htmlFor="login-password" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Security Key</label>
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-xs font-semibold hover:underline"
                                        style={{ color: '#5dade2' }}
                                    >
                                        Reset Key?
                                    </button>
                                </div>
                                <div className="relative">
                                    <span
                                        className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-lg transition-colors"
                                        style={{ color: focusedField === 'password' ? '#5dade2' : '#64748b' }}
                                    >
                                        lock
                                    </span>
                                    <input
                                        id="login-password"
                                        name="login-password"
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="current-password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        onFocus={() => setFocusedField('password')}
                                        onBlur={() => setFocusedField(null)}
                                        placeholder="••••••••"
                                        className="w-full pl-11 pr-12 py-3.5 text-base rounded-xl text-white outline-none transition-all placeholder:text-slate-600"
                                        style={{
                                            background: '#0d1726',
                                            border: focusedField === 'password'
                                                ? '2px solid #5dade2'
                                                : '2px solid rgba(255,255,255,0.08)',
                                            boxShadow: focusedField === 'password'
                                                ? '0 0 0 4px rgba(93,173,226,0.15)'
                                                : 'none',
                                        }}
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                                    >
                                        <span className="material-symbols-outlined text-lg">
                                            {showPassword ? 'visibility_off' : 'visibility'}
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-4 rounded-xl text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-50"
                                style={{
                                    background: 'linear-gradient(135deg, #1f618d 0%, #2980b9 100%)',
                                    color: 'white',
                                    boxShadow: '0 4px 15px rgba(41,128,185,0.25)',
                                }}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <span>AUTHENTICATE</span>
                                        <span className="material-symbols-outlined text-base">sensors</span>
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="mt-8 text-center border-t border-white/5 pt-6">
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">
                                Authorized Personnel Only
                            </span>
                        </div>
                    </div>

                    {/* Back to Site */}
                    <div className="text-center mt-8">
                        <button
                            type="button"
                            onClick={() => navigate('/')}
                            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-white transition-colors"
                        >
                            <span className="material-symbols-outlined text-base">arrow_back</span>
                            Return to Website
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
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
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-6px); }
                    75% { transform: translateX(6px); }
                }
                .animate-shake {
                    animation: shake 0.25s ease-in-out 0s 2;
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;
