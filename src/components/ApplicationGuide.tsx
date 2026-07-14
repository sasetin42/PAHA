import React from 'react';

interface ApplicationGuideProps {
    isOpen: boolean;
    onClose: () => void;
}

const ApplicationGuide: React.FC<ApplicationGuideProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-6">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col max-h-[90vh] animate-scale-up">
                
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-white/5 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-semibold text-slate-900 dark:text-white uppercase tracking-tight">Application Guide</h2>
                        <p className="text-xs font-semibold text-primary uppercase tracking-[0.3em] mt-1">Step-by-step Accreditation Process</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-500 hover:text-red-500 transition-colors"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-10">
                    
                    {/* Intro Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">01</span>
                                Prepare Documents
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                                Before starting, ensure you have digital copies of the following mandatory requirements:
                            </p>
                            <ul className="space-y-2">
                                {[
                                    'DTI or SEC Registration Permit',
                                    'Valid PRC License of Head Veterinarian',
                                    'Bureau of Animal Industry (BAI) Registration',
                                    'Facility Photos (Exterior, Reception, Surgical)'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-sm font-medium text-slate-700 dark:text-slate-200">
                                        <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-6 border border-slate-200 dark:border-white/5">
                            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Submission Tip</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                "High-quality photos of your surgical suite and recovery area significantly expedite the clinical review phase. Ensure all permits are clearly legible."
                            </p>
                            <div className="mt-4 flex -space-x-2">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-800" />
                                ))}
                                <div className="w-8 h-8 rounded-full border-2 border-white dark:border-slate-900 bg-primary flex items-center justify-center text-[10px] text-white font-semibold">+12</div>
                            </div>
                        </div>
                    </div>

                    {/* Timeline */}
                    <div className="space-y-8">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                            <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">02</span>
                            The Timeline
                        </h3>
                        
                        <div className="relative">
                            <div className="absolute top-0 bottom-0 left-[19px] w-0.5 bg-slate-200 dark:bg-white/10" />
                            
                            <div className="space-y-8 relative z-10">
                                {[
                                    { title: 'Online Application', desc: 'Fill out the digital form and upload requirements.', icon: 'desktop_windows', color: 'bg-blue-500' },
                                    { title: 'Document Verification', desc: 'Our secretariat reviews your legal submissions (1-2 days).', icon: 'verified_user', color: 'bg-indigo-500' },
                                    { title: 'Clinical Review', desc: 'Committee members assess your facility profile and media.', icon: 'medical_services', color: 'bg-purple-500' },
                                    { title: 'Board Approval', desc: 'Final deliberation by the PAHA Board of Directors.', icon: 'gavel', color: 'bg-emerald-500' },
                                    { title: 'Welcome Package', desc: 'Receive your accreditation certificate and membership access.', icon: 'card_giftcard', color: 'bg-amber-500' }
                                ].map((step, i) => (
                                    <div key={i} className="flex gap-6 group">
                                        <div className={`w-10 h-10 rounded-2xl ${step.color} shrink-0 flex items-center justify-center text-white shadow-lg`}>
                                            <span className="material-symbols-outlined text-lg">{step.icon}</span>
                                        </div>
                                        <div className="flex-1 pt-1">
                                            <h4 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{step.title}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{step.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Footer Warning */}
                    <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-3xl border border-amber-200/50 dark:border-amber-900/30 flex items-start gap-4">
                        <span className="material-symbols-outlined text-amber-500 mt-1">info</span>
                        <div>
                            <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-400">Important Note</h4>
                            <p className="text-xs text-amber-700/80 dark:text-amber-500/80 leading-relaxed mt-1">
                                Applications without valid BAI registration will be automatically placed on hold. Please ensure all data provided matches your official business permits.
                            </p>
                        </div>
                    </div>

                </div>

                {/* Bottom Action */}
                <div className="p-8 border-t border-slate-100 dark:border-white/5 shrink-0 flex justify-end">
                    <button 
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-semibold text-sm hover:scale-[1.02] transition-all active:scale-95"
                    >
                        I Understand, Let's Start
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ApplicationGuide;
