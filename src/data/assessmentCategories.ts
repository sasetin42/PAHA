// ─────────────────────────────────────────────────────────────────────────────
// LEGACY ADAPTER — the old standard's constants were deleted. Everything here
// derives from the 2026 PAHA Accreditation Standard in
// `accreditationStandard2026.ts` (the single source of truth), so every
// consumer of ASSESSMENT_CATEGORIES automatically renders the 2026 content.
// ─────────────────────────────────────────────────────────────────────────────
import type { Category } from '../types/accreditation';
import { STANDARD_2026_AS_CATEGORIES } from './accreditationStandard2026';

export const ASSESSMENT_CATEGORIES: Category[] = STANDARD_2026_AS_CATEGORIES;

export const FLAT_CATEGORIES = ASSESSMENT_CATEGORIES.reduce((acc, cat) => {
  if (cat.subCategories) {
    cat.subCategories.forEach(sub => {
      acc.push({
        ...cat,
        id: sub.id,
        title: sub.title,
        passingScore: sub.passingScore,
        items: sub.items,
        subCategories: undefined,
        parentId: cat.id,
      });
    });
  } else {
    acc.push(cat);
  }
  return acc;
}, [] as (Category & { parentId?: string })[]);

// Categories whose compliance evidence requires photo/visual verification
// (Stage 4). Mirrors the physical-facility sections of the 2026 standard.
export const VISUAL_VERIFICATION_CATEGORIES = [
  'CAT1',
  'CAT2',
  'CAT4',
  'CAT4A',
  'CAT4B',
  'CAT4C',
  'CAT4D',
  'CAT4D2',
  'CAT4E',
  'CAT4F',
  'CAT4G',
];

export function getAllItemIds(category: Category): string[] {
  const items: string[] = [];
  category.items?.forEach(item => items.push(item.id));
  category.subCategories?.forEach(sub => {
    sub.items.forEach(item => items.push(item.id));
  });
  return items;
}

export function getCategoryStats(
  category: Category,
  checkedItems: Record<string, boolean>
): { score: number; passed: boolean; allCompulsoryMet: boolean; earnedPoints: number; maxPoints: number } {
  let earnedPoints = 0;
  let maxPoints = 0;
  let allCompulsoryMet = true;

  category.items?.forEach(item => {
    if (item.points > 0) maxPoints += item.points;
    if (checkedItems[item.id]) earnedPoints += item.points;
    if (item.isCompulsory && !checkedItems[item.id]) allCompulsoryMet = false;
  });

  category.subCategories?.forEach(sub => {
    sub.items.forEach(item => {
      if (item.points > 0) maxPoints += item.points;
      if (checkedItems[item.id]) earnedPoints += item.points;
      if (item.isCompulsory && !checkedItems[item.id]) allCompulsoryMet = false;
    });
  });

  const normalizedScore = maxPoints > 0 ? (earnedPoints / maxPoints) * 100 : (allCompulsoryMet ? 100 : 0);
  const passed = allCompulsoryMet && normalizedScore >= category.passingScore - 1e-9;

  return { score: Math.round(normalizedScore), passed, allCompulsoryMet, earnedPoints: Math.round(earnedPoints * 100) / 100, maxPoints: Math.round(maxPoints * 100) / 100 };
}
