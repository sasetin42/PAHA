import React, { useState, useEffect } from 'react';
import { auth, db } from '../../config/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

interface PayCoolsSettingsData {
    enabled: boolean;
    environment: 'sandbox' | 'live';
    baseApiUrl: string;
    appId: string;
    appName: string;
    merchantId?: string;
    merchantPrivateKey: string;
    paycoolsPublicKey: string;
    defaultCurrency: string;
    settlementCurrency: string;
    countryCode: string;
    expireSeconds: number;
    merchantLogo: string;
    notifyUrl: string;
    redirectSuccessUrl: string;
    redirectFailedUrl: string;
    redirectPendingUrl: string;
    allowedChannelTypes: string[];
    allowedChannelCodes: string[];
    webhookLastReceivedAt?: any;
    lastConnectionTestAt?: any;
    lastConnectionStatus?: string;
    lastPaycoolsResponseLog?: string;
}

interface AuditLog {
    id: string;
    adminUserId: string;
    action: string;
    module: string;
    createdAt: any;
    ipAddress?: string;
}

const AVAILABLE_CHANNEL_TYPES = [
    { code: 'EWALLET', label: 'E-Wallet' },
    { code: 'ONLINE_BANKING', label: 'Online Banking' },
    { code: 'CARD', label: 'Credit/Debit Card' },
    { code: 'OTC', label: 'Over-The-Counter' },
    { code: 'QR', label: 'QR Code' }
];

const AVAILABLE_CHANNEL_CODES = [
    { code: 'GCASH_URL', label: 'GCash', type: 'EWALLET' },
    { code: 'PAYMAYA_URL', label: 'Maya', type: 'EWALLET' },
    { code: 'BPIA_URL', label: 'BPI Online', type: 'ONLINE_BANKING' },
    { code: 'MAYB_URL', label: 'Maybank', type: 'ONLINE_BANKING' },
    { code: 'MBTC_URL', label: 'Metrobank', type: 'ONLINE_BANKING' },
    { code: 'RCBC_URL', label: 'RCBC', type: 'ONLINE_BANKING' },
    { code: 'UBPB_URL', label: 'UnionBank', type: 'ONLINE_BANKING' },
    { code: 'VISA_CARD_URL', label: 'Visa Card', type: 'CARD' },
    { code: 'MASTER_CARD_URL', label: 'Mastercard', type: 'CARD' },
    { code: 'QRPH_DYNAMIC_QR', label: 'QRPH Dynamic', type: 'QR' },
    { code: '7ELEVEN_VA', label: '7-Eleven', type: 'OTC' }
];

const PayCoolsSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [settings, setSettings] = useState<PayCoolsSettingsData>({
        enabled: false,
        environment: 'live',
        baseApiUrl: 'https://api-uat.paycools.com',
        appId: '',
        appName: '',
        merchantId: '',
        merchantPrivateKey: '',
        paycoolsPublicKey: '',
        defaultCurrency: 'PHP',
        settlementCurrency: 'PHP',
        countryCode: 'PH',
        expireSeconds: 86400,
        merchantLogo: '',
        notifyUrl: '',
        redirectSuccessUrl: '',
        redirectFailedUrl: '',
        redirectPendingUrl: '',
        allowedChannelTypes: ['EWALLET', 'QR'],
        allowedChannelCodes: ['GCASH_URL', 'PAYMAYA_URL', 'QRPH_DYNAMIC_QR']
    });

    const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
    const [realtimeSettings, setRealtimeSettings] = useState<any>(null);

    // Auto-generate webhooks — notifyUrl must always be the production URL
    // (PayCools calls this URL server-to-server, so localhost will never work)
    useEffect(() => {
        const productionBase = 'https://paha-db.web.app';
        const origin = window.location.origin;
        setSettings(prev => ({
            ...prev,
            notifyUrl: `${productionBase}/api/paycools/webhook/checkout`,
            redirectSuccessUrl: `${origin}/membership/payment/success`,
            redirectFailedUrl: `${origin}/membership/payment/failed`,
            redirectPendingUrl: `${origin}/membership/payment/pending`
        }));
    }, []);

    // Load Settings & Live status from Firestore
    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, 'paymentGatewaySettings'), (snap) => {
            const paycoolsDoc = snap.docs.find(d => d.id === 'paycools');
            if (paycoolsDoc) {
                const data = paycoolsDoc.data();
                setRealtimeSettings(data);
            }
        });
        return () => unsubscribe();
    }, []);

    // Load audit logs
    useEffect(() => {
        const q = query(
            collection(db, 'adminAuditLogs'),
            orderBy('createdAt', 'desc'),
            limit(10)
        );
        const unsubscribe = onSnapshot(q, (snap) => {
            const logs = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AuditLog));
            setAuditLogs(logs);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = await auth.currentUser?.getIdToken();
                if (!token) return;

                const response = await fetch('/api/paycools/settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const resData = await response.json();
                if (resData.success && resData.data) {
                    const env: 'sandbox' | 'live' = resData.data.environment || 'live';
                    // Always enforce the correct base URL for the selected environment
                    const correctBaseUrl = env === 'live'
                        ? 'https://api.paycools.com.ph'
                        : 'https://api-uat.paycools.com';
                    setSettings(prev => ({
                        ...prev,
                        ...resData.data,
                        environment: env,
                        baseApiUrl: correctBaseUrl,
                        // Ensure webhook fields are updated to current origin if empty
                        notifyUrl: resData.data.notifyUrl || prev.notifyUrl,
                        redirectSuccessUrl: resData.data.redirectSuccessUrl || prev.redirectSuccessUrl,
                        redirectFailedUrl: resData.data.redirectFailedUrl || prev.redirectFailedUrl,
                        redirectPendingUrl: resData.data.redirectPendingUrl || prev.redirectPendingUrl
                    }));
                }
            } catch (err) {
                console.error('Failed to load settings:', err);
                showToast('Failed to load settings', 'error');
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch('/api/paycools/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settings)
            });

            if (response.ok) {
                showToast('Settings saved successfully', 'success');
            } else {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to save');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch('/api/paycools/settings/test-connection', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                showToast('Connection Test Successful!', 'success');
            } else {
                showToast(data.error || 'Connection Test Failed', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setTesting(false);
        }
    };

    const handleFetchChannels = async () => {
        setFetching(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch('/api/paycools/channels', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (data.success) {
                showToast(`Successfully cached ${data.data?.length || 0} channels!`, 'success');
            } else {
                showToast(data.error || 'Failed to fetch channels', 'error');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setFetching(false);
        }
    };

    const toggleChannelType = (code: string) => {
        setSettings(prev => {
            const types = prev.allowedChannelTypes.includes(code)
                ? prev.allowedChannelTypes.filter(c => c !== code)
                : [...prev.allowedChannelTypes, code];
            return { ...prev, allowedChannelTypes: types };
        });
    };

    const toggleChannelCode = (code: string) => {
        setSettings(prev => {
            const codes = prev.allowedChannelCodes.includes(code)
                ? prev.allowedChannelCodes.filter(c => c !== code)
                : [...prev.allowedChannelCodes, code];
            return { ...prev, allowedChannelCodes: codes };
        });
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        showToast('Copied to clipboard!', 'success');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <span className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></span>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {toast && (
                <div className={`fixed top-5 right-5 z-[300] px-4 py-3 rounded-[10px] shadow-xl flex items-center gap-3 text-sm font-semibold text-white animate-fade-in ${
                    toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
                }`}>
                    <span className="material-symbols-outlined">
                        {toast.type === 'success' ? 'check_circle' : 'error'}
                    </span>
        {toast.message}
        </div>
      )}

      {/* Header Cards & Live Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Gateway Status</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            {settings.enabled ? 'Enabled' : 'Disabled'}
                        </h3>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full ${settings.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`}></span>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Mode</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white capitalize">
                            {settings.environment}
                        </h3>
                    </div>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                        settings.environment === 'live' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                    }`}>
                        {settings.environment === 'live' ? 'Production' : 'Sandbox'}
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Webhook Status</p>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                            {(() => {
                                const val = realtimeSettings?.webhookLastReceivedAt;
                                if (!val) return 'No events received yet';
                                if (typeof val === 'object' && val.seconds !== undefined) {
                                    return `Last: ${new Date(val.seconds * 1000).toLocaleString()}`;
                                }
                                const d = new Date(val);
                                if (!isNaN(d.getTime())) {
                                    return `Last: ${d.toLocaleString()}`;
                                }
                                return 'No events received yet';
                            })()}
                        </h3>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">sync_alt</span>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
                {/* Configuration Fields */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-white/5 gap-4">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">PayCools API Credentials</h3>
                            <p className="text-xs text-slate-500">Configure connection details for the PayCools payment gateway.</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-semibold text-slate-600 dark:text-slate-300">Enable PayCools</label>
                            <button
                                type="button"
                                onClick={() => setSettings(prev => ({ ...prev, enabled: !prev.enabled }))}
                                className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                                    settings.enabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                                }`}
                            >
                                <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-md ${
                                    settings.enabled ? 'translate-x-5' : 'translate-x-0'
                                }`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label htmlFor="environment" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Environment</label>
                            <select
                                id="environment"
                                name="environment"
                                value={settings.environment}
                                onChange={e => {
                                    const env = e.target.value as 'sandbox' | 'live';
                                    setSettings(prev => ({
                                        ...prev,
                                        environment: env,
                                        baseApiUrl: env === 'live' ? 'https://api.paycools.com.ph' : 'https://api-uat.paycools.com'
                                    }));
                                }}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            >
                                <option value="sandbox">Sandbox / UAT</option>
                                <option value="live">Live / Production</option>
                            </select>
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="baseApiUrl" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Base API URL</label>
                            <input
                                id="baseApiUrl"
                                name="baseApiUrl"
                                type="text"
                                value={settings.baseApiUrl}
                                onChange={e => setSettings(prev => ({ ...prev, baseApiUrl: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="appId" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">App ID</label>
                            <input
                                id="appId"
                                name="appId"
                                type="text"
                                value={settings.appId}
                                onChange={e => setSettings(prev => ({ ...prev, appId: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Enter App ID"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="appName" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">App Name / Merchant Name</label>
                            <input
                                id="appName"
                                name="appName"
                                type="text"
                                value={settings.appName}
                                onChange={e => setSettings(prev => ({ ...prev, appName: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="e.g. Proximatech Solutions Company"
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="merchantId" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Merchant ID (Optional)</label>
                            <input
                                id="merchantId"
                                name="merchantId"
                                type="text"
                                value={settings.merchantId || ''}
                                onChange={e => setSettings(prev => ({ ...prev, merchantId: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="Enter Merchant ID"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label htmlFor="merchantLogo" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Merchant Logo URL</label>
                            <input
                                id="merchantLogo"
                                name="merchantLogo"
                                type="text"
                                value={settings.merchantLogo}
                                onChange={e => setSettings(prev => ({ ...prev, merchantLogo: e.target.value }))}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder="https://example.com/logo.png"
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label htmlFor="merchantPrivateKey" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                Merchant Private Key (RSA2 4096-bit)
                            </label>
                            <textarea
                                id="merchantPrivateKey"
                                name="merchantPrivateKey"
                                value={settings.merchantPrivateKey}
                                onChange={e => setSettings(prev => ({ ...prev, merchantPrivateKey: e.target.value }))}
                                className="w-full h-24 px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={settings.merchantPrivateKey ? "Preserved masked key. Type/Paste to replace." : "-----BEGIN PRIVATE KEY-----"}
                            />
                        </div>

                        <div className="space-y-1.5 md:col-span-2">
                            <label htmlFor="paycoolsPublicKey" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                PayCools Public Key (RSA2 4096-bit)
                            </label>
                            <textarea
                                id="paycoolsPublicKey"
                                name="paycoolsPublicKey"
                                value={settings.paycoolsPublicKey}
                                onChange={e => setSettings(prev => ({ ...prev, paycoolsPublicKey: e.target.value }))}
                                className="w-full h-24 px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-primary/20"
                                placeholder={settings.paycoolsPublicKey ? "Preserved masked key. Type/Paste to replace." : "-----BEGIN PUBLIC KEY-----"}
                            />
                        </div>
                    </div>
                </div>

                {/* Additional Settings */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                        Transaction Default Values
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
                        <div className="space-y-1.5">
                            <label htmlFor="defaultCurrency" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Currency</label>
                            <input
                                id="defaultCurrency"
                                name="defaultCurrency"
                                type="text"
                                value={settings.defaultCurrency}
                                readOnly
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-700/30 text-slate-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="settlementCurrency" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Settlement Currency</label>
                            <input
                                id="settlementCurrency"
                                name="settlementCurrency"
                                type="text"
                                value={settings.settlementCurrency}
                                readOnly
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-700/30 text-slate-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="countryCode" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Country Code</label>
                            <input
                                id="countryCode"
                                name="countryCode"
                                type="text"
                                value={settings.countryCode}
                                readOnly
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-700/30 text-slate-500 focus:outline-none"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="expireSeconds" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Expiration (Seconds)</label>
                            <input
                                id="expireSeconds"
                                name="expireSeconds"
                                type="number"
                                value={settings.expireSeconds}
                                onChange={e => setSettings(prev => ({ ...prev, expireSeconds: Number(e.target.value) }))}
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                                required
                            />
                        </div>
                    </div>
                </div>

                {/* System Generated URLs */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                        Integration Routing URLs
                    </h3>
                    <div className="space-y-3.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-[10px]">
                            <div>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Webhook URL / Notify URL</span>
                                <code className="text-xs font-mono text-primary font-semibold truncate max-w-lg block mt-0.5">{settings.notifyUrl}</code>
                            </div>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(settings.notifyUrl)}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 shrink-0"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                            </button>
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-slate-50 dark:bg-slate-900/40 rounded-[10px]">
                            <div>
                                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">Redirect Success URL</span>
                                <code className="text-xs font-mono text-slate-700 dark:text-slate-300 truncate max-w-lg block mt-0.5">{settings.redirectSuccessUrl}</code>
                            </div>
                            <button
                                type="button"
                                onClick={() => copyToClipboard(settings.redirectSuccessUrl)}
                                className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded-[10px] text-xs font-semibold flex items-center gap-1.5 shrink-0"
                            >
                                <span className="material-symbols-outlined text-sm">content_copy</span> Copy
                            </button>
                        </div>
                    </div>
                </div>

                {/* Channels Selection */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                        Allowed Payment Channels
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                                Channel Types
                            </span>
                            <div className="flex flex-wrap gap-3">
                                {AVAILABLE_CHANNEL_TYPES.map(type => {
                                    const active = settings.allowedChannelTypes.includes(type.code);
                                    return (
                                        <button
                                            type="button"
                                            key={type.code}
                                            onClick={() => toggleChannelType(type.code)}
                                            className={`px-3.5 py-2 rounded-[10px] text-xs font-semibold border transition-all flex items-center gap-2 ${
                                                active 
                                                    ? 'bg-primary/10 border-primary text-primary font-bold' 
                                                    : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {active ? 'check_box' : 'check_box_outline_blank'}
                                            </span>
                                            {type.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div>
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-2.5">
                                Specific Channels Codes
                            </span>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                {AVAILABLE_CHANNEL_CODES.map(ch => {
                                    const active = settings.allowedChannelCodes.includes(ch.code);
                                    return (
                                        <button
                                            type="button"
                                            key={ch.code}
                                            onClick={() => toggleChannelCode(ch.code)}
                                            className={`px-3 py-2 rounded-[10px] text-xs font-medium border text-left flex items-start gap-2.5 transition-all ${
                                                active 
                                                    ? 'bg-primary/10 border-primary text-primary font-bold' 
                                                    : 'bg-slate-50 dark:bg-slate-700/30 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300'
                                            }`}
                                        >
                                            <span className="material-symbols-outlined text-sm shrink-0 mt-0.5">
                                                {active ? 'check_box' : 'check_box_outline_blank'}
                                            </span>
                                            <div>
                                                <span className="block font-semibold">{ch.label}</span>
                                                <span className="block text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">{ch.type}</span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit & Diagnostic Logs */}
                {realtimeSettings?.lastPaycoolsResponseLog && (
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                            Last Connection Test Response Log
                        </h3>
                        <pre className="p-4 bg-slate-50 dark:bg-slate-900 rounded-[10px] overflow-x-auto text-[11px] font-mono text-slate-600 dark:text-slate-300 leading-relaxed max-h-40">
                            {realtimeSettings.lastPaycoolsResponseLog}
                        </pre>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-4 justify-between pt-2">
                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testing || saving}
                            className="px-5 py-2.5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-[10px] text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                        >
                            {testing ? (
                                <><span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin"></span> Testing...</>
                            ) : (
                                <><span className="material-symbols-outlined text-sm">wifi_tethering</span> Test Connection</>
                            )}
                        </button>

                        <button
                            type="button"
                            onClick={handleFetchChannels}
                            disabled={fetching || saving}
                            className="px-5 py-2.5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-[10px] text-sm font-semibold flex items-center gap-2 text-slate-700 dark:text-slate-200 disabled:opacity-50"
                        >
                            {fetching ? (
                                <><span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin"></span> Fetching...</>
                            ) : (
                                <><span className="material-symbols-outlined text-sm">cloud_download</span> Fetch Channels</>
                            )}
                        </button>
                    </div>

                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2.5 bg-primary text-white font-bold rounded-[10px] hover:bg-primary/95 shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50"
                    >
                        {saving ? (
                            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Saving...</>
                        ) : (
                            <><span className="material-symbols-outlined text-sm">save</span> Save Settings</>
                        )}
                    </button>
                </div>
            </form>

            {/* Audit Logs Section */}
            {auditLogs.length > 0 && (
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                        Admin Audit Logs (Recent Changes)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400 font-bold uppercase tracking-wider">
                                    <th className="py-2.5 px-3">Date/Time</th>
                                    <th className="py-2.5 px-3">Admin UID</th>
                                    <th className="py-2.5 px-3">Action</th>
                                    <th className="py-2.5 px-3">IP Address</th>
                                </tr>
                            </thead>
                            <tbody>
                                {auditLogs.map(log => (
                                    <tr key={log.id} className="border-b border-slate-50 dark:border-white/5 text-slate-700 dark:text-slate-300 font-medium hover:bg-slate-50/50 dark:hover:bg-slate-700/20">
                                        <td className="py-2.5 px-3">
                                            {log.createdAt ? new Date(log.createdAt.seconds * 1000).toLocaleString() : 'Pending'}
                                        </td>
                                        <td className="py-2.5 px-3 font-mono">{log.adminUserId}</td>
                                        <td className="py-2.5 px-3">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-[10px] font-bold">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3">{log.ipAddress || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayCoolsSettings;
