# Clinic Accreditation Workflow System - Specification

## 1. Concept & Vision

A **process-driven accreditation platform** that digitizes the full accreditation journey for member clinics. Unlike simple form submissions, this system implements a **controlled, multi-step workflow with admin oversight at every stage**. Clinics move through strict stages with admin approval gates, category-level evaluation, compliance iteration loops, and payment control—reflecting real-world accreditation flow where nothing can be skipped or bypassed.

The system embodies **professional rigor** with a clean, clinical aesthetic that communicates trust, compliance, and institutional quality. Every interaction reinforces that this is serious accreditation business, not a casual form.

---

## 2. Design Language

### Aesthetic Direction
Clean institutional design inspired by medical board portals and government compliance systems. Professional, trustworthy, with clear visual hierarchy for complex multi-step workflows.

### Color Palette
- **Primary**: `#1E3A8A` (Deep Navy) - Authority and trust
- **Secondary**: `#2563EB` (Royal Blue) - Action and progress
- **Accent**: `#059669` (Emerald) - Success and approval
- **Warning**: `#D97706` (Amber) - Attention required
- **Danger**: `#DC2626` (Red) - Non-compliance
- **Background**: `#F8FAFC` (Slate 50) - Clean backdrop
- **Surface**: `#FFFFFF` - Cards and panels
- **Text Primary**: `#0F172A` (Slate 900)
- **Text Secondary**: `#64748B` (Slate 500)
- **Border**: `#E2E8F0` (Slate 200)

### Typography
- **Headings**: Inter (700, 600) - Clean, professional
- **Body**: Inter (400, 500) - Excellent readability
- **Monospace**: JetBrains Mono - Reference numbers, codes
- **Scale**: 12px / 14px / 16px / 18px / 24px / 32px / 48px

### Spatial System
- Base unit: 4px
- Component padding: 16px / 24px
- Card padding: 24px / 32px
- Section gaps: 24px / 32px / 48px
- Border radius: 8px (buttons) / 12px (cards) / 16px (modals)

### Motion Philosophy
- Subtle transitions (200-300ms ease-out) for state changes
- Progress indicators animate to show workflow progression
- Loading states use skeleton loaders, not spinners
- No decorative animations—this is serious business

### Visual Assets
- Material Symbols Rounded (outlined style)
- Status icons: check_circle, warning, schedule, visibility, payment
- No decorative imagery—content-focused

---

## 3. Workflow Stages (Strict Sequence)

### Stage 1: Intent Submission
- **Status**: "Intent Submitted"
- **Clinic Action**: Submit Letter of Intent with clinic details and preferred visit dates
- **Admin Action**: None (waiting for LOI)
- **Progression**: Automatic after LOI submitted

### Stage 2: Self-Assessment
- **Status**: "Self-Assessment Completed"
- **Clinic Action**: Complete structured checklist across 10+ categories with scoring
- **Each Category Has**:
  - Checkbox items with points
  - Compulsory items (must be checked to pass)
  - Pass/fail threshold (typically 80-100%)
  - Sub-category breakdown for complex areas
- **Progression**: Clinic submits assessment → Status updates

### Stage 3: Site Visit / Inspection
- **Status**: "For Site Visit" → "Inspection Completed"
- **Admin Action**: Schedule site visit with inspector name, date, time, notes
- **Clinic Action**: Confirm availability
- **Validation Type**: Visual/manual verification (not just documents)
- **Progression**: Admin marks inspection complete

### Stage 4: Compliance Submission
- **Status**: "For Compliance Submission"
- **Clinic Action**: Upload required documents per category
- **Each Category Tracks**:
  - Admin status (pending/complied/non_complied/visual_required)
  - Admin remarks/instructions
  - Uploaded files with URLs
- **Progression**: Clinic submits documents → Moves to review

### Stage 5: Admin Review
- **Status**: "Under Review" or "Needs Compliance"
- **Admin Action**: Review each category individually
- **Admin Can**:
  - Approve category (complied)
  - Mark as Needs Compliance (non_complied)
  - Mark as Visual Required (requires physical inspection)
  - Add remarks/instructions for each category
- **Progression**: Admin sends back for compliance or approves all

### Stage 6: Compliance Loop
- **Status**: "Needs Compliance" (loops back to Stage 4)
- **Mechanism**: If ANY category is marked non_complied, clinic must:
  1. View specific remarks per category
  2. Fix/reupload documents
  3. Resubmit
  4. Admin reviews again
- **Loop Continues**: Until all categories approved

### Stage 7: Final Approval
- **Status**: "Approved"
- **Condition**: ALL categories must be "complied"
- **Admin Action**: Confirms all categories approved
- **Progression**: Manual trigger to Stage 8

