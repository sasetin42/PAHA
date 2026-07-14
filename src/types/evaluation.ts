// Types for the 2026 PAHA Clinic Accreditation Standard — shared by the
// admin Visiting Evaluation Form and the member Self-Assessment.

export type SectionPassRule = 80 | 100; // percent of total points required

export interface CompulsoryItem {
  id: string;
  label: string;
}

export interface ScoredItem {
  id: string;
  label: string;
  points: number;        // fixed value awarded when checked (no partial credit)
  subItems?: string[];   // display-only bullet list (e.g. equipment lists)
}

export interface EvaluationSection {
  id: string;                    // e.g. "I", "IV-A"
  title: string;
  compulsory?: CompulsoryItem[]; // ALL must be checked or section auto-fails
  scored?: ScoredItem[];
  passRule?: SectionPassRule;    // omit for compulsory-only sections
  totalPoints?: number;          // sum of scored points (100 wherever the source table totals 100)
}

export interface SectionResult {
  sectionId: string;
  compulsoryChecked: string[];   // ids
  scoredChecked: string[];       // ids — checked = full points awarded
  earnedPoints: number;
  passed: boolean;
}

export interface EvaluationResult {
  applicationId: string;
  clinicName: string;
  dateVisited: string;           // ISO
  evaluatorId: string;
  sections: SectionResult[];
  verdict: 'passed' | 'failed';
  adminOverride?: { verdict: 'passed' | 'failed'; remarks: string; by: string; at: string };
  createdAt: string;
}
