import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import JoinModal from '../components/JoinModal';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

import Hero from '../components/Hero';
import LatestAnnouncements from '../components/LatestAnnouncements';
// Removed unused UpcomingEvents import
import PartnerSlider from '../components/PartnerSlider';
const fasavaGroup = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2070&auto=format&fit=crop";

gsap.registerPlugin(ScrollTrigger);

const MetricCard = ({ metric }: { metric: any }) => {
    const countRef = useRef<HTMLDivElement>(null);

    useGSAP(() => {
        if (!countRef.current) return;

        gsap.from(countRef.current, {
            textContent: 0,
            duration: 2,
            ease: "power2.out",
            snap: { textContent: 1 },
            scrollTrigger: {
                trigger: countRef.current,
                start: "top 90%",
            },
            onUpdate: function() {
                if (countRef.current) {
                    const value = Math.floor(parseFloat(countRef.current.textContent || "0"));
                    countRef.current.textContent = value >= 1000 ? (value / 1000).toFixed(0) + 'K' : value.toString();
                }
            }
        });
    }, { scope: countRef });

    return (
        <div className="group relative">
            <div className={`bg-white dark:bg-[#1E293B] rounded-3xl p-8 border border-slate-200 dark:border-white/5 hover:border-primary/50 transition-all duration-500 hover:-translate-y-2 shadow-xl hover:shadow-2xl ${metric.glow}`}>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${metric.color} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                    <span className="material-symbols-outlined text-white text-3xl">{metric.icon}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-2">
                    <div ref={countRef} className="text-4xl font-semibold text-slate-900 dark:text-white tracking-tight">
                        {metric.value >= 1000 ? (metric.value / 1000) + 'K' : metric.value}
                    </div>
                    <span className="text-2xl font-semibold text-primary">{metric.suffix}</span>
                </div>
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                    {metric.label}
                </div>
                
                {/* Decorative Tech Lines */}
                <div className="absolute bottom-4 right-4 flex gap-1 opacity-20 group-hover:opacity-100 transition-opacity">
                    <div className="w-1 h-3 bg-primary rounded-full animate-pulse"></div>
                    <div className="w-1 h-5 bg-primary rounded-full animate-pulse delay-75"></div>
                    <div className="w-1 h-2 bg-primary rounded-full animate-pulse delay-150"></div>
                </div>
            </div>
        </div>
    );
};