### Stage 8: SOA & Payment Trigger
- **Status**: "For Payment"
- **Admin Action**: Manually triggers Statement of Account
- **Payment Gate**: Payment is ONLY available after admin triggers it
- **Clinic Action**: Views SOA, uploads proof of payment

### Stage 9: Payment
- **Status**: "Paid"
- **Clinic Action**: Submit proof of payment
- **Admin Action**: Confirm or reject payment
- **Progression**: Admin confirms → Stage 10

### Stage 10: Accreditation Granted
- **Status**: "Accredited"
- **Auto-generated**: Accreditation number, valid until date
- **Final State**: Accreditation complete

---

## 4. Data Models

### AccreditationApplication
```typescript
interface AccreditationApplication {
  id: string;
  clinicId: string;
  clinicName: string;
  membershipId: string;

  // Workflow control
  stage: AccreditationStage;
  status: WorkflowStatus;

  // Timestamps
  submittedAt: string;
  updatedAt: string;
  completedAt?: string;

  // Stage data
  loiData: LOIData | null;
  selfAssessmentData: SelfAssessmentData | null;
  visitData: VisitData | null;
  complianceData: ComplianceData | null;
  assessmentResultData: AssessmentResultData | null;
  paymentData: PaymentData | null;
}

type AccreditationStage =
  | 1  // Intent Submission
  | 2  // Self-Assessment
  | 3  // Site Visit Scheduled
  | 4  // Site Visit Completed / For Compliance
  | 5  // Under Admin Review
  | 6  // Approved / For Payment
  | 7  // Paid
  | 8; // Accredited

type WorkflowStatus =
  | 'intent_submitted'
  | 'self_assessment_completed'
  | 'for_site_visit'
  | 'inspection_completed'
  | 'for_compliance_submission'
  | 'under_review'
  | 'needs_compliance'
  | 'approved'
  | 'for_payment'
  | 'paid'
  | 'accredited';
```

### LOIData
```typescript
interface LOIData {
  representativeName: string;
  representativeTitle: string;
  prcLicenseNo: string;
  clinicName: string;
  clinicAddress: string;
  email: string;
  phone: string;
  preferredVisitDates: string[];
  declarationChecked: boolean;
  loiRef: string; // Auto-generated reference
}
```

### SelfAssessmentData
```typescript
interface SelfAssessmentData {
  checkedItems: Record<string, boolean>; // itemId -> checked
  categoryScores: Record<string, number>; // categoryId -> score %
  submittedAt: string;
}
```

### VisitData
```typescript
interface VisitData {
  scheduledDate: string;
  scheduledTime: string;
  inspectorName: string;
  notes: string;
  confirmedAt?: string;
  completedAt?: string;
  completedBy?: string;
}
```

### ComplianceData
```typescript
interface ComplianceData {
  categories: Record<string, CategoryCompliance>;
  submittedAt?: string;
}

interface CategoryCompliance {
  status: 'pending' | 'complied' | 'non_complied' | 'visual_required';
  uploadedFiles: UploadedFile[];
  adminRemarks: string;
  reviewedAt?: string;
  reviewedBy?: string;
}
```

### PaymentData
```typescript
interface PaymentData {
  triggeredAt?: string;
  amount: number;
  statementOfAccount: string;
  proofOfPaymentUrl?: string;
  submittedAt?: string;
  confirmedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  accreditationNo?: string;
  validUntil?: string;
}
```

---

## 5. Category Evaluation System

### Assessment Categories (10 total)
1. **I. Signages / Permits / Licenses** (100% required)
2. **II. General Sanitary Conditions** (80% required)
3. **III. Personnel** (100% required)
4. **IV. Physical Clinic Facilities** (100% required)
   - IV-A. Reception Room
   - IV-B. Pharmacy Room
   - IV-C. Examination Room
   - IV-D. Surgery Room
   - IV-E. Dead Patient Disposal
   - IV-F. Confinement Area
   - IV-G. Instruments & Supplies
   - IV-H. Surgical Paraphernalia
   - IV-I. Medicines
5. **V. Medical Records** (80% required)
6. **VI. Diagnostics: Imaging** (80% required)
   - VI-B. Digital Radiography
   - VI-C. Ultrasound
7. **VII. Diagnostics: Laboratory** (80% required)
   - VII-A. Services
   - VII-B. Equipment & Supplies
8. **VIII. Diagnostics: Pharmacy** (80% required)
   - VIII-A. Pharmacy
   - VIII-B. Controlled Substances

