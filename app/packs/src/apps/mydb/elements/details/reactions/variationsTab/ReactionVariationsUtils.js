import { set, cloneDeep } from 'lodash';
import { convertTemperature, convertDuration } from 'src/models/Reaction';
import { metPreConv as convertAmount } from 'src/utilities/metricPrefix';
import {
  updateYields, updateEquivalents, getMaterialData
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';

const temperatureUnits = ['°C', 'K', '°F'];
const durationUnits = ['Second(s)', 'Minute(s)', 'Hour(s)', 'Day(s)', 'Week(s)'];
const massUnits = ['mg', 'g', 'μg'];
const volumeUnits = ['ml', 'l', 'μl'];
const materialTypes = {
  startingMaterials: { label: 'Starting Materials', reactionAttributeName: 'starting_materials', units: massUnits },
  reactants: { label: 'Reactants', reactionAttributeName: 'reactants', units: massUnits },
  products: { label: 'Products', reactionAttributeName: 'products', units: massUnits },
  solvents: { label: 'Solvents', reactionAttributeName: 'solvents', units: volumeUnits }
};

function getVariationsRowName(reactionLabel, variationsRowId) {
  return `${reactionLabel}-${variationsRowId}`;
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

  return value;
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
        value: convertUnit(temperatureValue, temperatureUnit, temperatureUnits[0]), unit: temperatureUnits[0]
      },
      duration: {
        value: convertUnit(durationValue, durationUnit, durationUnits[0]), unit: durationUnits[0]
      }
    },
    analyses: [],
  };
  Object.entries(materialTypes).forEach(([materialType, { reactionAttributeName }]) => {
    row[materialType] = reactionCopy[reactionAttributeName].reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v, materialType) }), {});
  });

  row = updateYields(row, reactionCopy.has_polymers);
  row = updateEquivalents(row);

  return row;
}

function copyVariationsRow(row, variations) {
  const copiedRow = cloneDeep(row);
  copiedRow.id = getSequentialId(variations);
  copiedRow.analyses = [];

  return copiedRow;
}

function updateVariationsRow(row, field, value, reactionHasPolymers) {
  let updatedRow = { ...row };
  set(updatedRow, field, value);
  /*
  Some properties of a material need to be updated in response to changes in other properties:

  property   | needs to be updated in response to
  -----------|----------------------------------
  equivalent | own mass changes*, reference material's mass changes+
  mass       | own equivalent changes*
  yield      | own mass changes*, reference material's mass changes+

  *: handled in corresponding cell parsers (local, cell-internal changes)
  +: handled here (non-local, row-wide changes)

  TODO: Only run the following two updates if `value` pertains to the mass of the reference material.
  It's not incorrect to run those updates for other changes as well, just wasteful.
  */
  updatedRow = updateEquivalents(updatedRow);
  updatedRow = updateYields(updatedRow, reactionHasPolymers);

  return updatedRow;
}

export {
  massUnits,
  volumeUnits,
  temperatureUnits,
  durationUnits,
  materialTypes,
  convertUnit,
  getVariationsRowName,
  createVariationsRow,
  copyVariationsRow,
  updateVariationsRow,
};
