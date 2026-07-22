# Plan: Uploaded Files Layout Redesign

This plan covers enhancing and improving the design, details, and function of the uploaded files sections across the compliance and membership workflows. The primary change is converting the file list into a modern, 3-column, high-fidelity card-based grid layout.

## Goal
Redesign the uploaded files layouts across the admin and inspector interfaces into a premium, responsive 3-column card grid with format-specific icons, glassmorphism aesthetics, hover effects, proper preview/download action flows, and customized empty states.

---

## Project Type
- **WEB** (React, Tailwind CSS, TypeScript, Vite)

---

## Success Criteria
- [ ] Responsive 3-column grid (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`) implemented across all three target files.
- [ ] Every file entry represented as a high-fidelity card with glassmorphism design, border gradients, and micro-hover scale animations.
- [ ] Format-specific Google Material Symbols (`picture_as_pdf`, `image`, `folder_zip`, `description`, etc.) display correctly depending on file extension.
- [ ] Direct Action Buttons: **Preview** (opens internal file viewer/modal) and **Open in New Tab / Download** (direct URL navigation/download flow) function correctly.
- [ ] Elegant custom empty state illustrations and icons when no files are uploaded.
- [ ] Zero TypeScript errors and successful production build (`npm run build`).

---

## Tech Stack & Styling Tokens
- **Grid Layout:** `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **Card Aesthetics:** Glassmorphism styling (`bg-white/70 dark:bg-slate-900/40 backdrop-blur-md border border-slate-200/50 dark:border-white/10 hover:border-blue-500/30 dark:hover:border-blue-400/30 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 shadow-sm`)
- **Typography:** Sleek categorization titles (`text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500`) and truncation for file names (`truncate text-xs font-semibold text-slate-800 dark:text-slate-200`).
- **Icons:** Dynamic rendering matching file type extensions (.pdf, .jpg, .png, .zip, etc.).

---

## File Structure & Touchpoints
The following files display compliance/membership uploaded files and will be updated:
1. `src/components/InspectApplicationModal.tsx` (Lines ~1018-1054 for compliance files, and ~1289-1309 for self-assessment categories)
2. `src/pages/AdminDashboard.tsx` (Lines ~2799-2842)
3. `src/pages/AccreditationManager.tsx` (Lines ~764-782)

---

## Task Breakdown

### Task 1: Refactor Uploaded Files in `InspectApplicationModal.tsx`
- **Agent:** `@frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **Priority:** High
- **Dependencies:** None
- **Description:** 
  Update the uploaded compliance files (lines ~1018-1054) and self-assessment category files (lines ~1289-1309) in [InspectApplicationModal.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/components/InspectApplicationModal.tsx) to render in a 3-column grid layout instead of vertical lists. Implement premium glassmorphic cards, file-type icons, open-in-new-tab download triggers, and internal viewer toggles.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** Existing vertical button list for `memberDocs` and `catDocs`.
  - **OUTPUT:** Responsive 3-column card-based grid layout with file-type matching helper and visual action buttons (eye icon for preview, download/open_in_new icon for download).
  - **VERIFY:** Launch dev server and inspect the layout within the Inspect Application Modal. Confirm it uses a 3-column layout on large screens.

### Task 2: Refactor Uploaded Files in `AdminDashboard.tsx`
- **Agent:** `@frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **Priority:** High
- **Dependencies:** Task 1
- **Description:** 
  Update the document review card section (lines ~2799-2842) in [AdminDashboard.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/pages/AdminDashboard.tsx) using the same high-fidelity 3-column design, maintaining consistency with Action buttons and layout styling.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** Current standard vertical list buttons for applicant documents.
  - **OUTPUT:** Redesigned 3-column grid of glassmorphic document cards.
  - **VERIFY:** Review file details block in Admin Dashboard and confirm that the grid operates properly under dark/light modes.

### Task 3: Refactor Uploaded Files in `AccreditationManager.tsx`
- **Agent:** `@frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **Priority:** High
- **Dependencies:** Task 2
- **Description:** 
  Update the category details files list in the accreditation check view (lines ~764-782) in [AccreditationManager.tsx](file:///c:/Users/User/OneDrive/Desktop/SASE%20PROJECT/PAHA/New%20folder/PAHA%20WEB%20APP/src/pages/AccreditationManager.tsx) to follow the new 3-column card grid look and feel.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** Anchor tags linking to files.
  - **OUTPUT:** Styled 3-column grid cards containing preview/new tab actions.
  - **VERIFY:** Open Accreditation Manager page, select an application, and verify the file cards render correctly inside each category inspection card.

### Task 4: Add Premium Empty States
- **Agent:** `@frontend-specialist`
- **Skills:** `clean-code`, `frontend-design`
- **Priority:** Medium
- **Dependencies:** Tasks 1, 2, 3
- **Description:** 
  Implement highly polished empty states with a centered, styled layout, soft illustrative background circles, and clear description copy (e.g., "No business documents uploaded yet") when `memberDocs.length === 0 && catDocs.length === 0`.
- **INPUT → OUTPUT → VERIFY:**
  - **INPUT:** Missing or basic empty text statements.
  - **OUTPUT:** Modern UI empty cards with custom symbols, soft grays, and descriptive helper text.
  - **VERIFY:** Inspect components when documents are empty and ensure the designed state is displayed.

---

## Phase X: Verification Checklist

- [ ] **Type Check & Lint:**
  Run and ensure there are no compilation errors:
  ```bash
  npm run lint && npx tsc --noEmit
  ```
- [ ] **Build Check:**
  Run the production bundler to verify the build output:
  ```bash
  npm run build
  ```
- [ ] **Visual Audit:**
  Verify WCAG AA accessibility, color contrast, and spacing guidelines using the UX audit scripts:
  ```bash
  python .agents/skills/frontend-design/scripts/ux_audit.py .
  ```
- [ ] **Mobile & Responsiveness Audit:**
  Confirm that columns scale down gracefully to a single column (`grid-cols-1`) on mobile and two columns (`md:grid-cols-2`) on tablet sizes.
