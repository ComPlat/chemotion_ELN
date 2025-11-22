import Reaction from 'src/models/Reaction';
import Sample from 'src/models/Sample';
import Molecule from 'src/models/Molecule';

/**
 * Factory to create a gas phase reaction with feedstock, catalyst, and gas product
 */
export function createGasPhaseReaction(overrides = {}) {
  const defaultReaction = {
    id: 55,
    short_label: 'TEST-R1',
    name: 'Gas Phase Test Reaction',
    gaseous: true,
    vessel_size: { amount: 10000, unit: 'ml' },
    temperature: {
      data: [],
      userText: '',
      valueUnit: '°C'
    },
    duration: '',
    conditions: '',
    description: { ops: [{ insert: '\n' }] },
    purification: [],
    dangerous_products: [],
    tlc_solvents: '',
    tlc_description: '',
    rf_value: '0',
    status: '',
    solvent: '',
    role: '',
    rxno: '',
    timestamp_start: '',
    timestamp_stop: '',
    collection_id: '',
    can_copy: true,
    can_update: true,
    is_restricted: false,
    type: 'reaction',
    variations: [],
    segments: [],
    starting_materials: [],
    reactants: [],
    solvents: [],
    purification_solvents: [],
    products: [],
    ...overrides
  };

  return new Reaction(defaultReaction);
}

/**
 * Factory to create a feedstock sample
 */
export function createFeedstockSample(overrides = {}) {
  const molecule = new Molecule({
    id: 1,
    cano_smiles: 'Cn1cnc2c1c(=O)n(C)c(=O)n2C',
    sum_formular: 'C8H10N4O2',
    molecular_weight: 194.19,
    exact_molecular_weight: 194.08037558,
    iupac_name: '1,3,7-trimethylpurine-2,6-dione',
    inchikey: 'RYYVLZVUVIJVGH-UHFFFAOYSA-N'
  });

  const defaultSample = {
    id: 1,
    type: 'sample',
    short_label: 'feedstock',
    name: 'Test Feedstock',
    external_label: '',
    target_amount_value: 0.1,
    target_amount_unit: 'g',
    real_amount_value: 0.0019,
    real_amount_unit: 'g',
    purity: 1.0,
    density: 0,
    molarity_value: 0,
    molarity_unit: 'M',
    metrics: 'mmm',
    coefficient: 1,
    equivalent: 0.00001,
    reference: false,
    gas_type: 'feedstock',
    gas_phase_data: {
      time: { unit: 'h', value: null },
      temperature: { unit: 'K', value: null },
      turnover_number: null,
      part_per_million: null,
      turnover_frequency: { unit: 'TON/h', value: null }
    },
    molecule,
    position: 0,
    show_label: false,
    waste: false,
    ...overrides
  };

  return new Sample(defaultSample);
}

/**
 * Factory to create a catalyst sample
 */
export function createCatalystSample(overrides = {}) {
  const molecule = new Molecule({
    id: 2129,
    cano_smiles: '[C-]#[C-].[Ca+2]',
    sum_formular: 'C2Ca',
    molecular_weight: 64.0994,
    exact_molecular_weight: 63.96259098,
    iupac_name: 'calcium;acetylide',
    inchikey: 'UIXRSLJINYRGFQ-UHFFFAOYSA-N'
  });

  const defaultSample = {
    id: 2,
    type: 'sample',
    short_label: 'catalyst',
    name: 'Test Catalyst',
    external_label: '',
    target_amount_value: 1000.015,
    target_amount_unit: 'mol',
    real_amount_value: 0.234,
    real_amount_unit: 'mol',
    purity: 1.0,
    density: 0,
    molarity_value: 0,
    molarity_unit: 'M',
    metrics: 'mmm',
    coefficient: 1,
    equivalent: 0.22829268292682928,
    reference: false,
    gas_type: 'catalyst',
    gas_phase_data: {
      time: { unit: 'h', value: null },
      temperature: { unit: 'K', value: null },
      turnover_number: null,
      part_per_million: null,
      turnover_frequency: { unit: 'TON/h', value: null }
    },
    molecule,
    position: 1,
    show_label: false,
    waste: null,
    ...overrides
  };

  return new Sample(defaultSample);
}