const Home: React.FC = () => {
    const [showVideo, setShowVideo] = React.useState(true);
    const [isJoinModalOpen, setIsJoinModalOpen] = React.useState(false);
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-black font-display text-slate-900 dark:text-white relative overflow-hidden">
            {/* Decorative Background Elements */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                {/* Top Right Gradient Orb */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 dark:bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>

                {/* Bottom Left Gradient Orb */}
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-400/5 dark:bg-blue-500/10 rounded-full blur-[100px] translate-y-1/2 -translate-x-1/3"></div>

                {/* Center Accent */}
                <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-primary/3 dark:bg-primary/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2"></div>

                {/* Grid Pattern Overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(43,141,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(43,141,238,0.03)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(43,141,238,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(43,141,238,0.05)_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,black,transparent)]"></div>
            </div>



            <main className="relative z-10 flex flex-col">
                <Hero />

                {/* Latest Announcements Section */}
                <section className="py-10 md:py-14 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-50/50 to-transparent dark:via-white/[0.02]"></div>
                    <div className="relative">
                        <LatestAnnouncements />
                    </div>
                </section>

                {/* Membership Promotion Section */}
                <section className="py-12 md:py-24 bg-white dark:bg-slate-900 border-y border-slate-200 dark:border-white/5 relative overflow-hidden">
                    {/* Radial Background Accent */}
                    <div className="absolute top-1/2 left-1/4 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-[100px] -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/5 dark:bg-blue-500/10 rounded-full blur-[100px]"></div>

                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 items-center">
                            {/* Left Column: Staggered Image Grid */}
                            <div className="lg:col-span-6 relative mt-8 lg:mt-0">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div className="relative h-24 md:h-32 rounded-3xl overflow-hidden shadow-md border border-white/15 dark:border-white/5 bg-slate-100 dark:bg-charcoal group">
                                            <img 
                                                src="/assets/veterinary_practitioner.png" 
                                                alt="Veterinary Practitioner" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-xs">vaccines</span> Practitioner
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative h-36 md:h-44 rounded-3xl overflow-hidden shadow-md border border-white/15 dark:border-white/5 bg-slate-100 dark:bg-charcoal group">
                                            <img 
                                                src="/assets/veterinary_surgery.png" 
                                                alt="Veterinary Surgery" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-xs">medication</span> Surgery
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative h-28 md:h-36 rounded-3xl overflow-hidden shadow-md border border-white/15 dark:border-white/5 bg-slate-100 dark:bg-charcoal group">
                                            <img 
                                                src="/assets/pet_examination.png" 
                                                alt="Pet Examination" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-xs">stethoscope</span> Examination
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4 mt-4">
                                        <div className="relative h-36 md:h-44 rounded-3xl overflow-hidden shadow-md border border-white/15 dark:border-white/5 bg-slate-100 dark:bg-charcoal group">
                                            <img 
                                                src="/assets/laboratory_diagnostics.png" 
                                                alt="Laboratory Diagnostics" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-xs">biotech</span> Diagnostics
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative h-24 md:h-32 rounded-3xl overflow-hidden shadow-md border border-white/15 dark:border-white/5 bg-slate-100 dark:bg-charcoal group">
                                            <img 
                                                src="/assets/dog_checkup.png" 
                                                alt="Dog Checkup" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-xs">pets</span> Dog Checkup
                                                </span>
                                            </div>
                                        </div>
                                        <div className="relative h-36 md:h-44 rounded-3xl overflow-hidden shadow-md border border-white/15 dark:border-white/5 bg-slate-100 dark:bg-charcoal group">
                                            <img 
                                                src="/assets/cat_care.png" 
                                                alt="Cat Care" 
                                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                                                <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-xs">healing</span> Cat Care
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right Column: Text Content */}
                            <div className="lg:col-span-6 space-y-6 text-center lg:text-right">
                                <span className="inline-block text-primary font-semibold text-sm uppercase tracking-wider">
                                    NOT A PAHA MEMBER YET?
                                </span>

                                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-4xl font-bold text-blue-950 dark:text-white leading-snug tracking-tight">
                                    Build your network. <br />
                                    Connect with industry leaders. <br />
                                    Grow your practice.
                                </h2>

                                <div className="h-[2px] bg-slate-200 dark:bg-white/10 w-full max-w-lg mx-auto lg:ml-auto lg:mr-0 my-4"></div>

                                <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed max-w-xl mx-auto lg:ml-auto lg:mr-0 font-medium">
                                    Join PAHA and unlock exclusive discounts, priority access to top-tier seminars, free legal support, and a powerful network of Filipino veterinary professionals — everything you need to elevate your practice and never practice alone again.
                                </p>

                                <div className="pt-4 flex justify-center lg:justify-end">
                                    <Link
                                        to="/login"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-8 py-4 bg-primary hover:bg-primary/90 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-lg hover:shadow-primary/25 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 text-center"
                                    >
                                        Get Your Membership Access
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Mission Section */}
                <section className="relative overflow-hidden section-padding">
                    {/* Gradient Background */}
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(43,141,238,0.1),transparent_50%)]"></div>

                    <div className="max-w-7xl mx-auto px-6 relative">
                        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-12 lg:gap-16 items-center">
                            <div className="text-center lg:text-left">
                                <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] md:text-xs font-semibold uppercase tracking-[0.2em] mb-6 border border-primary/20">
                                    Our Mission
                                </span>
                                <h2 className="text-2xl md:text-3xl lg:text-3.5xl font-black text-slate-900 dark:text-white mb-6 leading-tight tracking-tight">
                                    Advancing Veterinary Excellence in the Philippines
                                </h2>
                                <p className="text-sm md:text-[15px] text-[#565656] dark:text-slate-400 mb-5 leading-relaxed font-medium">
                                    The Philippine Animal Hospital Association (PAHA) is dedicated to promoting the highest standards of veterinary care, fostering professional development, and advocating for animal welfare across the nation.
                                </p>
                                <p className="text-sm md:text-[15px] text-[#565656] dark:text-slate-400 leading-relaxed font-medium">
                                    Through continuous education, collaboration, and innovation, we empower veterinary professionals to deliver exceptional care and contribute to the health and well-being of animals and communities.
                                </p>

                            </div>

                            {/* Video Player Section */}
                            <div className="relative group">
                                <div className="aspect-video rounded-section overflow-hidden shadow-2xl border border-white/10 dark:border-white/5 bg-charcoal relative">
                                    {showVideo ? (
                                        <div className="w-full h-full relative">
                                            <iframe
                                                className="w-full h-full"
                                                src="https://www.facebook.com/plugins/video.php?href=https%3A%2F%2Fwww.facebook.com%2Freel%2F7822934544469147&show_text=false&autoplay=0&mute=0"
                                                title="PAHA Reel"
                                                style={{ border: 'none', overflow: 'hidden' }}
                                                scrolling="no"
                                                frameBorder="0"
                                                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                                                allowFullScreen
                                            ></iframe>
                                            <button
                                                onClick={() => setShowVideo(false)}
                                                className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full transition-colors z-20"
                                            >
                                                <span className="material-symbols-outlined">close</span>
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            {/* Video Placeholder with Play Button - Click anywhere to play */}
                                            <div
                                                onClick={() => setShowVideo(true)}
                                                className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-600/20 flex items-center justify-center z-10 group-hover:scale-105 transition-transform duration-700 cursor-pointer"
                                            >
                                                <div className="text-center transform transition-transform duration-500 group-hover:-translate-y-4">
                                                    <button className="w-20 h-20 rounded-full bg-white/90 dark:bg-white/80 flex items-center justify-center shadow-2xl group-hover:bg-primary group-hover:text-white mb-4 mx-auto relative overflow-hidden transition-all duration-300">
                                                        <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-0 group-hover:opacity-100"></div>
                                                        <span className="material-symbols-outlined text-4xl text-primary group-hover:text-white relative z-10">play_arrow</span>
                                                    </button>
                                                    <p className="text-white font-semibold text-lg mb-2 drop-shadow-lg">Watch PAHA in Action</p>
                                                    <p className="text-white/80 text-sm drop-shadow-md">Discover our impact on veterinary excellence</p>
                                                </div>
                                            </div>

                                            {/* Thumbnail Image */}
                                            <img
                                                src={fasavaGroup}
                                                alt="PAHA Overview"
                                                className="w-full h-full object-cover opacity-60 group-hover:opacity-50 transition-opacity duration-700 pointer-events-none"
                                            />

                                            {/* Bottom Info Bar */}
                                            <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between z-20 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none">
                                                {/* Stats Group */}
                                                <div className="flex items-center gap-4">
                                                    {[
                                                        { icon: 'visibility', value: '5K+', label: 'Views' },
                                                        { icon: 'thumb_up', value: '1.2K', label: 'Likes' },
                                                    ].map((stat, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 backdrop-blur-md border border-white/10">
                                                            <span className="material-symbols-outlined text-white text-[16px]">{stat.icon}</span>
                                                            <div className="flex flex-col leading-none">
                                                                <span className="text-xs font-semibold text-white">{stat.value}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Duration Badge */}
                                                <div className="px-3 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-semibold flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                                    5:12
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Decorative Glows */}
                                <div className="absolute -bottom-6 -right-6 w-48 h-48 bg-primary/30 rounded-full mix-blend-screen blur-3xl opacity-50 animate-pulse"></div>
                                <div className="absolute -top-6 -left-6 w-32 h-32 bg-blue-500/30 rounded-full mix-blend-screen blur-3xl opacity-50 animate-pulse delay-700"></div>
                            </div>
                        </div>

                        {/* Impact Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
                            {[
                                { 
                                    icon: 'pets', 
                                    value: 10000, 
                                    suffix: '+', 
                                    label: 'Animals Treated', 
                                    color: 'from-blue-600 to-indigo-600',
                                    glow: 'shadow-blue-500/20'
                                },
                                { 
                                    icon: 'local_hospital', 
                                    value: 200, 
                                    suffix: '+', 
                                    label: 'Partner Clinics', 
                                    color: 'from-emerald-600 to-teal-600',
                                    glow: 'shadow-emerald-500/20'
                                },
                                { 
                                    icon: 'school', 
                                    value: 150, 
                                    suffix: '+', 
                                    label: 'Training Programs', 
                                    color: 'from-purple-600 to-violet-600',
                                    glow: 'shadow-purple-500/20'
                                },
                                { 
                                    icon: 'military_tech', 
                                    value: 50, 
                                    suffix: '+', 
                                    label: 'Awards Received', 
                                    color: 'from-amber-600 to-orange-600',
                                    glow: 'shadow-amber-500/20'
                                }
                            ].map((metric, idx) => (
                                <MetricCard key={idx} metric={metric} />
                            ))}
                        </div>
                    </div>
                </section>


                {/* Partners Logo Slider */}
                <PartnerSlider />

                {/* CTA Section */}
                <section 
                    className="py-12 md:py-16 relative overflow-hidden text-white"
                    style={{ background: 'linear-gradient(135deg, #232323 0%, #565656 100%)' }}
                >
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[100px] translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 left-0 w-96 h-96 bg-black/20 rounded-full blur-[100px] -translate-x-1/2 translate-y-1/2"></div>
                    
                    {/* Grid Pattern */}
                    <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:48px_48px] opacity-10"></div>

                    <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                        <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-4 tracking-tight">
                            Ready to Join PAHA?
                        </h2>
                        <p className="text-sm md:text-base text-white/80 mb-6 max-w-2xl mx-auto font-medium">
                            Become part of the leading veterinary association in the Philippines and connect with fellow professionals dedicated to excellence.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Link
                                to="/login"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-6 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-black/20 hover:shadow-primary/45 transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">how_to_reg</span>
                                Apply for Membership
                            </Link>
                            <a
                                href="/about-us"
                                className="px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white text-white rounded-xl font-bold text-xs uppercase tracking-widest transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-base">info</span>
                                Learn More
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            <JoinModal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} />
        </div>
    );
};

export default Home;
