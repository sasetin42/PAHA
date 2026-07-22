import React from 'react';
import { useAppearance } from '../hooks/useAppearance';

interface LoadingScreenProps {
    /** Optional custom single-line message override */
    message?: string;
    /** Fullscreen mode (min-h-screen) or embedded overlay mode */
    fullScreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
    message = "PAHA • PHILIPPINE ANIMAL HOSPITAL ASSOCIATION",
    fullScreen = true 
}) => {
    const { loadingLogoUrl, logoUrl } = useAppearance();
    const finalLogo = loadingLogoUrl || logoUrl || "/paha-logo.png";

    const containerClasses = fullScreen 
        ? "min-h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-6 transition-colors duration-300 select-none"
        : "w-full py-16 flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-6 transition-colors duration-300 select-none";

    return (
        <div className={containerClasses} role="status" aria-label="Loading">
            <style>{`
                @keyframes loadingBarSequence {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                    100% { transform: translateX(200%); }
                }
                .animate-loading-sequence {
                    animation: loadingBarSequence 1.6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
                }
            `}</style>
            
            <div className="flex flex-col items-center max-w-md w-full text-center space-y-8">
                {/* Instant display logo without box/field container */}
                <div className="flex items-center justify-center p-0">
                    <img 
                        src={finalLogo} 
                        alt="PAHA Logo" 
                        className="h-28 sm:h-36 w-auto object-contain drop-shadow-md transition-all duration-200" 
                    />
                </div>

                {/* Modern loading sequence & single-line details text */}
                <div className="flex flex-col items-center space-y-4 w-full">
                    {/* Modern sleek gradient loading bar sequence */}
                    <div className="w-48 sm:w-56 h-1.5 bg-slate-200/80 dark:bg-white/10 rounded-full overflow-hidden relative shadow-inner">
                        <div className="absolute inset-y-0 w-2/3 bg-gradient-to-r from-primary/20 via-primary to-primary/20 rounded-full animate-loading-sequence shadow-[0_0_12px_rgba(37,99,235,0.6)]" />
                    </div>

                    {/* Enhanced single-line details text */}
                    <p className="text-[10px] sm:text-[11px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-[0.25em] whitespace-nowrap truncate max-w-full px-2">
                        {message}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
