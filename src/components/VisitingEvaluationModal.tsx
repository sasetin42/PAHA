import React, { useState, useEffect, useMemo } from 'react';
import jsPDF from 'jspdf';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db, auth, storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import type { AccreditationApplication, VisitingEvaluationForm } from '../types/accreditation';
import { STANDARD_2026 } from '../data/accreditationStandard2026';
import { computeOverall, sectionTotalPoints, computeGapSummary } from '../utils/evaluationScoring';
import AccreditationChecklist from './AccreditationChecklist';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    app: AccreditationApplication;
    existingForm?: VisitingEvaluationForm | null;
    onSaved: () => void;
}

const sanitizeClientName = (name: string) =>
    (name || 'CLIENT').replace(/[^a-zA-Z0-9]/g, '').toUpperCase() || 'CLIENT';

const yymmdd = (d: Date) => {
    const yy = String(d.getFullYear()).slice(-2);
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yy}${mm}${dd}`;
};

const draftKey = (appId: string) => `vef2026-draft-${appId}`;

const VisitingEvaluationModal: React.FC<Props> = ({ isOpen, onClose, app, existingForm, onSaved }) => {
    const [dateVisited, setDateVisited] = useState('');
    const [checked, setChecked] = useState<Record<string, boolean>>({});
    const [saving, setSaving] = useState(false);
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [overrideRemarks, setOverrideRemarks] = useState('');
    const [failRemarks, setFailRemarks] = useState('');
    const [logoBase64, setLogoBase64] = useState<string | null>(null);

    // Preload logo for PDF generation
    useEffect(() => {
        if (!isOpen) return;
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = '/paha-logo.png';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0);
            try {
                setLogoBase64(canvas.toDataURL('image/png'));
            } catch (e) {
                console.error('Failed to convert image to Base64', e);
            }
        };
    }, [isOpen]);

    // Load: existing saved form (fully editable, not read-only) or autosaved
    // draft for a brand-new evaluation (resume where the inspector left off).
    useEffect(() => {
        if (!isOpen) return;
        if (existingForm?.checkedItems) {
            setDateVisited(existingForm.dateVisited || '');
            setChecked(existingForm.checkedItems);
            setFailRemarks(existingForm.failRemarks || '');
            setOverrideOpen(!!existingForm.adminOverride);
            setOverrideRemarks(existingForm.adminOverride?.remarks || '');
            return;
        }
        try {
            const raw = localStorage.getItem(draftKey(app.id));
            if (raw) {
                const draft = JSON.parse(raw);
                setDateVisited(draft.dateVisited || '');
                setChecked(draft.checked || {});
            } else {
                setDateVisited(existingForm?.dateVisited || '');
                setChecked({});
            }
            setFailRemarks('');
            setOverrideOpen(false);
            setOverrideRemarks('');
        } catch { /* corrupted draft — start clean */ }
    }, [isOpen, app.id, existingForm]);

    // Autosave draft so an inspector can close and resume a brand-new (not yet
    // saved) evaluation without losing progress.
    useEffect(() => {
        if (!isOpen || existingForm) return;
        try {
            localStorage.setItem(draftKey(app.id), JSON.stringify({ dateVisited, checked }));
        } catch { /* storage full — non-fatal */ }
    }, [isOpen, existingForm, app.id, dateVisited, checked]);

    const overall = useMemo(() => computeOverall(STANDARD_2026, checked), [checked]);
    const gaps = useMemo(() => computeGapSummary(STANDARD_2026, checked), [checked]);
    // A failed visit is, by definition, one where the checklist ISN'T fully
    // checked — that's not a reason to block saving. This renders the full
    // list of unchecked/non-compliant items so the inspector doesn't have to
    // retype what the checklist already shows.
    const autoGapsText = useMemo(() => {
        if (gaps.length === 0) return '';
        return gaps.map(g => {
            const parts: string[] = [];
            if (g.missingCompulsory.length > 0) parts.push(`Missing: ${g.missingCompulsory.join(', ')}`);
            if (g.belowThreshold) parts.push(`Below required score (${Math.round(g.earnedPoints)}/${Math.round(g.totalPoints)} pts)`);
            return `• Section ${g.sectionId} — ${g.sectionTitle}: ${parts.join('; ')}`;
        }).join('\n');
    }, [gaps]);

    if (!isOpen) return null;

    const computedVerdict = overall.verdict;
    const finalVerdict: 'passed' | 'failed' = overrideOpen && overrideRemarks.trim()
        ? (computedVerdict === 'passed' ? 'failed' : 'passed')
        : computedVerdict;
    const isOverridden = finalVerdict !== computedVerdict;
    // Save is always available once a date is set — an incomplete checklist
    // is expected on a FAIL, not a blocker. The only other requirement is the
    // override justification, since that's a deliberate manual decision.
    const canSave = !!dateVisited && (!overrideOpen || overrideRemarks.trim().length > 0);

    const buildPdfDoc = (version: number, verdict: 'passed' | 'failed', createdAt: Date) => {
        const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        let y = 40;

        if (logoBase64) {
            const logoW = 80;
            const logoH = 53;
            pdf.addImage(logoBase64, 'PNG', (pageW - logoW) / 2, y, logoW, logoH);
            y += logoH + 20;
        }

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text('PHILIPPINE ANIMAL HOSPITAL ASSOCIATION, INC.', pageW / 2, y, { align: 'center' });
        y += 22;
        pdf.setFontSize(13);
        pdf.text('Visiting Evaluation Form — 2026 Accreditation Standard', pageW / 2, y, { align: 'center' });
        y += 30;

        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Clinic Name: ${app.clinicName}`, 50, y); y += 18;
        pdf.text(`Date Visited: ${dateVisited || '—'}`, 50, y); y += 18;
        pdf.text(`Reference: ${app.loiData?.loiRef || app.id}`, 50, y); y += 26;

        pdf.setFont('helvetica', 'bold');
        pdf.text('Section Results', 50, y); y += 18;
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);

        STANDARD_2026.forEach(section => {
            if (y > 760) { pdf.addPage(); y = 50; }
            const result = overall.sections.find(r => r.sectionId === section.id)!;
            const total = sectionTotalPoints(section);
            const scoreTxt = section.scored && total > 0
                ? `${Math.round(result.earnedPoints)}/${Math.round(total)}${section.passRule ? ` (pass ${section.passRule === 100 ? '= 100%' : '>= 80%'})` : ''}`
                : 'Compulsory only';
            pdf.text(`${section.id}. ${section.title}`, 50, y);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`${scoreTxt} — ${result.passed ? 'PASS' : 'FAIL'}`, pageW - 50, y, { align: 'right' });
            pdf.setFont('helvetica', 'normal');
            y += 16;
        });

        y += 16;
        if (y > 700) { pdf.addPage(); y = 50; }
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(13);
        pdf.setTextColor(verdict === 'passed' ? '#15803d' : '#b91c1c');
        pdf.text(`RESULT: ${verdict.toUpperCase()}`, 50, y);
        pdf.setTextColor('#000000');
        y += 20;
        if (isOverridden) {
            pdf.setFontSize(10);
            pdf.text(`ADMIN OVERRIDE (computed: ${computedVerdict.toUpperCase()})`, 50, y); y += 14;
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Override justification: ${overrideRemarks.trim()}`, 50, y, { maxWidth: pageW - 100 }); y += 28;
        } else {
            y += 10;
        }
        if (verdict === 'failed' && failRemarks.trim()) {
            if (y > 700) { pdf.addPage(); y = 50; }
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.text('Remarks — Why It Failed / What to Comply:', 50, y); y += 16;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            const lines = pdf.splitTextToSize(failRemarks.trim(), pageW - 100);
            pdf.text(lines, 50, y); y += lines.length * 13 + 12;
        }

        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Generated: ${createdAt.toLocaleString()}  ·  Version ${String(version).padStart(2, '0')}`, 50, y);

        return pdf;
    };

    // Explicit, on-demand export — no PDF is ever generated automatically.
    // Downloads straight to the admin's machine; nothing is uploaded to storage.
    const handleDownloadPdf = () => {
        const version = existingForm?.version
            ?? ((app.visitingEvaluationForms?.length ?? 0) > 0
                ? Math.max(...(app.visitingEvaluationForms ?? []).map(f => f.version)) + 1
                : 1);
        const createdAt = existingForm ? new Date(existingForm.createdAt) : new Date();
        const filename = `${String(version).padStart(2, '0')}PAHA${yymmdd(createdAt)}-${sanitizeClientName(app.clinicName)}.pdf`;
        const pdf = buildPdfDoc(version, finalVerdict, createdAt);
        pdf.save(filename);
    };

    // Saves the structured evaluation data (checklist state, computed sections,
    // verdict) — always editable afterward, never locked to read-only. A FAIL
    // sends the application back to the Site Visit stage (a physical revisit
    // is needed, not just new documents) instead of advancing to Stage 4.
    const handleSaveEvaluation = async () => {
        if (!canSave || saving) return;

        setSaving(true);
        try {
            const existingForms = app.visitingEvaluationForms || [];
            // Editing an existing version updates it in place; a brand-new
            // evaluation creates the next version number.
            const version = existingForm?.version
                ?? (existingForms.length > 0 ? Math.max(...existingForms.map(f => f.version)) + 1 : 1);

            const createdAt = existingForm ? new Date(existingForm.createdAt) : new Date();

            // Auto-generate the PDF and upload it to Storage so the member can download it
            let pdfUrl = existingForm?.url || '';
            let pdfFilename = existingForm?.filename || '';
            try {
                const pdf = buildPdfDoc(version, finalVerdict, createdAt);
                const pdfBlob = pdf.output('blob');
                pdfFilename = `${String(version).padStart(2, '0')}PAHA${yymmdd(createdAt)}-${sanitizeClientName(app.clinicName)}.pdf`;
                const pdfRef = ref(storage, `accreditation/evaluations/${app.id}/${pdfFilename}`);
                const snap = await uploadBytes(pdfRef, pdfBlob);
                pdfUrl = await getDownloadURL(snap.ref);
            } catch (pdfErr) {
                console.error('Failed to auto-generate or upload evaluation PDF:', pdfErr);
            }

            const newForm: VisitingEvaluationForm = {
                filename: pdfFilename,
                url: pdfUrl,
                version,
                result: finalVerdict === 'passed' ? 'Passed' : 'Fail',
                clinicName: app.clinicName,
                dateVisited,
                checkedItems: checked,
                sections: overall.sections,
                verdict: finalVerdict,
                ...(isOverridden ? {
                    adminOverride: {
                        verdict: finalVerdict,
                        remarks: overrideRemarks.trim(),
                        by: auth.currentUser?.email || auth.currentUser?.uid || 'admin',
                        at: createdAt.toISOString(),
                    },
                } : {}),
                ...(finalVerdict === 'failed' ? {
                    failRemarks: [autoGapsText, failRemarks.trim() ? `Additional remarks:\n${failRemarks.trim()}` : '']
                        .filter(Boolean).join('\n\n'),
                } : {}),
                createdAt: createdAt.toISOString(),
            };

            const otherForms = existingForms.filter(f => f.version !== version);
            const updatedForms = [...otherForms, newForm].sort((a, b) => a.version - b.version);

            const isNewSave = !existingForm;

            // Track how many site visits have failed — 1st failure sends them
            // back to Site Visit (stage 3); a 2nd failure escalates the revisit
            // request to Stage 4; a 3rd failure bans the clinic from applying
            // for accreditation for 3 months.
            const failedVisitCount = updatedForms.filter(f => f.result === 'Fail').length;
            const isBanned = finalVerdict === 'failed' && failedVisitCount >= 3;
            const bannedUntil = isBanned ? new Date(createdAt.getTime() + 90 * 24 * 60 * 60 * 1000) : null;

            await updateDoc(doc(db, 'accreditation_applications', app.id), {
                visitingEvaluationForms: updatedForms,
                failedVisitCount,
                status: finalVerdict === 'passed' ? 'inspection_completed' : isBanned ? 'accreditation_banned' : 'vef_failed',
                stage: finalVerdict === 'passed' ? 4 : isBanned ? 1 : failedVisitCount >= 2 ? 4 : 3,
                ...(isBanned ? { bannedAt: createdAt.toISOString(), bannedUntil: bannedUntil!.toISOString() } : {}),
                visitData: {
                    ...(app.visitData || { scheduledDate: '', scheduledTime: '', inspectorName: '', notes: '' }),
                    completedAt: createdAt.toISOString(),
                },
                updatedAt: serverTimestamp(),
            });

            // Every save notifies the member — including edits to an already-saved
            // evaluation, since the result or remarks may have changed.
            {
                const savedRemarks = newForm.failRemarks || '';
                await addDoc(collection(db, 'member_notifications'), {
                    clinicId: app.clinicId,
                    type: finalVerdict === 'passed' ? 'site_visit_completed' : isBanned ? 'accreditation_banned' : 'site_visit_failed',
                    title: finalVerdict === 'passed'
                        ? 'Site Visit Completed'
                        : isBanned
                            ? 'Accreditation Application Banned'
                            : (isNewSave ? 'Site Visit Not Passed' : 'Site Visit Evaluation Updated'),
                    body: finalVerdict === 'passed'
                        ? `The PAHA site visit for ${app.clinicName} has been completed. Result: Passed.`
                        : isBanned
                            ? `${app.clinicName} has failed 3 site visits. Your clinic is banned from applying for accreditation until ${bannedUntil!.toLocaleDateString()}.`
                            : `The PAHA site visit for ${app.clinicName} did not pass. ${savedRemarks}`,
                    read: false,
                    createdAt: serverTimestamp(),
                });
                await addDoc(collection(db, 'admin_notifications'), {
                    type: 'accreditation',
                    title: finalVerdict === 'passed' ? 'Site Visit Passed' : isBanned ? 'Clinic Banned — 3 Failed Visits' : 'Site Visit Failed',
                    body: isBanned
                        ? `${app.clinicName} has failed 3 site visits and is now banned from applying for accreditation until ${bannedUntil!.toLocaleDateString()}.`
                        : `${app.clinicName} site visit ${finalVerdict === 'passed' ? 'passed' : 'did not pass'}${finalVerdict === 'failed' && gaps.length > 0 ? ` (${gaps.length} section${gaps.length !== 1 ? 's' : ''} flagged)` : ''}.`,
                    link: 'accreditation',
                    read: false,
                    createdAt: serverTimestamp(),
                });
            }

            localStorage.removeItem(draftKey(app.id));
            onSaved();
            onClose();
        } catch (e) {
            console.error('Failed to save evaluation form:', e);
            alert('Failed to save evaluation form. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={saving ? undefined : onClose} />

            <div className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 dark:border-white/10 flex-shrink-0">
                    <div>
                        <p className="text-[10px] font-bold text-primary uppercase tracking-widest">PAHA Site Visit</p>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Visiting Evaluation Form <span className="text-slate-400 font-semibold text-sm">· 2026 Standard</span></h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {existingForm && (
                            <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300 uppercase tracking-widest">Editing v{String(existingForm.version).padStart(2, '0')}</span>
                        )}
                        <button onClick={onClose} disabled={saving} className="size-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white hover:bg-red-100 hover:text-red-600 transition-all disabled:opacity-40">
                            <span className="material-symbols-outlined text-xl">close</span>
                        </button>
                    </div>
                </div>

                {/* Body — single scroll container */}
                <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
                    {/* Clinic + Date */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Clinic Name</label>
                            <input
                                type="text"
                                value={app.clinicName}
                                readOnly
                                className="w-full px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-white text-sm font-semibold cursor-not-allowed"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Date Visited</label>
                            <input
                                type="date"
                                value={dateVisited}
                                onChange={e => setDateVisited(e.target.value)}
                                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                            />
                        </div>
                    </div>

                    {/* 2026 standard accordion — always editable */}
                    <AccreditationChecklist
                        standard={STANDARD_2026}
                        mode="inspection"
                        value={checked}
                        onChange={setChecked}
                        readOnly={false}
                    />

                    {/* Failure remarks — shown to the member as-is. The unchecked/failing
                        items are recorded automatically; the inspector only needs to add
                        anything extra beyond what the checklist already captures. */}
                    {finalVerdict === 'failed' && (
                        <div className="rounded-2xl border border-red-200 dark:border-red-500/25 bg-red-50/60 dark:bg-red-500/5 p-4 space-y-3">
                            <div>
                                <p className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400 mb-2">
                                    Why It Failed / What They Need to Comply
                                </p>
                                {autoGapsText ? (
                                    <pre className="whitespace-pre-wrap font-sans text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 rounded-xl px-4 py-3">{autoGapsText}</pre>
                                ) : (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 italic">No unchecked items — this result comes from the admin override below.</p>
                                )}
                                <p className="text-[10px] text-red-600/70 dark:text-red-400/70 mt-1.5">Recorded automatically from the checklist above — this list is what the member sees.</p>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-red-600/80 dark:text-red-400/80 uppercase tracking-widest mb-1.5">Additional Remarks (optional)</label>
                                <textarea
                                    value={failRemarks}
                                    onChange={e => setFailRemarks(e.target.value)}
                                    rows={3}
                                    placeholder="Anything extra beyond the checklist — context, severity, special instructions..."
                                    className="w-full px-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-red-200 dark:border-red-500/20 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-red-400/40 outline-none resize-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Admin override */}
                    <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4">
                        <label className="flex items-center gap-2.5 cursor-pointer">
                            <input type="checkbox" checked={overrideOpen} onChange={() => setOverrideOpen(v => !v)} className="size-4 accent-amber-500" />
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Admin override — flip the computed verdict</span>
                        </label>
                        {overrideOpen && (
                            <div className="mt-3">
                                <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2 font-semibold">
                                    The computed verdict is {computedVerdict.toUpperCase()}. Saving with an override records the verdict as {computedVerdict === 'passed' ? 'FAILED' : 'PASSED'}. A justification is required.
                                </p>
                                <textarea
                                    value={overrideRemarks}
                                    onChange={e => setOverrideRemarks(e.target.value)}
                                    rows={3}
                                    placeholder="Justification for overriding the computed verdict (required)..."
                                    className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-amber-400/40 outline-none resize-none"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky footer — progress + computed verdict + save/download */}
                <div className="px-8 py-4 border-t border-slate-100 dark:border-white/10 flex-shrink-0 flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900">
                    <div className="flex-1 min-w-[180px]">
                        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                            {overall.sectionsPassed} / {overall.sectionsTotal} sections passing
                        </p>
                        <div className="h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden mt-1.5 max-w-[220px]">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(overall.sectionsPassed / overall.sectionsTotal) * 100}%` }} />
                        </div>
                    </div>
                    <span className={`text-xs font-black px-3 py-1.5 rounded-xl uppercase tracking-widest ${finalVerdict === 'passed' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>
                        {finalVerdict}{isOverridden ? ' · overridden' : ''}
                    </span>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={!dateVisited}
                        title={!dateVisited ? 'Enter the Date Visited first' : 'Download the current form as a PDF'}
                        className="px-5 py-3 rounded-xl font-bold uppercase tracking-widest text-xs bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <span className="material-symbols-outlined text-base">download</span>
                        Download as PDF
                    </button>
                    <button
                        onClick={handleSaveEvaluation}
                        disabled={!canSave || saving}
                        title={!dateVisited ? 'Enter the Date Visited' : (overrideOpen && !overrideRemarks.trim()) ? 'Override justification is required' : undefined}
                        className="px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-sm bg-primary text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? <span className="animate-spin border-2 border-white/30 border-t-white rounded-full size-4" /> : <span className="material-symbols-outlined text-base">send</span>}
                        Send &amp; Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VisitingEvaluationModal;
