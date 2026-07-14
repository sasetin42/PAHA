// ─────────────────────────────────────────────────────────────────────────────
// 2026 PAHA Clinic Accreditation Standard — SINGLE SOURCE OF TRUTH.
//
// This constant drives BOTH the admin Visiting Evaluation Form and the member
// Self-Assessment (plus every read-only review view via the Category adapter
// in assessmentCategories.ts). A revision of the standard must be made here
// and nowhere else.
//
// Scoring rule: an item is either satisfied (full points) or not (0).
// A section passes when ALL compulsory items are checked AND, where a scored
// table exists, earnedPoints >= totalPoints * passRule / 100.
// ─────────────────────────────────────────────────────────────────────────────
import type { EvaluationSection } from '../types/evaluation';
import type { Category } from '../types/accreditation';

// IV-D2 has no per-item points in the source PDF.
// EQUAL-WEIGHT ASSUMPTION — confirm with PAHA: all 13 rows (4 kits + 9
// consumables) are weighted equally so the table totals 100 at threshold 80%.
const D2_EQUAL_WEIGHT = 100 / 13;

export const STANDARD_2026: EvaluationSection[] = [
  // ── Section I ──────────────────────────────────────────────────────────────
  {
    id: 'I',
    title: 'Signages / Accreditation & Registration Certificates / Permits / Licenses',
    compulsory: [
      { id: 'I.c1', label: 'Operating hours of at least 8 hours a day, 7 days a week' },
      { id: 'I.c2', label: 'Posted sign at the entrance showing operating days/hours and after-hours notice' },
      { id: 'I.c3', label: 'Displayed College Diploma and PRC registration of all attending veterinarians' },
      { id: 'I.c4', label: 'Displayed Business Permit and pertinent documents' },
      { id: 'I.c5', label: 'Displayed BIR registration and certificates' },
      { id: 'I.c6', label: 'Displayed BAI and LTO (Food and Drugs) & VDAP' },
    ],
    scored: [
      { id: 'I.s1', label: 'Signage in good condition and promotes a professional image', points: 25 },
      { id: 'I.s2', label: 'Exterior lighting adequate for safety', points: 25 },
      { id: 'I.s3', label: 'Facility grounds neat, clean and safe', points: 25 },
      { id: 'I.s4', label: 'Landscaping properly maintained', points: 25 },
    ],
    passRule: 100,
    totalPoints: 100,
  },

  // ── Section II ─────────────────────────────────────────────────────────────
  {
    id: 'II',
    title: 'General Sanitary Conditions',
    compulsory: [
      { id: 'II.c1', label: 'Staff follow infection control procedures (hygiene, sanitation, disinfection, hand washing/antimicrobials)' },
      { id: 'II.c2', label: 'Contaminated materials contained in impervious containers/bags' },
    ],
    scored: [
      { id: 'II.s1', label: 'Shelves/cabinets clean to touch', points: 5 },
      { id: 'II.s2', label: 'Trash cans emptied regularly', points: 15 },
      { id: 'II.s3', label: 'Floors mopped/disinfected regularly', points: 10 },
      { id: 'II.s4', label: 'Instruments clean and sanitary', points: 10 },
      { id: 'II.s5', label: 'Apparatus clean and sanitary', points: 5 },
      { id: 'II.s6', label: 'Staff uniform clean and sanitary', points: 5 },
      { id: 'II.s7', label: 'Cleaning schedule posted and implemented', points: 10 },
      { id: 'II.s8', label: 'Trash segregation — infectious yellow / recyclable green / non-recyclable black', points: 10 },
      { id: 'II.s9', label: 'Sharps removed and segregated from syringes', points: 10 },
      { id: 'II.s10', label: 'Free of persistent offensive odors', points: 5 },
      { id: 'II.s11', label: 'Furnishings maintained and conveniently arranged', points: 5 },
      { id: 'II.s12', label: 'Client area displays clean and orderly', points: 5 },
      { id: 'II.s13', label: 'HVAC provides climate-controlled filtered air to all areas', points: 5 },
    ],
    passRule: 80,
    totalPoints: 100,
  },

  // ── Section III ────────────────────────────────────────────────────────────
  {
    id: 'III',
    title: 'Personnel',
    scored: [
      { id: 'III.s1', label: '2 licensed veterinarians', points: 60 },
      { id: 'III.s2', label: '1 receptionist / secretary', points: 10 },
      { id: 'III.s3', label: '2 animal aides / handlers', points: 10 },
      { id: 'III.s4', label: 'S2 license of all attending veterinarians', points: 20 },
    ],
    passRule: 100,
    totalPoints: 100,
  },

  // ── Section IV — Physical Clinic Facilities ────────────────────────────────
  {
    id: 'IV-A',
    title: 'Reception Room',
    scored: [
      { id: 'IVA.s1', label: 'Spacious — accommodates a minimum of 3 clients with animals', points: 10 },
      { id: 'IVA.s2', label: 'Sufficient sturdy easy-to-clean chairs', points: 10 },
      { id: 'IVA.s3', label: 'Reception desk organization for records', points: 5 },
      { id: 'IVA.s4', label: 'One filing cabinet or equivalent', points: 5 },
      { id: 'IVA.s5', label: 'Computer', points: 10 },
      { id: 'IVA.s6', label: 'One telephone line listed as veterinarian', points: 5 },
      { id: 'IVA.s7', label: 'One mobile phone line', points: 5 },
      { id: 'IVA.s8', label: 'Well-lighted', points: 10 },
      { id: 'IVA.s9', label: 'Well-ventilated or air-conditioned', points: 10 },
      { id: 'IVA.s10', label: 'Light-color painted', points: 5 },
      { id: 'IVA.s11', label: 'Smooth concrete / easy-clean floors, not wood', points: 10 },
      { id: 'IVA.s12', label: 'Comfort room for clients', points: 5 },
      { id: 'IVA.s13', label: 'Covered waste bin', points: 5 },
      { id: 'IVA.s14', label: 'Emergency light or generator set', points: 5 },
      // Checklist-only rows — the source instrument assigns no points to these.
      { id: 'IVA.s15', label: 'Weighing scale', points: 0 },
      { id: 'IVA.s16', label: 'Organizational chart', points: 0 },
    ],
    passRule: 100,
    totalPoints: 100,
  },
  {
    id: 'IV-B',
    title: 'Pharmacy Room',
    compulsory: [
      { id: 'IVB.c1', label: 'Log books for restricted drugs' },
      { id: 'IVB.c2', label: 'Safety cabinet for restricted drugs' },
      { id: 'IVB.c3', label: 'Air-conditioned room for medicine storage' },
      { id: 'IVB.c4', label: 'Refrigerator for vaccines/medicines kept at 2°C–8°C' },
    ],
  },
  {
    id: 'IV-C',
    title: 'Examination Room',
    compulsory: [
      { id: 'IVC.c1', label: 'Emergency services or referral ready during operating hours' },
      { id: 'IVC.c2', label: 'Prescribed oxygen administration method' },
      { id: 'IVC.c3', label: 'Pain assessment on every checkup' },
      { id: 'IVC.c4', label: 'Pain management prescribed appropriately' },
      { id: 'IVC.c5', label: 'Genuine humane care' },
      { id: 'IVC.c6', label: 'No careless restraint' },
      { id: 'IVC.c7', label: 'Thorough examination incl. complete history + major organ systems' },
      { id: 'IVC.c8', label: 'Single-use disposable syringes/needles' },
      { id: 'IVC.c9', label: 'Thorough dental cavity examination by veterinarians' },
      { id: 'IVC.c10', label: 'Only licensed veterinarians perform dental procedures' },
    ],
    scored: [
      { id: 'IVC.s1', label: '2–3 examination rooms', points: 10 },
      { id: 'IVC.s2', label: 'Spacious for safe examination', points: 10 },
      { id: 'IVC.s3', label: 'Adequate lighting incl. emergency', points: 10 },
      { id: 'IVC.s4', label: 'Stainless examination table per room', points: 10 },
      {
        id: 'IVC.s5', label: 'Minimum equipment set', points: 50,
        subItems: [
          'Sterile needles/syringes',
          'Stethoscope',
          'Weighing scale (<5 kg)',
          'Restraint equipment',
          'Otoscope',
          'Penlight',
          'Disposable gloves',
          'Sink',
          'Sanitizers/disinfectants',
          'Visual aids / anatomical models',
          'Crash cart with 5-drawer configuration',
        ],
      },
      { id: 'IVC.s6', label: 'Cleaning materials, disposable towels, covered trash bin per room', points: 10 },
    ],
    passRule: 100,
    totalPoints: 100,
  },
  {
    id: 'IV-D',
    title: 'Surgery Room',
    compulsory: [
      // Anesthesia (8)
      { id: 'IVD.a1', label: 'Anesthesia: only vets / supervised trained assistants administer anesthesia' },
      { id: 'IVD.a2', label: 'Anesthesia: ventilation assist available at all times' },
      { id: 'IVD.a3', label: 'Anesthesia: pre-anesthesia assessment by a veterinarian' },
      { id: 'IVD.a4', label: 'Anesthesia: ET tubes stay until swallow/gag reflex' },
      { id: 'IVD.a5', label: 'Anesthesia: frequent monitoring until full recovery, with infusion pump' },
      { id: 'IVD.a6', label: 'Anesthesia: trained CPR staff always available' },
      { id: 'IVD.a7', label: 'Anesthesia: emergency meds/equipment labeled and in place' },
      { id: 'IVD.a8', label: 'Anesthesia: transparent anesthetic masks with observed induction' },
      // Surgery (18)
      { id: 'IVD.b1', label: 'Surgery: prep room with oxygen' },
      { id: 'IVD.b2', label: 'Surgery: only licensed veterinarians perform surgery' },
      { id: 'IVD.b3', label: 'Surgery: surgery room closed to non-sterile activities' },
      { id: 'IVD.b4', label: 'Surgery: autoclaved instruments/towels/drapes' },
      { id: 'IVD.b5', label: 'Surgery: pre-surgical assessment incl. patient ID + test documentation' },
      { id: 'IVD.b6', label: 'Surgery: sterile attire in sterile area' },
      { id: 'IVD.b7', label: 'Surgery: new sterile single-use gloves every surgery' },
      { id: 'IVD.b8', label: 'Surgery: separate sterilized packs per procedure' },
      { id: 'IVD.b9', label: 'Surgery: instruments cleaned/repacked/sterilized before each use' },
      { id: 'IVD.b10', label: 'Surgery: all supplies wrapped and sterilized' },
      { id: 'IVD.b11', label: 'Surgery: packs sterilized via autoclave / ethylene oxide / gas plasma' },
      { id: 'IVD.b12', label: 'Surgery: drapes/pads/sponges/towels wrapped and sterilized' },
      { id: 'IVD.b13', label: 'Surgery: surgical room equipment includes the required set' },
      { id: 'IVD.b14', label: 'Surgery: smooth nonporous surgical tables' },
      { id: 'IVD.b15', label: 'Surgery: oxygen supply' },
      { id: 'IVD.b16', label: 'Surgery: gas anesthetic machine w/ compatible vaporizer + ventilatory assist' },
      { id: 'IVD.b17', label: 'Surgery: scavenging system for waste gases' },
      { id: 'IVD.b18', label: 'Surgery: readily accessible emergency drugs' },
    ],
    scored: [
      { id: 'IVD.s1', label: 'Sterile environment separated, strict sterilization protocols', points: 10 },
      { id: 'IVD.s2', label: 'Essential surgical instruments — soft tissue, spay, dental, orthopedic kits', points: 10 },
      { id: 'IVD.s3', label: 'Essential specialized equipment — anesthesia machine, oxygen, ECG/pulse ox monitoring, cautery', points: 10 },
      { id: 'IVD.s4', label: 'Ergonomic layout', points: 10 },
      { id: 'IVD.s5', label: 'Surgical + emergency lighting', points: 10 },
      { id: 'IVD.s6', label: 'Biological & sharps waste disposal in-room', points: 10 },
      { id: 'IVD.s7', label: 'Emergency preparedness — meds, crash cart, resuscitation within reach', points: 10 },
      { id: 'IVD.s8', label: 'Sterile gowning area with scrubs/masks/caps/shoe covers', points: 10 },
      { id: 'IVD.s9', label: 'Post-op recovery area with cages, monitoring, oxygen', points: 10 },
      { id: 'IVD.s10', label: 'Air-conditioned room', points: 10 },
    ],
    passRule: 100,
    totalPoints: 100,
  },
  {
    id: 'IV-D2',
    title: 'Surgical Kits & Consumables',
    // EQUAL-WEIGHT ASSUMPTION — confirm with PAHA. The source PDF assigns no
    // per-item points to this checklist; all 13 rows are weighted equally so
    // the table totals 100 with the stated 80% threshold.
    scored: [
      // NOTE: full per-kit instrument lists come from the source PDF; populate
      // subItems with the complete lists when transcribed.
      { id: 'IVD2.k1', label: 'Soft tissue surgical kit (complete instrument list per 2026 standard)', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.k2', label: 'Spay kit (complete instrument list per 2026 standard)', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.k3', label: 'Dental kit (complete instrument list per 2026 standard)', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.k4', label: 'Orthopedic kit (complete instrument list per 2026 standard)', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c1', label: '6 surgical drapes', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c2', label: 'Gauze pads', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c3', label: 'Laparotomy sheets — 2 each S/M/L', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c4', label: 'Cotton + jars', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c5', label: '6 pairs sterile gloves', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c6', label: '2 operating gowns', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c7', label: 'Suture thread — 12 pcs absorbable + non-absorbable', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c8', label: 'Plaster of Paris / orthofix / vetwrap', points: D2_EQUAL_WEIGHT },
      { id: 'IVD2.c9', label: 'Assorted bandages', points: D2_EQUAL_WEIGHT },
    ],
    passRule: 80,
    totalPoints: 100,
  },
  {
    id: 'IV-E',
    title: 'Disposal of Unclaimed Dead Patients',
    // SOURCE AMBIGUOUS — PDF shows only 80/100; modeled as single pass/fail item.
    scored: [
      { id: 'IVE.s1', label: 'Provisions for proper disposal on/off-site', points: 100 },
    ],
    passRule: 80,
    totalPoints: 100,
  },
  {
    id: 'IV-F',
    title: 'Confinement Area',
    compulsory: [
      { id: 'IVF.c1', label: 'Secure escape-proof ventilated air-conditioned cleanable area with weighing scale' },
      { id: 'IVF.c2', label: 'Sanitation protocols incl. foot baths + hand washing' },
      { id: 'IVF.c3', label: 'Infectious separated from non-infectious' },
    ],
    scored: [
      { id: 'IVF.s1', label: 'Separate from exam/surgery rooms', points: 10 },
      { id: 'IVF.s2', label: 'Separate infectious / non-infectious areas', points: 10 },
      { id: 'IVF.s3', label: 'Minimum 3 cages/patients per division', points: 5 },
      { id: 'IVF.s4', label: 'IV fluid stand / wall / cage attachment', points: 5 },
      { id: 'IVF.s5', label: 'Water tap', points: 5 },
      { id: 'IVF.s6', label: 'Cages — secure, welded iron/stainless/aluminum, removable flooring', points: 5 },
      { id: 'IVF.s7', label: 'Stainless water/food containers', points: 5 },
      { id: 'IVF.s8', label: 'Leash / muzzle ≥ 2', points: 5 },
      { id: 'IVF.s9', label: 'Infusion pump for both divisions', points: 5 },
      { id: 'IVF.s10', label: 'Concrete / tiled / hospital-grade vinyl floors', points: 10 },
      { id: 'IVF.s11', label: 'Good ventilation & air-conditioning', points: 10 },
      { id: 'IVF.s12', label: 'Tiled or light-painted impervious walls', points: 5 },
      { id: 'IVF.s13', label: 'Uniform / protective clothing for helpers', points: 5 },
      { id: 'IVF.s14', label: 'Doors with lock', points: 5 },
      { id: 'IVF.s15', label: 'Covered tin/plastic waste can', points: 5 },
      { id: 'IVF.s16', label: 'Emergency light', points: 5 },
    ],
    passRule: 80,
    totalPoints: 100,
  },
  {
    id: 'IV-G',
    title: 'Instruments and Supplies',
    // SOURCE SUMS TO 92 — point values encoded verbatim from the 2026
    // instrument; the pass threshold is computed against the actual total.
    scored: [
      { id: 'IVG.s1', label: 'Syringes 1cc/3cc/5cc/10cc/50cc — 1 box each', points: 4 },
      { id: 'IVG.s2', label: 'Tuberculin 18G/21G/23G/25G — 1 box each', points: 4 },
      { id: 'IVG.s3', label: 'IV catheters adult/pedia — 1 box each', points: 4 },
      { id: 'IVG.s4', label: 'Medical tapes — micropore & Leukoplast', points: 4 },
      { id: 'IVG.s5', label: 'Tongue depressors', points: 4 },
      { id: 'IVG.s6', label: 'Stethoscope', points: 2 },
      { id: 'IVG.s7', label: 'Rectal / digital thermometer', points: 4 },
      { id: 'IVG.s8', label: 'Glass slides + cover slips', points: 4 },
      { id: 'IVG.s9', label: 'Test tubes + rack', points: 2 },
      { id: 'IVG.s10', label: 'Ophthalmoscope / otoscope / penlight', points: 2 },
      { id: 'IVG.s11', label: 'Nail clipper', points: 4 },
      { id: 'IVG.s12', label: 'Muzzles — various sizes', points: 4 },
      { id: 'IVG.s13', label: 'Instrument tray', points: 2 },
      { id: 'IVG.s14', label: 'Magnifying glass', points: 2 },
      { id: 'IVG.s15', label: 'Urinary dog catheter — all sizes', points: 2 },
      { id: 'IVG.s16', label: 'Tom catheter sizes 1.0 / 1.3', points: 4 },
      { id: 'IVG.s17', label: 'ET tubes — various sizes', points: 4 },
      { id: 'IVG.s18', label: 'Ambu bags S/M/L', points: 4 },
      { id: 'IVG.s19', label: 'Disposable hand towels', points: 4 },
      { id: 'IVG.s20', label: 'Examination gloves', points: 4 },
      { id: 'IVG.s21', label: 'Heating pad or hot/cold compress', points: 4 },
      { id: 'IVG.s22', label: 'Cat bag or equivalent', points: 4 },
      { id: 'IVG.s23', label: 'Hydrogen peroxide 3%', points: 4 },
      { id: 'IVG.s24', label: 'Alcohol 70%', points: 4 },
      { id: 'IVG.s25', label: 'Povidone 10%', points: 4 },
      { id: 'IVG.s26', label: 'Disinfectants', points: 4 },
    ],
    passRule: 80,
    totalPoints: 92,
  },

  // ── Section V ──────────────────────────────────────────────────────────────
  {
    id: 'V',
    title: 'Medical Records',
    compulsory: [
      { id: 'V.c1', label: 'Legible records' },
      { id: 'V.c2', label: 'Consistent record-keeping system' },
      { id: 'V.c3', label: 'Filing allows easy retrieval' },
      { id: 'V.c4', label: 'Entries completed before filing' },
    ],
    scored: [
      { id: 'V.s1', label: 'Digital record system', points: 5 },
      { id: 'V.s2', label: 'Confinement record', points: 5 },
      { id: 'V.s3', label: 'AMA (Against Medical Advice) form', points: 10 },
      { id: 'V.s4', label: 'Vaccination record, preferably PAHA-approved', points: 10 },
      { id: 'V.s5', label: 'Veterinary health certificate', points: 5 },
      { id: 'V.s6', label: 'Examination protocol', points: 5 },
      { id: 'V.s7', label: 'Appointment slip', points: 5 },
      { id: 'V.s8', label: 'Confinement form', points: 10 },
      { id: 'V.s9', label: 'Discharge form', points: 5 },
      { id: 'V.s10', label: 'Pain-score record', points: 5 },
      { id: 'V.s11', label: 'Dental COHAT record', points: 5 },
      { id: 'V.s12', label: 'Surgery consent form', points: 5 },
      { id: 'V.s13', label: 'Euthanasia form', points: 5 },
      { id: 'V.s14', label: 'Patient weight recorded every visit', points: 20 },
    ],
    passRule: 80,
    totalPoints: 100,
  },

  // ── Section VI ─────────────────────────────────────────────────────────────
  {
    id: 'VI',
    title: 'Diagnostics & Pharmacy: Diagnostic Imaging',
    compulsory: [
      { id: 'VI.c1', label: 'Quality diagnostic images generated on premises' },
      { id: 'VI.c2', label: 'Radiation equipment operated only by trained hazard-aware staff' },
      { id: 'VI.c3', label: 'Separate room devoted to imaging' },
    ],
  },
  {
    id: 'VI-B',
    title: 'Digital Radiography',
    scored: [
      { id: 'VIB.s1', label: 'Competent, safe digital imaging', points: 10 },
      { id: 'VIB.s2', label: 'DICOM + JPEG/TIFF transmission', points: 10 },
      { id: 'VIB.s3', label: 'Save/share images without proprietary software', points: 10 },
      { id: 'VIB.s4', label: 'Appropriately sized CR cassettes / DR sensors', points: 10 },
      { id: 'VIB.s5', label: 'Protective lead apparel — aprons, gloves, thyroid shields, eyewear', points: 10 },
      { id: 'VIB.s6', label: '≥ 2 sets of lead gear, integrity verified every 6 months', points: 10 },
      { id: 'VIB.s7', label: 'Protective barriers/distance protect adjacent areas; staff behind shield or outside during exposure', points: 10 },
      { id: 'VIB.s8', label: 'Positioning & technique poster', points: 10 },
      { id: 'VIB.s9', label: 'Radiographic training certificate (any staff)', points: 20 },
    ],
    passRule: 80,
    totalPoints: 100,
  },
  {
    id: 'VI-C',
    title: 'Ultrasound',
    scored: [
      { id: 'VIC.s1', label: 'Certificate of training', points: 20 },
      { id: 'VIC.s2', label: 'Routinely cleaned and calibrated', points: 30 },
      { id: 'VIC.s3', label: 'Saves/shares images for clients and referrals', points: 50 },
    ],
    passRule: 80,
    totalPoints: 100,
  },

  // ── Section VII ────────────────────────────────────────────────────────────
  {
    id: 'VII',
    title: 'Diagnostics & Pharmacy: Laboratory',
    compulsory: [
      { id: 'VII.c1', label: 'Only trained staff perform lab tests' },
      { id: 'VII.c2', label: 'Periodic QC with pre-assayed control material' },
    ],
  },
  {
    id: 'VII-A',
    title: 'Laboratory Services (in-house or outside)',
    scored: [
      { id: 'VIIA.s1', label: 'PCR', points: 10 },
      { id: 'VIIA.s2', label: 'Smear / staining', points: 10 },
      { id: 'VIIA.s3', label: 'Hematology', points: 10 },
      { id: 'VIIA.s4', label: 'Blood chemistry', points: 10 },
      { id: 'VIIA.s5', label: 'Urinalysis incl. sediment', points: 10 },
      { id: 'VIIA.s6', label: 'Fecal parasite exam', points: 10 },
      { id: 'VIIA.s7', label: 'Skin parasite exam', points: 10 },
      { id: 'VIIA.s8', label: 'Blood parasite exam', points: 10 },
      { id: 'VIIA.s9', label: 'Cytology', points: 10 },
      { id: 'VIIA.s10', label: 'Serum electrolytes', points: 10 },
    ],
    passRule: 80,
    totalPoints: 100,
  },
  {
    id: 'VII-B',
    title: 'Laboratory Equipment & Supplies',
    scored: [
      { id: 'VIIB.s1', label: 'Binocular microscope 100x + light', points: 10 },
      { id: 'VIIB.s2', label: 'Clinical centrifuge with lid, low/high speed', points: 10 },
      { id: 'VIIB.s3', label: 'Refrigerator', points: 10 },
      { id: 'VIIB.s4', label: 'Glucometer', points: 10 },
      { id: 'VIIB.s5', label: 'Test kits — fungal', points: 10 },
      { id: 'VIIB.s6', label: 'Test kits — viral', points: 10 },
      { id: 'VIIB.s7', label: 'Test kits — bacterial', points: 10 },
      { id: 'VIIB.s8', label: 'Test kits — parasitic', points: 10 },
      { id: 'VIIB.s9', label: 'Disposes of expired kits/reagents', points: 10 },
      { id: 'VIIB.s10', label: 'Reagents stored per manufacturer instructions', points: 10 },
    ],
    passRule: 80,
    totalPoints: 100,
  },

  // ── Section VIII ───────────────────────────────────────────────────────────
  {
    id: 'VIII',
    title: 'Diagnostics & Pharmacy: Pharmacy',
    compulsory: [
      { id: 'VIII.c1', label: 'Controlled substances in limited-access locked constructed cabinet/safe' },
      { id: 'VIII.c2', label: 'Child-resistant containers unless client declines' },
      { id: 'VIII.c3', label: 'Separate accurate controlled-substance log' },
    ],
    scored: [
      { id: 'VIII.s1', label: 'Pharmacy access restricted', points: 20 },
      { id: 'VIII.s2', label: 'Prefilled syringes labeled', points: 10 },
      { id: 'VIII.s3', label: 'Prefilled meds handled to preserve potency', points: 10 },
      { id: 'VIII.s4', label: 'Storage prevents cross-contamination/adulteration', points: 10 },
      { id: 'VIII.s5', label: 'Current pharma reference — PVET/MIMS/Formulary', points: 10 },
      { id: 'VIII.s6', label: 'Antidote + poison control info available', points: 10 },
      { id: 'VIII.s7', label: 'Well-organized storage', points: 10 },
      { id: 'VIII.s8', label: 'Refrigerator temps documented daily; no non-medical items stored', points: 20 },
    ],
    passRule: 80,
    totalPoints: 100,
  },
  {
    id: 'VIII-B',
    title: 'Controlled Substances',
    scored: [
      { id: 'VIIIB.s1', label: 'Lockboxes/safes labeled with suicide-prevention resources and contacts', points: 50 },
      { id: 'VIIIB.s2', label: 'Separate accurate administered/dispensed log', points: 50 },
    ],
    passRule: 80,
    totalPoints: 100,
  },
];

// ── Major-section grouping (for the accordion UI) ────────────────────────────
export interface MajorSection {
  numeral: string;   // 'I'..'VIII'
  title: string;
  sections: EvaluationSection[]; // subsections in display order
}

const MAJOR_TITLES: Record<string, string> = {
  I: 'Signages / Certificates / Permits / Licenses',
  II: 'General Sanitary Conditions',
  III: 'Personnel',
  IV: 'Physical Clinic Facilities',
  V: 'Medical Records',
  VI: 'Diagnostics & Pharmacy: Diagnostic Imaging',
  VII: 'Diagnostics & Pharmacy: Laboratory',
  VIII: 'Diagnostics & Pharmacy: Pharmacy',
};

export const MAJOR_SECTIONS: MajorSection[] = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'].map(numeral => ({
  numeral,
  title: MAJOR_TITLES[numeral],
  sections: STANDARD_2026.filter(s => s.id === numeral || s.id.startsWith(`${numeral}-`)),
}));

