import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import JoinModal from './JoinModal';
import { useAppearance } from '../hooks/useAppearance';
const pahaLogoLight = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%232563EB'/><text x='50' y='58' font-family='sans-serif' font-size='20' font-weight='900' fill='white' text-anchor='middle'>PAHA</text></svg>";

const Navbar: React.FC = () => {
    const location = useLocation();
    const { logoUrl, headerLogoUrl } = useAppearance();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);

    const mobileMenuRef = useRef<HTMLDivElement>(null);

    const isActive = (path: string) => location.pathname === path;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 20);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (location.hash) {
            const id = location.hash.substring(1);
            setTimeout(() => {
                const element = document.getElementById(id);
                if (element) {
                    element.scrollIntoView({ behavior: 'smooth' });
                }
            }, 150);
        }
    }, [location]);

    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMobileMenuOpen]);

    const navLinks = [
        { name: 'Home', path: '/' },
        { name: 'Find A Vet', path: '/find-a-vet' },
        { name: 'Events', path: '/events' },
        {
            name: 'Membership & Accreditation',
            path: '/membership',
            hasDropdown: true,
            dropdownItems: [
                { name: "Member's Directory", path: '/membership/directory' },
                { name: 'Membership Application', path: '/membership/application' },
                { name: 'Benefits', path: '/membership/benefits' },
                { name: 'Accredited Clinics', path: '/membership/accredited-clinics' },
                { name: 'Accreditation Requirements', path: '/membership/accreditation-requirements' }
            ]
        },
        { name: 'Committees', path: '/committees' },
        { name: 'About', path: '/about-us' },
        { name: 'Contact', path: '/contact' },
    ];

    return (
        <>
            <nav
                className={`fixed top-0 left-0 right-0 z-[9999] px-6 flex items-center justify-between transition-all duration-300 bg-white dark:bg-slate-900
                    ${isScrolled ? 'h-14 md:h-16 shadow-lg shadow-black/5' : 'h-16 md:h-20 shadow-md shadow-black/5'}
                `}
            >
                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-slate-100 dark:bg-white/10"></div>

                <div className="max-w-7xl mx-auto w-full flex items-center justify-between relative z-10">
                    <Link to="/" className="flex items-center gap-2 relative z-[60]">
                        <img
                            src={headerLogoUrl || logoUrl || pahaLogoLight}
                            alt="PAHA Logo"
                            className="h-[48px] md:h-[68px] w-auto object-contain transition-all py-0.5"
                        />
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden lg:flex items-center gap-6">
                        {navLinks.map((link) => (
                            <div key={link.name} className="relative group">
                                <Link
                                    to={link.path}
                                    className={`text-[14px] font-bold tracking-wider uppercase transition-all duration-300 flex items-center gap-1 py-2
                                        ${isActive(link.path)
                                            ? 'text-primary'
                                            : 'text-slate-700 hover:text-primary dark:text-slate-200 dark:hover:text-primary'
                                        }
                                    `}
                                >
                                    {link.name}
                                    {link.hasDropdown && (
                                        <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:rotate-180 opacity-70">expand_more</span>
                                    )}
                                    <span className={`absolute bottom-0 left-0 h-[3px] bg-primary rounded-full transition-all duration-300 ease-out
                                        ${isActive(link.path) ? 'w-full' : 'w-0 group-hover:w-full'}
                                    `}></span>
                                </Link>

                                {link.hasDropdown && (
                                    <div className="absolute top-full left-0 pt-6 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50">
                                        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/10 rounded-xl p-2 w-64 shadow-2xl transform origin-top-left group-hover:scale-100 scale-95 transition-all duration-300">
                                            <div className="flex flex-col gap-1">
                                                {link.dropdownItems?.map((item) => (
                                                    <Link
                                                        key={item.name}
                                                        to={item.path}
                                                        className={`block px-4 py-3 text-[14px] font-semibold rounded-lg transition-all duration-200
                                                            ${isActive(item.path)
                                                                ? 'text-primary bg-primary/10 dark:bg-primary/20'
                                                                : 'text-slate-600 dark:text-slate-300 hover:text-primary hover:bg-primary/5'
                                                            }
                                                        `}
                                                    >
                                                        {item.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Action Section */}
                    <div className="hidden lg:flex items-center">
                        <a
                            href="/login"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-[#1e4b8a] hover:bg-[#153a6b] text-white px-6 py-2.5 rounded-full font-bold text-[12px] uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 flex items-center gap-2 border border-transparent hover:border-white/20"
                        >
                            <span className="material-symbols-outlined text-base">person_add</span>
                            Become a Member
                        </a>
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center lg:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="relative size-12 flex items-center justify-center rounded-full group focus:outline-none z-[70]"
                            aria-label="Toggle Menu"
                        >
                            <svg className={`absolute inset-0 size-full -rotate-90 pointer-events-none transition-transform duration-500 ${isMobileMenuOpen ? 'scale-110' : 'group-hover:scale-110'}`} viewBox="0 0 100 100">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    className="text-gray-100 dark:text-white/5"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="46"
                                    fill="none"
                                    stroke="url(#gradient-premium)"
                                    strokeWidth="3"
                                    strokeLinecap="round"
                                    className="animate-draw-circle"
                                />
                                <defs>
                                    <linearGradient id="gradient-premium" x1="0%" y1="0%" x2="100%" y2="0%">
                                        <stop offset="0%" stopColor="#1E60A3" />
                                        <stop offset="50%" stopColor="#00f2fe" />
                                        <stop offset="100%" stopColor="#1E60A3" />
                                    </linearGradient>
                                </defs>
                            </svg>

                            <div className="flex flex-col gap-1.5 w-6 items-end relative z-10 transition-all duration-300">
                                <span className={`h-[2.5px] bg-slate-900 dark:bg-white transition-all duration-300 rounded-full ${isMobileMenuOpen ? 'w-6 -rotate-45 translate-y-[8px]' : 'w-6'}`}></span>
                                <span className={`h-[2.5px] bg-primary transition-all duration-300 rounded-full ${isMobileMenuOpen ? 'w-0 opacity-0' : 'w-4'}`}></span>
                                <span className={`h-[2.5px] bg-slate-900 dark:bg-white transition-all duration-300 rounded-full ${isMobileMenuOpen ? 'w-6 rotate-45 -translate-y-[8px]' : 'w-5'}`}></span>
                            </div>

                            <div className="absolute inset-0 bg-primary/10 rounded-full scale-0 group-active:scale-100 transition-transform duration-300"></div>
                        </button>
                    </div>

                    {/* Mobile Menu Overlay */}
                    {isMobileMenuOpen && (
                        <div
                            ref={mobileMenuRef}
                            className="lg:hidden fixed inset-0 h-screen bg-white dark:bg-black z-[60] flex flex-col pt-8 px-10 pb-12 overflow-y-auto"
                        >
                            <div className="mb-10 flex items-center justify-between">
                                <Link to="/" onClick={() => setIsMobileMenuOpen(false)}>
                                    <img src={headerLogoUrl || logoUrl || pahaLogoLight} alt="Logo" className="h-12 w-auto object-contain" />
                                </Link>
                            </div>

                            <div className="flex flex-col gap-8 flex-1">
                                {navLinks.map((link) => (
                                    <div key={link.name} className="mobile-link">
                                        <div className="flex items-center justify-between">
                                            <Link
                                                to={link.path}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                                className={`text-[24px] font-bold tracking-tight transition-all duration-300 active:scale-95 ${isActive(link.path) ? 'text-primary' : 'text-slate-900 dark:text-white opacity-90'}`}
                                            >
                                                {link.name}
                                            </Link>
                                        </div>
                                        {link.hasDropdown && (
                                            <div className="mt-4 ml-4 border-l-2 border-slate-100 dark:border-white/10 flex flex-col gap-2">
                                                {link.dropdownItems?.map(item => (
                                                    <Link
                                                        key={item.name}
                                                        to={item.path}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`text-[16px] font-semibold transition-colors flex items-center gap-3 py-1.5 px-3 rounded-lg
                                                            ${isActive(item.path)
                                                                ? 'text-primary bg-primary/10 dark:bg-primary/20 font-bold'
                                                                : 'text-slate-505 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-white/5'
                                                            }
                                                        `}
                                                    >
                                                        <span className="h-[1px] w-3 bg-slate-200 dark:bg-white/10 flex-shrink-0"></span>
                                                        {item.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-auto pt-10">
                                <a
                                    href="/login"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center justify-center w-full bg-[#1e4b8a] text-white py-5 rounded-full font-bold text-lg uppercase tracking-widest shadow-xl active:scale-95 transition-all gap-2"
                                >
                                    Become a Member
                                    <span className="text-xl">›</span>
                                </a>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            <JoinModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
        </>
    );
};

export default Navbar;