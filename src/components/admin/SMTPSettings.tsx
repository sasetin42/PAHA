import React, { useState, useEffect } from 'react';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface SMTPSettingsData {
    host: string;
    port: string;
    secure: 'ssl' | 'starttls' | 'none';
    authEnabled: boolean;
    user: string;
    pass: string;
    fromName: string;
    fromEmail: string;
}

const SMTPSettings: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [testing, setTesting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    
    const [settings, setSettings] = useState<SMTPSettingsData>({
        host: '',
        port: '587',
        secure: 'starttls',
        authEnabled: true,
        user: '',
        pass: '',
        fromName: '',
        fromEmail: ''
    });

    const [testEmail, setTestEmail] = useState('');
    const [connectionStatus, setConnectionStatus] = useState<'unconfigured' | 'connected' | 'failed'>('unconfigured');
    const [statusDetails, setStatusDetails] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const snap = await getDoc(doc(db, 'systemSettings', 'smtp'));
                if (snap.exists()) {
                    const data = snap.data() as SMTPSettingsData;
                    setSettings({
                        host: data.host || '',
                        port: data.port || '587',
                        secure: data.secure || 'starttls',
                        authEnabled: data.authEnabled !== undefined ? data.authEnabled : true,
                        user: data.user || '',
                        pass: data.pass || '',
                        fromName: data.fromName || '',
                        fromEmail: data.fromEmail || ''
                    });
                    setConnectionStatus('connected');
                } else {
                    setConnectionStatus('unconfigured');
                }
            } catch (err: any) {
                console.error('Failed to load SMTP settings:', err);
                showToast('Failed to load SMTP settings', 'error');
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
            await setDoc(doc(db, 'systemSettings', 'smtp'), {
                ...settings,
                updatedAt: new Date().toISOString()
            });
            showToast('SMTP settings saved successfully', 'success');
            setConnectionStatus('connected');
            setStatusDetails('Settings saved. Ready to test.');
        } catch (err: any) {
            showToast(err.message || 'Failed to save settings', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleTestConnection = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!testEmail) {
            showToast('Please enter a test email address', 'error');
            return;
        }
        setTesting(true);
        setStatusDetails('Testing connection...');
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error('Authentication required');

            const response = await fetch('/api/paycools/smtp/test', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    ...settings,
                    testEmail
                })
            });
            
            const data = await response.json();
            if (response.ok && data.success) {
                showToast('Test email sent successfully!', 'success');
                setConnectionStatus('connected');
                setStatusDetails(`Success! Test email sent. Message ID: ${data.messageId}`);
            } else {
                setConnectionStatus('failed');
                const errMsg = data.error || 'SMTP Connection Test Failed';
                showToast(errMsg, 'error');
                setStatusDetails(`Failed: ${errMsg}`);
            }
        } catch (err: any) {
            setConnectionStatus('failed');
            showToast(err.message, 'error');
            setStatusDetails(`Error: ${err.message}`);
        } finally {
            setTesting(false);
        }
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

            {/* Header Cards & Connection Status */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-5 flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SMTP Server Status</p>
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                            {connectionStatus === 'connected' ? 'Configured' : connectionStatus === 'failed' ? 'Connection Failed' : 'Unconfigured'}
                        </h3>
                    </div>
                    <span className={`w-3.5 h-3.5 rounded-full ${
                        connectionStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : connectionStatus === 'failed' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}></span>
                </div>

                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-5 flex items-center justify-between md:col-span-2">
                    <div className="space-y-1 w-full">
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Diagnostic Log / Details</p>
                        <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate max-w-full font-mono">
                            {statusDetails || 'No connection tests performed yet.'}
                        </h3>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">terminal</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Form configuration - Left Side */}
                <form onSubmit={handleSave} className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5 gap-4">
                            <div>
                                <h3 className="text-base font-semibold text-slate-900 dark:text-white">SMTP Configuration</h3>
                                <p className="text-xs text-slate-500">Configure connection details for outgoing emails.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="sp-smtp-host" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SMTP Host / Server</label>
                                <input
                                    id="sp-smtp-host"
                                    type="text"
                                    value={settings.host}
                                    onChange={e => setSettings(prev => ({ ...prev, host: e.target.value }))}
                                    placeholder="e.g. smtp.gmail.com"
                                    className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="sp-smtp-port" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SMTP Port</label>
                                <input
                                    id="sp-smtp-port"
                                    type="text"
                                    value={settings.port}
                                    onChange={e => setSettings(prev => ({ ...prev, port: e.target.value }))}
                                    placeholder="e.g. 587"
                                    className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="sp-smtp-secure" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Encryption Method</label>
                                <select
                                    id="sp-smtp-secure"
                                    value={settings.secure}
                                    onChange={e => {
                                        const sec = e.target.value as 'ssl' | 'starttls' | 'none';
                                        setSettings(prev => ({
                                            ...prev,
                                            secure: sec,
                                            port: sec === 'ssl' ? '465' : sec === 'starttls' ? '587' : '25'
                                        }));
                                    }}
                                    className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                                >
                                    <option value="ssl">SSL / TLS (Port 465 recommended)</option>
                                    <option value="starttls">STARTTLS (Port 587 recommended)</option>
                                    <option value="none">None (Port 25 / unencrypted)</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900/40 rounded-[10px] border border-slate-100 dark:border-white/5">
                                <div className="space-y-0.5">
                                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">Require Authentication</span>
                                    <span className="text-[10px] text-slate-400 block font-medium">Use username and password</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setSettings(prev => ({ ...prev, authEnabled: !prev.authEnabled }))}
                                    className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                                        settings.authEnabled ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-700'
                                    }`}
                                >
                                    <span className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform shadow-md ${
                                        settings.authEnabled ? 'translate-x-5' : 'translate-x-0'
                                    }`} />
                                </button>
                            </div>
                        </div>

                        {settings.authEnabled && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-white/5 animate-fade-in">
                                <div className="space-y-1.5">
                                    <label htmlFor="sp-smtp-user" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SMTP Username / Email</label>
                                    <input
                                        id="sp-smtp-user"
                                        type="text"
                                        value={settings.user}
                                        onChange={e => setSettings(prev => ({ ...prev, user: e.target.value }))}
                                        placeholder="e.g. noreply@paha.ph"
                                        className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                                        required={settings.authEnabled}
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label htmlFor="sp-smtp-pass" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">SMTP Password / App Secret</label>
                                    <input
                                        id="sp-smtp-pass"
                                        type="password"
                                        value={settings.pass}
                                        onChange={e => setSettings(prev => ({ ...prev, pass: e.target.value }))}
                                        placeholder="••••••••••••••••"
                                        className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                                        required={settings.authEnabled}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 space-y-4">
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-white/5">
                            Sender Details
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="sp-smtp-fromName" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sender Name</label>
                                <input
                                    id="sp-smtp-fromName"
                                    type="text"
                                    value={settings.fromName}
                                    onChange={e => setSettings(prev => ({ ...prev, fromName: e.target.value }))}
                                    placeholder="e.g. PAHA Secretariat"
                                    className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label htmlFor="sp-smtp-fromEmail" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sender Email Address</label>
                                <input
                                    id="sp-smtp-fromEmail"
                                    type="email"
                                    value={settings.fromEmail}
                                    onChange={e => setSettings(prev => ({ ...prev, fromEmail: e.target.value }))}
                                    placeholder="e.g. info@paha.ph"
                                    className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="submit"
                            disabled={saving}
                            className="px-6 py-2.5 bg-primary text-white font-bold rounded-[10px] hover:bg-primary/95 shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 text-[11px] uppercase tracking-wider"
                        >
                            {saving ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Saving...</>
                            ) : (
                                <><span className="material-symbols-outlined text-sm">save</span> Save SMTP Settings</>
                            )}
                        </button>
                    </div>
                </form>

                {/* Connection Test Panel - Right Side */}
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/5 rounded-[10px] p-4 flex flex-col justify-between h-fit gap-4">
                    <div className="space-y-3">
                        <div>
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">SMTP Connection Test</h3>
                            <p className="text-xs text-slate-500">Send a quick test email to verify your SMTP server configuration in real-time.</p>
                        </div>
                        <hr className="border-slate-100 dark:border-white/5" />
                        <div className="space-y-1.5">
                            <label htmlFor="sp-smtp-testEmail" className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Test Destination Email</label>
                            <input
                                id="sp-smtp-testEmail"
                                type="email"
                                value={testEmail}
                                onChange={e => setTestEmail(e.target.value)}
                                placeholder="your-email@example.com"
                                className="w-full px-4 py-2.5 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-700/50 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 font-semibold"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleTestConnection}
                        disabled={testing || saving || !settings.host || !settings.port || !settings.fromEmail}
                        className="w-full py-2.5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-700/50 rounded-[10px] text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 text-slate-700 dark:text-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
                    >
                        {testing ? (
                            <><span className="w-4 h-4 border-2 border-slate-400/30 border-t-slate-600 rounded-full animate-spin"></span> Testing...</>
                        ) : (
                            <><span className="material-symbols-outlined text-sm">send</span> Send Test Email</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SMTPSettings;
