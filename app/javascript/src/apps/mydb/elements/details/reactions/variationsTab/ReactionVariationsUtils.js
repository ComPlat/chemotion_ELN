import { set, cloneDeep } from 'lodash';
import { convertTemperature, convertDuration } from 'src/models/Reaction';
import { metPreConv as convertAmount } from 'src/utilities/metricPrefix';
import {
  updateVariationsRowOnReferenceMaterialChange,
  updateVariationsRowOnCatalystMaterialChange,
  getMaterialData
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';

const REACTION_VARIATIONS_TAB_KEY = 'reactionVariationsTab';
const temperatureUnits = ['°C', 'K', '°F'];
const durationUnits = ['Second(s)', 'Minute(s)', 'Hour(s)', 'Day(s)', 'Week(s)'];
const massUnits = ['g', 'mg', 'μg'];
const volumeUnits = ['l', 'ml', 'μl'];
const amountUnits = ['mol', 'mmol'];
const concentrationUnits = ['ppm'];
const materialTypes = {
  startingMaterials: { label: 'Starting Materials', reactionAttributeName: 'starting_materials' },
  reactants: { label: 'Reactants', reactionAttributeName: 'reactants' },
  products: { label: 'Products', reactionAttributeName: 'products' },
  solvents: { label: 'Solvents', reactionAttributeName: 'solvents' }
};

function convertUnit(value, fromUnit, toUnit) {
  if (temperatureUnits.includes(fromUnit) && temperatureUnits.includes(toUnit)) {
    const convertedValue = convertTemperature(value, fromUnit, toUnit);
    if (toUnit === 'K' && convertedValue < 0) {
      return 0;
    }
    if (toUnit === '°C' && convertedValue < -273.15) {
      return -273.15;
    }
    if (toUnit === '°F' && convertedValue < -459.67) {
      return -459.67;
    }
    return convertedValue;
  }
  if (durationUnits.includes(fromUnit) && durationUnits.includes(toUnit)) {
    return convertDuration(value, fromUnit, toUnit);
  }
  if (massUnits.includes(fromUnit) && massUnits.includes(toUnit)) {
    const amountUnitPrefixes = { g: 'n', mg: 'm', μg: 'u' };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }
  if (volumeUnits.includes(fromUnit) && volumeUnits.includes(toUnit)) {
    const amountUnitPrefixes = { l: 'n', ml: 'm', μl: 'u' };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }
  if (amountUnits.includes(fromUnit) && amountUnits.includes(toUnit)) {
    const amountUnitPrefixes = { mol: 'n', mmol: 'm' };
    return convertAmount(value, amountUnitPrefixes[fromUnit], amountUnitPrefixes[toUnit]);
  }

  return value;
}

function getStandardUnits(entry) {
  switch (entry) {
    case 'volume':
      return volumeUnits;
    case 'mass':
      return massUnits;
    case 'amount':
      return amountUnits;
    case 'temperature':
      return temperatureUnits;
    case 'duration':
      return durationUnits;
    case 'concentration':
      return concentrationUnits;
    default:
      return [null];
  }
}

function getStandardValue(entry, material) {
  switch (entry) {
    case 'volume':
      return material.amount_l ?? null;
    case 'mass':
      return material.amount_g ?? null;
    case 'amount':
      return material.amount_mol ?? null;
    case 'equivalent':
      return (material.reference ?? false) ? 1 : 0;
    case 'temperature': {
      const { value = null, unit = null } = material.gas_phase_data?.temperature ?? {};
      return convertUnit(value, unit, getStandardUnits('temperature')[0]);
    }
    case 'concentration':
      return material.gas_phase_data?.part_per_million ?? null;
    case 'turnoverNumber':
      return material.gas_phase_data?.turnover_number ?? null;
    case 'turnoverFrequency':
      return material.gas_phase_data?.turnover_frequency?.value ?? null;
    default:
      return null;
  }
}

function getCellDataType(entry, gasType = 'off') {
  switch (entry) {
    case 'temperature':
    case 'duration':
      return gasType === 'off' ? 'property' : 'gas';
    case 'equivalent':
      return gasType === 'feedstock' ? 'feedstock' : 'equivalent';
    case 'mass':
    case 'volume':
    case 'amount':
      return gasType === 'feedstock' ? 'feedstock' : 'material';
    case 'concentration':
    case 'turnoverNumber':
    case 'turnoverFrequency':
      return 'gas';
    case 'yield':
      return 'yield';
    default:
      return null;
  }
}

function getUserFacingUnit(unit) {
  switch (unit) {
    case 'Second(s)':
      return 's';
    case 'Minute(s)':
      return 'm';
    case 'Hour(s)':
      return 'h';
    case 'Day(s)':
      return 'd';
    case 'Week(s)':
      return 'w';
    default:
      return unit;
  }
}

function getInternalUnit(unit) {
  switch (unit) {
    case 's':
      return 'Second(s)';
    case 'm':
      return 'Minute(s)';
    case 'h':
      return 'Hour(s)';
    case 'd':
      return 'Day(s)';
    case 'w':
      return 'Week(s)';
    default:
      return unit;
  }
}

function getVariationsRowName(reactionLabel, variationsRowId) {
  return `${reactionLabel}-${variationsRowId}`;
}

function getSequentialId(variations) {
  const ids = variations.map((row) => (row.id));
  return (ids.length === 0) ? 1 : Math.max(...ids) + 1;
}

function createVariationsRow(reaction, variations, gasMode = false, vesselVolume = null) {
  const reactionCopy = cloneDeep(reaction);
  const { dispValue: durationValue = null, dispUnit: durationUnit = 'None' } = reactionCopy.durationDisplay ?? {};
  const { userText: temperatureValue = null, valueUnit: temperatureUnit = 'None' } = reactionCopy.temperature ?? {};
  const row = {
    id: getSequentialId(variations),
    properties: {
      temperature: {
        value: convertUnit(temperatureValue, temperatureUnit, getStandardUnits('temperature')[0]),
        unit: getStandardUnits('temperature')[0]
      },
      duration: {
        value: convertUnit(durationValue, durationUnit, getStandardUnits('duration')[0]),
        unit: getStandardUnits('duration')[0],
      },
    },
    analyses: [],
    notes: '',
  };
  Object.entries(materialTypes).forEach(([materialType, { reactionAttributeName }]) => {
    row[materialType] = reactionCopy[reactionAttributeName].reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v, materialType, gasMode, vesselVolume) }), {});
  });

  return updateVariationsRowOnReferenceMaterialChange(row, reactionCopy.has_polymers);
}

