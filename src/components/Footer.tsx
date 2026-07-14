import React from 'react';
import { Link } from 'react-router-dom';
import { useAppearance } from '../hooks/useAppearance';

const Footer: React.FC = () => {
    const { logoUrl, footerLogoUrl } = useAppearance();
    const finalLogo = footerLogoUrl || logoUrl || "/paha-logo.png";


    return (
        <footer className="bg-slate-50 dark:bg-[#0B0F19] border-t border-slate-200 dark:border-white/5 pt-16 pb-8 font-sans transition-all duration-300">
            <div className="max-w-7xl mx-auto px-6">
                
                {/* 5-Column Layout */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 lg:gap-6 mb-16">
                    
                    {/* Column 1: About PAHA */}
                    <div className="flex flex-col items-start space-y-5 lg:col-span-1">
                        <Link to="/" className="inline-block">
                            <img
                                src={finalLogo}
                                alt="PAHA Logo"
                                className={`h-16 w-auto object-contain opacity-95 dark:brightness-110 ${finalLogo.includes("/paha-logo.png") && !logoUrl && !footerLogoUrl ? 'dark:invert-0' : ''}`}
                            />
                        </Link>
                        <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed max-w-sm font-medium">
                            Promoting excellence in companion animal practice through high standard regulations, continuing education, and community advocacy.
                        </p>
                        
                        {/* Social Icons */}
                        <div className="flex items-center gap-2.5 pt-2">
                            <a
                                href="https://facebook.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="size-8 rounded-lg border border-slate-250 dark:border-white/10 bg-white dark:bg-slate-900/40 flex items-center justify-center text-slate-450 dark:text-slate-400 hover:text-white hover:bg-blue-600 hover:border-blue-600 transition-all duration-300 shadow-sm"
                                aria-label="Facebook"
                            >
                                <span className="material-symbols-outlined text-[16px]">public</span>
                            </a>
                            <a
                                href="mailto:paha_members@yahoo.com"
                                className="size-8 rounded-lg border border-slate-250 dark:border-white/10 bg-white dark:bg-slate-900/40 flex items-center justify-center text-slate-450 dark:text-slate-400 hover:text-white hover:bg-red-500 hover:border-red-500 transition-all duration-300 shadow-sm"
                                aria-label="Email"
                            >
                                <span className="material-symbols-outlined text-[16px]">mail</span>
                            </a>
                            <a
                                href="https://linkedin.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="size-8 rounded-lg border border-slate-250 dark:border-white/10 bg-white dark:bg-slate-900/40 flex items-center justify-center text-slate-450 dark:text-slate-400 hover:text-white hover:bg-sky-600 hover:border-sky-600 transition-all duration-300 shadow-sm"
                                aria-label="LinkedIn"
                            >
                                <span className="material-symbols-outlined text-[16px]">group</span>
                            </a>
                        </div>
                    </div>

                    {/* Column 2: Quick Links */}
                    <div className="flex flex-col items-start">
                        <h4 className="text-[#1e4b8a] dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-6">Quick Links</h4>
                        <ul className="space-y-3">
                            {[
                                { name: 'Home', path: '/' },
                                { name: 'About', path: '/about-us' },
                                { name: 'Find a Vet', path: '/membership/accredited-clinics' },
                                { name: 'Events', path: '/events' },
                                { name: 'Membership', path: '/membership' },
                                { name: 'Contact', path: '/contact' },
                            ].map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 text-xs font-semibold transition-colors duration-250 relative group flex items-center gap-1.5"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-primary dark:group-hover:bg-blue-400 transition-colors"></span>
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 3: Resources */}
                    <div className="flex flex-col items-start">
                        <h4 className="text-[#1e4b8a] dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-6">Resources</h4>
                        <ul className="space-y-3">
                            {[
                                { name: 'Accreditation Guidelines', path: '/membership' },
                                { name: 'Committees Directory', path: '/committees' },
                                { name: 'Upcoming Workshops', path: '/events' },
                                { name: 'Support & FAQs', path: '/contact' },
                                { name: 'Privacy Policy', path: '/privacy-policy' },
                                { name: 'Terms of Service', path: '/terms-of-service' },
                            ].map((link) => (
                                <li key={link.name}>
                                    <Link
                                        to={link.path}
                                        className="text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-blue-400 text-xs font-semibold transition-colors duration-250 relative group flex items-center gap-1.5"
                                    >
                                        <span className="h-1.5 w-1.5 rounded-full bg-slate-300 dark:bg-slate-700 group-hover:bg-primary dark:group-hover:bg-blue-400 transition-colors"></span>
                                        {link.name}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Column 4: Hours of Operation */}
                    <div className="flex flex-col items-start space-y-4">
                        <h4 className="text-[#1e4b8a] dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Office Hours</h4>
                        <div className="space-y-3 text-xs text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                            <div className="flex gap-3 items-start">
                                <div className="size-8 rounded-lg bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                </div>
                                <div>
                                    <h5 className="text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">Weekdays</h5>
                                    <p className="text-slate-500 dark:text-slate-450">Mon - Fri: 9:00 AM - 6:00 PM</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="size-8 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-sm">calendar_today</span>
                                </div>
                                <div>
                                    <h5 className="text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">Saturdays</h5>
                                    <p className="text-slate-500 dark:text-slate-450">9:00 AM - 3:00 PM</p>
                                </div>
                            </div>
                            <div className="flex gap-3 items-start">
                                <div className="size-8 rounded-lg bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-sm">event_busy</span>
                                </div>
                                <div>
                                    <h5 className="text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">Sundays</h5>
                                    <p className="text-slate-500 dark:text-slate-450">Closed for Holidays</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 5: Contact Information */}
                    <div className="flex flex-col items-start space-y-4">
                        <h4 className="text-[#1e4b8a] dark:text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">Contact Details</h4>
                        
                        <div className="flex flex-col items-start space-y-3.5">
                            {/* Head Office */}
                            <div className="flex gap-3 items-start">
                                <div className="size-8 rounded-lg bg-blue-50 dark:bg-blue-950/20 text-[#1e4b8a] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-sm">location_on</span>
                                </div>
                                <div>
                                    <h5 className="text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">Head Office</h5>
                                    <p className="text-slate-500 dark:text-slate-450 text-[11px] leading-relaxed max-w-[180px]">
                                        46 Pres. Quezon St., Industrial Valley Complex, Marikina City, Philippines
                                    </p>
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="flex gap-3 items-start">
                                <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-sm">call</span>
                                </div>
                                <div>
                                    <h5 className="text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">Phone</h5>
                                    <p className="text-slate-500 dark:text-slate-450 text-[11px] font-semibold">
                                        0906-252-5627
                                    </p>
                                </div>
                            </div>

                            {/* Email */}
                            <div className="flex gap-3 items-start">
                                <div className="size-8 rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 shadow-sm">
                                    <span className="material-symbols-outlined text-sm">mail</span>
                                </div>
                                <div>
                                    <h5 className="text-slate-700 dark:text-slate-300 font-bold text-[10px] uppercase tracking-wider mb-0.5">Email</h5>
                                    <a href="mailto:paha_members@yahoo.com" className="text-slate-500 dark:text-slate-400 text-[11px] hover:text-primary dark:hover:text-blue-400 font-semibold transition-colors duration-200">
                                        paha_members@yahoo.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Footer Bar */}
                <div className="pt-8 border-t border-slate-200 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
                    <p className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                        &copy; {new Date().getFullYear()} Philippine Animal Hospital Association. All Rights Reserved.
                    </p>
                    <div className="flex items-center gap-6">
                        <Link to="/privacy-policy" className="text-slate-400 hover:text-primary dark:hover:text-blue-400 text-xs font-semibold transition-colors duration-200">Privacy Policy</Link>
                        <Link to="/terms-of-service" className="text-slate-400 hover:text-primary dark:hover:text-blue-400 text-xs font-semibold transition-colors duration-200">Terms of Service</Link>
                        <Link to="/sitemap" className="text-slate-400 hover:text-primary dark:hover:text-blue-400 text-xs font-semibold transition-colors duration-200">Sitemap</Link>
                    </div>
                </div>

            </div>
        </footer>
    );
};

export default Footer;
