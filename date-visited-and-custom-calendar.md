# Implementation Plan: Date Visited and Custom Calendar Picker

This document outlines the step-by-step plan for introducing a modern, accessible, and unified custom `CalendarPicker` component across the application to replace all native HTML `type="date"` input elements. It also outlines making the **Date Visited** field required in the visiting evaluation modal.

---

## 🎯 Objectives

1. **Required Date Visited**: Ensure the "Date Visited" field in `VisitingEvaluationModal` is marked visually with a red asterisk (`*`) and is dynamically required.
2. **Unified Custom Calendar**: Create a reusable `CalendarPicker` component based on the premium dropdown-style calendar used in `PaymentPage.tsx` (using Month and Year selectors with custom dropdowns).
3. **Seamless Replacement**: Replace all 21 native `<input type="date">` instances in the codebase with the new `CalendarPicker` component while maintaining existing accessibility requirements (explicit `id`/`htmlFor` pairings).

---

## 📦 Component Design: `CalendarPicker.tsx`

We will build a generic, highly customizable React component: `src/components/CalendarPicker.tsx`.

### Props Interface
```typescript
interface CalendarPickerProps {
    id: string; // Required for accessibility and label matching
    label?: string; // Optional field label
    value: string; // Date in YYYY-MM-DD format (or empty string)
    onChange: (date: string) => void; // Change handler
    required?: boolean; // Shows red asterisk and flags browser validation
    disabled?: boolean; // Disabled state
    placeholder?: string; // Default: 'mm/dd/yyyy'
    minYear?: number; // Default: 1930
    maxYear?: number; // Default: Current year + 5
}
```

### Key Behaviors & Premium UI Features
- **Dropdown Month/Year Pickers**: Month and Year selection lists inside the calendar card header, matching the look and feel of the `PaymentPage.tsx` calendar.
- **Click Outside Dismissal**: Closes the calendar and month/year selector dropdowns when the user clicks outside.
- **Accessibility**: Employs correct `id` and `aria-*` tags, keeping the input accessible to screen readers.
- **Modern Styling**: Dark mode support (`dark:bg-slate-800`, `dark:text-white`), smooth micro-animations (`origin-top transition-all duration-300`), and a premium color palette (primary colors for selections, soft Slate gray for hover states).

---

## 🗄️ Affected Files

Here is the list of files where native date inputs will be replaced by `<CalendarPicker />`:

| # | File Path | Field Label / Purpose |
|---|---|---|
| 1 | [VisitingEvaluationModal.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/components/VisitingEvaluationModal.tsx) | "Date Visited" (Make Required) |
| 2 | [InspectApplicationModal.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/components/InspectApplicationModal.tsx) | "Visit Date", "Visit Time" or scheduling dates |
| 3 | [MembersManager.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/components/MembersManager.tsx) | Date filters or registration dates |
| 4 | [PayCoolsTransactions.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/components/admin/PayCoolsTransactions.tsx) | From and To Date transaction filters |
| 5 | [AccreditationManager.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/pages/AccreditationManager.tsx) | Scheduled visit date |
| 6 | [AccreditationPipeline.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/pages/AccreditationPipeline.tsx) | LOI submit dates or scheduling fields |
| 7 | [AdminDashboard.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/pages/AdminDashboard.tsx) | Custom date picker inputs across announcement scheduling, event dates, and access controls |
| 8 | [PaymentPage.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/pages/PaymentPage.tsx) | "Date of Birth" (Refactor to use new shared component) |

---

## 🛠️ Step-by-Step Implementation Flow

### Phase 1: Create `CalendarPicker.tsx`
1. Write the component code in `src/components/CalendarPicker.tsx`.
2. Extract calendar logic: months array, years array dynamically generated.
3. Add key event handlers for chevron month browsing and month/year dropdown quick navigation.
4. Implement clicked-outside React ref hook handlers.

### Phase 2: Make "Date Visited" Required
1. Modify [VisitingEvaluationModal.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/components/VisitingEvaluationModal.tsx):
   - Add visual red asterisk: `Date Visited <span className="text-red-500">*</span>`.
   - The validation `const canSave = !!dateVisited && ...` is already in place. We will ensure the submit/save function displays a warning alert if `dateVisited` is empty (preventing submit).

### Phase 3: Replace Date Inputs Across All Target Files
1. Import `CalendarPicker` in all listed files.
2. Replace native inputs:
   - `<input type="date" value={val} onChange={e => setVal(e.target.value)} id="xyz" />`
   - with:
   - `<CalendarPicker id="xyz" value={val} onChange={setVal} required={...} />`

---

## 🔍 Verification & Testing Plan

### 1. Functionality Tests
- **Dropdown Calendar**: Verify clicking the picker opens the calendar overlay.
- **Year/Month Pickers**: Select "December" and "2020" and verify the grid updates correctly.
- **Selection**: Click a day in the calendar grid and verify that the date updates the state in the `YYYY-MM-DD` format.
- **Click Outside**: Click anywhere outside the calendar overlay and verify it closes.

### 2. Validation & Field Enforcement
- In the Site Visit evaluation form, try submitting the form without filling in the **Date Visited**. Verify it blocks submission and highlights the field.

### 3. Accessibility & Markup Audit
- Verify every calendar has a unique `id` and matches the `htmlFor` of its label tag.