function copyVariationsRow(row, variations) {
  const copiedRow = cloneDeep(row);
  copiedRow.id = getSequentialId(variations);
  copiedRow.analyses = [];
  copiedRow.notes = '';

  return copiedRow;
}

function updateVariationsRow(row, field, value, reactionHasPolymers) {
  /*
  Some attributes of a material need to be updated in response to changes in other attributes:

  attribute         | needs to be updated in response to change in
  ------------------|---------------------------------------------
  equivalent        | mass^, amount^, reference material's mass~, reference material's amount~
  mass              | amount^, equivalent^, concentration^, temperature^
  amount            | mass^, equivalent^, concentration^, temperature^
  yield             | mass^, amount^x, concentration^, temperature^, reference material's mass~, reference material's amount~
  turnoverNumber    | concentration^, temperature^, catalyst material's amount~
  turnoverFrequency | concentration^, temperature^, duration^, turnoverNumber^, catalyst material's amount~

  ^: handled in cell parsers (changes within single material)
  ~: handled here (row-wide changes across materials)
  ^x: not permitted according to business logic
  */
  let updatedRow = cloneDeep(row);
  set(updatedRow, field, value);
  if (value.aux?.isReference) {
    updatedRow = updateVariationsRowOnReferenceMaterialChange(updatedRow, reactionHasPolymers);
  }
  if (value.aux?.gasType === 'catalyst') {
    updatedRow = updateVariationsRowOnCatalystMaterialChange(updatedRow);
  }

  return updatedRow;
}

function updateColumnDefinitions(columnDefinitions, field, property, newValue) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  updatedColumnDefinitions.forEach((columnDefinition) => {
    if (columnDefinition.groupId) {
      // Column group.
      if (columnDefinition.groupId === field) {
        columnDefinition[property] = newValue;
      } else {
        columnDefinition.children.forEach((child) => {
          if (child.field === field) {
            child[property] = newValue;
          }
        });
      }
    } else if (columnDefinition.field === field) {
      // Single column.
      columnDefinition[property] = newValue;
    }
  });

  return updatedColumnDefinitions;
}

export {
  massUnits,
  volumeUnits,
  amountUnits,
  temperatureUnits,
  durationUnits,
  concentrationUnits,
  getStandardUnits,
  convertUnit,
  materialTypes,
  getVariationsRowName,
  createVariationsRow,
  copyVariationsRow,
  updateVariationsRow,
  updateColumnDefinitions,
  getCellDataType,
  getUserFacingUnit,
  getStandardValue,
  REACTION_VARIATIONS_TAB_KEY
};
