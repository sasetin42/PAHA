import React from 'react';

import { Link } from 'react-router-dom';

const Benefits: React.FC = () => {
    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark-navy font-display text-slate-900 dark:text-white antialiased pb-20">


            <main className="pt-20 lg:pt-24 px-6 max-w-7xl mx-auto pb-6 relative z-10">
                {/* ── HERO SECTION ── */}
                <div className="relative rounded-[2rem] overflow-hidden bg-slate-950 text-white min-h-[420px] md:min-h-[48vh] flex items-center p-6 md:p-10 lg:p-12 shadow-2xl border border-white/5 mb-12">
                    {/* Background Overlay */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src="https://images.pexels.com/photos/6816842/pexels-photo-6816842.jpeg"
                            className="w-full h-full object-cover opacity-35 mix-blend-overlay scale-105"
                            alt="Membership Benefits Background"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#232323]/80 via-[#232323]/70 to-[#565656]/30"></div>
                    </div>

                    {/* Content Grid */}
                    <div className="relative z-10 w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                        {/* Left Side: Headline & Description */}
                        <div className="lg:col-span-7 space-y-6 text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-white text-primary text-[10px] md:text-xs font-bold uppercase tracking-wider shadow-sm">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
                                Philippine Animal Hospital Association
                            </div>
                            
                            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-white">
                                Membership <span className="text-primary">Benefits</span>
                            </h1>
                            
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed max-w-xl">
                                Unlock the full potential of your veterinary practice. PAHA membership opens doors to exclusive opportunities, resources, and a supportive community dedicated to excellence.
                            </p>
                        </div>

                        {/* Right Side: Detailed Features Grid */}
                        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-emerald-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">workspace_premium</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-lg text-white tracking-tight">CPD Seminars</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">PRC Accredited</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-blue-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">library_books</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-lg text-white tracking-tight">Library Access</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Resource Center</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-purple-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">percent</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-lg text-white tracking-tight">20% Off</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Event Discounts</p>
                                </div>
                            </div>

                            <div className="p-5 rounded-2xl border border-white/5 bg-white/5 flex flex-col justify-between min-h-[120px] hover:border-rose-500/30 transition-all group">
                                <div className="size-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-400 select-none">
                                    <span className="material-symbols-outlined text-[20px] font-bold">gavel</span>
                                </div>
                                <div className="mt-3">
                                    <h4 className="font-extrabold text-lg text-white tracking-tight">Legal Advisory</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Free Support</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Benefits Grid */}
                <section className="mb-12 md:mb-24">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            {
                                icon: "school",
                                title: "Continuing Education (CPD)",
                                desc: "Earn necessary CPD units through our accredited seminars, workshops, and annual conventions at discounted member rates.",
                                color: "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400"
                            },
                            {
                                icon: "gavel",
                                title: "Legal & Policy Representation",
                                desc: "We represent the interests of companion animal practitioners in government dialogues, ensuring your voice is heard in policy-making.",
                                color: "bg-blue-500/10 text-blue-500 dark:text-blue-400"
                            },
                            {
                                icon: "verified_user",
                                title: "Hospital Accreditation",
                                desc: "Get expert guidance and assessment to achieve PAHA Hospital Accreditation, a mark of quality and trust for pet owners.",
                                color: "bg-purple-500/10 text-purple-500 dark:text-purple-400"
                            },
                            {
                                icon: "groups",
                                title: "Professional Networking",
                                desc: "Connect with the country's top veterinary specialists and hospital owners. Share knowledge, referrals, and best practices.",
                                color: "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                            },
                            {
                                icon: "library_books",
                                title: "Resource Library",
                                desc: "Access members-only clinical guidelines, standard operating procedures, and business management templates.",
                                color: "bg-amber-500/10 text-amber-500 dark:text-amber-400"
                            },
                            {
                                icon: "campaign",
                                title: "Public Awareness",
                                desc: "Benefit from PAHA's nationwide campaigns promoting responsible pet ownership and the importance of veterinary care.",
                                color: "bg-cyan-500/10 text-cyan-500 dark:text-cyan-400"
                            }
                        ].map((benefit, i) => (
                            <div key={i} className="bg-slate-50 dark:bg-charcoal p-8 rounded-3xl border border-slate-200 dark:border-white/5 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all group">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform ${benefit.color}`}>
                                    <span className="material-symbols-outlined text-3xl">{benefit.icon}</span>
                                </div>
                                <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">{benefit.title}</h3>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-sm">
                                    {benefit.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Testimonial / Impact Section */}
                <section className="px-4 sm:px-6 lg:px-8 mb-12 md:mb-24">
                    <div className="max-w-5xl mx-auto bg-slate-900 rounded-[1.5rem] md:rounded-[3rem] p-8 sm:p-12 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                        <div className="relative z-10">
                            <span className="material-symbols-outlined text-6xl text-primary/50 mb-6">format_quote</span>
                            <h2 className="text-lg sm:text-xl md:text-3xl lg:text-4xl font-semibold text-white mb-5 md:mb-8 leading-snug">
                                "Being a PAHA member has been instrumental in the growth of my practice. The standards they set and the camaraderie among members are unmatched."
                            </h2>
                            <div className="flex flex-col items-center gap-2">
                                <div className="w-16 h-16 rounded-full border-2 border-primary overflow-hidden">
                                    <img src="https://i.pravatar.cc/150?img=11" alt="Member" className="w-full h-full object-cover" />
                                </div>
                                <div>
                                    <p className="font-semibold text-white">Dr. Sarah Jimenez</p>
                                    <p className="text-primary text-sm">Regular Member since 2015</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="text-center px-6 mb-10">
                    <h2 className="text-5xl font-semibold text-blue-950 dark:text-white mb-6">Experience the PAHA Advantage</h2>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/membership/application" className="px-8 py-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold transition-all shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2">
                            Join Now
                            <span className="material-symbols-outlined">arrow_forward</span>
                        </Link>
                        <Link to="/contact" className="px-8 py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white rounded-xl font-semibold transition-all hover:bg-slate-50 dark:hover:bg-white/10">
                            Contact Us
                        </Link>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Benefits;
