import React, { useState } from 'react';
import { useAdmin, type FormerOfficer } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';

const FormerOfficersManager: React.FC = () => {
    const { formerOfficers, addFormerOfficer, updateFormerOfficer, deleteFormerOfficer, uploadImage } = useAdmin();
    const { adminRole } = useAuth();
    const canEdit = adminRole !== 'viewer';
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<FormerOfficer | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form State (for the modal)
    const [year, setYear] = useState<number>(new Date().getFullYear());
    const [officers, setOfficers] = useState<{ name: string; role: string; image?: string }[]>([
        { name: '', role: 'President', image: '' }
    ]);

    const handleOpenModal = (item?: FormerOfficer) => {
        if (item) {
            setEditingItem(item);
            setYear(item.year);
            setOfficers(item.officers.map(o => ({ ...o, image: o.image || '' })));
        } else {
            setEditingItem(null);
            setYear(new Date().getFullYear());
            setOfficers([{ name: '', role: 'President', image: '' }]);
        }
        setIsModalOpen(true);
    };

    const handleAddOfficerRow = () => {
        setOfficers([...officers, { name: '', role: '', image: '' }]);
    };

    const handleRemoveOfficerRow = (index: number) => {
        setOfficers(officers.filter((_, i) => i !== index));
    };

    const handleOfficerChange = (index: number, field: 'name' | 'role' | 'image', value: string) => {
        const newOfficers = [...officers];
        newOfficers[index][field] = value;
        setOfficers(newOfficers);
    };

    const handleImageUpload = async (index: number, file: File) => {
        try {
            const url = await uploadImage(file);
            handleOfficerChange(index, 'image', url);
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Image upload failed.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const data: Omit<FormerOfficer, 'id'> = {
            year,
            officers: officers.filter(o => o.name.trim() !== '')
        };

        try {
            if (editingItem?.id) {
                await updateFormerOfficer(editingItem.id, data);
            } else {
                await addFormerOfficer(data);
            }
            setIsModalOpen(false);
        } catch (error: any) {
            console.error("Save failed:", error);
            alert("Failed to save records. Error: " + (error?.message || "Unknown database error"));
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-semibold font-display">Past Officers Management</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">Honoring the leaders of PAHA since 1978.</p>
                </div>
                <div className="flex gap-3">
                    {canEdit && (
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-primary text-white px-4 py-2 rounded-[10px] font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Add Term Year
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[10px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Term Year</th>
                            <th className="p-4 font-semibold">Officers Count</th>
                            <th className="p-4 font-semibold">Preview (President)</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5 font-sans">
                        {formerOfficers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-12 text-center text-slate-500 italic">
                                    No records found.
                                </td>
                            </tr>
                        ) : (
                            formerOfficers.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="p-4 font-semibold text-lg text-primary">{item.year}</td>
                                    <td className="p-4">
                                        <span className="bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-xs font-semibold">
                                            {item.officers.length} Officers
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            {item.officers[0]?.image ? (
                                                <img src={item.officers[0].image} className="size-8 rounded-full border border-primary/20 object-cover" alt="" />
                                            ) : (
                                                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                    <span className="material-symbols-outlined text-xs">person</span>
                                                </div>
                                            )}
                                            <span className="font-semibold">{item.officers[0]?.name || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && (<>
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-[10px] transition-all"
                                                    title="Edit Term"
                                                >
                                                    <span className="material-symbols-outlined text-lg">edit</span>
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Delete record for year ${item.year}?`)) {
                                                            if (item.id) deleteFormerOfficer(item.id);
                                                        }
                                                    }}
                                                    className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-[10px] transition-all"
                                                    title="Delete Record"
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

            {/* Modal */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm" onClick={() => !isSaving && setIsModalOpen(false)}></div>
                    <div className="fixed inset-0 z-[70] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 py-8">
                            <div className="bg-white dark:bg-slate-900 rounded-[10px] w-full max-w-2xl relative z-10 shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50 dark:bg-white/5">
                            <h3 className="text-xl font-semibold">{editingItem ? `Edit Year ${year}` : 'Add New Term Year'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="p-4 space-y-4 max-h-[70vh] overflow-y-auto font-sans">
                            <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[10px] border border-slate-100 dark:border-white/5">
                                <label htmlFor="fo-year" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Term Year</label>
                                <input
                                    id="fo-year"
                                    name="fo-year"
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(parseInt(e.target.value))}
                                    required
                                    className="w-full max-w-[200px] px-4 py-3 rounded-[10px] border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary transition-all font-semibold text-2xl text-primary"
                                />
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Officers List</p>
                                    <button
                                        type="button"
                                        onClick={handleAddOfficerRow}
                                        className="text-xs font-semibold text-primary hover:bg-primary/10 px-3 py-1.5 rounded-[10px] flex items-center gap-1 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-sm">add</span> Add Row
                                    </button>
                                </div>
                                
                                <div className="space-y-4">
                                    {officers.map((officer, index) => (
                                        <div key={index} className="bg-white dark:bg-black/20 p-5 rounded-[10px] border border-slate-100 dark:border-white/5 shadow-sm relative group/row">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOfficerRow(index)}
                                                className="absolute -top-3 -right-3 size-8 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 transition-all shadow-lg hover:bg-red-600 z-10"
                                            >
                                                <span className="material-symbols-outlined text-lg">close</span>
                                            </button>

                                            <div className="flex flex-col md:flex-row gap-4">
                                                {/* Left: Image Upload Preview */}
                                                <div className="flex flex-col gap-2 shrink-0">
                                                    <div className="size-24 rounded-[10px] bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 overflow-hidden relative group/img">
                                                        <img 
                                                            src={officer.image || 'https://placehold.co/100?text=Profile'} 
                                                            className="w-full h-full object-cover transition-all group-hover/img:scale-110" 
                                                            alt="" 
                                                            onError={(e) => {
                                                                e.currentTarget.src = 'https://placehold.co/100?text=Profile';
                                                                e.currentTarget.className = 'w-full h-full object-contain p-4 opacity-20';
                                                            }}
                                                        />
                                                        <label htmlFor={`fo-photo-${index}`} className="sr-only">Officer Photo</label>
                                                        <input 
                                                            id={`fo-photo-${index}`}
                                                            type="file" 
                                                            accept="image/*"
                                                            className="absolute inset-0 opacity-0 cursor-pointer z-20"
                                                            onChange={(e) => {
                                                                const file = e.target.files?.[0];
                                                                if (file) handleImageUpload(index, file);
                                                            }}
                                                        />
                                                        <div className="absolute inset-0 bg-primary/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-all z-10 pointer-events-none">
                                                            <span className="material-symbols-outlined text-white text-2xl">cloud_upload</span>
                                                        </div>
                                                    </div>
                                                    <span className="text-[10px] font-semibold text-center text-slate-400 tracking-wider">OFFICER PHOTO</span>
                                                    {officer.image && (
                                                        <button 
                                                            type="button"
                                                            onClick={() => handleOfficerChange(index, 'image', '')}
                                                            className="text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-[10px] transition-colors flex items-center justify-center gap-1 mt-1"
                                                        >
                                                            <span className="material-symbols-outlined text-[10px]">delete</span>
                                                            Remove Image
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Right: Inputs */}
                                                <div className="flex-1 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div>
                                                            <label htmlFor={`fo-name-${index}`} className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Full Name</label>
                                                            <input
                                                                id={`fo-name-${index}`}
                                                                name="officerName"
                                                                type="text"
                                                                value={officer.name}
                                                                onChange={(e) => handleOfficerChange(index, 'name', e.target.value)}
                                                                placeholder="e.g. Dr. Juan"
                                                                className="w-full px-4 py-2 text-sm rounded-[10px] border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 focus:ring-1 focus:ring-primary outline-none"
                                                                required
                                                            />
                                                        </div>
                                                        <div>
                                                            <label htmlFor={`fo-role-${index}`} className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Role</label>
                                                            <input
                                                                id={`fo-role-${index}`}
                                                                name="officerRole"
                                                                type="text"
                                                                value={officer.role}
                                                                onChange={(e) => handleOfficerChange(index, 'role', e.target.value)}
                                                                placeholder="e.g. President"
                                                                className="w-full px-4 py-2 text-sm rounded-[10px] border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 focus:ring-1 focus:ring-primary outline-none"
                                                                required
                                                            />
                                                        </div>
                                                        <div className="md:col-span-2">
                                                            <label htmlFor={`fo-image-${index}`} className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">Image URL</label>
                                                            <input
                                                                id={`fo-image-${index}`}
                                                                name="officerImage"
                                                                type="url"
                                                                value={officer.image || ''}
                                                                onChange={(e) => handleOfficerChange(index, 'image', e.target.value)}
                                                                placeholder="Upload an image or enter a direct image URL"
                                                                className="w-full px-4 py-2 text-sm rounded-[10px] border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-black/20 focus:ring-1 focus:ring-primary outline-none"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-100 dark:border-white/5 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-[10px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-[2] bg-primary text-white px-4 py-3 rounded-[10px] font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isSaving ? (
                                        <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined text-sm">save</span>
                                    )}
                                    {editingItem ? 'Update Record' : 'Save Record'}
                                </button>
                            </div>
                        </form>
                    </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default FormerOfficersManager;
