import React, { useState, useEffect } from 'react';
import { storage, db } from '../../config/firebase';
import { ref, listAll, getDownloadURL, getMetadata, uploadBytes, getBlob } from 'firebase/storage';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import PayCoolsSettings from './PayCoolsSettings';
import SMTPSettings from './SMTPSettings';

interface StorageImage {
    path: string;
    name: string;
    originalSize: number;
    compressedSize: number | null;
    savedBytes: number | null;
    url: string;
    status: 'idle' | 'processing' | 'done' | 'skipped' | 'error';
    errorMsg?: string;
}

const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const compressToWebP = (blob: Blob, quality: number): Promise<Blob | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);
        img.onload = () => {
            URL.revokeObjectURL(url);
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(null); return; }
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(resolve, 'image/webp', quality / 100);
        };
        img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
        img.src = url;
    });
};

const SCAN_FOLDERS = ['images', 'committees', 'partners', 'events'];

const SettingsPanel: React.FC = () => {
    const [subTab, setSubTab] = useState<'paycools' | 'appearance' | 'smtp' | 'plans_validity' | 'card_design'>('appearance');

    // Membership Card Customization State
    const [cardBackgroundType, setCardBackgroundType] = useState<'solid' | 'gradient' | 'image'>('gradient');
    const [cardSolidColor, setCardSolidColor] = useState('#0d2257');
    const [cardGradientStart, setCardGradientStart] = useState('#0d2257');
    const [cardGradientVia, setCardGradientVia] = useState('#2563eb');
    const [cardGradientEnd, setCardGradientEnd] = useState('#3b82f6');
    const [cardGradientDirection, setCardGradientDirection] = useState('to-br');
    const [cardTextColor, setCardTextColor] = useState<'light' | 'dark'>('light');
    const [cardIcon, setCardIcon] = useState<'pets' | 'medical_services' | 'local_hospital' | 'custom'>('pets');
    const [cardCustomIconUrl, setCardCustomIconUrl] = useState('');
    const [cardBackgroundImageUrl, setCardBackgroundImageUrl] = useState('');
    const [cardShowPattern, setCardShowPattern] = useState(true);
    const [cardTitle, setCardTitle] = useState('MEMBERSHIP CARD');
    const [uploadingCardBg, setUploadingCardBg] = useState(false);
    const [uploadingCardIcon, setUploadingCardIcon] = useState(false);
    const [savingCardDesign, setSavingCardDesign] = useState(false);
    const [cardSaveStatus, setCardSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Accreditation Validity & Custom Duration Settings State
    const [accValidityYears, setAccValidityYears] = useState(3);
    const [accBaseFee, setAccBaseFee] = useState(15000);
    const [accProcessingFee, setAccProcessingFee] = useState(2500);
    const [enableAccProcessingFee, setEnableAccProcessingFee] = useState(true);
    const [savingAccSettings, setSavingAccSettings] = useState(false);
    const [accSaveStatus, setAccSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    // Membership Plans Editing State (Only Annual Membership with Fee, Processing Fee, Validity)
    const [firstPaymentFee, setFirstPaymentFee] = useState(5000);
    const [recurringFee, setRecurringFee] = useState(2000);
    const [annualMemberProcessingFee, setAnnualMemberProcessingFee] = useState(1000);
    const [enableMemberProcessingFee, setEnableMemberProcessingFee] = useState(true);
    const [annualMemberValidityYears, setAnnualMemberValidityYears] = useState(1);
    const [syncValidityWithAcc, setSyncValidityWithAcc] = useState(false);
    const [savingPlansList, setSavingPlansList] = useState(false);
    
    // Image Optimizer state
    const [images, setImages] = useState<StorageImage[]>([]);
    const [scanning, setScanning] = useState(false);
    const [optimizing, setOptimizing] = useState(false);
    const [quality, setQuality] = useState(80);
    const [scanned, setScanned] = useState(false);

    // Appearance State
    const [logoUrl, setLogoUrl] = useState('');
    const [headerLogoUrl, setHeaderLogoUrl] = useState('');
    const [footerLogoUrl, setFooterLogoUrl] = useState('');
    const [sidebarCollapsedLogoUrl, setSidebarCollapsedLogoUrl] = useState('');
    const [sidebarExpandedLogoUrl, setSidebarExpandedLogoUrl] = useState('');
    const [loadingLogoUrl, setLoadingLogoUrl] = useState('');
    const [faviconUrl, setFaviconUrl] = useState('');
    const [appName, setAppName] = useState('');
    const [appEmail, setAppEmail] = useState('');
    const [appPhone, setAppPhone] = useState('');
    const [appAddress, setAppAddress] = useState('');
    const [appDescription, setAppDescription] = useState('');
    const [socialFacebook, setSocialFacebook] = useState('');
    const [socialTwitter, setSocialTwitter] = useState('');
    const [socialInstagram, setSocialInstagram] = useState('');
    const [uploadingLogo, setUploadingLogo] = useState(false);
    const [uploadingHeaderLogo, setUploadingHeaderLogo] = useState(false);
    const [uploadingFooterLogo, setUploadingFooterLogo] = useState(false);
    const [uploadingSidebarCollapsed, setUploadingSidebarCollapsed] = useState(false);
    const [uploadingSidebarExpanded, setUploadingSidebarExpanded] = useState(false);
    const [uploadingLoadingLogo, setUploadingLoadingLogo] = useState(false);
    const [uploadingFavicon, setUploadingFavicon] = useState(false);
    const [savingAppearance, setSavingAppearance] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    useEffect(() => {
        if (syncValidityWithAcc) {
            setAnnualMemberValidityYears(accValidityYears);
        }
    }, [syncValidityWithAcc, accValidityYears]);

    // Load appearance settings
    useEffect(() => {
        if (subTab === 'appearance') {
            const loadSettings = async () => {
                try {
                    const snap = await getDoc(doc(db, 'systemSettings', 'appearance'));
                    if (snap.exists()) {
                        const data = snap.data();
                        setLogoUrl(data.logoUrl || '');
                        setHeaderLogoUrl(data.headerLogoUrl || '');
                        setFooterLogoUrl(data.footerLogoUrl || '');
                        setSidebarCollapsedLogoUrl(data.sidebarCollapsedLogoUrl || '');
                        setSidebarExpandedLogoUrl(data.sidebarExpandedLogoUrl || '');
                        setLoadingLogoUrl(data.loadingLogoUrl || '');
                        setFaviconUrl(data.faviconUrl || '/paha-logo.png');
                        setAppName(data.appName || 'PAHA');
                        setAppEmail(data.appEmail || '');
                        setAppPhone(data.appPhone || '');
                        setAppAddress(data.appAddress || '');
                        setAppDescription(data.appDescription || '');
                        setSocialFacebook(data.socialFacebook || '');
                        setSocialTwitter(data.socialTwitter || '');
                        setSocialInstagram(data.socialInstagram || '');
                        setQuality(data.optimizerQuality || 80);
                    }
                } catch (err: any) {
                    console.error('Failed to load appearance:', err);
                }
            };
            loadSettings();
        }

        if (subTab === 'plans_validity') {
            // Real-time sync for accreditation settings
            const unsubAcc = onSnapshot(doc(db, 'systemSettings', 'accreditation'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setAccValidityYears(data.validityYears || 3);
                    setAccBaseFee(data.baseFee || 15000);
                    setAccProcessingFee(data.processingFee !== undefined ? data.processingFee : 2500);
                    setEnableAccProcessingFee(data.enableProcessingFee !== undefined ? data.enableProcessingFee : true);
                }
            }, (err) => {
                console.error('Failed to sync accreditation settings:', err);
            });

            // Real-time sync for Annual Membership plan
            const unsubPlan = onSnapshot(doc(db, 'membership_plans', 'Annual Membership'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const feeVal = data.fee || 5000;
                    setFirstPaymentFee(data.firstPaymentFee !== undefined ? data.firstPaymentFee : feeVal);
                    setRecurringFee(data.recurringFee !== undefined ? data.recurringFee : feeVal);
                    setAnnualMemberProcessingFee(data.processingFee !== undefined ? data.processingFee : 1000);
                    setAnnualMemberValidityYears(data.validityDuration || 1);
                    setEnableMemberProcessingFee(data.enableProcessingFee !== undefined ? data.enableProcessingFee : true);
                    setSyncValidityWithAcc(data.syncValidityWithAccreditation || false);
                }
            }, (err) => {
                console.error('Failed to sync membership plan:', err);
            });

            return () => {
                unsubAcc();
                unsubPlan();
            };
        }

        if (subTab === 'card_design') {
            const unsubCard = onSnapshot(doc(db, 'systemSettings', 'membershipCard'), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    setCardBackgroundType(data.backgroundType || 'gradient');
                    setCardSolidColor(data.solidColor || '#0d2257');
                    setCardGradientStart(data.gradientStart || '#0d2257');
                    setCardGradientVia(data.gradientVia || '#2563eb');
                    setCardGradientEnd(data.gradientEnd || '#3b82f6');
                    setCardGradientDirection(data.gradientDirection || 'to-br');
                    setCardTextColor(data.textColor || 'light');
                    setCardIcon(data.icon || 'pets');
                    setCardCustomIconUrl(data.customIconUrl || '');
                    setCardBackgroundImageUrl(data.backgroundImageUrl || '');
                    setCardShowPattern(data.showPatternOverlay !== false);
                    setCardTitle(data.cardTitle || 'MEMBERSHIP CARD');
                }
            }, (err) => {
                console.error('Failed to sync card design settings:', err);
            });
            return () => unsubCard();
        }
    }, [subTab]);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLogo(true);
        try {
            const fileRef = ref(storage, `system/brand-logo_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setLogoUrl(downloadUrl);
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                logoUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err: any) {
            console.error('Logo upload error:', err);
            alert('Failed to upload logo.');
        } finally {
            setUploadingLogo(false);
        }
    };

    const handleHeaderLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingHeaderLogo(true);
        try {
            const fileRef = ref(storage, `system/header-logo_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setHeaderLogoUrl(downloadUrl);
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                headerLogoUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err: any) {
            console.error('Header Logo upload error:', err);
            alert('Failed to upload Header logo.');
        } finally {
            setUploadingHeaderLogo(false);
        }
    };

    const handleFooterLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFooterLogo(true);
        try {
            const fileRef = ref(storage, `system/footer-logo_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setFooterLogoUrl(downloadUrl);
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                footerLogoUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err: any) {
            console.error('Footer Logo upload error:', err);
            alert('Failed to upload Footer logo.');
        } finally {
            setUploadingFooterLogo(false);
        }
    };

    const handleSidebarCollapsedLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingSidebarCollapsed(true);
        try {
            const fileRef = ref(storage, `system/sidebar-collapsed_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setSidebarCollapsedLogoUrl(downloadUrl);
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                sidebarCollapsedLogoUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err: any) {
            console.error('Sidebar Collapsed Logo upload error:', err);
            alert('Failed to upload Sidebar Collapsed logo.');
        } finally {
            setUploadingSidebarCollapsed(false);
        }
    };

    const handleSidebarExpandedLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingSidebarExpanded(true);
        try {
            const fileRef = ref(storage, `system/sidebar-expanded_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setSidebarExpandedLogoUrl(downloadUrl);
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                sidebarExpandedLogoUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err: any) {
            console.error('Sidebar Expanded Logo upload error:', err);
            alert('Failed to upload Sidebar Expanded logo.');
        } finally {
            setUploadingSidebarExpanded(false);
        }
    };

    const handleLoadingLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingLoadingLogo(true);
        try {
            const fileRef = ref(storage, `system/loading-logo_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setLoadingLogoUrl(downloadUrl);
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                loadingLogoUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err: any) {
            console.error('Loading Logo upload error:', err);
            alert('Failed to upload loading logo.');
        } finally {
            setUploadingLoadingLogo(false);
        }
    };

    const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingFavicon(true);
        try {
            const fileRef = ref(storage, `system/favicon_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setFaviconUrl(downloadUrl);
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                faviconUrl: downloadUrl,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (err: any) {
            console.error('Favicon upload error:', err);
            alert('Failed to upload favicon.');
        } finally {
            setUploadingFavicon(false);
        }
    };

    const saveAppearanceSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingAppearance(true);
        setSaveStatus(null);
        try {
            await setDoc(doc(db, 'systemSettings', 'appearance'), {
                logoUrl,
                headerLogoUrl,
                footerLogoUrl,
                sidebarCollapsedLogoUrl,
                sidebarExpandedLogoUrl,
                loadingLogoUrl,
                faviconUrl,
                appName,
                appEmail,
                appPhone,
                appAddress,
                appDescription,
                socialFacebook,
                socialTwitter,
                socialInstagram,
                optimizerQuality: quality,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            setSaveStatus({ type: 'success', message: 'Appearance settings saved successfully.' });
        } catch (err: any) {
            setSaveStatus({ type: 'error', message: err.message || 'Failed to save settings.' });
        } finally {
            setSavingAppearance(false);
        }
    };

    const scanImages = async () => {
        setScanning(true);
        setScanned(false);
        setImages([]);
        const found: StorageImage[] = [];

        for (const folder of SCAN_FOLDERS) {
            try {
                const folderRef = ref(storage, folder);
                const result = await listAll(folderRef);
                for (const item of result.items) {
                    try {
                        const [url, meta] = await Promise.all([
                            getDownloadURL(item),
                            getMetadata(item),
                        ]);
                        const contentType = meta.contentType || '';
                        if (!contentType.startsWith('image/')) continue;
                        found.push({
                            path: item.fullPath,
                            name: item.name,
                            originalSize: meta.size,
                            compressedSize: null,
                            savedBytes: null,
                            url,
                            status: 'idle',
                        });
                    } catch {
                        // skip inaccessible files
                    }
                }
            } catch {
                // folder may not exist
            }
        }

        setImages(found);
        setScanning(false);
        setScanned(true);
    };

    const optimizeAll = async () => {
        if (!images.length) return;
        setOptimizing(true);
        const idleImages = images.filter(i => i.status === 'idle' || i.status === 'error');

        for (const img of idleImages) {
            setImages(prev => prev.map(i => i.path === img.path ? { ...i, status: 'processing' } : i));
            try {
                const originalBlob = await getBlob(ref(storage, img.path));

                if (img.originalSize < 10 * 1024) {
                    setImages(prev => prev.map(i => i.path === img.path ? { ...i, status: 'skipped', errorMsg: 'Under 10KB, skipped' } : i));
                    continue;
                }

                const compressed = await compressToWebP(originalBlob, quality);
                if (!compressed) throw new Error('Compression failed');

                if (compressed.size >= img.originalSize) {
                    setImages(prev => prev.map(i => i.path === img.path ? {
                        ...i, status: 'skipped', errorMsg: 'Already optimized', compressedSize: compressed.size, savedBytes: 0
                    } : i));
                    continue;
                }

                const storageRef = ref(storage, img.path);
                await uploadBytes(storageRef, compressed, { contentType: 'image/webp' });

                const saved = img.originalSize - compressed.size;
                setImages(prev => prev.map(i => i.path === img.path ? {
                    ...i, status: 'done', compressedSize: compressed.size, savedBytes: saved
                } : i));
            } catch (err: any) {
                setImages(prev => prev.map(i => i.path === img.path ? {
                    ...i, status: 'error', errorMsg: err?.message || 'Failed'
                } : i));
            }
        }
        setOptimizing(false);
    };

    const saveAccreditationSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingAccSettings(true);
        setAccSaveStatus(null);
        try {
            await setDoc(doc(db, 'systemSettings', 'accreditation'), {
                validityYears: accValidityYears,
                baseFee: accBaseFee,
                processingFee: accProcessingFee,
                enableProcessingFee: enableAccProcessingFee,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            setAccSaveStatus({ type: 'success', message: 'Accreditation settings saved successfully.' });
        } catch (err: any) {
            setAccSaveStatus({ type: 'error', message: err.message || 'Failed to save settings.' });
        } finally {
            setSavingAccSettings(false);
        }
    };

    const saveMembershipPlansList = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingPlansList(true);
        try {
            await setDoc(doc(db, 'membership_plans', 'Annual Membership'), {
                fee: Number(firstPaymentFee), // Keep as first payment fee for fallback
                firstPaymentFee: Number(firstPaymentFee),
                recurringFee: Number(recurringFee),
                processingFee: Number(annualMemberProcessingFee),
                enableProcessingFee: enableMemberProcessingFee,
                validityDuration: Number(annualMemberValidityYears),
                syncValidityWithAccreditation: syncValidityWithAcc,
                title: 'Annual Membership',
                type: 'Annual',
                updatedAt: new Date().toISOString()
            }, { merge: true });
            alert('Annual Membership details and processing fee updated successfully!');
        } catch (err: any) {
            console.error('Failed to save plans:', err);
            alert('Failed to save membership plan details.');
        } finally {
            setSavingPlansList(false);
        }
    };

    const handleCardBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingCardBg(true);
        try {
            const fileRef = ref(storage, `system/card/bg_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setCardBackgroundImageUrl(downloadUrl);
        } catch (err: any) {
            console.error('Card background upload error:', err);
            alert('Failed to upload card background image.');
        } finally {
            setUploadingCardBg(false);
        }
    };

    const handleCardIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadingCardIcon(true);
        try {
            const fileRef = ref(storage, `system/card/icon_${Date.now()}_${file.name}`);
            await uploadBytes(fileRef, file);
            const downloadUrl = await getDownloadURL(fileRef);
            setCardCustomIconUrl(downloadUrl);
        } catch (err: any) {
            console.error('Card logo upload error:', err);
            alert('Failed to upload card logo.');
        } finally {
            setUploadingCardIcon(false);
        }
    };

    const saveCardDesignSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSavingCardDesign(true);
        setCardSaveStatus(null);
        try {
            await setDoc(doc(db, 'systemSettings', 'membershipCard'), {
                backgroundType: cardBackgroundType,
                solidColor: cardSolidColor,
                gradientStart: cardGradientStart,
                gradientVia: cardGradientVia,
                gradientEnd: cardGradientEnd,
                gradientDirection: cardGradientDirection,
                textColor: cardTextColor,
                icon: cardIcon,
                customIconUrl: cardCustomIconUrl,
                backgroundImageUrl: cardBackgroundImageUrl,
                showPatternOverlay: cardShowPattern,
                cardTitle: cardTitle,
                updatedAt: new Date().toISOString()
            }, { merge: true });
            setCardSaveStatus({ type: 'success', message: 'Membership Card design saved successfully.' });
        } catch (err: any) {
            setCardSaveStatus({ type: 'error', message: err.message || 'Failed to save card design settings.' });
        } finally {
            setSavingCardDesign(false);
        }
    };

    const totalOriginal = images.reduce((s, i) => s + i.originalSize, 0);
    const totalSaved = images.filter(i => i.savedBytes && i.savedBytes > 0).reduce((s, i) => s + (i.savedBytes || 0), 0);
    const doneCount = images.filter(i => i.status === 'done').length;
    const savingPercent = totalOriginal > 0 && totalSaved > 0 ? Math.round((totalSaved / totalOriginal) * 100) : 0;

    return (
        <div className="space-y-4 animate-fade-in text-xs">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-wider">Settings</h1>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">System configuration and appearances</p>
                </div>
            </div>
            <div className="flex border-b border-slate-200 dark:border-white/5 gap-4">
                {[
                    { id: 'appearance', icon: 'palette', label: 'Appearance & Media Utilities' },
                    { id: 'plans_validity', icon: 'event_available', label: 'Accred. & Membership Price' },
                    { id: 'card_design', icon: 'badge', label: 'Membership Card Design' },
                    { id: 'paycools', icon: 'payments', label: 'PayCools Gateway' },
                    { id: 'smtp', icon: 'mail', label: 'SMTP Connection' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setSubTab(tab.id as any)}
                        className={`pb-2 text-[10px] uppercase font-bold tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                            subTab === tab.id
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                        }`}
                    >
                        <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Appearance Settings */}
            {subTab === 'appearance' && (
                <form onSubmit={saveAppearanceSettings} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden p-6 space-y-6 w-full max-w-5xl">
                    <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                        <span className="material-symbols-outlined text-primary text-base">palette</span>
                        <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">System Appearance & Application Configurations</h2>
                    </div>

                    {saveStatus && (
                        <div className={`p-2.5 rounded-[10px] text-xs font-semibold ${saveStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
                            {saveStatus.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* 1st Column: Application Details */}
                        <div className="space-y-4">
                            <div className="border-b border-slate-100 dark:border-white/5 pb-2">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">1. Application Information</h3>
                            </div>
                            <div>
                                <label htmlFor="sp-appName" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Brand App Name</label>
                                <input
                                    id="sp-appName"
                                    type="text"
                                    value={appName}
                                    onChange={e => setAppName(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                    placeholder="e.g. PAHA"
                                />
                            </div>
                            <div>
                                <label htmlFor="sp-appEmail" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Contact Email Address</label>
                                <input
                                    id="sp-appEmail"
                                    type="email"
                                    value={appEmail}
                                    onChange={e => setAppEmail(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                    placeholder="e.g. info@paha.ph"
                                />
                            </div>
                            <div>
                                <label htmlFor="sp-appPhone" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Contact Phone Number</label>
                                <input
                                    id="sp-appPhone"
                                    type="text"
                                    value={appPhone}
                                    onChange={e => setAppPhone(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                    placeholder="e.g. +63 2 8123 4567"
                                />
                            </div>
                            <div>
                                <label htmlFor="sp-appAddress" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Office Address</label>
                                <input
                                    id="sp-appAddress"
                                    type="text"
                                    value={appAddress}
                                    onChange={e => setAppAddress(e.target.value)}
                                    className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                    placeholder="e.g. Unit 123, PAHA Tower, Quezon City"
                                />
                            </div>
                            <div>
                                <label htmlFor="sp-appDescription" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Application Bio / Description</label>
                                <textarea
                                    id="sp-appDescription"
                                    value={appDescription}
                                    onChange={e => setAppDescription(e.target.value)}
                                    className="w-full h-20 px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white resize-none font-semibold"
                                    placeholder="Short summary of the organization or application..."
                                />
                            </div>

                            <div className="border-b border-slate-100 dark:border-white/5 pb-2 pt-2">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">Social Media Links</h3>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label htmlFor="sp-facebook" className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Facebook Page</label>
                                    <input
                                        id="sp-facebook"
                                        type="text"
                                        value={socialFacebook}
                                        onChange={e => setSocialFacebook(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                        placeholder="https://facebook.com/..."
                                    />
                                </div>
                                <div>
                                    <label htmlFor="sp-twitter" className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Twitter / X</label>
                                    <input
                                        id="sp-twitter"
                                        type="text"
                                        value={socialTwitter}
                                        onChange={e => setSocialTwitter(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                        placeholder="https://twitter.com/..."
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label htmlFor="sp-instagram" className="block text-[9px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Instagram URL</label>
                                    <input
                                        id="sp-instagram"
                                        type="text"
                                        value={socialInstagram}
                                        onChange={e => setSocialInstagram(e.target.value)}
                                        className="w-full px-3 py-2 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                        placeholder="https://instagram.com/..."
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 2nd Column: System Appearance */}
                        <div className="space-y-4">
                            <div className="border-b border-slate-100 dark:border-white/5 pb-2">
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">2. Brand Assets & Logos</h3>
                            </div>

                            <div>
                                <label htmlFor="sp-logoUrl" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Main Logo Brand</label>
                                <div className="flex items-center gap-3">
                                    {logoUrl ? (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden flex items-center justify-center p-1.5">
                                            <img src={logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-slate-400 text-base">
                                            <span className="material-symbols-outlined">image</span>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            id="sp-logoUrl"
                                            type="text"
                                            value={logoUrl}
                                            onChange={e => setLogoUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                            placeholder="Paste brand logo image URL"
                                        />
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold cursor-pointer transition-colors text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-xs">upload</span>
                                            {uploadingLogo ? 'Uploading...' : 'Upload Image'}
                                            <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sp-headerLogo" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Header Logo</label>
                                <div className="flex items-center gap-3">
                                    {headerLogoUrl ? (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden flex items-center justify-center p-1.5">
                                            <img src={headerLogoUrl} alt="Header Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-slate-400 text-base">
                                            <span className="material-symbols-outlined">image</span>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            id="sp-headerLogo"
                                            type="text"
                                            value={headerLogoUrl}
                                            onChange={e => setHeaderLogoUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                            placeholder="Paste header logo image URL"
                                        />
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold cursor-pointer transition-colors text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-xs">upload</span>
                                            {uploadingHeaderLogo ? 'Uploading...' : 'Upload Image'}
                                            <input type="file" accept="image/*" onChange={handleHeaderLogoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sp-footerLogo" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Footer Logo</label>
                                <div className="flex items-center gap-3">
                                    {footerLogoUrl ? (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden flex items-center justify-center p-1.5">
                                            <img src={footerLogoUrl} alt="Footer Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-slate-400 text-base">
                                            <span className="material-symbols-outlined">image</span>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            id="sp-footerLogo"
                                            type="text"
                                            value={footerLogoUrl}
                                            onChange={e => setFooterLogoUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                            placeholder="Paste footer logo image URL"
                                        />
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold cursor-pointer transition-colors text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-xs">upload</span>
                                            {uploadingFooterLogo ? 'Uploading...' : 'Upload Image'}
                                            <input type="file" accept="image/*" onChange={handleFooterLogoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sp-sidebarExpanded" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Sidebar Logo (Expanded / Uncollapsed)</label>
                                <div className="flex items-center gap-3">
                                    {sidebarExpandedLogoUrl ? (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden flex items-center justify-center p-1.5">
                                            <img src={sidebarExpandedLogoUrl} alt="Sidebar Expanded Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-slate-400 text-base">
                                            <span className="material-symbols-outlined">image</span>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            id="sp-sidebarExpanded"
                                            type="text"
                                            value={sidebarExpandedLogoUrl}
                                            onChange={e => setSidebarExpandedLogoUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                            placeholder="Paste sidebar expanded logo image URL"
                                        />
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold cursor-pointer transition-colors text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-xs">upload</span>
                                            {uploadingSidebarExpanded ? 'Uploading...' : 'Upload Image'}
                                            <input type="file" accept="image/*" onChange={handleSidebarExpandedLogoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sp-sidebarCollapsed" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Sidebar Logo (Collapsed)</label>
                                <div className="flex items-center gap-3">
                                    {sidebarCollapsedLogoUrl ? (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden flex items-center justify-center p-1.5">
                                            <img src={sidebarCollapsedLogoUrl} alt="Sidebar Collapsed Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-slate-400 text-base">
                                            <span className="material-symbols-outlined">image</span>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            id="sp-sidebarCollapsed"
                                            type="text"
                                            value={sidebarCollapsedLogoUrl}
                                            onChange={e => setSidebarCollapsedLogoUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white"
                                            placeholder="Paste sidebar collapsed logo image URL"
                                        />
                                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-[10px] font-bold cursor-pointer transition-colors text-[10px] text-slate-700 dark:text-slate-200 uppercase tracking-wider">
                                            <span className="material-symbols-outlined text-xs">upload</span>
                                            {uploadingSidebarCollapsed ? 'Uploading...' : 'Upload Image'}
                                            <input type="file" accept="image/*" onChange={handleSidebarCollapsedLogoUpload} className="hidden" />
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sp-loadingLogo" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Loading Screen Logo</label>
                                <div className="flex items-center gap-3">
                                    {loadingLogoUrl ? (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden flex items-center justify-center p-1.5">
                                            <img src={loadingLogoUrl} alt="Loading Screen Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-slate-400 text-base">
                                            <span className="material-symbols-outlined">image</span>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            id="sp-loadingLogo"
                                            type="text"
                                            value={loadingLogoUrl}
                                            onChange={e => setLoadingLogoUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                            placeholder="Paste loading screen logo image URL"
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/5 rounded-[10px] text-slate-700 dark:text-white font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-all">
                                                <span className="material-symbols-outlined text-xs">upload</span>
                                                {uploadingLoadingLogo ? 'Uploading...' : 'Upload Image'}
                                                <input type="file" accept="image/*" onChange={handleLoadingLogoUpload} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sp-faviconUrl" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Favicon Tab Icon</label>
                                <div className="flex items-center gap-3">
                                    {faviconUrl ? (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden flex items-center justify-center p-2">
                                            <img src={faviconUrl} alt="Favicon" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 bg-slate-100 dark:bg-slate-900 rounded-[10px] flex items-center justify-center text-slate-400 text-base">
                                            <span className="material-symbols-outlined">filter_drama</span>
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-1.5">
                                        <input
                                            id="sp-faviconUrl"
                                            type="text"
                                            value={faviconUrl}
                                            onChange={e => setFaviconUrl(e.target.value)}
                                            className="w-full px-3 py-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                            placeholder="Paste favicon tab icon URL"
                                        />
                                        <div className="flex flex-wrap items-center gap-2">
                                            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-white/5 rounded-[10px] text-slate-700 dark:text-white font-bold cursor-pointer text-[10px] uppercase tracking-wider transition-all">
                                                <span className="material-symbols-outlined text-xs">upload</span>
                                                {uploadingFavicon ? 'Uploading...' : 'Upload Icon'}
                                                <input type="file" accept="image/*" onChange={handleFaviconUpload} className="hidden" />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Image Optimizer Utilities Card */}
                    <div className="border-t border-slate-200 dark:border-white/10 pt-6 space-y-4">
                        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                            <span className="material-symbols-outlined text-primary text-base">image_search</span>
                            <div>
                                <h3 className="text-[10px] font-black text-primary uppercase tracking-widest">3. Brand Image Assets Optimizer</h3>
                                <p className="text-[9px] text-slate-400 mt-0.5 font-medium">Compresses all uploaded brand images inside Firebase Storage to WebP format to speed up loading times.</p>
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <label htmlFor="sp-quality" className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider whitespace-nowrap">Target Quality</label>
                                <input
                                    id="sp-quality"
                                    type="range" min={50} max={95} step={5} value={quality}
                                    onChange={e => setQuality(Number(e.target.value))}
                                    className="w-24 accent-primary cursor-pointer"
                                    disabled={optimizing}
                                />
                                <span className="text-xs font-bold text-primary">{quality}%</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={scanImages}
                                    disabled={scanning || optimizing}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-[10px] hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-all flex items-center gap-1.5 uppercase tracking-wider text-[10px]"
                                >
                                    {scanning ? 'Scanning...' : 'Scan Storage'}
                                </button>

                                {scanned && images.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={optimizeAll}
                                        disabled={optimizing || images.every(i => i.status === 'done' || i.status === 'skipped')}
                                        className="px-4 py-2 bg-primary text-white font-bold rounded-[10px] hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center gap-1.5 uppercase tracking-wider text-[10px] shadow-sm"
                                    >
                                        {optimizing ? 'Optimizing...' : 'Optimize All'}
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Summary Stats */}
                        {scanned && images.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-[10px] p-2.5 text-center">
                                    <p className="text-base font-bold text-slate-900 dark:text-white">{images.length}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Images Found</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-[10px] p-2.5 text-center">
                                    <p className="text-base font-bold text-slate-900 dark:text-white">{formatBytes(totalOriginal)}</p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Total Size</p>
                                </div>
                                <div className={`border rounded-[10px] p-2.5 text-center ${doneCount > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-white/5'}`}>
                                    <p className={`text-base font-bold ${doneCount > 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                        {doneCount > 0 ? `${formatBytes(totalSaved)}` : '—'}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Saved Size</p>
                                </div>
                                <div className={`border rounded-[10px] p-2.5 text-center ${savingPercent > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-white/5'}`}>
                                    <p className={`text-base font-bold ${savingPercent > 0 ? 'text-emerald-600' : 'text-slate-900 dark:text-white'}`}>
                                        {savingPercent > 0 ? `-${savingPercent}%` : '—'}
                                    </p>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">Reduction</p>
                                </div>
                            </div>
                        )}

                        {/* Image List */}
                        {scanned && images.length > 0 && (
                            <div className="space-y-1 max-h-[220px] overflow-y-auto pr-1 border border-slate-100 dark:border-white/5 rounded-xl p-2 bg-slate-50/50 dark:bg-slate-900/10 custom-scrollbar">
                                {images.map(img => (
                                    <div key={img.path} className="flex items-center justify-between px-3 py-2 bg-white dark:bg-slate-850 rounded-[10px] border border-slate-100 dark:border-white/5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <img
                                                src={img.url}
                                                alt={img.name}
                                                className="w-8 h-8 rounded-[10px] object-cover flex-shrink-0 bg-slate-200"
                                                onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                            />
                                            <div className="min-w-0">
                                                <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{img.path}</p>
                                                <div className="flex items-center gap-2 mt-0.5 text-[10px]">
                                                    <span className="text-slate-400">{formatBytes(img.originalSize)}</span>
                                                    {img.compressedSize !== null && img.savedBytes !== null && img.savedBytes > 0 && (
                                                        <>
                                                            <span className="text-slate-300 dark:text-slate-600">→</span>
                                                            <span className="font-bold text-emerald-600">{formatBytes(img.compressedSize)}</span>
                                                            <span className="bg-emerald-500/10 text-emerald-600 px-1 rounded-full font-bold">
                                                                -{Math.round((img.savedBytes / img.originalSize) * 100)}%
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex-shrink-0 ml-2">
                                            {img.status === 'idle' && <span className="text-[9px] text-slate-400 font-bold uppercase">Ready</span>}
                                            {img.status === 'processing' && <span className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin block"></span>}
                                            {img.status === 'done' && <span className="material-symbols-outlined text-emerald-500 text-sm">check_circle</span>}
                                            {img.status === 'skipped' && <span className="text-[9px] text-slate-400 font-bold" title={img.errorMsg}>Skipped</span>}
                                            {img.status === 'error' && <span className="text-[9px] text-red-500 font-bold" title={img.errorMsg}>Failed</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Empty States */}
                        {!scanned && !scanning && (
                            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                                <span className="material-symbols-outlined text-3xl text-slate-200 dark:text-slate-700 block mb-1.5">image_search</span>
                                <p className="font-bold text-slate-500">Scan Storage to optimize site images.</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">We will compress files and replace them with WebP formats.</p>
                            </div>
                        )}

                        {scanned && images.length === 0 && !scanning && (
                            <div className="text-center py-6 border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                                <span className="material-symbols-outlined text-3xl text-slate-200 dark:text-slate-700 block mb-1.5">check_circle</span>
                                <p className="font-bold text-slate-500">No images found in storage folders.</p>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={savingAppearance || uploadingLogo || uploadingHeaderLogo || uploadingFooterLogo || uploadingSidebarCollapsed || uploadingSidebarExpanded || uploadingFavicon || uploadingLoadingLogo}
                        className="w-full py-2 bg-primary text-white text-[10px] uppercase font-bold tracking-widest rounded-[10px] hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-sm mt-6"
                    >
                        {savingAppearance ? 'Saving Configurations...' : 'Save Appearance Settings'}
                    </button>
                </form>
            )}

            {subTab === 'plans_validity' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">
                    <form onSubmit={saveAccreditationSettings} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden p-6 space-y-6 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                <span className="material-symbols-outlined text-primary text-base">event_available</span>
                                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Accreditation Validity & Pricing Customization</h2>
                            </div>

                            {accSaveStatus && (
                                <div className={`p-2.5 rounded-[10px] text-xs font-semibold ${accSaveStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
                                    {accSaveStatus.message}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-1">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-wider">Accreditation Info</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Plan</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label htmlFor="sp-accBaseFee" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Accreditation Base Fee (PHP) *</label>
                                            <input
                                                id="sp-accBaseFee"
                                                type="number"
                                                required
                                                min="0"
                                                value={accBaseFee}
                                                onChange={e => setAccBaseFee(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                                placeholder="e.g. 15000"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label htmlFor="sp-accProcessingFee" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Processing Fee (PHP) *</label>
                                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                                    <input
                                                        id="sp-accProcessingFee-toggle"
                                                        type="checkbox"
                                                        checked={enableAccProcessingFee}
                                                        onChange={e => setEnableAccProcessingFee(e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-7 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                                                    <span className="ml-1.5 text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase">{enableAccProcessingFee ? 'ON' : 'OFF'}</span>
                                                </label>
                                            </div>
                                            <input
                                                id="sp-accProcessingFee"
                                                type="number"
                                                required
                                                disabled={!enableAccProcessingFee}
                                                min="0"
                                                value={enableAccProcessingFee ? accProcessingFee : 0}
                                                onChange={e => setAccProcessingFee(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900/30"
                                                placeholder="e.g. 2500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="sp-accValidity" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Accreditation Validity Duration (Years) *</label>
                                            <input
                                                id="sp-accValidity"
                                                type="number"
                                                required
                                                min="1"
                                                max="10"
                                                value={accValidityYears}
                                                onChange={e => setAccValidityYears(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                                placeholder="e.g. 3"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={savingAccSettings}
                            className="w-full py-2 bg-primary text-white text-[10px] uppercase font-bold tracking-widest rounded-[10px] hover:bg-primary/95 disabled:opacity-50 transition-colors shadow-sm mt-6"
                        >
                            {savingAccSettings ? 'Saving Configurations...' : 'Save Accreditation Settings'}
                        </button>
                    </form>

                    {/* Membership Details & Customizable Validity Panel */}
                    <form onSubmit={saveMembershipPlansList} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden p-6 space-y-6 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                <span className="material-symbols-outlined text-primary text-base">card_membership</span>
                                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Annual Membership Price & Processing</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-white/5 space-y-4">
                                    <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-white/5 pb-1">
                                        <span className="text-[10px] font-black text-primary uppercase tracking-wider">Annual Membership</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Plan</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div>
                                            <label htmlFor="sp-firstPaymentFee" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">First Payment Price (PHP) *</label>
                                            <input
                                                id="sp-firstPaymentFee"
                                                type="number"
                                                required
                                                min="0"
                                                value={firstPaymentFee}
                                                onChange={e => setFirstPaymentFee(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                                placeholder="e.g. 5000"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="sp-recurringFee" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Recurring Subscription Price (PHP) *</label>
                                            <input
                                                id="sp-recurringFee"
                                                type="number"
                                                required
                                                min="0"
                                                value={recurringFee}
                                                onChange={e => setRecurringFee(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                                placeholder="e.g. 3000"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label htmlFor="sp-memberProcessingFee" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Processing Fee (PHP) *</label>
                                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                                    <input
                                                        id="sp-memberProcessingFee-toggle"
                                                        type="checkbox"
                                                        checked={enableMemberProcessingFee}
                                                        onChange={e => setEnableMemberProcessingFee(e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-7 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                                                    <span className="ml-1.5 text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase">{enableMemberProcessingFee ? 'ON' : 'OFF'}</span>
                                                </label>
                                            </div>
                                            <input
                                                id="sp-memberProcessingFee"
                                                type="number"
                                                required
                                                disabled={!enableMemberProcessingFee}
                                                min="0"
                                                value={enableMemberProcessingFee ? annualMemberProcessingFee : 0}
                                                onChange={e => setAnnualMemberProcessingFee(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold disabled:opacity-50 disabled:bg-slate-50 dark:disabled:bg-slate-900/30"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center justify-between mb-1.5">
                                                <label htmlFor="sp-syncValidity" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Sync Validity with Accreditation</label>
                                                <label className="relative inline-flex items-center cursor-pointer select-none">
                                                    <input
                                                        id="sp-syncValidity"
                                                        type="checkbox"
                                                        checked={syncValidityWithAcc}
                                                        onChange={e => setSyncValidityWithAcc(e.target.checked)}
                                                        className="sr-only peer"
                                                    />
                                                    <div className="w-7 h-4 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-3 peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-slate-600 peer-checked:bg-primary"></div>
                                                    <span className="ml-1.5 text-[8.5px] font-black text-slate-400 dark:text-slate-500 uppercase">{syncValidityWithAcc ? 'YES' : 'NO'}</span>
                                                </label>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                <label htmlFor="sp-memberValidity" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">Validity Duration (Years) *</label>
                                                {syncValidityWithAcc && (
                                                    <span className="material-symbols-outlined text-[11px] text-primary animate-pulse" title="Synced with Accreditation Validity">sync</span>
                                                )}
                                            </div>
                                            <input
                                                id="sp-memberValidity"
                                                type="number"
                                                required
                                                disabled={syncValidityWithAcc}
                                                min="1"
                                                max="10"
                                                value={annualMemberValidityYears}
                                                onChange={e => setAnnualMemberValidityYears(Number(e.target.value))}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold disabled:bg-slate-50 dark:disabled:bg-slate-900/30 disabled:text-slate-400"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={savingPlansList}
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] uppercase font-bold tracking-widest rounded-[10px] disabled:opacity-50 transition-colors shadow-sm mt-6"
                        >
                            {savingPlansList ? 'Saving Membership...' : 'Save Membership Details'}
                        </button>
                    </form>
                </div>
            )}

            {subTab === 'card_design' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full max-w-6xl">
                    {/* Settings Form */}
                    <form onSubmit={saveCardDesignSettings} className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-white/5 rounded-[10px] overflow-hidden p-6 space-y-6 flex flex-col justify-between">
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-white/5 pb-3">
                                <span className="material-symbols-outlined text-primary text-base">badge</span>
                                <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Membership Card Customization</h2>
                            </div>

                            {cardSaveStatus && (
                                <div className={`p-2.5 rounded-[10px] text-xs font-semibold ${cardSaveStatus.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-red-50 dark:bg-red-500/10 text-red-600'}`}>
                                    {cardSaveStatus.message}
                                </div>
                            )}

                            <div className="space-y-4">
                                {/* Title */}
                                <div>
                                    <label htmlFor="sp-cardTitle" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Card Title *</label>
                                    <input
                                        id="sp-cardTitle"
                                        type="text"
                                        required
                                        value={cardTitle}
                                        onChange={e => setCardTitle(e.target.value)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                        placeholder="e.g. MEMBERSHIP CARD"
                                    />
                                </div>

                                {/* Background Type */}
                                <div>
                                    <label htmlFor="sp-cardBgType" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Background Type</label>
                                    <select
                                        id="sp-cardBgType"
                                        value={cardBackgroundType}
                                        onChange={e => setCardBackgroundType(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                    >
                                        <option value="solid">Solid Color</option>
                                        <option value="gradient">Gradient</option>
                                        <option value="image">Custom Background Image</option>
                                    </select>
                                </div>

                                {cardBackgroundType === 'solid' && (
                                    <div>
                                        <label htmlFor="sp-cardSolidColor" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Solid Background Color</label>
                                        <div className="flex gap-2 items-center">
                                            <input
                                                id="sp-cardSolidColor"
                                                type="color"
                                                value={cardSolidColor}
                                                onChange={e => setCardSolidColor(e.target.value)}
                                                className="size-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                            />
                                            <input
                                                type="text"
                                                value={cardSolidColor}
                                                onChange={e => setCardSolidColor(e.target.value)}
                                                className="w-28 px-3 py-1 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                            />
                                        </div>
                                    </div>
                                )}

                                {cardBackgroundType === 'gradient' && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div>
                                                <label htmlFor="sp-cardGradStart" className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Start Color</label>
                                                <input
                                                    id="sp-cardGradStart"
                                                    type="color"
                                                    value={cardGradientStart}
                                                    onChange={e => setCardGradientStart(e.target.value)}
                                                    className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="sp-cardGradVia" className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">Via Color</label>
                                                <input
                                                    id="sp-cardGradVia"
                                                    type="color"
                                                    value={cardGradientVia}
                                                    onChange={e => setCardGradientVia(e.target.value)}
                                                    className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="sp-cardGradEnd" className="block text-[8px] font-bold uppercase tracking-wider text-slate-400 mb-1">End Color</label>
                                                <input
                                                    id="sp-cardGradEnd"
                                                    type="color"
                                                    value={cardGradientEnd}
                                                    onChange={e => setCardGradientEnd(e.target.value)}
                                                    className="w-full h-8 rounded-lg cursor-pointer border-0 bg-transparent"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="sp-cardGradDir" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Gradient Direction</label>
                                            <select
                                                id="sp-cardGradDir"
                                                value={cardGradientDirection}
                                                onChange={e => setCardGradientDirection(e.target.value)}
                                                className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                            >
                                                <option value="to-r">Left to Right</option>
                                                <option value="to-br">Top Left to Bottom Right</option>
                                                <option value="to-b">Top to Bottom</option>
                                                <option value="to-tr">Bottom Left to Top Right</option>
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {cardBackgroundType === 'image' && (
                                    <div>
                                        <label htmlFor="sp-cardBgUpload" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Background Image</label>
                                        <div className="flex flex-col gap-2">
                                            {cardBackgroundImageUrl && (
                                                <img src={cardBackgroundImageUrl} alt="Card Background" className="h-20 w-36 rounded-lg object-cover border border-slate-200" />
                                            )}
                                            <input
                                                id="sp-cardBgUpload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCardBgUpload}
                                                className="text-xs"
                                            />
                                            {uploadingCardBg && <span className="text-[10px] text-primary">Uploading image...</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Card Text Color */}
                                <div>
                                    <label htmlFor="sp-cardTextColor" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Text Theme</label>
                                    <select
                                        id="sp-cardTextColor"
                                        value={cardTextColor}
                                        onChange={e => setCardTextColor(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                    >
                                        <option value="light">Light Text (White)</option>
                                        <option value="dark">Dark Text (Slate-900)</option>
                                    </select>
                                </div>

                                {/* Logo / Icon Selection */}
                                <div>
                                    <label htmlFor="sp-cardIcon" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Card Logo/Icon</label>
                                    <select
                                        id="sp-cardIcon"
                                        value={cardIcon}
                                        onChange={e => setCardIcon(e.target.value as any)}
                                        className="w-full px-3 py-2 bg-white dark:bg-slate-850 border border-slate-200 dark:border-white/10 rounded-[10px] text-xs outline-none focus:border-primary text-slate-800 dark:text-white font-semibold"
                                    >
                                        <option value="pets">Paw (Default)</option>
                                        <option value="medical_services">Medical Case</option>
                                        <option value="local_hospital">Cross</option>
                                        <option value="custom">Custom Image Upload</option>
                                    </select>
                                </div>

                                {cardIcon === 'custom' && (
                                    <div>
                                        <label htmlFor="sp-cardIconUpload" className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Custom Card Logo</label>
                                        <div className="flex flex-col gap-2">
                                            {cardCustomIconUrl && (
                                                <img src={cardCustomIconUrl} alt="Card Custom Icon" className="size-10 rounded-lg object-contain border border-slate-200" />
                                            )}
                                            <input
                                                id="sp-cardIconUpload"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleCardIconUpload}
                                                className="text-xs"
                                            />
                                            {uploadingCardIcon && <span className="text-[10px] text-primary">Uploading logo...</span>}
                                        </div>
                                    </div>
                                )}

                                {/* Pattern Overlay Switch */}
                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        id="sp-cardShowPattern"
                                        type="checkbox"
                                        checked={cardShowPattern}
                                        onChange={e => setCardShowPattern(e.target.checked)}
                                        className="size-4 rounded border-slate-200 text-primary focus:ring-primary"
                                    />
                                    <label htmlFor="sp-cardShowPattern" className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Show Tech Circle Pattern Overlay</label>
                                </div>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={savingCardDesign || uploadingCardBg || uploadingCardIcon}
                            className="w-full py-2 bg-primary text-white text-[10px] uppercase font-bold tracking-widest rounded-[10px] disabled:opacity-50 transition-colors shadow-sm mt-6"
                        >
                            {savingCardDesign ? 'Saving Card Design...' : 'Save Card Design'}
                        </button>
                    </form>

                    {/* Preview Panel */}
                    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-[10px] p-6 space-y-6 flex flex-col justify-center items-center">
                        <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-white/30 mb-2">Live Preview (Regular Member)</p>
                        
                        <div 
                            style={{
                                background: cardBackgroundType === 'solid' 
                                    ? cardSolidColor 
                                    : cardBackgroundType === 'image' 
                                        ? `url(${cardBackgroundImageUrl}) center/cover no-repeat` 
                                        : `linear-gradient(${
                                            cardGradientDirection === 'to-r' ? '90deg' 
                                            : cardGradientDirection === 'to-b' ? '180deg' 
                                            : cardGradientDirection === 'to-tr' ? '45deg' 
                                            : '135deg'
                                        }, ${cardGradientStart}, ${cardGradientVia}, ${cardGradientEnd})`,
                                color: cardTextColor === 'light' ? '#FFFFFF' : '#0F172A'
                            }}
                            className="relative w-full max-w-sm aspect-[1.586/1] rounded-2xl p-5 shadow-2xl overflow-hidden"
                        >
                            {/* We inline specific style overrides for tailwind classes to be safe with arbitrary gradients */}

                            {cardShowPattern && (
                                <div className="absolute inset-0 opacity-10 pointer-events-none">
                                    <div className="absolute top-2 right-2 size-32 rounded-full border-4 border-current"></div>
                                    <div className="absolute top-10 right-10 size-32 rounded-full border-4 border-current"></div>
                                </div>
                            )}

                            <div className="relative z-10 h-full flex flex-col justify-between">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="text-[7px] font-black uppercase tracking-[0.3em] opacity-60 mb-0.5">Philippine Animal Hospital Association</div>
                                        <div className="text-[10px] font-black tracking-tight">{cardTitle}</div>
                                    </div>
                                    <div className="flex-shrink-0">
                                        {cardIcon === 'custom' && cardCustomIconUrl ? (
                                            <img src={cardCustomIconUrl} alt="Logo" className="h-10 w-auto object-contain" />
                                        ) : (
                                            <span className="material-symbols-outlined text-3xl">{cardIcon === 'custom' ? 'pets' : cardIcon}</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3.5 my-auto">
                                    <div className="size-16 rounded-xl border border-current/25 bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-3xl opacity-75">account_circle</span>
                                    </div>
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div>
                                            <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Member Name</div>
                                            <div className="text-xs font-black tracking-wide leading-tight truncate">Cesar Cruz</div>
                                        </div>
                                        <div>
                                            <div className="text-[7px] opacity-60 uppercase tracking-widest leading-none mb-0.5">Facility</div>
                                            <div className="font-bold text-[10px] leading-tight truncate">My Veterinary Clinic</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between items-end pt-2 border-t border-current/10">
                                    <div>
                                        <div className="text-[7px] opacity-60 uppercase tracking-widest mb-0.5">Valid Until</div>
                                        <div className="font-bold text-[10px]">1 Year from Payment</div>
                                    </div>
                                    <div className="px-2 py-0.5 rounded bg-white/20 text-[8px] font-black uppercase tracking-wider">
                                        Regular
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {subTab === 'paycools' && <PayCoolsSettings />}
            {subTab === 'smtp' && <SMTPSettings />}
        </div>
    );
};

export default SettingsPanel;
