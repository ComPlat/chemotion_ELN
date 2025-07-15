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

const default_units = {
  activity: 'U',
  amount_as_used_mol: 'mol',
  amount_as_used_mass: 'g',
  concentration: 'ng/L',
  molarity: 'mol/L',
  activity_per_volume: 'U/L',
  activity_per_mass: 'U/g',
  volume_as_used: 'L',
};

const convertUnits = (value, from, to) => {
  if (!from || !to || from === to) { return value; }

  let factor = conversionFactors[from].factor / conversionFactors[to].factor;
  factor = factor < 1 ? factor : Math.round(factor);
  return parseFloat((value * factor).toFixed(8));
}

export { unitSystems, convertUnits, conversionFactors, default_units }