// ── Legacy Category adapter ──────────────────────────────────────────────────
// Derives the old `Category[]` shape (used by review screens, the compliance
// document stage, and AccreditationManager) FROM the 2026 standard so those
// views render the new content with zero drift. Category ids intentionally
// keep the legacy CAT* naming so compliance data keyed by category id
// continues to work.
const SECTION_TO_CAT: Record<string, string> = {
  'I': 'CAT1', 'II': 'CAT2', 'III': 'CAT3',
  'IV-A': 'CAT4A', 'IV-B': 'CAT4B', 'IV-C': 'CAT4C', 'IV-D': 'CAT4D',
  'IV-D2': 'CAT4D2', 'IV-E': 'CAT4E', 'IV-F': 'CAT4F', 'IV-G': 'CAT4G',
  'V': 'CAT5', 'VI': 'CAT6', 'VI-B': 'CAT6B', 'VI-C': 'CAT6C',
  'VII': 'CAT7', 'VII-A': 'CAT7A', 'VII-B': 'CAT7B',
  'VIII': 'CAT8', 'VIII-B': 'CAT8B',
};

function sectionToItems(section: EvaluationSection) {
  return [
    ...(section.compulsory || []).map(c => ({ id: c.id, label: c.label, points: 0, isCompulsory: true })),
    ...(section.scored || []).map(s => ({ id: s.id, label: s.label, points: s.points })),
  ];
}

function buildCategories(): Category[] {
  const cats: Category[] = [];
  for (const major of MAJOR_SECTIONS) {
    const root = major.sections.find(s => s.id === major.numeral);
    const subs = major.sections.filter(s => s.id !== major.numeral);
    const catId = SECTION_TO_CAT[major.numeral] || `CAT_${major.numeral}`;
    if (subs.length === 0 && root) {
      cats.push({
        id: catId,
        title: `${major.numeral}. ${root.title}`,
        passingScore: root.passRule ?? 100,
        items: sectionToItems(root),
      });
    } else {
      cats.push({
        id: catId,
        title: `${major.numeral}. ${major.title}`,
        passingScore: root?.passRule ?? 100,
        items: root ? sectionToItems(root) : undefined,
        subCategories: subs.map(sub => ({
          id: SECTION_TO_CAT[sub.id] || sub.id,
          title: `${sub.id}. ${sub.title}`,
          passingScore: sub.passRule ?? 100,
          items: sectionToItems(sub),
        })),
      });
    }
  }
  return cats;
}

export const STANDARD_2026_AS_CATEGORIES: Category[] = buildCategories();
