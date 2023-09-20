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

function getMaterialData(material, materialType) {
  const value = materialType === 'solvents' ? (material.amount_l ?? null) : (material.amount_g ?? null);
  const unit = materialType === 'solvents' ? 'l' : 'g';
  const aux = {
    coefficient: material.coefficient ?? null,
    isReference: material.reference ?? false,
    loading: (Array.isArray(material.residues) && material.residues.length) ? material.residues[0].custom_info?.loading : null,
    purity: material.purity ?? null,
    molarity: material.molarity_value ?? null,
    molecularWeight: material.molecule_molecular_weight ?? null,
    sumFormula: material.molecule_formula ?? null,
    yield: null,
    equivalent: material.equivalent ?? null
  };
  return { value, unit, aux };
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
      { ...a, [v.id]: getMaterialData(v, materialType) }), {});
  });

  return row;
}

function getMolFromGram(gram, material) {
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

function getGramFromMol(mol, material) {
  if (material.aux.loading) {
    return (mol / material.aux.loading) * 1e4;
  }
  return (mol / (material.aux.purity ?? 1.0)) * material.aux.molecularWeight;
}

function getReferenceMaterial(variationsRow) {
  const potentialReferenceMaterials = { ...variationsRow.startingMaterials, ...variationsRow.reactants };
  return Object.values(potentialReferenceMaterials).find((material) => {
    if (material.aux) {
      return material.aux.isReference;
    }
    return false;
  });
}

function computeEquivalent(material, referenceMaterial) {
  return getMolFromGram(convertUnit(material.value, material.unit, 'g'), material)
  / getMolFromGram(convertUnit(referenceMaterial.value, referenceMaterial.unit, 'g'), referenceMaterial);
}

function updateYields(variations, reactionHasPolymers) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    const referenceMaterial = getReferenceMaterial(row);
    if (!referenceMaterial) { return; }

    Object.entries(row.products).forEach(([productName, productMaterial]) => {
      const stoichiometryCoefficient = (productMaterial.aux.coefficient ?? 1.0)
    / (referenceMaterial.aux.coefficient ?? 1.0);
      const equivalent = computeEquivalent(productMaterial, referenceMaterial, 'products')
    / stoichiometryCoefficient;
      const percentYield = reactionHasPolymers ? (equivalent * 100)
        : ((equivalent <= 1 ? equivalent : 1) * 100);

      row.products[productName].aux.yield = percentYield;
    });
  });
  return updatedVariations;
}

function updateEquivalents(variations) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    const referenceMaterial = getReferenceMaterial(row);
    if (!referenceMaterial) { return; }

    ['startingMaterials', 'reactants'].forEach((materialType) => {
      Object.entries(row[materialType]).forEach(([materialName, material]) => {
        if (material.aux.isReference) { return; }
        row[materialType][materialName].aux.equivalent = computeEquivalent(material, referenceMaterial);
      });
    });
  });
  return updatedVariations;
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
          row[materialType][material.id] = getMaterialData(material, materialType);
        }
      });
    });
  });
  return updatedVariations;
}

export {
  createVariationsRow,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  updateYields,
  updateEquivalents,
  temperatureUnits,
  durationUnits,
  massUnits,
  volumeUnits,
  convertUnit,
  materialTypes,
  getGramFromMol,
  getMolFromGram,
  computeEquivalent,
  getReferenceMaterial
};
