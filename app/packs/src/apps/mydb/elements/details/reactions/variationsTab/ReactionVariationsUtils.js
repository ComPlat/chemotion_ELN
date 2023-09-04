import cloneDeep from 'lodash/cloneDeep';
import { convertTemperature, convertDuration } from 'src/models/Reaction';
import { metPreConv as convertAmount } from 'src/utilities/metricPrefix';

const temperatureUnits = ['°C', 'K', '°F'];
const durationUnits = ['Second(s)', 'Minute(s)', 'Hour(s)', 'Day(s)', 'Week(s)'];
const massUnits = ['mg', 'g', 'μg'];
const volumeUnits = ['ml', 'l', 'μl'];
const materialTypes = {
  startingMaterials: { label: 'Starting Materials', reactionAttributeName: 'starting_materials' },
  reactants: { label: 'Reactants', reactionAttributeName: 'reactants' },
  products: { label: 'Products', reactionAttributeName: 'products' },
  solvents: { label: 'Solvents', reactionAttributeName: 'solvents' }
};

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

function getMaterialData(material) {
  const value = material.amount_value ?? null;
  const unit = material.amount_unit ?? null;
  const aux = {
    coefficient: material.coefficient ?? null,
    isReference: material.reference ?? false,
    loading: (Array.isArray(material.residues) && material.residues.length) ? material.residues[0].custom_info?.loading : null,
    purity: material.purity ?? null,
    molarity: material.molarity_value ?? null,
    molecularWeight: material.molecule_molecular_weight ?? null,
    sumFormula: material.molecule_formula ?? null,
    yield: null
  };
  return { value, unit, aux };
}

function getMolFromGram(material) {
  const gram = convertUnit(material.value, material.unit, 'g');

  if (material.aux.loading) {
    return (material.aux.loading * gram) / 1e4;
  }

  if (material.aux.molarity) {
    const liter = (gram * material.aux.purity)
      / (material.aux.molarity * material.aux.molecularWeight);
    return liter * material.molarity;
  }

  return (gram * material.aux.purity) / material.aux.molecularWeight;
}

function createVariationsRow(reaction, id) {
  const { dispValue: durationValue = '', dispUnit: durationUnit = 'None' } = reaction.durationDisplay ?? {};
  const { userText: temperatureValue = '', valueUnit: temperatureUnit = 'None' } = reaction.temperature ?? {};
  const row = {
    id,
    properties: {
      temperature: {
        value: temperatureValue, unit: temperatureUnit
      },
      duration: {
        value: durationValue, unit: durationUnit
      }
    },
  };
  Object.entries(materialTypes).forEach(([materialType, { reactionAttributeName }]) => {
    row[materialType] = reaction[reactionAttributeName].reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v) }), {});
  });

  return row;
}

function removeObsoleteMaterialsFromVariations(variations, currentMaterials) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.keys(materialTypes).forEach((materialType) => {
      Object.keys(row[materialType]).forEach((materialName) => {
        if (!currentMaterials[materialType].map((material) => material.id.toString()).includes(materialName)) {
          delete row[materialType][materialName];
        }
      });
    });
  });
  return updatedVariations;
}

function addMissingMaterialsToVariations(variations, currentMaterials) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.keys(materialTypes).forEach((materialType) => {
      currentMaterials[materialType].forEach((material) => {
        if (!(material.id in row[materialType])) {
          row[materialType][material.id] = getMaterialData(material);
        }
      });
    });
  });
  return updatedVariations;
}

function computeYield(variations, reactionHasPolymers) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    const potentialReferenceMaterials = { ...row.startingMaterials, ...row.reactants };
    const referenceMaterial = Object.values(potentialReferenceMaterials).find((material) => {
      if (material.aux) {
        return material.aux.isReference;
      }
      return false;
    });

    if (referenceMaterial) {
      Object.entries(row.products).forEach(([productName, productProperties]) => {
        const stoichiometryCoefficient = (productProperties.aux.coefficient || 1.0)
        / (referenceMaterial.aux.coefficient || 1.0);
        const equivalent = getMolFromGram(productProperties)
        / getMolFromGram(referenceMaterial) / stoichiometryCoefficient;
        const percentYield = reactionHasPolymers ? (equivalent * 100).toFixed(0)
          : ((equivalent <= 1 ? equivalent : 1) * 100).toFixed(0);

        row.products[productName].aux.yield = percentYield;
      });
    }
  });
  return updatedVariations;
}

export {
  createVariationsRow,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  computeYield,
  temperatureUnits,
  durationUnits,
  massUnits,
  volumeUnits,
  convertUnit,
  materialTypes
};
