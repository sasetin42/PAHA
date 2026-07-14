import React, { useState, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';
import Home from '../pages/Home';
import Events from '../pages/Events';
import Contact from '../pages/Contact';
import Membership from '../pages/Membership';
import Association from '../pages/Association';

const WebsiteContentEditor: React.FC = () => {
    const { pages, siteConfig, updateSiteConfig, updatePageSection, resetPageToDefault, uploadFile, uploadImage, syncStatus } = useAdmin();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadingKey, setUploadingKey] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [activePageId, setActivePageId] = useState<string>('home');
    const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
    const [localDrafts, setLocalDrafts] = useState<Record<string, string>>({});
    const [pendingUpdates, setPendingUpdates] = useState<Record<string, any>>({});

    const activePage = pages[activePageId];

    // Helper to get icon based on section type
    const getSectionIcon = (type: string) => {
        switch (type) {
            case 'hero': return 'view_carousel';
            case 'features': return 'grid_view';
            case 'list': return 'format_list_bulleted';
            case 'text': return 'article';
            default: return 'web_asset';
        }
    };

    const handleStyleChange = (sectionId: string, key: string, value: string) => {
        setPendingUpdates(prev => ({
            ...prev,
            [sectionId]: {
                ...(prev[sectionId] || {}),
                style: { ...((prev[sectionId] || {}).style || {}), [key]: value }
            }
        }));
    };

    const handleContentChange = useCallback((sectionId: string, key: string, value: string) => {
        const draftKey = `${sectionId}-${key}`;
        setLocalDrafts(prev => ({ ...prev, [draftKey]: value }));
        
        setPendingUpdates(prev => ({
            ...prev,
            [sectionId]: {
                ...(prev[sectionId] || {}),
                content: { ...((prev[sectionId] || {}).content || {}), [key]: value }
            }
        }));
    }, []);

    /*
    const saveSectionChanges = useCallback((sectionId: string) => {
        const updates = pendingUpdates[sectionId];
        if (updates) {
            updatePageSection(activePageId, sectionId, updates);
            setPendingUpdates(prev => {
                const copy = { ...prev };
                delete copy[sectionId];
                return copy;
            });
        }
    }, [pendingUpdates, activePageId, updatePageSection]);
    */

    const saveAllChanges = useCallback(() => {
        Object.keys(pendingUpdates).forEach(sectionId => {
            updatePageSection(activePageId, sectionId, pendingUpdates[sectionId]);
        });
        setPendingUpdates({});
    }, [pendingUpdates, activePageId, updatePageSection]);

    const pendingCount = Object.keys(pendingUpdates).length;

    const handleImageFile = async (file: File, sectionId: string, key: string, fileInputRef?: HTMLInputElement) => {
        try {
            setIsUploading(true);
            setUploadingKey(`${sectionId}-${key}`);
            setUploadProgress(10);

            // Show local preview IMMEDIATELY
            const localPreviewUrl = URL.createObjectURL(file);
            setLocalDrafts(prev => ({ ...prev, [`${sectionId}-${key}`]: localPreviewUrl }));

            // Convert to High Quality WebP Base64 (Using AdminContext helper)
            const base64 = await uploadImage(file);

            setUploadProgress(100);

            // Replace local blob preview with the permanent base64 string
            setLocalDrafts(prev => { const next = { ...prev }; delete next[`${sectionId}-${key}`]; return next; });
            setPendingUpdates(prev => ({
                ...prev,
                [sectionId]: {
                    ...(prev[sectionId] || {}),
                    content: { ...((prev[sectionId] || {}).content || {}), [key]: base64 }
                }
            }));
        } catch (err) {
            console.error(err);
            alert("Image processing failed. Please try again.");
        } finally {
            setIsUploading(false);
            setUploadingKey(null);
            setUploadProgress(0);
            if (fileInputRef) {
                fileInputRef.value = '';
            }
        }
    };

    const SyncIndicator = ({ pageId, sectionId }: { pageId: string, sectionId: string }) => {
        const status = syncStatus[`${pageId}-${sectionId}`];
        if (!status) return null;

        return (
            <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest transition-all duration-300 ${
                status === 'syncing' ? 'bg-blue-500/10 text-blue-400 animate-pulse' : 
                status === 'synced' ? 'bg-green-500/10 text-green-400' : 
                'bg-red-500/10 text-red-400'
            }`}>
                <span className="material-symbols-outlined text-[10px]">
                    {status === 'syncing' ? 'sync' : status === 'synced' ? 'check_circle' : 'error'}
                </span>
                <span>{status}</span>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300 rounded-xl overflow-hidden border border-slate-700/50 shadow-2xl font-sans">
            {/* Header */}
            <div className="bg-slate-900 border-b border-slate-700/50 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                            <span className="material-symbols-outlined text-blue-500">web</span>
                        </div>
                        <h2 className="text-xl font-semibold text-white tracking-tight">Website Content</h2>
                    </div>

                    {/* SAVE BUTTON — top right, always visible */}
                    <button
                        onClick={saveAllChanges}
                        disabled={pendingCount === 0}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                            pendingCount > 0
                            ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/30 animate-pulse'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                    >
                        <span className="material-symbols-outlined text-base">cloud_upload</span>
                        {pendingCount > 0 ? `Save ${pendingCount} Change${pendingCount > 1 ? 's' : ''}` : '✓ All Saved'}
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-8 text-sm font-medium border-b border-slate-700/50">
                    <button className="pb-3 text-blue-400 border-b-2 border-blue-400">Site Pages</button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Left Sidebar - Pages List */}
                <div className="w-64 bg-slate-900 border-r border-slate-700/50 flex flex-col">
                    <div className="p-4 flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-widest text-slate-500">Pages</span>
                        <button className="text-slate-400 hover:text-white transition-colors">
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 space-y-1">
                        {/* Theme Config Item */}
                        <button
                            onClick={() => setActivePageId('theme')}
                            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${activePageId === 'theme'
                                ? 'bg-purple-600/10 text-purple-400 border border-purple-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                                }`}
                        >
                            <span className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg">palette</span> Global Theme
                            </span>
                        </button>

                        <div className="my-2 border-b border-slate-800"></div>

                        {Object.values(pages).map(page => (
                            <button
                                key={page.id}
                                onClick={() => setActivePageId(page.id)}
                                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all ${activePageId === page.id
                                    ? 'bg-blue-600/10 text-blue-400 border border-blue-600/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                                    }`}
                            >
                                <span>{page.title}</span>
                                {activePageId === page.id && (
                                    <span className="material-symbols-outlined text-xs">chevron_right</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Middle Column - Editor Controls */}
                    <div className="w-[500px] bg-slate-950/50 flex flex-col border-r border-slate-700/50 z-10">
                        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-3">
                            <div>
                                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">Editing Page</span>
                                <h3 className="text-lg font-semibold text-white max-w-[160px] truncate">{activePage?.title || 'Global Theme'}</h3>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {/* SAVE BUTTON — always visible in header */}
                                <button
                                    onClick={saveAllChanges}
                                    disabled={pendingCount === 0}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                                        pendingCount > 0
                                        ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/30'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                >
                                    <span className="material-symbols-outlined text-base">cloud_upload</span>
                                    {pendingCount > 0 ? `Save (${pendingCount})` : 'Saved'}
                                </button>
                                <div className="w-px h-5 bg-slate-700"></div>
                                <button
                                    onClick={() => resetPageToDefault(activePageId)}
                                    className="p-2 text-slate-400 hover:text-red-400 bg-slate-800/20 hover:bg-slate-800/50 rounded-lg transition-colors"
                                    title="Reset to Default Layout"
                                >
                                    <span className="material-symbols-outlined text-lg">restart_alt</span>
                                </button>
                            </div>
                        </div>


                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                            {activePage && (
                                <>
                                    <div className="space-y-4">
                                        {activePage?.sections.map((section, index) => (
                                            <div
                                                key={section.id}
                                                className={`bg-slate-900 border ${expandedSectionId === section.id ? 'border-blue-500/50 ring-1 ring-blue-500/20' : 'border-slate-800'} rounded-xl transition-all shadow-sm`}
                                            >
                                                {/* Section Header Card */}
                                                <div className="p-4 flex items-center gap-4">
                                                    {/* Drag Handle */}
                                                    <div className="text-slate-600 cursor-grab hover:text-slate-400 flex items-center gap-3">
                                                        <span className="material-symbols-outlined">drag_indicator</span>
                                                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400">
                                                            <span className="material-symbols-outlined">{getSectionIcon(section.type)}</span>
                                                        </div>
                                                    </div>

                                                    {/* Section Info */}
                                                    <div className="flex-1 cursor-pointer" onClick={() => setExpandedSectionId(expandedSectionId === section.id ? null : section.id)}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="text-sm font-semibold text-slate-200">{section.title}</h4>
                                                                <SyncIndicator pageId={activePageId} sectionId={section.id} />
                                                            </div>
                                                            <span className={`material-symbols-outlined text-slate-500 transition-transform ${expandedSectionId === section.id ? 'rotate-180' : ''}`}>
                                                                expand_more
                                                            </span>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mt-0.5">{section.type}</p>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex items-center gap-1">
                                                        <button className="p-2 text-slate-500 hover:text-white transition-colors disabled:opacity-30" disabled={index === 0}>
                                                            <span className="material-symbols-outlined text-lg">arrow_upward</span>
                                                        </button>
                                                        <button className="p-2 text-slate-500 hover:text-white transition-colors disabled:opacity-30" disabled={index === activePage.sections.length - 1}>
                                                            <span className="material-symbols-outlined text-lg">arrow_downward</span>
                                                        </button>
                                                        <div className="w-px h-4 bg-slate-700 mx-2"></div>
                                                        <button className="p-2 text-slate-500 hover:text-red-400 transition-colors">
                                                            <span className="material-symbols-outlined text-lg">delete</span>
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Expanded Editor */}
                                                {expandedSectionId === section.id && (
                                                    <div className="border-t border-slate-800 p-6 bg-slate-950/30">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                            {/* Edit Content */}
                                                            <div>
                                                                <h5 className="text-xs font-semibold uppercase text-blue-400 mb-4 flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-sm">edit_note</span> Content
                                                                </h5>
                                                                <div className="space-y-4">
                                                                    {Object.entries(section.content).map(([key, value]) => {
                                                                        const isImage = key.toLowerCase().includes('image') || 
                                                                                        key.toLowerCase().includes('img') || 
                                                                                        key.toLowerCase().includes('photo') || 
                                                                                        key.toLowerCase().includes('logo') ||
                                                                                        (key.toLowerCase().includes('url') && !key.toLowerCase().includes('video'));
                                                                        
                                                                        return (
                                                                            <div key={key} className="space-y-2">
                                                                                <label htmlFor={`${section.id}-${key}`} className="block text-xs font-semibold text-slate-500 capitalize">
                                                                                    {key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}
                                                                                </label>
                                                                                
                                                                                {isImage ? (
                                                                                    <div className="space-y-3">
                                                                                        {/* === PRIMARY: Large file upload dropzone === */}
                                                                                        <div 
                                                                                            className="relative group cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 rounded-xl outline-none"
                                                                                            tabIndex={0}
                                                                                            onPaste={(e) => {
                                                                                                const pastedFile = e.clipboardData?.files?.[0];
                                                                                                if (pastedFile && pastedFile.type.startsWith('image/')) {
                                                                                                    e.preventDefault();
                                                                                                    handleImageFile(pastedFile, section.id, key);
                                                                                                }
                                                                                            }}
                                                                                        >
                                                                                            <div className={`flex flex-col items-center justify-center gap-2 w-full py-5 rounded-xl border-2 border-dashed transition-all ${
                                                                                                isUploading && uploadingKey === `${section.id}-${key}`
                                                                                                    ? 'border-blue-500 bg-blue-500/10'
                                                                                                    : 'border-slate-700 hover:border-primary hover:bg-primary/5 bg-slate-950'
                                                                                            }`}>
                                                                                                {isUploading && uploadingKey === `${section.id}-${key}` ? (
                                                                                                    <>
                                                                                                        <span className="material-symbols-outlined text-3xl animate-spin text-blue-400">progress_activity</span>
                                                                                                        <p className="text-sm font-semibold text-blue-400">Uploading... {uploadProgress}%</p>
                                                                                                        <div className="w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                                                                            <div
                                                                                                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                                                                                                style={{ width: `${uploadProgress}%` }}
                                                                                                            />
                                                                                                        </div>
                                                                                                    </>
                                                                                                ) : (
                                                                                                    <>
                                                                                                        <span className="material-symbols-outlined text-3xl text-slate-500 group-hover:text-primary transition-colors">image</span>
                                                                                                        <p className="text-sm font-semibold text-slate-400 group-hover:text-primary transition-colors">Click, drag, or paste (Ctrl+V)</p>
                                                                                                        <p className="text-xs text-slate-600">JPG, PNG, WEBP — any size</p>
                                                                                                    </>
                                                                                                )}
                                                                                            </div>
                                                                                            <label htmlFor={`${section.id}-${key}-file`} className="sr-only">Upload {key.replace(/([A-Z])/g, ' $1')}</label>
                                                                                            <input
                                                                                                id={`${section.id}-${key}-file`}
                                                                                                type="file"
                                                                                                accept="image/*"
                                                                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
                                                                                                disabled={isUploading}
                                                                                                onChange={(e) => {
                                                                                                    if (e.target.files && e.target.files[0]) {
                                                                                                        handleImageFile(e.target.files[0], section.id, key, e.target);
                                                                                                    }
                                                                                                }}
                                                                                            />
                                                                                        </div>

                                                                                        {/* === SECONDARY: URL input (collapsed style) === */}
                                                                                        <div className="flex items-center gap-2">
                                                                                            <div className="h-px bg-slate-800 flex-1"></div>
                                                                                            <span className="text-[10px] text-slate-600 font-semibold uppercase tracking-widest">or paste URL</span>
                                                                                            <div className="h-px bg-slate-800 flex-1"></div>
                                                                                        </div>
                                                                                        <div className="flex items-center gap-2">
                                                                                            <input
                                                                                                id={`${section.id}-${key}`}
                                                                                                type="text"
                                                                                                value={localDrafts[`${section.id}-${key}`] ?? String(value)}
                                                                                                onChange={(e) => handleContentChange(section.id, key, e.target.value)}
                                                                                                onBlur={(e) => {
                                                                                                    setPendingUpdates(prev => ({
                                                                                                        ...prev,
                                                                                                        [section.id]: {
                                                                                                            ...(prev[section.id] || {}),
                                                                                                            content: { ...((prev[section.id] || {}).content || {}), [key]: e.target.value }
                                                                                                        }
                                                                                                    }));
                                                                                                }}
                                                                                                placeholder="https://example.com/photo.jpg"
                                                                                                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-400 focus:border-blue-500 outline-none transition-all placeholder-slate-700 font-mono"
                                                                                            />
                                                                                            {(localDrafts[`${section.id}-${key}`] ?? String(value)) && (
                                                                                                <button
                                                                                                    type="button"
                                                                                                    onClick={() => {
                                                                                                        const draftKey = `${section.id}-${key}`;
                                                                                                        setLocalDrafts(prev => { const next = { ...prev }; delete next[draftKey]; return next; });
                                                                                                        setPendingUpdates(prev => ({
                                                                                                            ...prev,
                                                                                                            [section.id]: {
                                                                                                                ...(prev[section.id] || {}),
                                                                                                                content: { ...((prev[section.id] || {}).content || {}), [key]: '' }
                                                                                                            }
                                                                                                        }));
                                                                                                    }}
                                                                                                    className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-lg transition-all flex-shrink-0"
                                                                                                    title="Remove Image"
                                                                                                >
                                                                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                                                                </button>
                                                                                            )}
                                                                                        </div>

                                                                                        {/* === Preview === */}
                                                                                        {(localDrafts[`${section.id}-${key}`] ?? String(value)) && (
                                                                                            <div className="rounded-xl overflow-hidden border border-slate-800 h-28 relative group/preview">
                                                                                                <img
                                                                                                    src={localDrafts[`${section.id}-${key}`] ?? String(value)}
                                                                                                    alt=""
                                                                                                    className="w-full h-full object-cover"
                                                                                                    onError={(e) => {
                                                                                                        e.currentTarget.src = 'https://placehold.co/400x120?text=Invalid+URL';
                                                                                                        e.currentTarget.className = 'w-full h-full object-contain p-3 opacity-20';
                                                                                                    }}
                                                                                                />
                                                                                                <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/30 transition-colors flex items-center justify-center opacity-0 group-hover/preview:opacity-100">
                                                                                                    <span className="text-white text-xs font-semibold bg-black/50 px-2 py-1 rounded">Current Image</span>
                                                                                                </div>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <>
                                                                                        {typeof value === 'string' && value.length > 50 ? (
                                                                                            <textarea
                                                                                                id={`${section.id}-${key}`}
                                                                                                value={localDrafts[`${section.id}-${key}`] ?? String(value)}
                                                                                                onChange={(e) => handleContentChange(section.id, key, e.target.value)}
                                                                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-700 min-h-[100px]"
                                                                                            />
                                                                                        ) : (
                                                                                            <input
                                                                                                id={`${section.id}-${key}`}
                                                                                                type="text"
                                                                                                value={localDrafts[`${section.id}-${key}`] ?? String(value)}
                                                                                                onChange={(e) => handleContentChange(section.id, key, e.target.value)}
                                                                                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder-slate-700"
                                                                                            />
                                                                                        )}
                                                                                    </>
                                                                                )}
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>

                                                            {/* Edit Styles/Settings */}
                                                            <div>
                                                                <h5 className="text-xs font-semibold uppercase text-purple-400 mb-4 flex items-center gap-2">
                                                                    <span className="material-symbols-outlined text-sm">palette</span> Styles & Visibility
                                                                </h5>
                                                                <div className="space-y-6">
                                                                    <div className="flex items-center justify-between bg-slate-950 p-4 rounded-lg border border-slate-800">
                                                                        <span className="text-sm font-medium text-slate-300">Visible on Site</span>
                                                                        <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                                                                            <input
                                                                                type="checkbox"
                                                                                name="toggle"
                                                                                id={`toggle-${section.id}`}
                                                                                className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer text-blue-500 checked:right-0 checked:border-blue-500"
                                                                                checked={pendingUpdates[section.id]?.isVisible ?? section.isVisible}
                                                                                onChange={(e) => setPendingUpdates(prev => ({ ...prev, [section.id]: { ...(prev[section.id] || {}), isVisible: e.target.checked } }))}
                                                                            />
                                                                            <label htmlFor={`toggle-${section.id}`} className="toggle-label block overflow-hidden h-5 rounded-full bg-slate-700 cursor-pointer"></label>
                                                                        </div>
                                                                    </div>

                                                                    <div className="space-y-4">
                                                                        <div>
                                                                            <label htmlFor={`${section.id}-textColor`} className="block text-xs font-semibold text-slate-500 mb-1.5">Text Color</label>
                                                                            <div className="flex gap-2">
                                                                                <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-800 relative">
                                                                                    <input
                                                                                        id={`${section.id}-textColor-picker`}
                                                                                        type="color"
                                                                                        value={pendingUpdates[section.id]?.style?.textColor ?? section.style.textColor ?? '#ffffff'}
                                                                                        onChange={(e) => handleStyleChange(section.id, 'textColor', e.target.value)}
                                                                                        className="absolute -top-2 -left-2 w-16 h-16 p-0 cursor-pointer"
                                                                                    />
                                                                                </div>
                                                                                <input
                                                                                    id={`${section.id}-textColor`}
                                                                                    type="text"
                                                                                    value={pendingUpdates[section.id]?.style?.textColor ?? section.style.textColor ?? ''}
                                                                                    onChange={(e) => handleStyleChange(section.id, 'textColor', e.target.value)}
                                                                                    placeholder="#HEX"
                                                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 text-sm text-slate-300 font-mono"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <div>
                                                                            <label htmlFor={`${section.id}-bgColor`} className="block text-xs font-semibold text-slate-500 mb-1.5">Background Color</label>
                                                                            <div className="flex gap-2">
                                                                                <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-800 relative">
                                                                                    <input
                                                                                        id={`${section.id}-bgColor-picker`}
                                                                                        type="color"
                                                                                        value={pendingUpdates[section.id]?.style?.backgroundColor ?? section.style.backgroundColor ?? '#000000'}
                                                                                        onChange={(e) => handleStyleChange(section.id, 'backgroundColor', e.target.value)}
                                                                                        className="absolute -top-2 -left-2 w-16 h-16 p-0 cursor-pointer"
                                                                                    />
                                                                                </div>
                                                                                <input
                                                                                    id={`${section.id}-bgColor`}
                                                                                    type="text"
                                                                                    value={section.style.backgroundColor || ''}
                                                                                    onChange={(e) => handleStyleChange(section.id, 'backgroundColor', e.target.value)}
                                                                                    placeholder="#HEX"
                                                                                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 text-sm text-slate-300 font-mono"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Add Section Button Bottom */}
                                    <div className="mt-6 border-2 border-dashed border-slate-800 rounded-xl p-4 flex items-center justify-center cursor-pointer hover:border-slate-600 hover:bg-slate-800/50 transition-all group">
                                        <span className="text-slate-600 group-hover:text-slate-400 text-sm font-semibold flex items-center gap-2">
                                            <span className="material-symbols-outlined">add_circle</span> Add New Section
                                        </span>
                                    </div>
                                </>
                            )}

                            {activePageId === 'theme' && (
                                <div className="space-y-8 animate-in fade-in duration-300">
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                                <span className="material-symbols-outlined text-purple-500 text-xl">play_circle</span>
                                            </div>
                                            <div>
                                                <h4 className="text-slate-200 font-semibold">Registration Video Guide</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">The video displayed in the clinic application modal.</p>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label htmlFor="theme-videoUpload" className="block text-[10px] font-semibold text-slate-500 uppercase tracking-widest mb-2">Upload New Video</label>
                                                <div className="flex flex-col gap-3">
                                                    <label htmlFor="theme-videoUpload" className={`cursor-pointer group flex flex-col items-center justify-center border-2 border-dashed ${isUploading ? 'border-purple-500/50 bg-purple-500/5' : 'border-slate-800 hover:border-purple-500/50 hover:bg-slate-900'} rounded-2xl p-8 transition-all relative overflow-hidden`}>
                                                        <input 
                                                            id="theme-videoUpload"
                                                            type="file" 
                                                            accept="video/*" 
                                                            className="hidden" 
                                                            disabled={isUploading}
                                                            onChange={async (e) => {
                                                                const file = e.target.files?.[0];
                                                                if (!file) return;
                                                                
                                                                try {
                                                                    setIsUploading(true);
                                                                    setUploadProgress(0);
                                                                    const { url } = await uploadFile(file, 'videos', (p) => setUploadProgress(p));
                                                                    updateSiteConfig({ applicationVideoUrl: url });
                                                                    setIsUploading(false);
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    setIsUploading(false);
                                                                    alert("Failed to upload video.");
                                                                }
                                                            }}
                                                        />
                                                        {isUploading ? (
                                                            <div className="flex flex-col items-center gap-3 w-full max-w-[200px]">
                                                                <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent animate-spin rounded-full"></div>
                                                                <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
                                                                    <div 
                                                                        className="bg-purple-500 h-full transition-all duration-300"
                                                                        style={{ width: `${uploadProgress}%` }}
                                                                    ></div>
                                                                </div>
                                                                <span className="text-[10px] font-semibold text-slate-400">{Math.round(uploadProgress)}% Uploaded</span>
                                                            </div>
                                                        ) : (
                                                            <>
                                                                <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mb-3 border border-slate-800 group-hover:scale-110 transition-transform shadow-lg">
                                                                    <span className="material-symbols-outlined text-purple-500 text-3xl">cloud_upload</span>
                                                                </div>
                                                                <div className="text-center">
                                                                    <p className="text-slate-200 font-semibold text-sm">Drop video file here or browse</p>
                                                                    <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">MP4, WEBM, or MOV preferred</p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </label>

                                                    <div className="relative">
                                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                                            <div className="w-full border-t border-slate-800"></div>
                                                        </div>
                                                        <div className="relative flex justify-center">
                                                            <span className="bg-slate-900 px-3 text-xs font-semibold text-slate-600 uppercase tracking-widest">or use URL</span>
                                                        </div>
                                                    </div>

                                                    <div className="relative">
                                                        <label htmlFor="theme-videoUrl" className="sr-only">Application Video URL</label>
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-sm text-slate-600">link</span>
                                                        <input
                                                            id="theme-videoUrl"
                                                            type="text"
                                                            value={siteConfig.applicationVideoUrl}
                                                            onChange={(e) => updateSiteConfig({ applicationVideoUrl: e.target.value })}
                                                            placeholder="Paste Google Drive, YouTube, or direct video URL"
                                                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-300 outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Preview in editor */}
                                            {siteConfig.applicationVideoUrl && (
                                                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner group relative">
                                                    <iframe
                                                        src={siteConfig.applicationVideoUrl}
                                                        className="w-full h-full"
                                                        title="Video Preview"
                                                        frameBorder="0"
                                                    ></iframe>
                                                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-all">
                                                        <span className="text-[10px] font-semibold text-white/60">Live Preview from URL</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Color Settings (Placeholder implementation for show) */}
                                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl opacity-60">
                                         <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-blue-500/10 rounded-lg">
                                                <span className="material-symbols-outlined text-blue-500 text-xl">palette</span>
                                            </div>
                                            <div>
                                                <h4 className="text-slate-200 font-semibold">Primary Brand Color</h4>
                                                <p className="text-xs text-slate-500 mt-0.5">Control the main accent color across the whole site.</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-3 items-center">
                                            <label htmlFor="theme-primaryColor" className="sr-only">Primary Brand Color</label>
                                            <div className="h-12 w-12 rounded-xl border border-slate-700 overflow-hidden relative">
                                                <input
                                                    id="theme-primaryColor-picker"
                                                    type="color"
                                                    value={siteConfig.colors.primary}
                                                    onChange={(e) => updateSiteConfig({ colors: { ...siteConfig.colors, primary: e.target.value } })}
                                                    className="absolute -inset-1 w-[150%] h-[150%] cursor-pointer"
                                                />
                                            </div>
                                            <input
                                                id="theme-primaryColor"
                                                type="text"
                                                value={siteConfig.colors.primary}
                                                onChange={(e) => updateSiteConfig({ colors: { ...siteConfig.colors, primary: e.target.value } })}
                                                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-400 font-mono w-32"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column - Live Preview */}
                    <div className="flex-1 bg-black/90 relative flex flex-col justify-center items-center overflow-hidden">
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-slate-900/90 rounded-full border border-slate-700/50 backdrop-blur-md z-50 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Live Preview</span>
                        </div>

                        {/* Preview Frame */}
                        <div
                            className="bg-white dark:bg-slate-950 h-full w-full shadow-2xl overflow-y-auto relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                            style={{ contain: 'content' }} // Traps fixed elements like Navbar inside this div
                        >
                            {/* Overlay to disable links during preview */}
                            <div className="absolute inset-x-0 top-0 h-16 z-[60]" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}></div>

                            {activePageId === 'home' && <Home />}
                            {activePageId === 'events' && <Events />}
                            {activePageId === 'contact' && <Contact />}
                            {activePageId === 'membership' && <Membership />}
                            {activePageId === 'association' && <Association />}

                            {/* Fallback for others */}
                            {!['home', 'events', 'contact', 'membership', 'association'].includes(activePageId) && activePageId !== 'theme' && (
                                <div className="h-full flex items-center justify-center text-slate-500 flex-col gap-4">
                                    <span className="material-symbols-outlined text-6xl opacity-20">preview</span>
                                    <p>Preview not available for this page type yet.</p>
                                </div>
                            )}

                            {activePageId === 'theme' && (
                                <div className="h-full flex items-center justify-center bg-slate-100 dark:bg-slate-900 p-8">
                                    <div className="max-w-md w-full text-center space-y-8">
                                        <div className="p-8 bg-white dark:bg-slate-800 rounded-2xl shadow-xl">
                                            <h1 className="text-4xl font-semibold text-primary mb-4">Heading 1</h1>
                                            <h2 className="text-2xl font-semibold text-gray-800 dark:text-white mb-2">Heading 2</h2>
                                            <p className="text-gray-600 dark:text-gray-400">This is how your body text will look. Colors and fonts update in real-time based on your settings.</p>
                                            <div className="mt-6">
                                                <button className="bg-primary text-white px-6 py-3 rounded-lg font-semibold shadow-lg shadow-primary/30">Primary Button</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Styles for toggle switch */}
            <style>{`
                .toggle-checkbox:checked { right: 0; border-color: #3b82f6; }
                .toggle-checkbox { right: auto; left: 0; transition: all 0.2s ease-in-out; }
                .toggle-label { width: 40px; }
            `}</style>
        </div>
    );
};

export default WebsiteContentEditor;
