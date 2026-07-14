import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentPending: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [countdown, setCountdown] = useState(15);

    useEffect(() => {
        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    navigate('/members');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [navigate]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4 font-display">
            <div className="max-w-md w-full bg-white dark:bg-[#1E293B] rounded-3xl shadow-xl border border-slate-200 dark:border-white/10 p-10 text-center">

                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="material-symbols-outlined text-white text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
                    </div>
                </div>

                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600 mb-2">Proof Uploaded</p>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Payment Proof Submitted</h1>
                <p className="text-slate-500 dark:text-slate-450 text-sm leading-relaxed mb-6">
                    We have successfully received your registration and proof of manual payment. PAHA administrators are now verifying your deposit. Your account will be activated once verification is complete.
                </p>

                {orderId && (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-6 border border-slate-200 dark:border-white/5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Reference Number</p>
                        <p className="text-sm font-mono font-bold text-slate-800 dark:text-slate-200">{orderId}</p>
                        <p className="text-xs text-slate-450 mt-1">Reference key for your membership application</p>
                    </div>
                )}

                {/* Redirect Progress Indicator */}
                <div className="mb-6 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
                        <span className="animate-spin border-2 border-primary/20 border-t-primary rounded-full size-4"></span>
                        Redirecting to My Account in <span className="text-primary font-bold">{countdown}s</span>...
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-white/5 h-1 rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-1000" style={{ width: `${(countdown / 15) * 100}%` }}></div>
                    </div>
                </div>

                <div className="flex">
                    <button
                        onClick={() => navigate('/members')}
                        className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-1.5 active:scale-[0.98]"
                    >
                        <span className="material-symbols-outlined text-sm">account_circle</span>
                        My Account
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentPending;
