import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import JoinModal from './JoinModal';
import { useAdmin } from '../context/AdminContext';
const homeBg = "/video-thumbnail.png";
const conferenceBanner = "/paha_conference_2026.png";

const Hero: React.FC = () => {
    const { members } = useAdmin();
    const totalMembers = members.length;
    const accreditedClinics = members.filter(m => m.isAccredited).length;
    const totalClinics = members.filter(m => m.type !== 'Professional Member').length;
    const [isVisible, setIsVisible] = useState(false);
    const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
    const [timeLeft, setTimeLeft] = useState({
        days: 60,
        hours: 0,
        minutes: 0,
        seconds: 0
    });

    useEffect(() => {
        setIsVisible(true);
        
        // Set target date to 60 days from now
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + 60);

        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate.getTime() - now;

            if (distance < 0) {
                clearInterval(timer);
                return;
            }

            setTimeLeft({
                days: Math.floor(distance / (1000 * 60 * 60 * 24)),
                hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
                minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
                seconds: Math.floor((distance % (1000 * 60)) / 1000)
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return (
        <>
            <div className="relative bg-[#f1f1f1] dark:bg-background-dark-black pt-16 md:pt-20 overflow-hidden font-display">
                <div className="w-full p-[10px]">
                    <div
                        className={`relative rounded-[25px] pb-[40px] overflow-hidden min-h-[600px] md:min-h-[90vh] flex flex-col items-center justify-center text-center px-6 transition-all duration-1000 transform ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'} shadow-2xl shadow-primary/20`}
                    >
                        {/* Background Image with Deep Overlay */}
                        <div className="absolute inset-0 z-0">
                            <img
                                src={homeBg}
                                className="w-full h-full object-cover scale-105 object-center"
                                alt="PAHA Hero Background"
                            />
                            <div className="absolute inset-0 bg-gradient-to-b from-black/85 via-black/55 to-black/85"></div>
                        </div>

                        {/* Content Layer */}
                        <div className="relative z-10 w-full max-w-[95%] mx-auto">
                            {/* Subtitle */}
                            <div className="mb-6 pt-10 md:pt-0">
                                <p className={`text-[#60A5FA] font-extrabold tracking-[0.5em] uppercase text-[15px] transition-all duration-700 delay-300 transform ${isVisible ? 'translate-y-0' : 'translate-y-full'}`}>
                                    Elevating Companion Animal Care
                                </p>
                            </div>

                            {/* Title */}
                            <h1 className="text-white text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight tracking-tight">
                                Philippine Animal Hospital Association
                            </h1>

                            {/* Description */}
                            <p className="text-white/80 text-sm md:text-md lg:text-lg leading-relaxed mb-10 max-w-3xl mx-auto font-medium">
                                Leads the veterinary community in building globally aligned standards, empowered clinical teams, and highest standard of patient care
                            </p>

                            {/* Buttons */}
                            <div className="flex flex-row gap-4 justify-center items-center">
                                <Link
                                    to="/login"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-primary hover:bg-primary/90 text-white px-6 py-2.5 rounded-full font-bold text-[12px] uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 flex items-center gap-2 border border-transparent hover:border-white/20"
                                >
                                    <span className="material-symbols-outlined text-base">person_add</span>
                                    Join PAHA
                                </Link>
                                <Link
                                    to="/about-us"
                                    className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-6 py-2.5 rounded-full font-bold text-[12px] uppercase tracking-wider transition-all duration-300 active:scale-95 flex items-center gap-2"
                                >
                                    <span className="material-symbols-outlined text-base">info</span>
                                    Learn More
                                </Link>
                            </div>
                        </div>

                        {/* Decorative bottom glow */}
                        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1/2 h-32 bg-primary/20 blur-[120px] pointer-events-none"></div>
                    </div>
                </div>
            </div>

            {/* Section 1: Colorized & Interactive Stats */}
            <div className="bg-gradient-to-br from-[#232323] to-[#565656] text-white py-16 md:py-20 border-y border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:32px_32px] opacity-30"></div>
                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    
                    {/* Section Title & Description */}
                    <div className="text-center mb-12">
                        <span className="text-[#60A5FA] font-bold tracking-[0.3em] uppercase text-[10px] md:text-xs mb-2 block">
                            PAHA BY THE NUMBERS
                        </span>
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                            Advancing Veterinary Standards Nationwide
                        </h2>
                        <p className="text-slate-400 text-xs md:text-sm mt-3 max-w-2xl mx-auto font-medium leading-relaxed">
                            Explore our growing network of dedicated veterinary practitioners and accredited animal healthcare facilities across the Philippines.
                        </p>
                        <div className="w-12 h-1 bg-[#60A5FA]/30 mx-auto mt-4 rounded-full"></div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {/* Stat 1 */}
                        <div className="flex items-center gap-5 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 hover:-translate-y-1 shadow-lg group">
                            <div className="flex items-center justify-center size-16 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 via-orange-500 to-rose-500 text-white shadow-lg shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <span className="material-symbols-outlined text-3.5xl font-bold">verified</span>
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-[28px] font-black text-white tracking-tight leading-none mb-1">48 Years</h3>
                                <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest leading-none">Of Veterinary Advocacy</p>
                            </div>
                        </div>

                        {/* Stat 2 */}
                        <div className="flex items-center gap-5 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 hover:-translate-y-1 shadow-lg group">
                            <div className="flex items-center justify-center size-16 shrink-0 rounded-2xl bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                <span className="material-symbols-outlined text-3.5xl font-bold">groups</span>
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-[28px] font-black text-white tracking-tight leading-none mb-1">
                                    {totalMembers > 0 ? `${totalMembers}+` : '160+'}
                                </h3>
                                <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest leading-none">Active PAHA Members</p>
                            </div>
                        </div>

                        {/* Stat 3 */}
                        <div className="flex items-center gap-5 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 hover:-translate-y-1 shadow-lg group">
                            <div className="flex items-center justify-center size-16 shrink-0 rounded-2xl bg-gradient-to-br from-teal-400 via-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                <span className="material-symbols-outlined text-3.5xl font-bold">location_on</span>
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-[28px] font-black text-white tracking-tight leading-none mb-1">
                                    {accreditedClinics > 0 ? `${accreditedClinics}` : '19'}
                                </h3>
                                <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest leading-none">Accredited Clinics</p>
                            </div>
                        </div>

                        {/* Stat 4 */}
                        <div className="flex items-center gap-5 p-6 rounded-2xl bg-white/[0.02] border border-white/5 backdrop-blur-md hover:bg-white/[0.04] hover:border-white/10 transition-all duration-500 hover:-translate-y-1 shadow-lg group">
                            <div className="flex items-center justify-center size-16 shrink-0 rounded-2xl bg-gradient-to-br from-rose-400 via-pink-500 to-red-500 text-white shadow-lg shadow-rose-500/20 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-500">
                                <span className="material-symbols-outlined text-3.5xl font-bold">local_hospital</span>
                            </div>
                            <div>
                                <h3 className="text-2xl md:text-[28px] font-black text-white tracking-tight leading-none mb-1">
                                    {totalClinics > 0 ? `${totalClinics}` : '141'}
                                </h3>
                                <p className="text-xs md:text-sm text-slate-400 font-bold uppercase tracking-widest leading-none">Clinics & Hospitals</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                {/* Section 2: 2-Column Conference Section */}
                <div className="bg-white dark:bg-background-dark-black overflow-hidden font-display py-12 md:py-16">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                            {/* 1st Column: Most Related Image */}
                            <div className="relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-white/5 shadow-xl group">
                                <img 
                                    src={conferenceBanner} 
                                    alt="31st PAHA Annual Conference" 
                                    className="w-full h-full object-cover transform group-hover:scale-[1.02] transition-transform duration-[1.5s] aspect-[4/3] md:aspect-[16/10] lg:aspect-[1/1]"
                                />
                            </div>

                            {/* 2nd Column: Details & Functions */}
                            <div className="flex flex-col gap-6 text-left">
                                <div>
                                    <span className="text-primary font-bold tracking-[0.3em] uppercase text-[10px] md:text-xs mb-2 block">
                                        Annual Event 2026
                                    </span>
                                    <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                        31<sup>st</sup> PAHA Conference Rates
                                    </h2>
                                    <div className="w-16 h-1 bg-primary/20 mt-3 rounded-full"></div>
                                </div>

                                {/* Interactive & Alive Colorized Rate Cards */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                                    {[
                                        { amount: 'PHP 18,000', label: "Members' Rate", icon: 'verified_user', gradient: 'from-blue-400 to-indigo-500 shadow-blue-500/20' },
                                        { amount: 'PHP 22,000', label: "Non-Members' Rate", icon: 'person_add', gradient: 'from-amber-400 to-orange-500 shadow-orange-500/20' }
                                    ].map((rate, idx) => (
                                        <div key={idx} className="bg-slate-50 dark:bg-slate-900/60 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-white/5 hover:border-primary/30 transition-all duration-300 flex lg:flex-row xl:flex-col items-center gap-4 text-left xl:text-center">
                                            <div className={`size-10 rounded-xl bg-gradient-to-br ${rate.gradient} text-white flex items-center justify-center shrink-0`}>
                                                <span className="material-symbols-outlined text-lg">{rate.icon}</span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-tight mb-0.5">{rate.label}</p>
                                                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{rate.amount}</h3>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Countdown Timer */}
                                <div className="bg-gradient-to-r from-[#232323] to-[#565656] rounded-2xl p-5 relative overflow-hidden">
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                        <div className="text-center sm:text-left">
                                            <h3 className="text-white text-sm font-bold mb-0.5">
                                                Registration is Open
                                            </h3>
                                            <p className="text-slate-400 text-xs">
                                                31st Annual PAHA Conference
                                            </p>
                                        </div>

                                        <div className="flex gap-4 justify-center">
                                            {[
                                                { label: 'Days', value: timeLeft.days },
                                                { label: 'Hrs', value: timeLeft.hours },
                                                { label: 'Min', value: timeLeft.minutes },
                                                { label: 'Sec', value: timeLeft.seconds }
                                            ].map((item, idx) => (
                                                <div key={idx} className="flex flex-col items-center min-w-[35px]">
                                                    <span className="text-xl font-bold text-white tracking-tighter mb-0.5">
                                                        {item.value.toString().padStart(2, '0')}
                                                    </span>
                                                    <span className="text-[8px] uppercase tracking-wider font-bold text-primary">
                                                        {item.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Register Button (compact header button size with icon) */}
                                <div className="flex justify-start">
                                    <a 
                                        href="https://paha-event.4eventz.online/?fbclid=IwY2xjawR6o_9leHRuA2FlbQIxMABicmlkETEyRTlGRENQSDR2bXFRbEJsc3J0YwZhcHBfaWQQMjIyMDM5MTc4ODIwMDg5MgABHqacgRUwzPMHKF7oYPC3n673DvSWa8CXH30OQkc3Cpy0IR0e9g55mYAD1Voy_aem_XgIfJGfG9_ZTkbzwA-MxMw"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex justify-center items-center px-6 py-2.5 bg-[#1e4b8a] hover:bg-[#153a6b] text-white rounded-full font-bold text-[12px] uppercase tracking-wider shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 gap-2 border border-transparent hover:border-white/20 group"
                                    >
                                        <span className="material-symbols-outlined text-base">assignment_turned_in</span>
                                        Register Here
                                        <span className="material-symbols-outlined text-sm transition-transform group-hover:translate-x-1">arrow_right_alt</span>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Our Mission & Vision in Action */}
                <div className="bg-[#f8fafc] dark:bg-background-dark-black py-16 md:py-20 border-t border-slate-100 dark:border-white/5">
                    <div className="max-w-6xl mx-auto px-6 text-center">
                        <div className="max-w-3xl mx-auto mb-12">
                            <span className="text-primary font-bold tracking-[0.3em] uppercase text-[10px] md:text-xs mb-2 block">
                                Official Presentation
                            </span>
                            <h2 className="text-2xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">
                                Our Mission & Vision in Action
                            </h2>
                            <div className="w-16 h-1 bg-primary/20 mx-auto mt-3 rounded-full"></div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed font-medium mt-4">
                                Discover how the Philippine Animal Hospital Association coordinates animal healthcare excellence, clinical standard alignments, and professional vet growth nationwide. Join us for our annual events and professional collaboration.
                            </p>
                        </div>

                        {/* Highlights in 3 columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { title: 'Leading Veterinary Practice', desc: 'Promoting top-tier companion animal care and standard of procedures.', icon: 'medical_services', color: 'text-blue-500 bg-blue-500/10' },
                                { title: 'Nationwide Accreditation', desc: 'Providing trusted credentials for hospitals and veterinary centers.', icon: 'verified', color: 'text-emerald-500 bg-emerald-500/10' },
                                { title: 'Continuing Professional Education', desc: 'Empowering clinical teams through advanced training and seminars.', icon: 'school', color: 'text-purple-500 bg-purple-500/10' }
                            ].map((feature, idx) => (
                                <div key={idx} className="bg-white dark:bg-[#0F172A] border border-slate-100 dark:border-white/5 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all duration-300 group">
                                    <div className={`size-12 rounded-2xl flex items-center justify-center ${feature.color} group-hover:scale-110 transition-transform duration-300 mb-4 shadow-sm`}>
                                        <span className="material-symbols-outlined text-xl">{feature.icon}</span>
                                    </div>
                                    <h4 className="font-bold text-base text-slate-900 dark:text-white mb-2">{feature.title}</h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            <JoinModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
        </>
    );
};

export default Hero;