/**
 * Factory to create a gas product sample
 */
export function createGasProductSample(overrides = {}) {
  const molecule = new Molecule({
    id: 3,
    cano_smiles: 'O=CC=Cc1ccccc1',
    sum_formular: 'C9H8O',
    molecular_weight: 132.15922,
    exact_molecular_weight: 132.057514876,
    iupac_name: '3-phenylprop-2-enal',
    inchikey: 'KJPRLNWUNMBNBZ-UHFFFAOYSA-N'
  });

  // Calculate real_amount_value based on gas phase formula:
  // Mol = ppm × V/(0.0821 × T × 1000000)
  // ppm = 10000, V = 10L (10000ml), T = 298K
  // Mol = 10000 × 10 / (0.0821 × 298 × 1000000) = 0.00408733824358901
  const defaultSample = {
    id: 11287,
    type: 'sample',
    short_label: 'CU1-10754',
    name: 'CU1-R15-A',
    external_label: '',
    target_amount_value: null,
    target_amount_unit: 'g',
    real_amount_value: 0.00408733824358901,
    real_amount_unit: 'mol',
    purity: 1.0,
    density: 1,
    molarity_value: 0,
    molarity_unit: 'M',
    metrics: 'mmm',
    coefficient: 1,
    equivalent: 0.00029400000000000004,
    reference: false,
    gas_type: 'gas',
    gas_phase_data: {
      time: { unit: 'h', value: 3 },
      temperature: { unit: 'K', value: 298 },
      turnover_number: null,
      part_per_million: 10000,
      turnover_frequency: { unit: 'TON/h', value: null }
    },
    molecule,
    position: 0,
    show_label: false,
    waste: null,
    ...overrides
  };

  return new Sample(defaultSample);
}

/**
 * Factory to create a reference material (starting material)
 */
export function createReferenceMaterial(overrides = {}) {
  const molecule = new Molecule({
    id: 951,
    cano_smiles: '[Cl-].[Cl-].[Ca+2]',
    sum_formular: 'CaCl2',
    molecular_weight: 110.984,
    exact_molecular_weight: 109.90029634,
    iupac_name: 'calcium;dichloride',
    inchikey: 'UXVMQQNJUSDDNG-UHFFFAOYSA-L'
  });

  const defaultSample = {
    id: 11285,
    type: 'sample',
    short_label: 'CU1-10749-1',
    name: 'CU1-R1-A',
    external_label: '',
    target_amount_value: 0.010474200000000001,
    target_amount_unit: 'g',
    real_amount_value: 1.025,
    real_amount_unit: 'mol',
    purity: 1.0,
    density: 0,
    molarity_value: 0,
    molarity_unit: 'M',
    metrics: 'mmm',
    coefficient: 1,
    equivalent: 1.0,
    reference: true,
    gas_type: 'off',
    gas_phase_data: {
      time: { unit: 'h', value: null },
      temperature: { unit: 'K', value: null },
      turnover_number: null,
      part_per_million: null,
      turnover_frequency: { unit: 'TON/h', value: null }
    },
    molecule,
    position: 0,
    show_label: false,
    waste: false,
    ...overrides
  };

  return new Sample(defaultSample);
}

/**
 * Creates a complete gas phase reaction with all materials
 */
export function createCompleteGasPhaseReaction() {
  const reaction = createGasPhaseReaction();
  reaction.starting_materials = [createReferenceMaterial()];
  reaction.reactants = [
    createFeedstockSample(),
    createCatalystSample()
  ];
  reaction.products = [createGasProductSample()];
  return reaction;
}
