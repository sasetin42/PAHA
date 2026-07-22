# PAHA Web App — AGENTS.md

## Summary (as of last session)

### Completed
- **All form field accessibility violations fixed** — Every `<input>`, `<select>`, `<textarea>` across all 60+ `.tsx` files now has an `id` attribute, and every preceding `<label>` has `htmlFor` matching that `id`.
- **EventRegistrationModal.tsx** — Added `id`/`htmlFor` on step 2 (designation, fullName, email, phone, prcLicense, clinicName, specialization, clinicAddress, dietary, promoCode) and step 3 (paymentMethod radios).
- **PartnersManager.tsx** — Added `id`/`htmlFor` on logo file, partner name, website URL, display order.
- **FormerOfficersManager.tsx** — Added `id`/`htmlFor` on term year, officer name/role/image rows, file uploads.
- **CommitteesManager.tsx** — Added `id`/`htmlFor` on name, clinic, role, displayOrder, imageUrl, imageFile.
- **MembersManager.tsx** — Added `id` on search, name, headVet, email, phone, address, facility type, lat/lng, image upload, image URL.
- **WebsiteContentEditor.tsx** — Added `id`/`htmlFor` on content fields, style color inputs, video upload/URL, primary color.
- **AdminDashboard.tsx** — Added `id`/`htmlFor` on registration edit modal, event modal, announcement form, access control create/edit.
- **AccreditationPipeline.tsx** — Fixed `paymentData.triggeredAt` undefined error with `?? new Date().toISOString()` fallback. Added `id`/`htmlFor` on LOI form fields, visit date inputs, payment proof upload.
- **SettingsPanel.tsx** — Added `id`/`htmlFor` on app info fields, social links, logo URLs, favicon URL, quality slider.
- **AccreditationManager.tsx** — Added `id`/`htmlFor` on visit scheduling form (date, time, inspector, notes), status filter select, category remarks textarea, reject reason textarea.
- **PayCoolsTransactions.tsx** — Added `id`/`htmlFor` on search, status/Channel selects, from/to date inputs.
- **Membership.tsx** — Added sr-only label + `id` on clinic search input.
- **Events.tsx** — Added sr-only label + `id` on workshop selector.
- **MemberLogin.tsx, AdminLogin.tsx, JoinModal.tsx** — Added `id`/`htmlFor` on email, password, remember-me.
- **Contact.tsx** — Added `id` on firstName, lastName, email, message.
- **MembersDirectory.tsx, Events.tsx** — Added `id` on search inputs.
- **VisitingEvaluationModal.tsx** — Added dynamic `id` on radio inputs.
- **MembershipFormModal.tsx, MemberDashboard.tsx** — Added `id`/`htmlFor` on all form fields.
- **firestore.rules** — Added `match /systemSettings/{docId}` rule (public read, auth write) to fix "Missing or insufficient permissions" error in `useAppearance` hook.
- **AdminDashboard.tsx** — Increased header height from `h-28` to `h-36`.
- **Manual Payment Approval Table Integration** — Integrated inline **Approve Payment** action buttons and manual payment status badges directly into the Accreditation Table in `AdminDashboard.tsx`.
- **Quick Manual Payment Approval Modal** — Added Quick Manual Payment Approval modal popup with deposit slip receipt preview, Statement of Account breakdown, and instant accreditation issuing (`PAHA-ACC-YYYY-XXXXX`).
- **Inspect Application Modal Payment Approval Card** — Added Manual Payment Approval Card into Stage 6 / Final Review section of `InspectApplicationModal.tsx`.
- **Solid Back Buttons** — Standardized high-contrast solid primary blue (`bg-[#2563EB] text-white hover:bg-blue-700 shadow-md shadow-blue-500/20 active:scale-95`) back buttons across `InspectApplicationModal.tsx`, `AdminDashboard.tsx`, and `AccreditationManager.tsx`.

