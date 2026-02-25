const unitSystems = {
  activity: [
    { value: 'u', label: 'U' },
    { value: 'mu', label: 'mU' },
    { value: 'kat', label: 'kat' },
    { value: 'mkat', label: 'mkat' },
    { value: 'µkat', label: 'µkat' },
    { value: 'nkat', label: 'nkat' },
  ],
  activity_per_volume: [
    { value: 'u_l', label: 'U/L' },
    { value: 'u_ml', label: 'U/mL' },
  ],
  activity_per_mass: [
    { value: 'u_g', label: 'U/g' },
    { value: 'u_mg', label: 'U/mg' },
  ],
  amount_substance: [
    { value: 'mol', label: 'mol' },
    { value: 'mmol', label: 'mmol' },
    { value: 'umol', label: 'µmol' },
    { value: 'nmol', label: 'nmol' },
    { value: 'pmol', label: 'pmol' },
  ],
  amount_mass: [
    { value: 'g', label: 'g' },
    { value: 'kg', label: 'kg' },
    { value: 'ug', label: 'µg' },
    { value: 'mg', label: 'mg' },
  ],
  concentration: [
    { value: 'ng_l', label: 'ng/L' },
    { value: 'mg_l', label: 'mg/L' },
    { value: 'g_l', label: 'g/L' },
  ],
  molarity: [
    { value: 'mol_l', label: 'mol/L' },
    { value: 'mmol_l', label: 'mmol/L' },
    { value: 'umol_l', label: 'µmol/L' },
    { value: 'nmol_l', label: 'nmol/L' },
    { value: 'pmol_l', label: 'pmol/L' },
  ],
  molecule_mass: [
    { value: 'dalton', label: 'D' },
    { value: 'kilo_dalton', label: 'kD' },
  ],
  molecular_weight: [
    { value: 'kg_mol', label: 'kg/mol' },
  ],
  purity: [
    { value: 'percent', label: '%' },
  ],
  volumes: [
    { value: 'L', label: 'L' },
    { value: 'mL', label: 'mL' },
    { value: 'uL', label: 'µL' },
    { value: 'nL', label: 'nL' },
  ],
};

const conversionFactors = {
  'g': { factor: 1 },
  'kg': { factor: 1e3 },
  'µg': { factor: 1e-6 },
  'mg': { factor: 1e-3 },

  'L': { factor: 1 },
  'mL': { factor: 1e-3 },
  'µL': { factor: 1e-6 },
  'nL': { factor: 1e-9 },

  'ng/L': { factor: 1 },
  'mg/L': { factor: 1e3 },
  'g/L': { factor: 1e6 },

  'mol': { factor: 1 },
  'mmol': { factor: 1e-3 },
  'µmol': { factor: 1e-6 },
  'nmol': { factor: 1e-9 },
  'pmol': { factor: 1e-12 },

  'mol/L': { factor: 1 },
  'mmol/L': { factor: 1e-3 },
  'µmol/L': { factor: 1e-6 },
  'nmol/L': { factor: 1e-9 },
  'pmol/L': { factor: 1e-12 },

  'U': { factor: 1.67e-8 },
  'mU': { factor: 1.67e-11 },
  'kat': { factor: 1 },
  'mkat': { factor: 1e-3 },
  'µkat': { factor: 1e-6 },
  'nkat': { factor: 1e-9 },

  'U/L': { factor: 1 },
  'U/mL': { factor: 1e3 },

  'U/g': { factor: 1 },
  'U/mg': { factor: 1e3 },
};

const defaultUnits = {
  activity: 'U',
  amount_as_used_mol: 'mol',
  amount_as_used_mass: 'g',
  concentration: 'ng/L',
  molarity: 'mol/L',
  activity_per_volume: 'U/L',
  activity_per_mass: 'U/g',
  volume_as_used: 'L',
};

/**
 * Normalizes user/backend unit variants to canonical keys used in `conversionFactors`.
 *
 * Accepts common aliases (e.g. `uM`, `ml`, `mol/l`) and Unicode variants,
 * then returns the canonical unit token used by conversion logic.
 *
 * @param {string} unit - Raw unit string from UI or persisted payload.
 * @returns {string} Canonical unit key (or original input when no mapping exists).
 */
const normalizeUnitKey = (unit) => {
  if (!unit || typeof unit !== 'string') return unit;

  const trimmed = unit.trim();
  if (conversionFactors[trimmed]) return trimmed;
  if (trimmed === 'M') return 'mol/L';
  if (trimmed === 'mM') return 'mmol/L';
  if (trimmed === 'uM' || trimmed === 'µM' || trimmed === 'μM') return 'µmol/L';
  if (trimmed === 'nM') return 'nmol/L';
  if (trimmed === 'pM') return 'pmol/L';

  const aliases = {
    l: 'L',
    ml: 'mL',
    ul: 'µL',
    'µl': 'µL',
    'μl': 'µL',
    nl: 'nL',
    ug: 'µg',
    'µg': 'µg',
    'μg': 'µg',
    umol: 'µmol',
    'µmol': 'µmol',
    'μmol': 'µmol',
    'mol/l': 'mol/L',
    'mmol/l': 'mmol/L',
    'umol/l': 'µmol/L',
    'µmol/l': 'µmol/L',
    'μmol/l': 'µmol/L',
    'nmol/l': 'nmol/L',
    'pmol/l': 'pmol/L',
    'ng/l': 'ng/L',
    'mg/l': 'mg/L',
    'g/l': 'g/L',
    u: 'U',
    mu: 'mU',
    ukat: 'µkat',
    'µkat': 'µkat',
    'μkat': 'µkat',
    'u/l': 'U/L',
    'u/ml': 'U/mL',
    'u/g': 'U/g',
    'u/mg': 'U/mg',
  };

  return aliases[trimmed.toLowerCase()] || trimmed;
};

/**
 * Converts a numeric value between two unit types based on predefined conversion factors.
 *
 * Conversion is calculated using:
 *      factor = conversionFactors[from].factor / conversionFactors[to].factor
 *
 * Special behaviors:
 *  - If `from` or `to` is missing, the original value is returned.
 *  - If units are identical (`from === to`), the original value is returned.
 *  - If `from` or `to` cannot be mapped to `conversionFactors`, the original value is returned.
 *  - The factor is rounded to the nearest integer **only when > 1**.
 *  - The final result is rounded to 8 decimal places.
 *
 * @param {number} value - The numeric value to convert.
 * @param {string} from - The source unit key (must exist in `conversionFactors`).
 * @param {string} to - The target unit key (must exist in `conversionFactors`).
 *
 * @returns {number} The converted value, rounded to 8 decimal places.
 *
 * @example
 * convertUnits(1000, 'mL', 'L'); // => 1
 *
 * @example
 * convertUnits(2.5, 'g', 'mg'); // => 2500
 *
 * @example
 * convertUnits(10, 'L', 'L'); // => 10 (no conversion)
 */
const convertUnits = (value, from, to) => {
  if (!from || !to || from === to) { return value; }
  if (!conversionFactors[from] || !conversionFactors[to]) { return value; }

  let factor = conversionFactors[from].factor / conversionFactors[to].factor;
  factor = factor < 1 ? factor : Math.round(factor);
  return parseFloat((value * factor).toFixed(8));
};

export {
  unitSystems, convertUnits, conversionFactors, defaultUnits, normalizeUnitKey
};
