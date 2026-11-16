export interface DosageFormGroup {
  id: string;
  label: string;
  forms: string[];
}

export const DOSAGE_FORM_GROUPS: DosageFormGroup[] = [
  {
    id: 'solid',
    label: '1. Solid Dosage Forms',
    forms: [
      'Tablet',
      'Capsule',
      'Chewable Tablet',
      'Dispersible Tablet',
      'Effervescent Tablet',
      'Sublingual Tablet',
      'Buccal Tablet',
      'Powder',
      'Granules',
      'Lozenges',
      'Oral Pellets',
    ],
  },
  {
    id: 'liquid',
    label: '2. Liquid Dosage Forms',
    forms: [
      'Syrup',
      'Suspension',
      'Solution',
      'Oral Drops',
      'Eye Drops',
      'Ear Drops',
      'Nasal Drops',
      'Oral Emulsion',
      'Elixir',
      'Mouthwash',
      'Gargle',
    ],
  },
  {
    id: 'injectable',
    label: '3. Injectable Dosage Forms',
    forms: [
      'IV Injection',
      'IM Injection',
      'SC Injection',
      'Intradermal Injection',
      'Prefilled Syringe',
      'Injection Powder',
      'Infusion',
      'Insulin Injection',
    ],
  },
  {
    id: 'semi_solid',
    label: '4. Semi-Solid Dosage Forms',
    forms: [
      'Cream',
      'Ointment',
      'Gel',
      'Lotion',
      'Paste',
      'Suppository',
      'Pessary',
      'Medicated Shampoo',
    ],
  },
  {
    id: 'inhalation',
    label: '5. Inhalation Dosage Forms',
    forms: [
      'Metered Dose Inhaler (MDI)',
      'Dry Powder Inhaler (DPI)',
      'Nebulizer Solution',
      'Aerosol Spray',
      'Inhalation Capsule',
      'Medical Gas',
    ],
  },
  {
    id: 'topical',
    label: '6. Topical Dosage Forms',
    forms: [
      'Topical Spray',
      'Skin Solution',
      'Dusting Powder',
      'Transdermal Patch',
      'Medicated Plaster',
      'Topical Foam',
    ],
  },
  {
    id: 'ophthalmic_nasal_otic',
    label: '7. Ophthalmic, Nasal & Otic Dosage Forms',
    forms: [
      'Eye Ointment',
      'Eye Gel',
      'Nasal Spray',
      'Nasal Gel',
      'Ear Spray',
      'Ear Solution',
    ],
  },
  {
    id: 'special',
    label: '8. Special Dosage Forms',
    forms: [
      'Oral Dissolving Film',
      'Transdermal Patch',
      'Vaginal Tablet',
      'Vaginal Cream',
      'Vaginal Suppository',
      'Implant',
      'Medicated Wafers',
    ],
  },
];

export const ALL_DOSAGE_FORMS: string[] = Array.from(
  new Set(DOSAGE_FORM_GROUPS.flatMap((g) => g.forms))
);

export const MEDICINE_BASE_UNITS: string[] = [
  'Tablet',
  'Capsule',
  'Bottle',
  'Vial',
  'Ampoule',
  'Tube',
  'Sachet',
  'Piece',
  'Drop',
  'Syringe',
  'Patch',
  'Inhaler',
  'Spray',
];

export function getDefaultBaseUnitForDosage(dosageForm: string): string {
  const f = (dosageForm || '').toLowerCase();
  if (f.includes('capsule')) return 'Capsule';
  if (
    f.includes('syrup') ||
    f.includes('suspension') ||
    f.includes('solution') ||
    f.includes('drops') ||
    f === 'drop' ||
    f.includes('emulsion') ||
    f.includes('elixir') ||
    f.includes('mouthwash') ||
    f.includes('gargle') ||
    f.includes('lotion') ||
    f.includes('shampoo') ||
    f.includes('infusion')
  ) {
    return 'Bottle';
  }
  if (f.includes('syringe')) return 'Piece';
  if (f.includes('injection')) return 'Vial';
  if (
    f.includes('cream') ||
    f.includes('ointment') ||
    f.includes('gel') ||
    f.includes('paste')
  ) {
    return 'Tube';
  }
  if (f.includes('powder') || f.includes('granules')) return 'Sachet';
  if (
    f.includes('inhaler') ||
    f.includes('spray') ||
    f.includes('foam') ||
    f.includes('patch') ||
    f.includes('plaster') ||
    f.includes('suppository') ||
    f.includes('pessary') ||
    f.includes('film') ||
    f.includes('implant') ||
    f.includes('wafers') ||
    f.includes('lozenges') ||
    f.includes('pellets') ||
    f.includes('gas')
  ) {
    return 'Piece';
  }
  return 'Tablet';
}
