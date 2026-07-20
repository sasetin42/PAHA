import React, { useState } from 'react';
import { useAdmin, type CommitteeMember } from '../../context/AdminContext';
import { useAuth } from '../../context/AuthContext';

const COMMITTEES = [
    { id: 'membership', name: 'Membership' },
    { id: 'accreditation', name: 'Accreditation' },
    { id: 'csr', name: 'CSR' },
    { id: 'cpd', name: 'CPD' },
    { id: 'ethics', name: 'Ethics' },
    { id: 'technical-standards', name: 'Technical Standards' }
];

const CommitteesManager: React.FC = () => {
    const { committeeMembers, addCommitteeMember, updateCommitteeMember, deleteCommitteeMember, uploadImage, committeeCovers, updateCommitteeCover } = useAdmin();
    const { adminRole } = useAuth();
    const canEdit = adminRole !== 'viewer';
    const [selectedCommitteeId, setSelectedCommitteeId] = useState(COMMITTEES[0].id);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<CommitteeMember | null>(null);
    const [previewImage, setPreviewImage] = useState<string>(''); // For real-time preview
    const [isUploading, setIsUploading] = useState(false);
    const [isCoverUploading, setIsCoverUploading] = useState(false);

    const filteredMembers = committeeMembers.filter(m => m.committeeId === selectedCommitteeId);
    const selectedCover = committeeCovers[selectedCommitteeId] || '';

    const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsCoverUploading(true);
        try {
            const url = await uploadImage(file);
            await updateCommitteeCover(selectedCommitteeId, url);
        } catch (error) {
            console.error("Cover upload failed:", error);
            alert("Cover photo upload failed.");
        } finally {
            setIsCoverUploading(false);
            e.target.value = '';
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsUploading(true);
        const formData = new FormData(e.currentTarget);
        
        // Use React state as source of truth — if previewImage is '' the image was intentionally
        // removed and we must write '' to Firestore (not fall back to the old DB value).
        let finalImageUrl = previewImage;
        const imageFile = formData.get('imageFile') as File;

        if (imageFile && imageFile.size > 0) {
            try {
                finalImageUrl = await uploadImage(imageFile);
                setPreviewImage(finalImageUrl);
            } catch (error) {
                console.error("Upload failed:", error);
                alert("Image upload failed.");
                setIsUploading(false);
                return;
            }
        }

        const memberData: Omit<CommitteeMember, 'id'> = {
            committeeId: selectedCommitteeId,
            name: formData.get('name') as string,
            clinic: formData.get('clinic') as string,
            role: formData.get('role') as string,
            image: finalImageUrl,
            displayOrder: Number(formData.get('displayOrder')) || 0
        };

        try {
            // Seeded members may not have an ID in local state until Firebase finishes saving them. 
            // If they are edited before getting an ID, we gracefully promote them via addCommitteeMember.
            if (editingMember?.id) {
                await updateCommitteeMember(editingMember.id, memberData);
            } else {
                await addCommitteeMember(memberData);
            }
            setIsModalOpen(false);
            setEditingMember(null);
            setPreviewImage('');
        } catch (error: any) {
            console.error("Save failed:", error);
            alert("Failed to save member. Error: " + (error?.message || "Unknown database error"));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-semibold">Committees Management</h2>
                    <p className="text-slate-600 dark:text-slate-300 text-sm">Manage committee members, roles, and photos.</p>
                </div>
                <div className="flex gap-3">

                    {canEdit && <button
                        onClick={() => {
                            setEditingMember(null);
                            setPreviewImage('');
                            setIsModalOpen(true);
                        }}
                        className="bg-primary text-white px-4 py-2 rounded-[10px] font-semibold text-sm flex items-center gap-2 hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        <span className="material-symbols-outlined text-lg">add</span>
                        Add Member
                    </button>}
                </div>
            </div>

            {/* Committee Selector */}
            <div className="flex flex-wrap gap-2 p-1 bg-slate-200 dark:bg-white/5 rounded-[10px] w-fit">
                {COMMITTEES.map(c => (
                    <button
                        key={c.id}
                        onClick={() => setSelectedCommitteeId(c.id)}
                        className={`px-4 py-2 rounded-[10px] text-sm font-semibold transition-all ${
                            selectedCommitteeId === c.id 
                            ? 'bg-white dark:bg-primary text-primary dark:text-white shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-white'
                        }`}
                    >
                        {c.name}
                    </button>
                ))}
            </div>

            {/* Committee Cover / Group Photo */}
            <div className="bg-white dark:bg-slate-800 rounded-[10px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                <div className="p-4 border-b border-slate-100 dark:border-white/5">
                    <h3 className="font-semibold text-sm">Group / Cover Photo</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        A wide banner photo (e.g., a group picture of this committee) shown on the public Committees page — not a member profile picture.
                    </p>
                </div>
                <div className="relative w-full aspect-[21/9] bg-slate-100 dark:bg-slate-900">
                    {selectedCover ? (
                        <img src={selectedCover} alt={`${selectedCommitteeId} cover`} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1.5">
                            <span className="material-symbols-outlined text-3xl">panorama</span>
                            <span className="text-xs font-semibold">No cover photo set</span>
                        </div>
                    )}
                </div>
                {canEdit && (
                    <div className="p-4 flex items-center gap-3">
                        <label htmlFor="cm-cover-file" className="relative inline-flex items-center gap-2 px-4 py-2 rounded-[10px] bg-primary text-white font-semibold text-sm cursor-pointer hover:bg-primary/90 transition-colors">
                            {isCoverUploading ? (
                                <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                            ) : (
                                <span className="material-symbols-outlined text-lg">upload_file</span>
                            )}
                            {selectedCover ? 'Replace Cover Photo' : 'Upload Cover Photo'}
                            <input
                                id="cm-cover-file"
                                type="file"
                                accept="image/*"
                                onChange={handleCoverFileChange}
                                disabled={isCoverUploading}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                        </label>
                        {selectedCover && (
                            <button
                                type="button"
                                onClick={() => { if (confirm('Remove this committee\'s cover photo?')) updateCommitteeCover(selectedCommitteeId, ''); }}
                                className="px-4 py-2 rounded-[10px] text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                            >
                                Remove
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Members List */}
            <div className="bg-white dark:bg-slate-800 rounded-[10px] shadow-sm border border-slate-200 dark:border-white/5 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 text-xs uppercase">
                        <tr>
                            <th className="p-4 font-semibold">Photo</th>
                            <th className="p-4 font-semibold">Name / Clinic</th>
                            <th className="p-4 font-semibold">Role</th>
                            <th className="p-4 font-semibold text-center">Order</th>
                            <th className="p-4 font-semibold text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-slate-100 dark:divide-white/5">
                        {filteredMembers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="p-12 text-center text-slate-500 italic">
                                    No members found for this committee.
                                </td>
                            </tr>
                        ) : (
                            filteredMembers.map(member => (
                                <tr key={member.id} className="hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                                    <td className="p-4">
                                        <img 
                                            src={member.image || 'https://via.placeholder.com/150'} 
                                            alt={member.name} 
                                            className="w-12 h-12 rounded-full object-cover border-2 border-slate-100 dark:border-white/10"
                                        />
                                    </td>
                                    <td className="p-4">
                                        <div className="font-semibold text-slate-900 dark:text-white">{member.name}</div>
                                        <div className="text-xs text-slate-600 dark:text-slate-400">{member.clinic}</div>
                                    </td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-semibold uppercase ${
                                            member.role === 'Chairperson' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-silver'
                                        }`}>
                                            {member.role}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center font-mono text-slate-600 dark:text-slate-400">
                                        {member.displayOrder || 0}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex justify-end gap-2">
                                            {canEdit && <><button
                                                onClick={() => {
                                                    setEditingMember(member);
                                                    setPreviewImage(member.image || '');
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-[10px] transition-all"
                                                title="Edit Member"
                                            >
                                                <span className="material-symbols-outlined text-lg">edit</span>
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (!member.id) {
                                                        alert("Please wait for this initial database record to finish setting up before deleting.");
                                                        return;
                                                    }
                                                    if (confirm(`Delete ${member.name} from this committee?`)) {
                                                        deleteCommitteeMember(member.id);
                                                    }
                                                }}
                                                className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-[10px] transition-all"
                                                title="Delete Member"
                                            >
                                                <span className="material-symbols-outlined text-lg">delete</span>
                                            </button></>}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <>
                    <div className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
                    <div className="fixed inset-0 z-[70] overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 py-8">
                            <div className="bg-white dark:bg-slate-900 rounded-[10px] w-full max-w-lg relative z-10 shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col max-h-[min(95vh,850px)] overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-slate-900 z-20">
                            <h3 className="text-xl font-semibold">{editingMember ? 'Edit Committee Member' : 'Add New Member'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-slate-400">close</span>
                            </button>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {/* Name */}
                                <div>
                                    <label htmlFor="cm-name" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Full Name</label>
                                    <input
                                        id="cm-name"
                                        name="name"
                                        type="text"
                                        defaultValue={editingMember?.name}
                                        required
                                        className="w-full px-4 py-3 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="e.g., Dr. Juan Dela Cruz"
                                    />
                                </div>

                                {/* Clinic */}
                                <div>
                                    <label htmlFor="cm-clinic" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Clinic / Affiliation</label>
                                    <input
                                        id="cm-clinic"
                                        name="clinic"
                                        type="text"
                                        defaultValue={editingMember?.clinic}
                                        required
                                        className="w-full px-4 py-3 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary transition-all"
                                        placeholder="e.g., PAHA Veterinary Hospital"
                                    />
                                </div>

                                {/* Role & Order */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="cm-role" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Role</label>
                                        <select
                                            id="cm-role"
                                            name="role"
                                            defaultValue={editingMember?.role || 'Member'}
                                            className="w-full px-4 py-3 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary transition-all appearance-none"
                                        >
                                            <option value="Chairperson">Chairperson</option>
                                            <option value="Vice Chairperson">Vice Chairperson</option>
                                            <option value="Member">Member</option>
                                            <option value="Secretary">Secretary</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="cm-displayOrder" className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Display Order</label>
                                        <input
                                            id="cm-displayOrder"
                                            name="displayOrder"
                                            type="number"
                                            defaultValue={editingMember?.displayOrder || filteredMembers.length + 1}
                                            className="w-full px-4 py-3 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Profile Photo */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Profile Photo Details</label>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-2">
                                                <label htmlFor="cm-imageUrl" className="sr-only">Image URL</label>
                                                <input
                                                    id="cm-imageUrl"
                                                    type="url"
                                                    name="imageUrl"
                                                    value={previewImage}
                                                    onChange={(e) => setPreviewImage(e.target.value)}
                                                    placeholder="Enter image URL"
                                                    className="w-full px-4 py-3 rounded-[10px] border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-primary transition-all text-sm"
                                                />
                                            </div>
                                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 uppercase">
                                                <div className="flex-1 border-t border-slate-200 dark:border-white/10"></div>
                                                <span>OR UPLOAD</span>
                                                <div className="flex-1 border-t border-slate-200 dark:border-white/10"></div>
                                            </div>
                                            <div className="relative">
                                                <label htmlFor="cm-imageFile" className="sr-only">Upload Photo</label>
                                                <input
                                                    id="cm-imageFile"
                                                    type="file"
                                                    name="imageFile"
                                                    accept="image/*"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            const objectUrl = URL.createObjectURL(file);
                                                            setPreviewImage(objectUrl);
                                                        }
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <div className="w-full px-4 py-3 rounded-[10px] border-2 border-dashed border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800 flex items-center justify-center gap-2 text-slate-500 group-hover:border-primary transition-all">
                                                    <span className="material-symbols-outlined text-xl">upload_file</span>
                                                    <span className="font-semibold text-sm">Upload New Photo</span>
                                                </div>
                                            </div>
                                        </div>

                                        {previewImage && (
                                            <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-black/20 rounded-[10px] border border-slate-100 dark:border-white/5 relative">
                                                <img src={previewImage} className="w-12 h-12 rounded-full object-cover" alt="Preview" />
                                                <span className="text-xs text-slate-500 font-semibold">Image Preview</span>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setPreviewImage('');
                                                        const fileInput = document.querySelector('input[name="imageFile"]') as HTMLInputElement;
                                                        if (fileInput) fileInput.value = '';
                                                    }}
                                                    className="absolute right-4 text-xs font-semibold text-red-500 hover:text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 px-3 py-1.5 rounded-[10px] transition-colors flex items-center gap-1"
                                                >
                                                    <span className="material-symbols-outlined text-sm">delete</span>
                                                    Remove Image
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Footer Buttons */}
                            <div className="p-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-3 rounded-[10px] font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUploading}
                                    className="flex-[2] bg-primary text-white px-4 py-3 rounded-[10px] font-semibold text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isUploading ? (
                                        <span className="material-symbols-outlined animate-spin">progress_activity</span>
                                    ) : (
                                        <span className="material-symbols-outlined">save</span>
                                    )}
                                    {editingMember ? 'Update Member' : 'Save Member'}
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

export default CommitteesManager;
