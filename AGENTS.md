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
- `cm-` CommitteesManager
- `mm-` MembersManager
- `ev-` AdminDashboard events modal
- `ann-` AdminDashboard announcement form
- `ac-create-` / `ac-edit-` AdminDashboard access control
- `ac-` AccreditationManager
- `pipeline-` AccreditationPipeline
- `pay-` PayCoolsTransactions
