import { set, cloneDeep } from 'lodash';
import { convertTemperature, convertDuration } from 'src/models/Reaction';
import { metPreConv as convertAmount } from 'src/utilities/metricPrefix';
import {
  updateYields, updateEquivalents, getMaterialData
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';

const temperatureUnits = ['°C', 'K', '°F'];
const durationUnits = ['Second(s)', 'Minute(s)', 'Hour(s)', 'Day(s)', 'Week(s)'];
const massUnits = ['g', 'mg', 'μg'];
const volumeUnits = ['l', 'ml', 'μl'];
const amountUnits = ['mol', 'mmol'];
const materialTypes = {
  startingMaterials: { label: 'Starting Materials', reactionAttributeName: 'starting_materials' },
  reactants: { label: 'Reactants', reactionAttributeName: 'reactants' },
  products: { label: 'Products', reactionAttributeName: 'products' },
  solvents: { label: 'Solvents', reactionAttributeName: 'solvents' }
};

function getStandardUnit(entry) {
  switch (entry) {
    case 'volume':
      return volumeUnits[0];
    case 'mass':
      return massUnits[0];
    case 'amount':
      return amountUnits[0];
    case 'temperature':
      return temperatureUnits[0];
    case 'duration':
      return durationUnits[0];
    default:
      return null;
  }
}

function convertUnit(value, fromUnit, toUnit) {
  if (temperatureUnits.includes(fromUnit) && temperatureUnits.includes(toUnit)) {
    return convertTemperature(value, fromUnit, toUnit);
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

function getCellDataType(entry) {
  if (['temperature', 'duration'].includes(entry)) {
    return 'property';
  }
  if (entry === 'equivalent') {
    return 'equivalent';
  }
  if (['mass', 'volume', 'amount'].includes(entry)) {
    return 'material';
  }
  return null;
}

function getVariationsRowName(reactionLabel, variationsRowId) {
  return `${reactionLabel}-${variationsRowId}`;
}

function getSequentialId(variations) {
  const ids = variations.map((row) => (row.id));
  return (ids.length === 0) ? 1 : Math.max(...ids) + 1;
}

function createVariationsRow(reaction, variations) {
  const reactionCopy = cloneDeep(reaction);
  const { dispValue: durationValue = null, dispUnit: durationUnit = 'None' } = reactionCopy.durationDisplay ?? {};
  const { userText: temperatureValue = null, valueUnit: temperatureUnit = 'None' } = reactionCopy.temperature ?? {};
  let row = {
    id: getSequentialId(variations),
    properties: {
      temperature: {
        value: convertUnit(temperatureValue, temperatureUnit, getStandardUnit('temperature')),
        unit: getStandardUnit('temperature')
      },
      duration: {
        value: convertUnit(durationValue, durationUnit, getStandardUnit('duration')),
        unit: getStandardUnit('duration'),
      },
    },
    analyses: [],
    notes: '',
  };
  Object.entries(materialTypes).forEach(([materialType, { reactionAttributeName }]) => {
    row[materialType] = reactionCopy[reactionAttributeName].reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v) }), {});
  });

  row = updateYields(row, reactionCopy.has_polymers);
  row = updateEquivalents(row);

  return row;
}

function copyVariationsRow(row, variations) {
  const copiedRow = cloneDeep(row);
  copiedRow.id = getSequentialId(variations);
  copiedRow.analyses = [];
  copiedRow.notes = '';

  return copiedRow;
}

function updateVariationsRow(row, field, value) {
  const updatedRow = cloneDeep(row);
  set(updatedRow, field, value);

  return updatedRow;
}

function updateVariationsRowOnReferenceMaterialChange(row, reactionHasPolymers) {
  let updatedRow = cloneDeep(row);
  updatedRow = updateEquivalents(updatedRow);
  updatedRow = updateYields(updatedRow, reactionHasPolymers);

  return updatedRow;
}

function updateColumnDefinitions(columnDefinitions, field, property, newValue) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  updatedColumnDefinitions.forEach((columnDefinition) => {
    if (columnDefinition.groupId) {
      // Column group.
      columnDefinition.children.forEach((child) => {
        if (child.field === field) {
          child[property] = newValue;
        }
      });
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
  convertUnit,
  getStandardUnit,
  materialTypes,
  getVariationsRowName,
  createVariationsRow,
  copyVariationsRow,
  updateVariationsRow,
  updateVariationsRowOnReferenceMaterialChange,
  updateColumnDefinitions,
  getCellDataType
};
