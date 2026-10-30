/*
Turns a variation written before the diff-based format into a diff.

db/migrate/20260731120000_convert_reaction_variations_to_diff_list.rb converted the old rows without
touching their values: each converted row has a diff naming nothing but its identity, and keeps its
former body verbatim under `legacy_data`. Left like that, every migrated row reads as a copy of its
parent reaction. The old values are written back here instead, onto the variation's clone of the
reaction, through the same Sample and Reaction attributes the scheme editor sets - the diff the
caller then takes of the clone is the one an edit in the grid would have produced.

The old body keyed materials by sample id and stored every value in a fixed unit, carrying the unit
alongside:

  startingMaterials|reactants|products|solvents: {
    <sample id>: { mass, amount, volume, equivalent, yield, concentration,
                   duration, temperature, turnoverNumber, turnoverFrequency: { value, unit },
                   aux: { ... } },
  },
  properties: { temperature, duration: { value, unit } },
  segments: { <klass label>: { 'layer<key>field<key>': { value, unit, ... } } },
  metadata: { notes, analyses, group }   (already carried over by the migration)

What is not written back, because the new model has no per-row place for it or derives it:
concentrations (computed from amount and reaction volume), the read-only `aux` block, materials
whose sample is no longer part of the reaction, SBMM reactants (`sbmm:<id>` keys), and segment
fields of segments the reaction does not have.
*/
import { convertDuration, convertTemperature } from 'src/models/Reaction';

const MATERIAL_GROUPS = {
  startingMaterials: '_starting_materials',
  reactants: '_reactants',
  products: '_products',
  solvents: '_solvents',
};

// Units the old grid stored its values in, used when an entry does not name its own.
const LEGACY_UNITS = {
  mass: 'g',
  volume: 'l',
  amount: 'mol',
  temperature: '°C',
  duration: 'Second(s)',
};

const TEMPERATURE_UNITS = ['°C', 'K', '°F'];

const MASS_FACTORS = { g: 1, mg: 1e-3, μg: 1e-6 };
const VOLUME_FACTORS = { l: 1, ml: 1e-3, μl: 1e-6 };
const AMOUNT_FACTORS = { mol: 1, mmol: 1e-3, μmol: 1e-6 };

// Gas time units the scheme writes into `gas_phase_data.time`, spelled the way convertDuration reads them.
const GAS_TIME_UNITS = ['s', 'm', 'h', 'd', 'w'];

const isNumber = (value) => value !== null && value !== undefined && value !== ''
  && Number.isFinite(Number(value));

const entryValue = (entry) => (isNumber(entry?.value) ? Number(entry.value) : null);

function valueIn(entry, factors, standardUnit) {
  const value = entryValue(entry);
  if (value === null) return null;
  const factor = factors[entry.unit ?? standardUnit];
  return factor === undefined ? null : value * factor;
}

const hasLegacyData = (variation) => Boolean(variation?.legacy_data)
  && typeof variation.legacy_data === 'object';

/*
Only a row that still is what the migration made of it: once the conversion - or an edit - has
written anything into the diff beyond the row's identity, the diff is what the row is.
*/
const needsLegacyConversion = (variation) => hasLegacyData(variation)
  && Object.keys(variation.data ?? {}).every((key) => key === 'id');

function roundForDisplay(value) {
  return Number(Number(value).toPrecision(6)).toString();
}

/*
The amount a material is written back with. A sample keeps a single amount, in one of g, l or mol,
and derives the other two; the one the parent uses is kept so the scheme keeps showing the field
the user entered.
*/
function legacyAmountOf(material, parentUnit) {
  const mass = valueIn(material.mass, MASS_FACTORS, LEGACY_UNITS.mass);
  const volume = valueIn(material.volume, VOLUME_FACTORS, LEGACY_UNITS.volume);
  const amount = valueIn(material.amount, AMOUNT_FACTORS, LEGACY_UNITS.amount);
  const candidates = { g: mass, l: volume, mol: amount };

  if (candidates[parentUnit] !== null && candidates[parentUnit] !== undefined) {
    return { value: candidates[parentUnit], unit: parentUnit };
  }
  const [unit, value] = Object.entries(candidates).find(([, v]) => v !== null) ?? [];
  return unit ? { value, unit } : null;
}

function applyGasPhaseData(sample, material) {
  const gasPhaseData = { ...(sample.gas_phase_data ?? {}) };

  const ppm = entryValue(material.concentration);
  if (ppm !== null) gasPhaseData.part_per_million = ppm;

  const ton = entryValue(material.turnoverNumber);
  if (ton !== null) gasPhaseData.turnover_number = ton;

  const temperature = entryValue(material.temperature);
  if (temperature !== null) {
    const toUnit = TEMPERATURE_UNITS.includes(gasPhaseData.temperature?.unit)
      ? gasPhaseData.temperature.unit : 'K';
    const fromUnit = material.temperature.unit ?? LEGACY_UNITS.temperature;
    gasPhaseData.temperature = {
      unit: toUnit,
      value: Number(roundForDisplay(convertTemperature(temperature, fromUnit, toUnit))),
    };
  }

  const time = entryValue(material.duration);
  if (time !== null) {
    const toUnit = GAS_TIME_UNITS.includes(gasPhaseData.time?.unit) ? gasPhaseData.time.unit : 'h';
    const fromUnit = material.duration.unit ?? LEGACY_UNITS.duration;
    gasPhaseData.time = {
      unit: toUnit,
      value: Number(roundForDisplay(convertDuration(time, fromUnit, toUnit))),
    };
  }

  // The old grid computed TOF per hour, which is the unit the scheme defaults to.
  const tof = entryValue(material.turnoverFrequency);
  if (tof !== null) {
    gasPhaseData.turnover_frequency = { unit: 'TON/h', value: tof };
  }

  sample.gas_phase_data = gasPhaseData;
}

