import React, { useState } from 'react';
import { useAdmin, type PartnerLogo, type PartnerCategory } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';

const PartnersManager: React.FC = () => {
    const { partners, addPartner, updatePartner, deletePartner, uploadFile } = useAdmin();
    const { adminRole } = useAuth();
    const canEdit = adminRole !== 'viewer';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<PartnerLogo | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [imagePath, setImagePath] = useState('');
    const [websiteUrl, setWebsiteUrl] = useState('');
    const [orderIndex, setOrderIndex] = useState(0);
    const [category, setCategory] = useState<PartnerCategory>('Silver');

    const handleOpenModal = (item?: PartnerLogo) => {
        if (item) {
            setEditingItem(item);
            setName(item.name);
            setImageUrl(item.imageUrl);
            setImagePath(item.imagePath || '');
            setWebsiteUrl(item.websiteUrl || '');
            setOrderIndex(item.orderIndex);
            setCategory(item.category || 'Silver');
        } else {
            setEditingItem(null);
            setName('');
            setImageUrl('');
            setImagePath('');
            setWebsiteUrl('');
            setCategory('Silver');
            const maxOrder = partners.length > 0 ? Math.max(...partners.map(p => p.orderIndex)) : -1;
            setOrderIndex(maxOrder + 1);
        }
        setIsModalOpen(true);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsUploading(true);
        try {
            const result = await uploadFile(file, 'partners');
            setImageUrl(result.url);
            setImagePath(result.path);
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Image upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!imageUrl) { alert('Please upload a partner logo.'); return; }
        setIsSaving(true);
        const data: Omit<PartnerLogo, 'id'> = { name, imageUrl, imagePath, websiteUrl, orderIndex, category };
        try {
            if (editingItem?.id) {
                await updatePartner(editingItem.id, data);
            } else {
                await addPartner(data);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Save failed:', error);
            alert('Failed to save record. Error: ' + (error?.message || 'Unknown error'));
        } finally {
            setIsSaving(false);
        }
    };

    // ── Helpers ──────────────────────────────────────────────────────────────
    const CAT_STYLES: Record<PartnerCategory, { badge: string; icon: string }> = {
        Gold:     { badge: 'bg-yellow-400/10 text-yellow-500 border-yellow-400/30', icon: 'workspace_premium' },
        Platinum: { badge: 'bg-sky-400/10 text-sky-400 border-sky-400/30',         icon: 'diamond'            },
        Silver:   { badge: 'bg-slate-400/10 text-slate-400 border-slate-400/30',   icon: 'military_tech'      },
    };

    const TIERS: { value: PartnerCategory; emoji: string; activeRing: string; activeText: string }[] = [
        { value: 'Silver',   emoji: '🥈', activeRing: 'ring-slate-400 border-slate-400/60 bg-slate-50 dark:bg-slate-400/10',     activeText: 'text-slate-500 dark:text-slate-300' },
        { value: 'Gold',     emoji: '🥇', activeRing: 'ring-yellow-400 border-yellow-400/60 bg-yellow-50 dark:bg-yellow-400/10', activeText: 'text-yellow-600 dark:text-yellow-400' },
        { value: 'Platinum', emoji: '💎', activeRing: 'ring-sky-400 border-sky-400/60 bg-sky-50 dark:bg-sky-400/10',            activeText: 'text-sky-500 dark:text-sky-400' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            {/* ── Page Header ── */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white dark:bg-slate-800/50 p-5 rounded-[2.5rem] border border-slate-200 dark:border-white/5 shadow-sm">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-semibold uppercase tracking-widest border border-primary/20">
                        <span className="material-symbols-outlined text-sm">handshake</span>
                        Partnership Registry
                    </div>
                    <h2 className="text-4xl font-semibold font-display tracking-tight text-slate-900 dark:text-white">Partners &amp; Sponsors</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-medium max-w-md">Oversee the collaborative network of partners displayed across the PAHA ecosystem.</p>
                </div>
                {canEdit && (
                    <button
                        onClick={() => handleOpenModal()}
                        className="group bg-primary text-white pl-4 pr-6 py-3.5 rounded-[10px] font-semibold text-xs uppercase tracking-widest flex items-center gap-3 hover:bg-primary/90 transition-all shadow-xl shadow-primary/25 active:scale-95"
                    >
                        <div className="size-6 bg-white/20 rounded-[10px] flex items-center justify-center group-hover:rotate-90 transition-transform">
                            <span className="material-symbols-outlined text-lg">add</span>
                        </div>
                        Initiate New Partner
                    </button>
                )}
            </div>

            {/* ── Main Grid ── */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Stats Panel */}
                <div className="xl:col-span-1 space-y-4">
                    <div className="bg-slate-900 dark:bg-black p-5 rounded-[2.5rem] text-white relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-60 mb-6 flex items-center gap-2">
                                <span className="size-1.5 rounded-full bg-primary animate-pulse"></span>
                                Live Statistics
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-5xl font-semibold mb-1">{partners.length}</h4>
                                    <p className="text-[10px] font-semibold uppercase tracking-widest opacity-40">Active Partners</p>
                                </div>
                                <div className="h-px bg-white/10 w-full"></div>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-yellow-400"></span>
                                            <span className="text-[9px] font-semibold uppercase tracking-widest opacity-60">Gold</span>
                                        </div>
                                        <span className="text-sm font-semibold text-yellow-400">{partners.filter(p => p.category === 'Gold').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-sky-300"></span>
                                            <span className="text-[9px] font-semibold uppercase tracking-widest opacity-60">Platinum</span>
                                        </div>
                                        <span className="text-sm font-semibold text-sky-300">{partners.filter(p => p.category === 'Platinum').length}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="size-2 rounded-full bg-slate-400"></span>
                                            <span className="text-[9px] font-semibold uppercase tracking-widest opacity-60">Silver</span>
                                        </div>
                                        <span className="text-sm font-semibold text-slate-400">{partners.filter(p => p.category === 'Silver' || !p.category).length}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[12rem] opacity-[0.03] rotate-12 pointer-events-none">
                            diversity_3
                        </span>
                    </div>
                </div>

                {/* Partners Table */}
                <div className="xl:col-span-2">
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-xl border border-slate-200 dark:border-white/5 overflow-hidden">
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02]">
                            <h3 className="font-semibold uppercase tracking-widest text-[10px] text-slate-400">Collaborator Manifest</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50/50 dark:bg-white/5 text-slate-500 text-[9px] uppercase tracking-[0.2em]">
                                    <tr>
                                        <th className="px-8 py-5 font-semibold text-center w-24">Index</th>
                                        <th className="px-4 py-5 font-semibold w-32">Visual Identity</th>
                                        <th className="px-4 py-5 font-semibold">Partner Details</th>
                                        <th className="px-4 py-5 font-semibold text-center">Category</th>
                                        <th className="px-8 py-5 font-semibold text-right">Operation</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                                    {partners.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4 opacity-20">
                                                    <span className="material-symbols-outlined text-6xl">cloud_off</span>
                                                    <p className="font-semibold uppercase tracking-widest text-xs">No partners in registry</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        partners.sort((a, b) => a.orderIndex - b.orderIndex).map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-all group">
                                                <td className="px-8 py-6 text-center">
                                                    <span className="font-mono font-semibold text-slate-300 group-hover:text-primary transition-colors">
                                                        #{item.orderIndex.toString().padStart(2, '0')}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-6">
                                                    <div className="h-16 w-28 bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center overflow-hidden border border-slate-200 dark:border-white/10 p-3 shadow-inner group-hover:shadow-lg group-hover:border-primary/20 transition-all duration-500">
                                                        {item.imageUrl ? (
                                                            <img src={item.imageUrl} alt={item.name} className="max-w-full max-h-full object-contain transition-all duration-500" />
                                                        ) : (
                                                            <span className="material-symbols-outlined text-slate-300">image</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-6">
                                                    <div className="font-semibold text-slate-900 dark:text-white text-lg uppercase tracking-tight">{item.name}</div>
                                                    {item.websiteUrl ? (
                                                        <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-semibold uppercase text-primary hover:text-primary/70 transition-colors tracking-widest">
                                                            <span className="material-symbols-outlined text-sm">link</span>
                                                            Access Terminal
                                                        </a>
                                                    ) : (
                                                        <div className="text-[9px] font-semibold text-slate-400 mt-2 uppercase tracking-widest">No site linked</div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-6 text-center">
                                                    {(() => {
                                                        const cat = item.category || 'Silver';
                                                        const s = CAT_STYLES[cat];
                                                        return (
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-semibold uppercase tracking-widest border ${s.badge}`}>
                                                                <span className="material-symbols-outlined text-xs">{s.icon}</span>
                                                                {cat}
                                                            </span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="px-8 py-6">
                                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {canEdit && (<>
                                                            <button
                                                                onClick={() => handleOpenModal(item)}
                                                                className="size-10 bg-blue-500/10 text-blue-600 rounded-[10px] hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center active:scale-90"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">edit</span>
                                                            </button>
                                                            <button
                                                                onClick={() => { if (confirm(`Sever ties with ${item.name}?`)) deletePartner(item.id); }}
                                                                className="size-10 bg-rose-500/10 text-rose-600 rounded-[10px] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center active:scale-90"
                                                            >
                                                                <span className="material-symbols-outlined text-lg">delete</span>
                                                            </button>
                                                        </>)}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════ PREMIUM MODAL ════════════════════════════════ */}
            {isModalOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-[200] bg-slate-950/80 backdrop-blur-xl"
                        onClick={() => !isSaving && setIsModalOpen(false)}
                    />

                    {/* Scroll container — sits above backdrop */}
                    <div className="fixed inset-0 z-[210] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 py-8">

                    {/* Card */}
                    <div className="relative w-full max-w-2xl animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300">
                        <div className="bg-white dark:bg-slate-900 rounded-[10px] shadow-[0_32px_80px_-16px_rgba(0,0,0,0.55)] border border-slate-200/60 dark:border-white/8 overflow-hidden">

                            {/* ── Header (compact dark strip) ── */}
                            <div className="relative px-7 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
                                {/* Decorative glows — smaller & tighter */}
                                <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/15 rounded-full blur-2xl pointer-events-none" />
                                <div className={`absolute -bottom-10 -left-10 w-36 h-36 rounded-full blur-2xl pointer-events-none transition-colors duration-700 ${
                                    category === 'Gold' ? 'bg-yellow-400/20' : category === 'Platinum' ? 'bg-sky-400/20' : 'bg-slate-400/8'
                                }`} />

                                {/* Single compact row */}
                                <div className="relative flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        {/* Mode icon badge */}
                                        <div className={`shrink-0 size-9 rounded-[10px] flex items-center justify-center transition-all duration-500 ${
                                            editingItem ? 'bg-amber-400/15 text-amber-400' : 'bg-primary/15 text-primary'
                                        }`}>
                                            <span className="material-symbols-outlined text-lg">{editingItem ? 'edit_note' : 'handshake'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-semibold text-white tracking-tight leading-tight truncate">
                                                {editingItem ? 'Update Partner Profile' : 'Register New Partner'}
                                            </h3>
                                            <p className="text-[9px] font-semibold text-white/35 uppercase tracking-[0.18em] leading-tight mt-0.5">
                                                PAHA · Partnership Registry
                                            </p>
                                        </div>
                                    </div>

                                    {/* Category pill + close */}
                                    <div className="flex items-center gap-2 shrink-0">
                                        <div className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-semibold uppercase tracking-widest border transition-all duration-500 ${
                                            category === 'Gold'     ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/25' :
                                            category === 'Platinum' ? 'bg-sky-400/10 text-sky-400 border-sky-400/25' :
                                                                      'bg-white/5 text-white/50 border-white/10'
                                        }`}>
                                            {category === 'Gold' ? '🥇' : category === 'Platinum' ? '💎' : '🥈'}
                                            {category}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => !isSaving && setIsModalOpen(false)}
                                            className="size-9 rounded-[10px] bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 flex items-center justify-center transition-all group/close"
                                        >
                                            <span className="material-symbols-outlined text-lg group-hover/close:rotate-90 transition-transform">close</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Category accent line */}
                                <div className={`absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-700 ${
                                    category === 'Gold'     ? 'bg-gradient-to-r from-yellow-400/0 via-yellow-400 to-yellow-400/0' :
                                    category === 'Platinum' ? 'bg-gradient-to-r from-sky-400/0 via-sky-400 to-sky-400/0' :
                                                              'bg-gradient-to-r from-slate-400/0 via-slate-400/50 to-slate-400/0'
                                }`} />
                            </div>

                            {/* ── Form Body ── */}
                            <form onSubmit={handleSubmit} className="p-4 space-y-5">

                                {/* Row 1 — Logo Upload + Right Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                                    {/* Upload Zone */}
                                    <div className="space-y-3">
                                        <label htmlFor="partner-logo" className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]">
                                            <span className="material-symbols-outlined text-sm">image</span>
                                            Partner Logo <span className="text-red-400">*</span>
                                        </label>
                                        <div className="relative group/upload h-36 rounded-[10px] overflow-hidden border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] hover:border-primary/50 hover:bg-primary/[0.02] transition-all duration-300 flex flex-col items-center justify-center text-center cursor-pointer">
                                            {imageUrl ? (
                                                <>
                                                    <img src={imageUrl} alt="Logo preview" className="max-w-full max-h-full object-contain p-4" />
                                                    <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm opacity-0 group-hover/upload:opacity-100 transition-all duration-300 flex flex-col items-center justify-center gap-2">
                                                        <span className="material-symbols-outlined text-white text-3xl">cloud_sync</span>
                                                        <p className="text-white text-[9px] font-semibold uppercase tracking-widest">Click to Replace</p>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="size-14 rounded-[10px] bg-slate-100 dark:bg-white/5 flex items-center justify-center mb-3 group-hover/upload:scale-110 transition-transform duration-300">
                                                        {isUploading
                                                            ? <span className="material-symbols-outlined animate-spin text-primary text-2xl">progress_activity</span>
                                                            : <span className="material-symbols-outlined text-2xl text-slate-400 group-hover/upload:text-primary transition-colors">cloud_upload</span>
                                                        }
                                                    </div>
                                                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                                                        {isUploading ? 'Uploading…' : 'Drop or Click to Upload'}
                                                    </p>
                                                    <p className="text-[9px] text-slate-400/60 mt-1 font-semibold">SVG · PNG · WEBP · JPG</p>
                                                </>
                                            )}
                                            <input
                                                id="partner-logo"
                                                type="file"
                                                accept="image/*"
                                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                                onChange={handleImageUpload}
                                                disabled={isUploading}
                                            />
                                        </div>
                                        {/* Status pill */}
                                        <div className={`flex items-center gap-2 px-4 py-2.5 rounded-[10px] border text-[9px] font-semibold uppercase tracking-widest transition-all duration-300 ${
                                            imageUrl
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/5 text-slate-400'
                                        }`}>
                                            <span className={`size-2 rounded-full shrink-0 ${imageUrl ? 'bg-emerald-500 shadow-[0_0_6px_2px_rgba(16,185,129,0.4)] animate-pulse' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                            {imageUrl ? '✓ Logo asset linked' : 'Awaiting logo upload'}
                                        </div>
                                    </div>

                                    {/* Right — Name, Website, Order */}
                                    <div className="flex flex-col justify-between gap-5">
                                        {/* Partner Name */}
                                        <div className="space-y-2">
                                            <label htmlFor="partner-name" className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]">
                                                <span className="material-symbols-outlined text-sm">badge</span>
                                                Partner Name <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                id="partner-name"
                                                name="partner-name"
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g. Acme Corporation"
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 rounded-[10px] border border-slate-200 dark:border-white/8 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none font-semibold text-sm placeholder:text-slate-300 dark:placeholder:text-white/20 transition-all"
                                                required
                                            />
                                        </div>
                                        {/* Website */}
                                        <div className="space-y-2">
                                            <label htmlFor="partner-website" className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]">
                                                <span className="material-symbols-outlined text-sm">link</span>
                                                Website URL
                                                <span className="ml-1 text-[9px] font-semibold text-slate-400/60 normal-case tracking-normal">Optional</span>
                                            </label>
                                            <input
                                                id="partner-website"
                                                name="partner-website"
                                                type="url"
                                                value={websiteUrl}
                                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                                placeholder="https://partner-site.com"
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 rounded-[10px] border border-slate-200 dark:border-white/8 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none font-semibold text-sm placeholder:text-slate-300 dark:placeholder:text-white/20 transition-all"
                                            />
                                        </div>
                                        {/* Display Order */}
                                        <div className="space-y-2">
                                            <label htmlFor="partner-order" className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]">
                                                <span className="material-symbols-outlined text-sm">sort</span>
                                                Display Order <span className="text-red-400">*</span>
                                            </label>
                                            <input
                                                id="partner-order"
                                                name="partner-order"
                                                type="number"
                                                value={orderIndex}
                                                onChange={(e) => setOrderIndex(parseInt(e.target.value))}
                                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 rounded-[10px] border border-slate-200 dark:border-white/8 focus:ring-2 focus:ring-primary/25 focus:border-primary outline-none font-mono font-semibold text-sm transition-all"
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Row 2 — Partnership Tier (Visual Tiles) */}
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.18em]">
                                        <span className="material-symbols-outlined text-sm">workspace_premium</span>
                                        Partnership Tier <span className="text-red-400">*</span>
                                    </label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {TIERS.map(tier => (
                                            <button
                                                key={tier.value}
                                                type="button"
                                                onClick={() => setCategory(tier.value)}
                                                className={`relative flex flex-col items-center justify-center gap-2 py-3.5 px-4 rounded-[10px] border-2 transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                                                    category === tier.value
                                                        ? `ring-2 ring-offset-2 dark:ring-offset-slate-900 ${tier.activeRing}`
                                                        : 'border-slate-200 dark:border-white/8 bg-slate-50/60 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/15'
                                                }`}
                                            >
                                                <span className="text-3xl leading-none">{tier.emoji}</span>
                                                <span className={`text-[10px] font-semibold uppercase tracking-widest transition-colors ${category === tier.value ? tier.activeText : 'text-slate-400'}`}>
                                                    {tier.value}
                                                </span>
                                                {category === tier.value && (
                                                    <span className="absolute top-2.5 right-2.5 size-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                                                        <span className="material-symbols-outlined text-[11px] text-white font-semibold">check</span>
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Info note */}
                                <div className="flex items-start gap-3 p-4 rounded-[10px] bg-indigo-50 dark:bg-indigo-500/5 border border-indigo-100 dark:border-indigo-500/15">
                                    <span className="material-symbols-outlined text-indigo-400 text-lg shrink-0 mt-0.5">info</span>
                                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                                        Partner data syncs in real-time across all public PAHA pages. <strong>Display Order</strong> controls the homepage slider sequence. <strong>Tier</strong> determines the card border color and category badge.
                                    </p>
                                </div>

                                {/* ── Actions ── */}
                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={() => !isSaving && setIsModalOpen(false)}
                                        disabled={isSaving}
                                        className="px-6 py-3.5 rounded-[10px] font-semibold text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/8 hover:bg-slate-100 dark:hover:bg-white/5 transition-all disabled:opacity-40"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={isSaving || isUploading || !imageUrl}
                                        className={`relative flex-1 overflow-hidden flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-[10px] font-semibold text-[11px] uppercase tracking-widest text-white transition-all duration-300 shadow-xl hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                                            category === 'Gold'
                                                ? 'bg-gradient-to-r from-yellow-500 to-amber-500 shadow-yellow-400/30'
                                                : category === 'Platinum'
                                                ? 'bg-gradient-to-r from-sky-500 to-blue-500 shadow-sky-400/30'
                                                : 'bg-gradient-to-r from-slate-700 to-slate-900 shadow-slate-500/20'
                                        }`}
                                    >
                                        {/* Shimmer */}
                                        <span className="absolute inset-0 translate-x-[-100%] bg-gradient-to-r from-transparent via-white/20 to-transparent hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />

                                        {isSaving ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                                                Saving…
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-base">{editingItem ? 'save' : 'verified_user'}</span>
                                                {editingItem ? 'Save Changes' : 'Register Partner'}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                        </div>{/* end centering wrapper */}
                    </div>{/* end scroll container */}
                </>
            )}
        </div>
    );
};

export default PartnersManager;
