import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAppearance } from '../hooks/useAppearance';

interface ProtectedRouteProps {
    children: React.ReactNode;
    adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
    const { user, loading, isAdmin, profile, signOut } = useAuth();
    const { loadingLogoUrl, logoUrl } = useAppearance();
    const location = useLocation();

    // Show loading state while checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-4 transition-colors duration-300">
                <div className="flex flex-col items-center max-w-lg w-full text-center space-y-6">
                    {/* Logo Section without background box and with modern breathing animation */}
                    <div className="relative flex items-center justify-center">
                        <img 
                            src={loadingLogoUrl || logoUrl || "/paha-logo.png"} 
                            alt="PAHA Logo" 
                            loading="eager"
                            fetchPriority="high"
                            className="h-36 md:h-40 w-auto object-contain animate-logo-float" 
                        />
                    </div>

                    {/* Progress Indicator */}
                    <div className="flex flex-col items-center space-y-4">
                        <div className="flex gap-2.5 justify-center items-center h-6">
                            <span className="w-3 h-3 bg-primary rounded-full animate-modern-dot" style={{ animationDelay: '0ms' }}></span>
                            <span className="w-3 h-3 bg-primary rounded-full animate-modern-dot" style={{ animationDelay: '200ms' }}></span>
                            <span className="w-3 h-3 bg-primary rounded-full animate-modern-dot" style={{ animationDelay: '400ms' }}></span>
                        </div>
                        <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] sm:tracking-[0.25em] whitespace-nowrap overflow-hidden text-ellipsis select-none">
                            PAHA - Philippines Animal Hospital Association
                        </p>
                    </div>
                </div>
            </div>
        );
    }
    // Redirect to login if not authenticated
    if (!user) {
        const redirectTo = adminOnly ? '/admin/login' : '/login';
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Redirect to dashboard if trying to access admin but not an admin
    if (adminOnly && !isAdmin) {
        return <Navigate to="/members" replace />;
    }

// Block deactivated OR deleted member accounts from the member dashboard.
    // profile is null when the users/{uid} doc has been deleted (account permanently removed).
    if (!adminOnly && profile === null) {
        // Fire-and-forget: clear the Firebase session. Redirect immediately.
        signOut().catch(console.error);
        return <Navigate to="/login" replace />;
    }

    if (!adminOnly && profile?.accountStatus === 'deactivated') {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#0F172A] p-4 text-center">
                <span className="material-symbols-outlined text-5xl text-rose-500 mb-4">block</span>
                <h1 className="text-xl font-black text-slate-900 dark:text-white mb-2">Account Deactivated</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mb-6">
                    Your PAHA membership account has been deactivated by an administrator. Please contact PAHA support if you believe this is a mistake.
                </p>
                <button
                    onClick={() => signOut()}
                    className="px-5 py-2.5 bg-primary text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-primary/90 transition-all"
                >
                    Sign Out
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in">
            {children}
        </div>
    );
};

export default ProtectedRoute;
