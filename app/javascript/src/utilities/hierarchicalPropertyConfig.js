import { unitSystems } from 'src/components/staticDropdownOptions/units';

export const HIERARCHICAL_PROPERTY_OPTIONS = [
  { value: 'sieve_fraction', label: 'Sieve fraction', placeholder: 'e.g., 100-200 µm' },
  { value: 'height', label: 'Height', placeholder: 'e.g., 5' },
  { value: 'diameter', label: 'Diameter', placeholder: 'e.g., 2.5' },
  { value: 'width', label: 'Width', placeholder: 'e.g., 3' },
  { value: 'length', label: 'Length', placeholder: 'e.g., 10' },
  { value: 'material', label: 'Material', placeholder: 'e.g., Glass, Plastic' },
  { value: 'cspi', label: 'CSPI', placeholder: 'e.g., 45°C' },
  { value: 'particle_size', label: 'Particle size', placeholder: 'e.g., Medium, 50 µm' },
  { value: 'shape', label: 'Shape', placeholder: 'e.g., Spherical, Cubic' },
  { value: 'storage_condition', label: 'Storage condition', placeholder: 'e.g., Room temperature' },
  // New properties
  { value: 'layer_thickness', label: 'Layer thickness', placeholder: 'e.g., 50' },
  { value: 'liquid_medium', label: 'Liquid medium', placeholder: 'e.g., Water' },
  { value: 'stabilizer', label: 'Stabilizer', placeholder: 'e.g., PVP' },
];

export const PROPERTY_MAP = Object.fromEntries(
  HIERARCHICAL_PROPERTY_OPTIONS.map((opt) => [opt.value, { label: opt.label, placeholder: opt.placeholder }])
);

export const DIMENSION_FIELDS = ['height', 'diameter', 'width', 'length'];
export const LENGTH_UNIT_FIELDS = [...DIMENSION_FIELDS, 'particle_size', 'sieve_fraction', 'layer_thickness'];
export const TEMP_FIELDS = ['cspi'];

const DIMENSION_UNIT_OPTIONS = unitSystems.length.filter((u) => ['µm', 'mm', 'cm', 'm'].includes(u.value));
const PARTICLE_SIZE_UNIT_OPTIONS = unitSystems.length.filter((u) => ['nm', 'µm', 'mm'].includes(u.value));
const SIEVE_FRACTION_UNIT_OPTIONS = unitSystems.length.filter((u) => ['µm', 'mm'].includes(u.value));
const LAYER_THICKNESS_UNIT_OPTIONS = unitSystems.length.filter((u) => ['µm', 'mm'].includes(u.value));

export const FIELD_UNIT_OPTIONS = {
  height: DIMENSION_UNIT_OPTIONS,
  width: DIMENSION_UNIT_OPTIONS,
  length: DIMENSION_UNIT_OPTIONS,
  diameter: DIMENSION_UNIT_OPTIONS,
  particle_size: PARTICLE_SIZE_UNIT_OPTIONS,
  sieve_fraction: SIEVE_FRACTION_UNIT_OPTIONS,
  cspi: unitSystems.temperature,
  layer_thickness: LAYER_THICKNESS_UNIT_OPTIONS,
};

// No dropdown fields — all pre-existing properties keep their original text/unit input rendering
export const FIELD_DROPDOWN_OPTIONS = {};
