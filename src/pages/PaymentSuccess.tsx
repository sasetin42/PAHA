import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { queryPaycoolsPayment } from '../services/paycoolsService';

const PaymentSuccess: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const mchOrderId = searchParams.get('mchOrderId') || searchParams.get('orderId');

    const [status, setStatus] = useState<'processing' | 'success' | 'pending' | 'error'>('processing');
    const [transactionDetails, setTransactionDetails] = useState<any>(null);

    // 1. Live Firestore Listener
    useEffect(() => {
        if (authLoading || !user || !mchOrderId) return;

        const unsubscribe = onSnapshot(doc(db, 'paymentTransactions', mchOrderId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setTransactionDetails(data);
                if (data.status === 'PAID') {
                    setStatus('success');
                } else if (data.status === 'FAILED') {
                    setStatus('error');
                } else if (data.status === 'CLOSED') {
                    setStatus('error');
                } else if (data.status === 'PENDING') {
                    setStatus('pending');
                }
            }
        }, (err) => {
            console.error('[PaymentSuccess] Listener error:', err);
        });

        return () => unsubscribe();
    }, [user, authLoading, mchOrderId]);

    // 2. Initial query + Fallback polling
    useEffect(() => {
        if (authLoading || !user || !mchOrderId) return;

        const checkStatus = async () => {
            try {
                const res = await queryPaycoolsPayment('', mchOrderId);
                if (res.success) {
                    if (res.status === 'PAID') {
                        setStatus('success');
                        return true;
                    } else if (res.status === 'FAILED' || res.status === 'CLOSED') {
                        setStatus('error');
                        return true;
                    }
                }
            } catch (err) {
                console.error('[PaymentSuccess] Initial status query error:', err);
            }
            return false;
        };

        checkStatus();

        const pollInterval = setInterval(async () => {
            const isFinal = await checkStatus();
            if (isFinal) {
                clearInterval(pollInterval);
            }
        }, 8000);

        return () => clearInterval(pollInterval);
    }, [user, authLoading, mchOrderId]);

    if (authLoading || status === 'processing') {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-[#0A0F1A] flex items-center justify-center px-4 pt-24 pb-12">
                <div className="text-center">
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center overflow-hidden shadow-inner">
                            <img
                                src="/paha-logo.png"
                                alt="PAHA Logo"
                                className="w-16 h-16 object-contain"
                                onError={(e) => { (e.target as HTMLImageElement).src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='48' fill='%232563EB'/><text x='50' y='58' font-family='sans-serif' font-size='20' font-weight='900' fill='white' text-anchor='middle'>PAHA</text></svg>"; }}
                            />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verifying Payment</h2>
                    <p className="text-slate-500 dark:text-slate-400">Please wait while we confirm your payment with PayCools...</p>
                </div>
            </div>
        );
    }

    if (status === 'pending') {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-[#0A0F1A] flex items-center justify-center px-4 pt-24 pb-12">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                        <span className="material-symbols-outlined text-white text-3xl">schedule</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Pending</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        Your transaction is currently pending confirmation from the payment provider. We will automatically activate your account as soon as the funds are cleared.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => navigate('/members')} className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all">
                            Go to Dashboard
                        </button>
                        <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl font-bold uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/10 transition-all">
                            Return to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="min-h-screen bg-slate-100 dark:bg-[#0A0F1A] flex items-center justify-center px-4 pt-24 pb-12">
                <div className="max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <span className="material-symbols-outlined text-white text-3xl">error</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Payment Failed or Closed</h2>
                    <p className="text-slate-500 dark:text-slate-400 mb-8">
                        The transaction was declined or timed out. If your funds were deducted, please contact PAHA support at support@paha.ph.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={() => navigate('/membership/payment')} className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary/90 transition-all">
                            Retry Payment
                        </button>
                        <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl font-bold uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/10 transition-all">
                            Return to Home
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-[#0A0F1A] flex items-center justify-center px-4 pt-24 pb-12">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="material-symbols-outlined text-white text-3xl">verified</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Payment Successful!</h2>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    Thank you for joining PAHA. Your membership is now active, and you can log in to your Clinic Portal.
                </p>

                <div className="bg-white dark:bg-[#0F172A] rounded-2xl p-6 mb-8 text-left border border-slate-200 dark:border-white/5 shadow-sm">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-3">Membership Details</p>
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600 dark:text-slate-300">Plan</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">PAHA Regular Membership</span>
                    </div>
                    {mchOrderId && (
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Order ID</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{mchOrderId}</span>
                        </div>
                    )}
                    {transactionDetails?.transactionId && (
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-slate-600 dark:text-slate-300">Transaction ID</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-white font-mono">{transactionDetails.transactionId}</span>
                        </div>
                    )}
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600 dark:text-slate-300">Status</span>
                        <span className="text-sm font-bold text-emerald-500">Active</span>
                    </div>
                </div>

                <div className="flex flex-col gap-3">
                    <button
                        onClick={() => navigate('/members')}
                        className="w-full py-4 bg-primary text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-primary/30 hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                    >
                        Go to Dashboard
                        <span className="material-symbols-outlined text-lg">dashboard</span>
                    </button>
                    <button onClick={() => navigate('/')} className="w-full py-4 bg-slate-200 dark:bg-white/5 text-slate-700 dark:text-white rounded-xl font-bold uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-white/10 transition-all">
                        Return to Home
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess;