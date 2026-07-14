// Pure scoring/verdict computation for the 2026 PAHA Accreditation Standard.
// Shared by the admin Visiting Evaluation Form and the member Self-Assessment.
import type { EvaluationSection, SectionResult } from '../types/evaluation';

export function computeSectionResult(
  section: EvaluationSection,
  checked: Record<string, boolean>
): SectionResult {
  const compulsoryChecked = (section.compulsory || [])
    .filter(c => checked[c.id])
    .map(c => c.id);
  const scoredChecked = (section.scored || [])
    .filter(s => checked[s.id])
    .map(s => s.id);

  const allCompulsory = (section.compulsory || []).length === compulsoryChecked.length;
  const earnedPoints = (section.scored || [])
    .filter(s => checked[s.id])
    .reduce((sum, s) => sum + s.points, 0);

  const totalPoints = section.totalPoints
    ?? (section.scored || []).reduce((sum, s) => sum + s.points, 0);

  const scoredPassed = !section.scored || !section.passRule || totalPoints === 0
    ? true
    : earnedPoints >= totalPoints * section.passRule / 100 - 1e-9; // float tolerance for equal-weight rows

  return {
    sectionId: section.id,
    compulsoryChecked,
    scoredChecked,
    earnedPoints: Math.round(earnedPoints * 100) / 100,
    passed: allCompulsory && scoredPassed,
  };
}

export interface OverallResult {
  sections: SectionResult[];
  verdict: 'passed' | 'failed';
  sectionsPassed: number;
  sectionsTotal: number;
  /** All compulsory items across the whole standard have been answered (checked). */
  allCompulsoryAnswered: boolean;
}

export function computeOverall(
  standard: EvaluationSection[],
  checked: Record<string, boolean>
): OverallResult {
  const sections = standard.map(s => computeSectionResult(s, checked));
  const sectionsPassed = sections.filter(s => s.passed).length;
  const allCompulsoryAnswered = standard.every(s =>
    (s.compulsory || []).every(c => checked[c.id])
  );
  return {
    sections,
    verdict: sectionsPassed === sections.length ? 'passed' : 'failed',
    sectionsPassed,
    sectionsTotal: sections.length,
    allCompulsoryAnswered,
  };
}

/** Per-section totals for display (points sum of the scored table). */
export function sectionTotalPoints(section: EvaluationSection): number {
  return section.totalPoints
    ?? (section.scored || []).reduce((sum, s) => sum + s.points, 0);
}

export interface GapEntry {
  sectionId: string;
  sectionTitle: string;
  missingCompulsory: string[]; // labels
  belowThreshold: boolean;
  earnedPoints: number;
  totalPoints: number;
  passRule?: number;
}

/** "What's missing" summary — every unchecked compulsory item and every
 *  section below its scoring threshold, in standard order. */
export function computeGapSummary(
  standard: EvaluationSection[],
  checked: Record<string, boolean>
): GapEntry[] {
  const gaps: GapEntry[] = [];
  for (const section of standard) {
    const missingCompulsory = (section.compulsory || [])
      .filter(c => !checked[c.id])
      .map(c => c.label);
    const result = computeSectionResult(section, checked);
    const total = sectionTotalPoints(section);
    const belowThreshold = !!section.scored && !!section.passRule && total > 0
      && result.earnedPoints < total * section.passRule / 100 - 1e-9;
    if (missingCompulsory.length > 0 || belowThreshold) {
      gaps.push({
        sectionId: section.id,
        sectionTitle: section.title,
        missingCompulsory,
        belowThreshold,
        earnedPoints: result.earnedPoints,
        totalPoints: total,
        passRule: section.passRule,
      });
    }
  }
  return gaps;
}