function applyMaterial(sample, material, groupName) {
  const gasType = material.aux?.gasType ?? sample.gas_type ?? 'off';

  if (gasType === 'gas') {
    applyGasPhaseData(sample, material);
    const amount = valueIn(material.amount, AMOUNT_FACTORS, LEGACY_UNITS.amount);
    if (amount !== null) sample.setAmount({ value: amount, unit: 'mol' });
    const yieldValue = entryValue(material.yield);
    if (yieldValue !== null) sample.equivalent = yieldValue / 100;
    return;
  }

  const parentUnit = gasType === 'feedstock' ? 'mol' : sample.amount_unit;
  const amount = legacyAmountOf(material, groupName === 'solvents' ? 'l' : parentUnit);
  if (amount) sample.setAmount(amount);

  if (groupName === 'products') {
    // The scheme keeps a product's yield as a fraction in `equivalent`.
    const yieldValue = entryValue(material.yield);
    if (yieldValue !== null) sample.equivalent = yieldValue / 100;
    return;
  }

  const equivalent = entryValue(material.equivalent);
  if (equivalent !== null && !sample.reference) sample.equivalent = equivalent;
}

function applyMaterials(variationReaction, legacyData) {
  Object.entries(MATERIAL_GROUPS).forEach(([groupName, attribute]) => {
    const samples = variationReaction[attribute] ?? [];
    Object.entries(legacyData[groupName] ?? {}).forEach(([sampleId, material]) => {
      if (!material || typeof material !== 'object') return;
      const sample = samples.find((s) => String(s.id) === String(sampleId));
      if (sample) applyMaterial(sample, material, groupName);
    });
  });
}

function applyTemperature(variationReaction, entry) {
  const value = entryValue(entry);
  if (value === null) return;

  const temperature = variationReaction._temperature ?? { data: [], userText: '', valueUnit: '°C' };
  const toUnit = TEMPERATURE_UNITS.includes(temperature.valueUnit) ? temperature.valueUnit : '°C';
  const converted = convertTemperature(value, entry.unit ?? LEGACY_UNITS.temperature, toUnit);
  variationReaction._temperature = {
    ...temperature,
    valueUnit: toUnit,
    userText: roundForDisplay(converted),
  };
}

function applyDuration(variationReaction, entry) {
  const value = entryValue(entry);
  if (value === null) return;

  // Shown in the unit the parent reaction uses, as the duration input of the scheme would.
  const unit = variationReaction.durationUnit || 'Hour(s)';
  const converted = roundForDisplay(convertDuration(value, entry.unit ?? LEGACY_UNITS.duration, unit));
  variationReaction._duration = `${converted} ${unit}`;
  variationReaction._durationDisplay = {
    dispUnit: unit,
    memUnit: unit,
    dispValue: converted,
    memValue: converted,
  };
}

const LEGACY_SEGMENT_FIELD = /^layer<([^>]*)>field<([^>]*)>$/;

function applySegments(variationReaction, legacySegments) {
  Object.entries(legacySegments ?? {}).forEach(([segmentLabel, fields]) => {
    const segment = (variationReaction._segments ?? []).find((s) => s.klass_label === segmentLabel);
    if (!segment) return;

    Object.entries(fields ?? {}).forEach(([entryKey, entry]) => {
      const match = entryKey.match(LEGACY_SEGMENT_FIELD);
      if (!match || !entry || entry.value === null || entry.value === undefined) return;

      const [, layerKey, fieldKey] = match;
      const field = (segment.properties?.layers?.[layerKey]?.fields ?? [])
        .find((f) => f.field === fieldKey);
      if (!field) return;

      field.value = entry.value;
      if (entry.unit) field.value_system = entry.unit;
    });
  });
}

/*
Writes the old values of `legacyData` onto `variationReaction`, a variation's own copy of the
reaction as built by makeVariationReaction. Mutates and returns it.
*/
function applyLegacyVariationData(variationReaction, legacyData) {
  if (!legacyData || typeof legacyData !== 'object') return variationReaction;

  applyMaterials(variationReaction, legacyData);
  applyTemperature(variationReaction, legacyData.properties?.temperature);
  applyDuration(variationReaction, legacyData.properties?.duration);
  applySegments(variationReaction, legacyData.segments);

  return variationReaction;
}

export {
  applyLegacyVariationData,
  needsLegacyConversion,
};