### Scoring Rules
- Each item has points value
- Compulsory items MUST be checked to pass
- Category score = (earned points / max points) * 100
- Category passes if: all compulsory met AND score >= passing threshold

---

## 6. Validation Types

### Document-Based Validation
- Clinic uploads photos/scans of permits, certificates, records
- Files stored in Firebase Storage
- Admin reviews uploaded files
- Can be done remotely

### Visual/Manual Validation
- Marked as "visual_required" status
- Requires physical inspection during site visit
- Admin inspector verifies during on-site visit
- Not substitutable by document uploads

---

## 7. Admin Controls

### Application Management
- View all applications with status filter
- Select application to view full details
- Progress through workflow stages

### Stage-Specific Actions
- **Stage 1**: View LOI, schedule site visit
- **Stage 3**: Confirm site visit completion, start inspection
- **Stage 4**: Review uploaded documents
- **Stage 5**: Approve/reject each category, add remarks
- **Stage 6**: Trigger payment (SOA generation)
- **Stage 7**: Confirm/reject payment

### Category Review Interface
- Show category checklist with admin status per item
- Set status: complied / non_complied / visual_required
- Add remarks per category
- Batch submit all reviews

---

## 8. Clinic Interface

### Dashboard View
- Current stage and status prominently displayed
- Stage tracker showing progress
- Required actions with clear call-to-action
- History of compliance iterations

### Stage-Specific Actions
- **Stage 1**: Fill LOI form, submit
- **Stage 2**: Complete self-assessment checklist
- **Stage 4**: Upload compliance documents per category
- **Stage 5**: View review results (wait or fix)
- **Stage 6**: View SOA, upload payment proof
- **Stage 7**: View payment confirmation (wait)

### Compliance Iteration View
- See which categories need work
- Read admin remarks per category
- Re-upload corrected documents
- Track resubmission history

---

## 9. Representative Management

### User Role
- Each clinic has a representative account
- Representative can be activated/deactivated

### Statuses
- **Active**: Can access and submit accreditation
- **Inactive**: Cannot access (e.g., if resigned)

### Data Model
```typescript
interface ClinicRepresentative {
  id: string;
  clinicId: string;
  name: string;
  email: string;
  status: 'active' | 'inactive';
  deactivatedAt?: string;
  deactivatedBy?: string;
}
```

---

## 10. Payment Gate

### Strict Rules
- Payment section ONLY visible after admin triggers
- Admin must explicitly generate SOA
- Clinic cannot proceed to payment without approval
- Payment confirmation by admin required for accreditation

### SOA Generation
- Admin triggers payment for specific application
- System generates Statement of Account automatically
- Fees: Accreditation Fee ₱15,000 + Processing Fee ₱2,500 = ₱17,500

---

## 11. Component Inventory

### StageTracker
- Shows all 10 stages with current highlighted
- Completed stages show checkmark
- Future stages show lock icon
- Admin view shows additional controls

### StatusBadge
- Pill-shaped badge with status color
- States: Intent Submitted, Self-Assessment Completed, For Site Visit, Inspection Completed, For Compliance Submission, Under Review, Needs Compliance, Approved, For Payment, Paid, Accredited

### CategoryCard
- Expandable card per assessment category
- Shows: title, score, status, remarks
- Admin version: editable status and remarks
- Clinic version: read-only status with action buttons

### ComplianceUploadCard
- Category header with status
- File upload dropzone
- List of uploaded files with preview
- Admin remarks section

### InspectionPanel
- Schedule form (date, time, inspector)
- Confirmation toggle
- Completion button
- Notes field

### PaymentPanel
- SOA display
- Payment proof upload
- Submit button
- Confirmation status

### ApplicationList (Admin)
- Filterable by status
- Sortable by date
- Click to select

---

## 12. Technical Approach

### Frontend
- React 18 with TypeScript
- React Router for navigation
- Tailwind CSS for styling
- React Icons / Material Symbols
- Firebase Auth for authentication
- Firebase Firestore for data
- Firebase Storage for files

### State Management
- React useState/useEffect for local state
- Firestore real-time listeners for data sync
- localStorage for form persistence

### API Design (Firestore)
- Collection: `accreditation_applications`
- Document per application
- Real-time updates via onSnapshot

### Security
- Auth-required routes
- Admin-only actions checked server-side via Firestore rules
- File uploads validate user authentication

---

## 13. Page Structure

### /accreditation
Clinic-facing accreditation pipeline
- Stage tracker
- Current stage content
- Action buttons

### /accreditation/admin
Admin-facing accreditation management
- Application list
- Selected application detail
- Stage-specific admin actions

### /accreditation/representative
Representative management (admin only)
- List representatives
- Activate/deactivate controls