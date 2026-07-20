import React, { useState } from 'react';
import type { EvaluationSection } from '../types/evaluation';
import { MAJOR_SECTIONS } from '../data/accreditationStandard2026';
import { computeSectionResult, computeGapSummary, sectionTotalPoints } from '../utils/evaluationScoring';

export type ChecklistMode = 'inspection' | 'self-assessment';

interface Props {
    standard: EvaluationSection[];
    mode: ChecklistMode;
    value: Record<string, boolean>;
    onChange: (checked: Record<string, boolean>) => void;
    readOnly?: boolean;
    /** Renders the "What's missing" gap summary panel below the accordion (self-assessment). */
    showGapSummary?: boolean;
}

const fmtPts = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

const SectionBlock: React.FC<{
    section: EvaluationSection;
    mode: ChecklistMode;
    checked: Record<string, boolean>;
    onToggle: (id: string) => void;
    readOnly: boolean;
}> = ({ section, mode, checked, onToggle, readOnly }) => {
    const result = computeSectionResult(section, checked);
    const total = sectionTotalPoints(section);
    const touched = (section.compulsory || []).some(c => checked[c.id]) || (section.scored || []).some(s => checked[s.id]);
    const statusColor = result.passed ? 'bg-emerald-500' : touched ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600';
    const passLabel = mode === 'inspection'
        ? (result.passed ? 'PASS' : touched ? 'FAIL' : '—')
        : (result.passed ? 'Ready' : touched ? 'Not yet ready' : '—');

    return (
        <div className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            {/* Subsection header */}
            <div className="px-4 py-3 bg-slate-50 dark:bg-white/5 flex flex-wrap items-center gap-2">
                <span className={`size-2.5 rounded-full shrink-0 ${statusColor}`} />
                <span className="text-sm font-bold text-slate-800 dark:text-white flex-1 min-w-[180px]">
                    {section.id}. {section.title}
                </span>
                {section.scored && total > 0 && (
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200">
                        {fmtPts(result.earnedPoints)}/{fmtPts(total)}
                    </span>
                )}
                {section.passRule && (
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${section.passRule === 100 ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300'}`}>
                        {section.passRule === 100 ? 'Pass = 100%' : 'Pass ≥ 80%'}
                    </span>
                )}
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${result.passed ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : touched ? 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300' : 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'}`}>
                    {passLabel}
                </span>
            </div>

            <div className="p-4 space-y-4">
                {/* Compulsory standards */}
                {section.compulsory && section.compulsory.length > 0 && (
                    <div className="rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50/50 dark:bg-red-500/5 p-3.5">
                        <p className="text-[11px] font-black uppercase tracking-widest text-red-700 dark:text-red-400 mb-1">Compulsory Standards</p>
                        <p className="text-[11px] text-red-600 dark:text-red-400/90 mb-3">
                            All compulsory standards must be satisfied. Any unchecked item fails this section.
                        </p>
                        <div className="space-y-1.5">
                            {section.compulsory.map(item => (
                                <label key={item.id} className={`flex items-start gap-2.5 py-1 ${readOnly ? '' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!checked[item.id]}
                                        disabled={readOnly}
                                        onChange={() => onToggle(item.id)}
                                        className="mt-0.5 size-4 accent-red-600 shrink-0"
                                    />
                                    <span className="text-[13px] leading-snug text-slate-700 dark:text-slate-200">{item.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                )}

                {/* Scored table */}
                {section.scored && section.scored.length > 0 && (
                    <div className="space-y-1">
                        {section.scored.map(item => (
                            <div key={item.id}>
                                <label className={`flex items-start gap-2.5 py-1.5 px-1 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.03] ${readOnly ? '' : 'cursor-pointer'}`}>
                                    <input
                                        type="checkbox"
                                        checked={!!checked[item.id]}
                                        disabled={readOnly}
                                        onChange={() => onToggle(item.id)}
                                        className="mt-0.5 size-4 accent-primary shrink-0"
                                    />
                                    <span className="text-[13px] leading-snug text-slate-700 dark:text-slate-200 flex-1">{item.label}</span>
                                    <span className="text-[11px] font-black text-slate-400 dark:text-slate-500 shrink-0 tabular-nums">
                                        {item.points > 0 ? `${fmtPts(item.points)} pts` : '—'}
                                    </span>
                                </label>
                                {item.subItems && item.subItems.length > 0 && (
                                    <ul className="ml-9 mb-1.5 list-disc list-inside space-y-0.5">
                                        {item.subItems.map((sub, i) => (
                                            <li key={i} className="text-[11px] text-slate-400 dark:text-slate-500">{sub}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const AccreditationChecklist: React.FC<Props> = ({ standard, mode, value, onChange, readOnly = false, showGapSummary = false }) => {
    const [openMajor, setOpenMajor] = useState<string | null>('I');

    const onToggle = (id: string) => {
        if (readOnly) return;
        onChange({ ...value, [id]: !value[id] });
    };

    const handleMarkAll = () => {
        if (readOnly) return;
        const allChecked: Record<string, boolean> = { ...value };
        standard.forEach(section => {
            (section.compulsory || []).forEach(item => { allChecked[item.id] = true; });
            (section.scored || []).forEach(item => { allChecked[item.id] = true; });
        });
        onChange(allChecked);
    };

    // Only render majors present in the provided standard (normally all 8)
    const majors = MAJOR_SECTIONS
        .map(m => ({ ...m, sections: m.sections.filter(s => standard.some(x => x.id === s.id)) }))
        .filter(m => m.sections.length > 0);

    const gaps = showGapSummary ? computeGapSummary(standard, value) : [];

    return (
        <div className="space-y-3">
            {mode === 'self-assessment' && !readOnly && (
                <div className="flex justify-end mb-4">
                    <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors">
                        <input 
                            type="checkbox" 
                            className="size-4 accent-primary"
                            checked={standard.reduce((acc, s) => {
                                const compulsory = (s.compulsory || []).every(i => value[i.id]);
                                const scored = (s.scored || []).every(i => value[i.id]);
                                return acc && compulsory && scored;
                            }, true)}
                            onChange={(e) => {
                                if (e.target.checked) handleMarkAll();
                                else {
                                    const allUnchecked: Record<string, boolean> = { ...value };
                                    standard.forEach(s => {
                                        (s.compulsory || []).forEach(i => { allUnchecked[i.id] = false; });
                                        (s.scored || []).forEach(i => { allUnchecked[i.id] = false; });
                                    });
                                    onChange(allUnchecked);
                                }
                            }}
                        />
                        <span className="text-xs font-bold uppercase tracking-wider">Mark All as Ready</span>
                    </label>
                </div>
            )}

            {majors.map(major => {
                const results = major.sections.map(s => computeSectionResult(s, value));
                const passedCount = results.filter(r => r.passed).length;
                const anyTouched = major.sections.some(s =>
                    [...(s.compulsory || []), ...(s.scored || [])].some(i => value[i.id])
                );
                const allPassed = passedCount === major.sections.length;
                const dot = allPassed ? 'bg-emerald-500' : anyTouched ? 'bg-red-500' : 'bg-slate-300 dark:bg-slate-600';
                const isOpen = openMajor === major.numeral;

                return (
                    <div key={major.numeral} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden bg-white dark:bg-slate-900/50">
                        <button
                            type="button"
                            onClick={() => setOpenMajor(isOpen ? null : major.numeral)}
                            className="w-full px-5 py-4 flex items-center gap-3 text-left hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                        >
                            <span className={`size-3 rounded-full shrink-0 ${dot}`} />
                            <span className="flex-1">
                                <span className="text-sm font-black text-slate-900 dark:text-white">Section {major.numeral} — {major.title}</span>
                                <span className="block text-[11px] text-slate-400 mt-0.5">
                                    {passedCount}/{major.sections.length} subsection{major.sections.length !== 1 ? 's' : ''} {mode === 'inspection' ? 'passing' : 'ready'}
                                </span>
                            </span>
                            <span className={`material-symbols-outlined text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        {isOpen && (
                            <div className="px-4 pb-4 space-y-3">
                                {major.sections.map(section => (
                                    <SectionBlock
                                        key={section.id}
                                        section={section}
                                        mode={mode}
                                        checked={value}
                                        onToggle={onToggle}
                                        readOnly={readOnly}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Gap summary — self-assessment's actionable output */}
            {showGapSummary && (
                <div className="border border-amber-200 dark:border-amber-500/25 bg-amber-50/60 dark:bg-amber-500/5 rounded-2xl p-5">
                    <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-2 mb-3">
                        <span className="material-symbols-outlined text-base">checklist_rtl</span>
                        What's missing
                    </h4>
                    {gaps.length === 0 ? (
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-base">verified</span>
                            Nothing — your clinic meets every section of the 2026 standard.
                        </p>
                    ) : (
                        <div className="space-y-4">
                            {gaps.map(gap => (
                                <div key={gap.sectionId}>
                                    <p className="text-[12px] font-bold text-slate-800 dark:text-white">
                                        {gap.sectionId}. {gap.sectionTitle}
                                        {gap.belowThreshold && (
                                            <span className="ml-2 text-[10px] font-black text-red-600 dark:text-red-400 uppercase">
                                                {fmtPts(gap.earnedPoints)}/{fmtPts(gap.totalPoints)} pts — needs ≥ {gap.passRule}%
                                            </span>
                                        )}
                                    </p>
                                    {gap.missingCompulsory.length > 0 && (
                                        <ul className="mt-1 ml-4 list-disc space-y-0.5">
                                            {gap.missingCompulsory.map((label, i) => (
                                                <li key={i} className="text-[11px] text-slate-600 dark:text-slate-300">
                                                    <span className="text-red-500 font-bold">Compulsory:</span> {label}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AccreditationChecklist;
