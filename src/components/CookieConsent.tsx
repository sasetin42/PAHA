import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const COOKIE_KEY = 'paha_cookie_consent';
const COOKIE_PREFS_KEY = 'paha_cookie_preferences';

const CookieConsent: React.FC = () => {
    const [visible, setVisible] = useState(false);
    const [showCustomize, setShowCustomize] = useState(false);
    const [analytics, setAnalytics] = useState(true);
    const [marketing, setMarketing] = useState(false);

    useEffect(() => {
        const consent = localStorage.getItem(COOKIE_KEY);
        if (!consent) {
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const saveSettings = (status: 'accepted' | 'declined' | 'customized', customPrefs?: { analytics: boolean; marketing: boolean }) => {
        localStorage.setItem(COOKIE_KEY, status);
        const prefs = customPrefs || {
            analytics: status === 'accepted',
            marketing: status === 'accepted'
        };
        localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
        setVisible(false);
    };

    const acceptAll = () => {
        saveSettings('accepted');
    };

    const declineAll = () => {
        saveSettings('declined', { analytics: false, marketing: false });
    };

    const saveCustom = () => {
        saveSettings('customized', { analytics, marketing });
    };

    if (!visible) return null;

    return (
        <div
            role="dialog"
            aria-label="Cookie consent"
            className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-6 animate-in slide-in-from-bottom duration-300"
        >
            <div className="max-w-4xl mx-auto bg-white/95 dark:bg-charcoal/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 transition-all duration-300">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    {/* Icon and Description */}
                    <div className="flex items-start gap-4 flex-1">
                        <div className="size-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
                            <span className="material-symbols-outlined text-2xl font-bold" aria-hidden="true">pets</span>
                        </div>
                        <div>
                            <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                Cookie Preferences
                                <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary text-[9px] font-black uppercase tracking-widest">paha.ph</span>
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-metallic leading-relaxed">
                                We use cookies and veterinary metrics analytics to improve your experience. Tailor your options below or accept recommended defaults.{' '}
                                <Link to="/privacy-policy" className="text-primary hover:underline font-bold">
                                    Learn more
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Actions Panel */}
                    <div className="flex flex-wrap items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                        <button
                            id="cookie-btn-customize"
                            onClick={() => setShowCustomize(!showCustomize)}
                            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-metallic border border-slate-200 dark:border-white/10 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center gap-1"
                        >
                            <span className="material-symbols-outlined text-sm">{showCustomize ? 'expand_less' : 'tune'}</span>
                            Configure
                        </button>
                        <button
                            id="cookie-btn-decline"
                            onClick={declineAll}
                            className="px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-500 dark:text-metallic hover:text-slate-700 transition-colors"
                        >
                            Decline All
                        </button>
                        <button
                            id="cookie-btn-accept"
                            onClick={acceptAll}
                            className="px-5 py-2 text-xs font-black uppercase tracking-widest bg-primary text-white rounded-xl hover:bg-primary/95 transition-all shadow-md shadow-primary/20"
                        >
                            Accept All
                        </button>
                    </div>
                </div>

                {/* Customizable Preferences Toggles */}
                {showCustomize && (
                    <div className="mt-6 pt-6 border-t border-slate-100 dark:border-white/5 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-200">
                        {/* Necessary Cookies */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-start justify-between gap-3">
                            <div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1 flex items-center gap-1.5">
                                    Necessary
                                    <span className="px-1.5 py-0.5 text-[8px] bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/60 font-black rounded uppercase tracking-wider">Required</span>
                                </h4>
                                <p className="text-[10px] text-slate-400 leading-normal">Required for secure authentication, member profile access, and payment workflows.</p>
                            </div>
                            <div className="size-5 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-sm">lock_open</span>
                            </div>
                        </div>

                        {/* Analytics and Performance */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1 flex items-center justify-between">
                                    Analytics & Metrics
                                </h4>
                                <p className="text-[10px] text-slate-400 leading-normal">Allows us to track page performance, session maps, and clinic search latency metrics.</p>
                            </div>
                            <button
                                id="cookie-toggle-analytics"
                                onClick={() => setAnalytics(!analytics)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${analytics ? 'bg-primary' : 'bg-slate-350 dark:bg-white/10'}`}
                            >
                                <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${analytics ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Marketing */}
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5 flex items-start justify-between gap-3">
                            <div className="flex-1">
                                <h4 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-1">
                                    Promotional & Social
                                </h4>
                                <p className="text-[10px] text-slate-400 leading-normal">Personalizes notifications about upcoming outreach programs, webinars, and conferences.</p>
                            </div>
                            <button
                                id="cookie-toggle-marketing"
                                onClick={() => setMarketing(!marketing)}
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${marketing ? 'bg-primary' : 'bg-slate-350 dark:bg-white/10'}`}
                            >
                                <span className={`pointer-events-none inline-block size-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${marketing ? 'translate-x-4' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {/* Save custom selections */}
                        <div className="md:col-span-3 flex justify-end mt-2">
                            <button
                                id="cookie-btn-save-custom"
                                onClick={saveCustom}
                                className="px-5 py-2 text-xs font-black uppercase tracking-widest bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-xl hover:opacity-90 transition-all shadow-md"
                            >
                                Save Custom Preferences
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CookieConsent;
