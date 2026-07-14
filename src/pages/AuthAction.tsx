import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { applyActionCode } from 'firebase/auth';
import { auth } from '../config/firebase';

type Status = 'processing' | 'success' | 'error';

const AuthAction: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const mode = searchParams.get('mode');
    const oobCode = searchParams.get('oobCode');

    const [status, setStatus] = useState<Status>('processing');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        if (!oobCode || mode !== 'verifyEmail') {
            setStatus('error');
            setErrorMessage('Invalid or unsupported verification link. Please request a new one.');
            return;
        }

        applyActionCode(auth, oobCode)
            .then(() => setStatus('success'))
            .catch((err: any) => {
                setStatus('error');
                if (err.code === 'auth/invalid-action-code') {
                    setErrorMessage('This verification link has already been used or has expired. Please sign in and request a new verification email.');
                } else if (err.code === 'auth/expired-action-code') {
                    setErrorMessage('This verification link has expired. Please sign in and request a new verification email.');
                } else {
                    setErrorMessage('We could not verify your email. Please try again or contact PAHA support.');
                }
            });
    }, [mode, oobCode]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50 font-display" style={{ fontFamily: "'Inter', 'Outfit', sans-serif" }}>

            {/* ── Header ─────────────────────────────────────────── */}
            <header className="bg-[#091929] shadow-lg flex-shrink-0">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <img
                            src="/paha-logo-light.png"
                            alt="PAHA Logo"
                            className="h-12 object-contain"
                            style={{ filter: 'brightness(0) invert(1)' }}
                            onError={e => { (e.target as HTMLImageElement).src = '/paha-logo.png'; }}
                        />
                    </Link>
                    <nav className="hidden md:flex items-center gap-6">
                        {[
                            { label: 'Home', to: '/' },
                            { label: 'Membership', to: '/membership' },
                            { label: 'Events', to: '/events' },
                            { label: 'About Us', to: '/about-us' },
                            { label: 'Contact', to: '/contact' },
                        ].map(link => (
                            <Link key={link.to} to={link.to} className="text-sm text-slate-300 hover:text-white font-medium transition-colors">
                                {link.label}
                            </Link>
                        ))}
                    </nav>
                    <Link
                        to="/login"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white text-sm font-bold rounded-full transition-all"
                    >
                        <span className="material-symbols-outlined text-base">login</span>
                        Sign In
                    </Link>
                </div>
            </header>

            {/* ── Main Content ────────────────────────────────────── */}
            <main className="flex-1 flex items-center justify-center px-4 py-16">
                <div className="w-full max-w-md">

                    {/* Processing */}
                    {status === 'processing' && (
                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200 text-center">
                            <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-6" />
                            <h2 className="text-xl font-bold text-slate-900 mb-2">Verifying your email…</h2>
                            <p className="text-slate-500 text-sm">Please wait a moment.</p>
                        </div>
                    )}

                    {/* Success */}
                    {status === 'success' && (
                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200 text-center">
                            {/* Icon */}
                            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                    <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>mark_email_read</span>
                                </div>
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 mb-2">Verification Complete</p>
                            <h1 className="text-2xl font-bold text-slate-900 mb-3">Email Verified!</h1>
                            <p className="text-slate-500 text-sm leading-relaxed mb-8">
                                Your email address has been successfully verified. You can now sign in to your PAHA account and complete your membership payment.
                            </p>

                            {/* Steps reminder */}
                            <div className="bg-slate-50 rounded-2xl p-4 mb-8 text-left space-y-3">
                                {[
                                    { icon: 'check_circle', label: 'Account created', done: true },
                                    { icon: 'check_circle', label: 'Email verified', done: true },
                                    { icon: 'payments', label: 'Complete membership payment', done: false },
                                ].map((step, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className={`material-symbols-outlined text-lg flex-shrink-0 ${step.done ? 'text-emerald-500' : 'text-slate-300'}`} style={step.done ? { fontVariationSettings: "'FILL' 1" } : {}}>
                                            {step.icon}
                                        </span>
                                        <span className={`text-sm font-medium ${step.done ? 'text-slate-700 line-through decoration-slate-300' : 'text-slate-900 font-bold'}`}>
                                            {step.label}
                                        </span>
                                        {!step.done && (
                                            <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Next</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={() => navigate('/membership/payment')}
                                className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-lg">payments</span>
                                Proceed to Payment
                            </button>
                        </div>
                    )}

                    {/* Error */}
                    {status === 'error' && (
                        <div className="bg-white rounded-3xl p-10 shadow-xl border border-slate-200 text-center">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <div className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                                    <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                                </div>
                            </div>

                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-red-500 mb-2">Verification Failed</p>
                            <h1 className="text-2xl font-bold text-slate-900 mb-3">Link Invalid or Expired</h1>
                            <p className="text-slate-500 text-sm leading-relaxed mb-8">{errorMessage}</p>

                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full py-4 bg-primary hover:bg-primary/90 text-white rounded-2xl font-bold uppercase tracking-widest shadow-xl shadow-primary/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-lg">login</span>
                                    Back to Login
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold uppercase tracking-widest transition-all"
                                >
                                    Return to Home
                                </button>
                            </div>
                        </div>
                    )}

                </div>
            </main>

            {/* ── Footer ─────────────────────────────────────────── */}
            <footer className="bg-[#091929] text-white flex-shrink-0">
                <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <img
                            src="/paha-logo-light.png"
                            alt="PAHA"
                            className="h-8 object-contain opacity-70"
                            style={{ filter: 'brightness(0) invert(1)' }}
                            onError={e => { (e.target as HTMLImageElement).src = '/paha-logo.png'; }}
                        />
                        <span className="text-xs text-slate-400">Philippine Animal Hospital Association, Inc.</span>
                    </div>
                    <div className="flex items-center gap-6 text-xs text-slate-400">
                        <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
                        <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
                        <Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link>
                    </div>
                    <p className="text-xs text-slate-500">© {new Date().getFullYear()} PAHA. All rights reserved.</p>
                </div>
            </footer>

        </div>
    );
};

export default AuthAction;