### Additional Fixes (2026-07-22)
- **Final audit: zero form field / label issues remaining** — Every `<input>`, `<select>`, `<textarea>` across 40+ `.tsx` files now has `id` + `name` (or `type="hidden"` exemption). Every `<label>` either has `htmlFor` matching an input `id`, wraps its input, or has been converted to `<p>`/`<span>` if it was a section heading.
- **AdminDashboard.tsx** — Added `id`/`name` + `htmlFor` on 24 form fields (search inputs, filter selects, date inputs, rejection textarea, profile fields, password fields, delete confirm, file upload).
- **MemberDashboard.tsx** — Added `id`/`name` + `htmlFor` on rep image upload, 6 profile edit fields.
- **Contact.tsx** — Added `id`/`name` on 4 fields (radio buttons, file input, captcha checkbox, privacy checkbox). Added `htmlFor` on attachment label.
- **CommitteesManager.tsx, FormerOfficersManager.tsx, PartnersManager.tsx** — Converted section-heading `<label>` to `<p>`.
- **MembersManager.tsx** — Converted 6 section-heading `<label>` to `<p>`, added `htmlFor` on password confirm label.
- **AccreditationManager.tsx** — Converted 10 section-heading `<label>` to `<p>` (rep fields, visit dates, inspector, status, notes).
- **AccreditationPipeline.tsx** — Converted 8 section-heading `<label>` to `<p>` (LOI upload, visit dates, inspector, status, notes).
- **AssociateMemberApplication.tsx** — Converted section-heading `<label>` to `<p>`, added `htmlFor` on document upload labels.
- **EventRegistrationModal.tsx** — Converted section-heading `<label>` to `<p>`.
- **PayCoolsSettings.tsx** — Converted inline `<label>` to `<span>`.
- **Full TypeScript check and build pass with zero errors.**

### Additional Fixes (2026-07-21)
- **Contact.tsx** — Added `id` on radio buttons (Email/Phone/Messenger), attachment file input, captcha checkbox, privacy agreement checkbox.
- **AdminDashboard.tsx** — Added `id` on 28 remaining form fields (search inputs, filter selects, date inputs, reject/fail/decline textareas, profile fields, password fields).
- **AssociateMemberApplication.tsx** — Added `id` on 10 form fields (clinic select, rep fields, document uploads, confirmation checkbox).
- **MemberDashboard.tsx** — Added `id` on document upload file inputs, rep image upload.
- **Committees.tsx** — Added `id` on committee search filter.
- **SettingsPanel.tsx** — Added `id` on 8 file upload inputs and text input.
- **MemberChatbot.tsx, PublicChatbot.tsx** — Added `id` on chat input.
- **All onSnapshot listeners** — Added error handler callbacks across 16 files to prevent "Uncaught Error in snapshot listener: permission-denied".
- **AdminDashboard.tsx** — Fixed memory leak where `onSnapshot` unsubscribe was lost inside `.then()`.
- **AuthContext.tsx** — Suppressed noisy permission-denied console.errors.
- **AdminLogin.tsx, MemberLogin.tsx** — Handle permission-denied gracefully (silent retry/navigate).
- **App.tsx** — Added `unstable_useTransitions={true}` to BrowserRouter.
- **Vite dep cache cleared** — Resolved "Outdated Optimize Dep" 504 errors.
- **Full TypeScript check and build pass with zero errors.**

### id prefix convention used per component
- `login-` MemberLogin / AdminLogin
- `join-` JoinModal
- `contact-` Contact
- `events-` Events
- `directory-` MembersDirectory
- `reg-` EventRegistrationModal
- `m-` MemberDashboard / Membership
- `rep-` MemberDashboard (clinic rep)
- `sp-` SettingsPanel
- `fo-` FormerOfficersManager
- `cm-` CommitteesManager (CommitteesManager + Committees.tsx)
- `mm-` MembersManager
- `ev-` AdminDashboard events modal
- `ann-` AdminDashboard announcement form
- `ac-create-` / `ac-edit-` AdminDashboard access control
- `ac-` AccreditationManager
- `pipeline-` AccreditationPipeline
- `pay-` PayCoolsTransactions
- `ad-` AdminDashboard (admin dashboard generic)
- `assoc-` AssociateMemberApplication
- `mbot-` MemberChatbot
- `pbot-` PublicChatbot
