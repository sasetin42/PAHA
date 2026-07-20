import React, { useState, useEffect } from 'react';
import { db, auth } from '../../config/firebase';
import { collection, query, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

interface Transaction {
    id: string; // mchOrderId
    localOrderId: string;
    mchOrderId: string;
    checkoutId: string;
    checkoutUrl: string;
    transactionId: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerMobile: string;
    amount: number;
    currency: string;
    settlementCurrency: string;
    countryCode: string;
    channelCode?: string;
    channelType?: string;
    status: 'INITIATED' | 'PENDING' | 'PAID' | 'COMPLETE' | 'FAILED' | 'CLOSED' | 'EXPIRED' | 'CANCELLED';
    paycoolsStatus?: string;
    goodsDetails?: string;
    expiresTime?: string;
    paidAt?: any;
    failedAt?: any;
    closedAt?: any;
    createdAt?: any;
    updatedAt?: any;
    rawCreateRequest?: any;
    rawCreateResponse?: any;
    rawQueryResponse?: any;
    rawWebhookPayload?: any;
}

const PayCoolsTransactions: React.FC = () => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [channelFilter, setChannelFilter] = useState('ALL');
    const [dateRange, setDateRange] = useState({ start: '', end: '' });
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    const [syncingId, setSyncingId] = useState<string | null>(null);
    const [closingId, setClosingId] = useState<string | null>(null);
const [diagnosticsModal, setDiagnosticsModal] = useState<any | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Load Transactions list with realtime listener
    useEffect(() => {
        const q = query(
            collection(db, 'paymentTransactions'),
            orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const list: Transaction[] = snap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data
                } as Transaction;
            });
            setTransactions(list);
            setLoading(false);
        }, (err) => {
            console.error('Error loading transactions:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

    // Filters
    const filteredTx = transactions.filter(tx => {
        // Search
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch = 
            !searchTerm ||
            tx.customerName?.toLowerCase().includes(searchLower) ||
            tx.customerEmail?.toLowerCase().includes(searchLower) ||
            tx.customerMobile?.includes(searchTerm) ||
            tx.localOrderId?.toLowerCase().includes(searchLower) ||
            tx.mchOrderId?.toLowerCase().includes(searchLower) ||
            tx.checkoutId?.toLowerCase().includes(searchLower) ||
            tx.transactionId?.toLowerCase().includes(searchLower);

        // Status
        const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;

        // Channel
        let matchesChannel = true;
        if (channelFilter !== 'ALL') {
            const code = tx.channelCode?.toUpperCase() || '';
            const type = tx.channelType?.toUpperCase() || '';
            if (channelFilter === 'GCASH') matchesChannel = code.includes('GCASH') || type.includes('GCASH');
            else if (channelFilter === 'MAYA') matchesChannel = code.includes('PAYMAYA') || code.includes('MAYA') || type.includes('MAYA');
            else if (channelFilter === 'CARD') matchesChannel = type.includes('CARD');
            else if (channelFilter === 'BANK') matchesChannel = type.includes('BANK') || code.includes('BPI') || code.includes('UBPB') || code.includes('INSTAPAY');
            else if (channelFilter === 'QRPH') matchesChannel = code.includes('QRPH') || type.includes('QR');
            else if (channelFilter === 'OTC') matchesChannel = type.includes('OTC') || code.includes('7ELEVEN');
        }

        // Date Range
        let matchesDate = true;
        if (dateRange.start || dateRange.end) {
            const createdDate = tx.createdAt?.seconds 
                ? new Date(tx.createdAt.seconds * 1000) 
                : tx.createdAt 
                    ? new Date(tx.createdAt) 
                    : null;
            if (createdDate) {
                createdDate.setHours(0,0,0,0);
                if (dateRange.start) {
                    const start = new Date(dateRange.start);
                    start.setHours(0,0,0,0);
                    if (createdDate < start) matchesDate = false;
                }
                if (dateRange.end) {
                    const end = new Date(dateRange.end);
                    end.setHours(0,0,0,0);
                    if (createdDate > end) matchesDate = false;
                }
            } else {
                matchesDate = false;
            }
        }

        return matchesSearch && matchesStatus && matchesChannel && matchesDate;
    });

    // Dashboard calculations
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const paidTx = transactions.filter(tx => tx.status === 'PAID');
    const totalPaidToday = paidTx
        .filter(tx => {
            const date = tx.paidAt?.seconds 
                ? new Date(tx.paidAt.seconds * 1000) 
                : tx.paidAt 
                    ? new Date(tx.paidAt) 
                    : null;
            if (!date) return false;
            date.setHours(0, 0, 0, 0);
            return date.getTime() === today.getTime();
        })
        .reduce((sum, tx) => sum + tx.amount, 0);

    const pendingCount = transactions.filter(tx => tx.status === 'PENDING').length;
    const failedCount = transactions.filter(tx => tx.status === 'FAILED').length;
    const totalTransactionsCount = transactions.length;
    const totalGrossAmount = paidTx.reduce((sum, tx) => sum + tx.amount, 0);

    // Call sync status
    const handleSyncStatus = async (tx: Transaction) => {
        setSyncingId(tx.mchOrderId);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch('/api/paycools/checkout/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    mchOrderId: tx.mchOrderId,
                    checkoutId: tx.checkoutId
                })
            });

            const data = await response.json();
            if (data.success) {
                showToast(`Sync complete! Status: ${data.status}`, 'success');
                // Re-load details modal if active
                if (selectedTx?.mchOrderId === tx.mchOrderId) {
                    const snap = await getDoc(doc(db, 'paymentTransactions', tx.mchOrderId));
                    if (snap.exists()) {
                        setSelectedTx({ id: snap.id, ...snap.data() } as Transaction);
                    }
                }
            } else {
                showToast(data.error || 'Sync status query failed', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSyncingId(null);
        }
    };

    // Call close transaction
    const handleCloseTransaction = async (tx: Transaction) => {
        setClosingId(tx.mchOrderId);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch('/api/paycools/checkout/close', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ mchOrderId: tx.mchOrderId })
            });

            const data = await response.json();
            if (data.success) {
                showToast('Transaction closed successfully!', 'success');
                if (selectedTx?.mchOrderId === tx.mchOrderId) {
                    const snap = await getDoc(doc(db, 'paymentTransactions', tx.mchOrderId));
                    if (snap.exists()) {
                        setSelectedTx({ id: snap.id, ...snap.data() } as Transaction);
                    }
                }
            } else {
                showToast(data.error || 'Failed to close transaction', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setClosingId(null);
        }
    };

    // Client-side CSV exporter
    const handleExportCSV = () => {
        if (filteredTx.length === 0) {
            showToast('No transactions to export', 'error');
            return;
        }

        const headers = ['Order ID', 'Merchant Order ID', 'Checkout ID', 'Transaction ID', 'Customer Name', 'Email', 'Mobile', 'Amount', 'Currency', 'Status', 'Channel', 'Created At', 'Paid At'];
        const rows = filteredTx.map(tx => {
            const createdAtStr = tx.createdAt?.seconds ? new Date(tx.createdAt.seconds * 1000).toLocaleString() : '';
            const paidAtStr = tx.paidAt?.seconds ? new Date(tx.paidAt.seconds * 1000).toLocaleString() : '';
            return [
                tx.localOrderId,
                tx.mchOrderId,
                tx.checkoutId || '',
                tx.transactionId || '',
                tx.customerName || '',
                tx.customerEmail || '',
                `'${tx.customerMobile || ''}`, // Prepend apostrophe to avoid auto-formatting mobile as scientific notation in Excel
                tx.amount,
                tx.currency,
                tx.status,
                tx.channelCode || tx.channelType || '',
                createdAtStr,
                paidAtStr
            ];
        });

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(','))].join('\n');
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `paycools_transactions_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast('Export successful', 'success');
    };

    const handlePrintReceipt = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></span>
            </div>
        );
    }
    return (
        <div className="space-y-6 print:space-y-0">
            {toast && (
                <div className={`fixed top-5 right-5 z-[300] px-4 py-3 rounded-[12px] shadow-xl flex items-center gap-3 text-sm font-semibold text-white animate-fade-in ${
                    toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                    <span className="material-symbols-outlined">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
                    {toast.message}
                </div>
            )}

            {/* Dashboard Cards / KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 print:hidden">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Gross Revenue</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mt-1">₱{totalGrossAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                        <span className="material-symbols-outlined text-2xl">monetization_on</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Paid Today</p>
                        <h3 className="text-xl font-bold text-emerald-500 mt-1">₱{totalPaidToday.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <span className="material-symbols-outlined text-2xl">today</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Orders</p>
                        <h3 className="text-xl font-bold text-amber-500 mt-1">{pendingCount}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <span className="material-symbols-outlined text-2xl">hourglass_empty</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Failed Orders</p>
                        <h3 className="text-xl font-bold text-rose-500 mt-1">{failedCount}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                        <span className="material-symbols-outlined text-2xl">error</span>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Total Orders</p>
                        <h3 className="text-xl font-bold text-slate-700 dark:text-slate-300 mt-1">{totalTransactionsCount}</h3>
                    </div>
                    <div className="size-12 rounded-xl bg-slate-500/10 flex items-center justify-center text-slate-500">
                        <span className="material-symbols-outlined text-2xl">receipt_long</span>
                    </div>
                </div>
            </div>

            {/* Filter and Search Panel (Hide when printing) */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    <div>
                        <label htmlFor="pay-search" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Search Orders</label>
                        <div className="relative">
                            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                            <input
                                id="pay-search"
                                type="text"
                                placeholder="Search customer, order..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full text-xs font-semibold pl-9 pr-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="pay-status" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Status</label>
                        <select
                            id="pay-status"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="INITIATED">Initiated</option>
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid / Completed</option>
                            <option value="FAILED">Failed</option>
                            <option value="CLOSED">Closed</option>
                            <option value="EXPIRED">Expired</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="pay-channel" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">Channel</label>
                        <select
                            id="pay-channel"
                            value={channelFilter}
                            onChange={e => setChannelFilter(e.target.value)}
                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        >
                            <option value="ALL">All Channels</option>
                            <option value="GCASH">GCash</option>
                            <option value="MAYA">Maya</option>
                            <option value="CARD">Debit/Credit Card</option>
                            <option value="BANK">Online Banking</option>
                            <option value="QRPH">QRPh</option>
                            <option value="OTC">OTC / Cash</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="pay-fromDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">From Date</label>
                        <input
                            id="pay-fromDate"
                            type="date"
                            value={dateRange.start}
                            onChange={e => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                        />
                    </div>
                    <div>
                        <label htmlFor="pay-toDate" className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">To Date</label>
                        <div className="flex gap-2">
                            <input
                                id="pay-toDate"
                                type="date"
                                value={dateRange.end}
                                onChange={e => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                                className="w-full text-xs font-semibold px-3 py-2 rounded-[8px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button
                                onClick={handleExportCSV}
                                title="Export CSV"
                                className="size-8 rounded-[8px] bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-all shrink-0 border border-primary/20"
                            >
                                <span className="material-symbols-outlined text-sm">cloud_download</span>
                            </button>
                        </div>
                    </div>
                </div>
                {(searchTerm || statusFilter !== 'ALL' || channelFilter !== 'ALL' || dateRange.start || dateRange.end) && (
                    <div className="flex justify-end mt-3">
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                setStatusFilter('ALL');
                                setChannelFilter('ALL');
                                setDateRange({ start: '', end: '' });
                            }}
                            className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1 transition-colors"
                        >
                            <span className="material-symbols-outlined text-xs">filter_alt_off</span>
                            Clear Filters
                        </button>
                    </div>
                )}
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-slate-800 rounded-[12px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden print:border-none print:shadow-none">
                <div className="overflow-x-auto custom-scrollbar">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50/70 dark:bg-slate-900/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-200 dark:border-white/5">
                            <tr>
                                <th className="p-4">Customer Details</th>
                                <th className="p-4">Merchant Order ID</th>
                                <th className="p-4">PayCools Channel</th>
                                <th className="p-4">Amount</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4">Created Date</th>
                                <th className="p-4 text-right print:hidden">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-xs divide-y divide-slate-100 dark:divide-white/5">
                            {filteredTx.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-slate-500 font-medium">
                                        <span className="material-symbols-outlined text-3xl opacity-30 block mb-2">payments</span>
                                        No transaction records found matching the filters
                                    </td>
                                </tr>
                            ) : (
                                filteredTx.map(tx => {
                                    const createdStr = tx.createdAt?.seconds 
                                        ? new Date(tx.createdAt.seconds * 1000).toLocaleString() 
                                        : '—';

                                    let statusBadge = (
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-300/20 text-slate-500">
                                            <span className="size-1.5 rounded-full bg-slate-400" />
                                            {tx.status}
                                        </span>
                                    );
                                    if (tx.status === 'PAID') {
                                        statusBadge = (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500">
                                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                                Paid
                                            </span>
                                        );
                                    } else if (tx.status === 'PENDING') {
                                        statusBadge = (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-500 animate-pulse">
                                                <span className="size-1.5 rounded-full bg-amber-500" />
                                                Pending
                                            </span>
                                        );
                                    } else if (tx.status === 'FAILED') {
                                        statusBadge = (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-500">
                                                <span className="size-1.5 rounded-full bg-rose-500" />
                                                Failed
                                            </span>
                                        );
                                    }

                                    return (
                                        <tr key={tx.mchOrderId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors">
                                            <td className="p-4">
                                                <p className="font-bold text-slate-900 dark:text-white">{tx.customerName || 'Anonymous'}</p>
                                                <p className="text-[10px] text-slate-400 mt-0.5">{tx.customerEmail}</p>
                                                <p className="text-[10px] text-slate-400">{tx.customerMobile}</p>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-slate-700 dark:text-slate-300">
                                                {tx.mchOrderId}
                                            </td>
                                            <td className="p-4 whitespace-nowrap">
                                                {tx.channelCode ? (
                                                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-300 rounded-[6px] text-[10px] font-bold">
                                                        {tx.channelCode.replace('_URL', '').replace('_', ' ')}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>
                                            <td className="p-4 font-extrabold text-slate-900 dark:text-white whitespace-nowrap">
                                                ₱{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </td>
                                            <td className="p-4 text-center whitespace-nowrap">{statusBadge}</td>
                                            <td className="p-4 text-slate-700 dark:text-slate-300 font-semibold whitespace-nowrap">{createdStr}</td>
                                            <td className="p-4 text-right whitespace-nowrap print:hidden">
                                                <div className="flex justify-end gap-1.5">
                                                    <button
                                                        onClick={() => setSelectedTx(tx)}
                                                        title="View Details"
                                                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-[8px] font-bold text-[10px] transition-all"
                                                    >
                                                        View Details
                                                    </button>
                                                    {tx.status === 'PENDING' && (
                                                        <button
                                                            onClick={() => handleSyncStatus(tx)}
                                                            disabled={syncingId === tx.mchOrderId}
                                                            title="Sync with PayCools"
                                                            className="px-2.5 py-1 bg-primary/15 hover:bg-primary/20 text-primary border border-primary/20 rounded-[8px] font-bold text-[10px] disabled:opacity-50 inline-flex items-center gap-1 transition-all"
                                                        >
                                                            {syncingId === tx.mchOrderId ? 'Syncing...' : 'Sync'}
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Details Modal */}
            {selectedTx && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 print:absolute print:bg-white print:p-0">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm print:hidden" onClick={() => setSelectedTx(null)}></div>
                    <div className="bg-white dark:bg-slate-800 rounded-[10px] p-4 max-w-3xl w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto pr-2 custom-scrollbar print:max-h-none print:shadow-none print:p-0 print:overflow-visible relative z-10">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-4 print:hidden">
                            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">receipt_long</span>
                                Transaction Invoice Details
                            </h3>
                            <button
                                onClick={() => setSelectedTx(null)}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Customer & Transaction Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 leading-relaxed">
                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Customer Profile</h4>
                                <div>
                                    <p className="text-xs text-slate-400">Full Name</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTx.customerName}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Email Address</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTx.customerEmail}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Contact Number</p>
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTx.customerMobile || '—'}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400">Local User ID</p>
                                    <p className="text-sm font-mono text-slate-600 dark:text-slate-300 truncate max-w-xs">{selectedTx.userId || '—'}</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest border-b pb-1">Gateway Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Merchant Order ID</p>
                                        <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTx.mchOrderId}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Checkout ID</p>
                                        <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTx.checkoutId || '—'}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">PayCools Reference ID</p>
                                        <p className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{selectedTx.transactionId || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Payment Status</p>
                                        <span className={`inline-block px-2.5 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider mt-1 ${
                                            selectedTx.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-500' :
                                            selectedTx.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500 animate-pulse' :
                                            selectedTx.status === 'FAILED' ? 'bg-rose-500/10 text-rose-500' :
                                            selectedTx.status === 'CLOSED' ? 'bg-slate-300/20 text-slate-500' :
                                            'bg-slate-100 dark:bg-slate-700 text-slate-600'
                                        }`}>
                                            {selectedTx.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs text-slate-400">Channel Type</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white capitalize">{selectedTx.channelType || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400">Channel Code</p>
                                        <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedTx.channelCode?.replace('_URL','') || '—'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Amount & Items Detail */}
                        <div className="bg-slate-50 dark:bg-slate-900/40 rounded-[10px] p-5 space-y-3">
                            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Transaction Description</h4>
                            <div className="flex justify-between font-bold text-sm">
                                <span className="text-slate-700 dark:text-slate-300">{selectedTx.goodsDetails || 'PAHA Membership Registration'}</span>
                                <span className="text-slate-900 dark:text-white">₱{selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                            <hr className="border-slate-200 dark:border-white/5" />
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-semibold text-slate-400">Total Fee Settled ({selectedTx.currency})</span>
                                <span className="text-xl font-black text-primary">₱{selectedTx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>

                        {/* Diagnostics & Logs section */}
                        <div className="space-y-2.5 print:hidden">
                            <div className="flex items-center gap-2 pb-1">
                                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">PayCools API Trace Logs</h4>
                                <span className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-400 px-1.5 py-0.5 rounded-full font-bold">Admin-Only Diagnostic</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setDiagnosticsModal({ type: 'CreateRequest', title: 'Raw Create Request Payload', data: selectedTx.rawCreateRequest })}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold text-[10px]"
                                    disabled={!selectedTx.rawCreateRequest}
                                >
                                    Create Request
                                </button>
                                <button
                                    onClick={() => setDiagnosticsModal({ type: 'CreateResponse', title: 'Raw Create Response Payload', data: selectedTx.rawCreateResponse })}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold text-[10px]"
                                    disabled={!selectedTx.rawCreateResponse}
                                >
                                    Create Response
                                </button>
                                <button
                                    onClick={() => setDiagnosticsModal({ type: 'QueryResponse', title: 'Raw Query Response Log', data: selectedTx.rawQueryResponse })}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold text-[10px]"
                                    disabled={!selectedTx.rawQueryResponse}
                                >
                                    Query Response
                                </button>
                                <button
                                    onClick={() => setDiagnosticsModal({ type: 'WebhookPayload', title: 'Raw Webhook Event Payload', data: selectedTx.rawWebhookPayload })}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold text-[10px]"
                                    disabled={!selectedTx.rawWebhookPayload}
                                >
                                    Webhook Payload
                                </button>
                            </div>
                        </div>

                        {/* Control buttons inside details (Hide when printing) */}
                        <div className="flex flex-wrap items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5 gap-3 print:hidden">
                            <div className="flex gap-2">
                                <button
                                    onClick={handlePrintReceipt}
                                    className="px-4 py-2 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-[10px] text-xs font-semibold flex items-center gap-1.5"
                                >
                                    <span className="material-symbols-outlined text-sm">print</span> Print Receipt
                                </button>
                                {selectedTx.status === 'PENDING' && (
                                    <button
                                        onClick={() => handleCloseTransaction(selectedTx)}
                                        disabled={closingId === selectedTx.mchOrderId}
                                        className="px-4 py-2 border border-rose-200 hover:bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:hover:bg-rose-500/10 rounded-[10px] text-xs font-semibold disabled:opacity-50"
                                    >
                                        {closingId === selectedTx.mchOrderId ? 'Closing...' : 'Close Gateway Checkout'}
                                    </button>
                                )}
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedTx(null)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 font-semibold rounded-[10px] text-xs text-slate-700 dark:text-slate-200"
                                >
                                    Cancel
                                </button>
                                {selectedTx.status === 'PENDING' && (
                                    <button
                                        onClick={() => handleSyncStatus(selectedTx)}
                                        disabled={syncingId === selectedTx.mchOrderId}
                                        className="px-4 py-2 bg-primary hover:bg-primary/95 text-white font-bold rounded-[10px] text-xs disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-primary/20"
                                    >
                                        <span className="material-symbols-outlined text-sm animate-spin-slow">sync</span>
                                        {syncingId === selectedTx.mchOrderId ? 'Syncing...' : 'Sync Gateway Status'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sub-diagnostic payload modal */}
            {diagnosticsModal && (
                <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 rounded-[10px] p-5 max-w-2xl w-full max-h-[80vh] flex flex-col gap-4 text-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-white/10 pb-3">
                            <h4 className="font-bold text-sm text-slate-300">{diagnosticsModal.title}</h4>
                            <button
                                onClick={() => setDiagnosticsModal(null)}
                                className="text-slate-400 hover:text-white"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto pr-1">
                            <pre className="p-4 bg-black/40 rounded-[10px] font-mono text-[11px] leading-relaxed text-emerald-400">
                                {JSON.stringify(diagnosticsModal.data, null, 4)}
                            </pre>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayCoolsTransactions;
