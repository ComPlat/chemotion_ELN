import cloneDeep from 'lodash/cloneDeep';
import { convertTemperature, convertDuration } from 'src/models/Reaction';
import { metPreConv as convertAmount } from 'src/utilities/metricPrefix';

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

function getReactionMaterials(reaction) {
  return Object.entries(materialTypes).reduce((materialsByType, [materialType, { reactionAttributeName }]) => {
    materialsByType[materialType] = reaction[reactionAttributeName];
    return materialsByType;
  }, {});
}

function getMaterialHeaderNames(material) {
  const names = [`ID: ${material.id.toString()}`];
  ['external_label', 'name', 'short_label', 'molecule_formula', 'molecule_iupac_name'].forEach((name) => {
    if (material[name]) {
      names.push(material[name]);
    }
  });
  return names;
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

function getMolFromGram(gram, material) {
  if (material.aux.loading) {
    return (material.aux.loading * gram) / 1e4;
  }

  if (material.aux.molarity) {
    const liter = (gram * material.aux.purity)
      / (material.aux.molarity * material.aux.molecularWeight);
    return liter * material.aux.molarity;
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
  return Object.values(potentialReferenceMaterials).find((material) => material.aux?.isReference || false);
}

function computeEquivalent(material, referenceMaterial) {
  return getMolFromGram(convertUnit(material.value, material.unit, 'g'), material)
  / getMolFromGram(convertUnit(referenceMaterial.value, referenceMaterial.unit, 'g'), referenceMaterial);
}

function computePercentYield(material, referenceMaterial, reactionHasPolymers) {
  const stoichiometryCoefficient = (material.aux.coefficient ?? 1.0)
    / (referenceMaterial.aux.coefficient ?? 1.0);
  const equivalent = computeEquivalent(material, referenceMaterial, 'products')
    / stoichiometryCoefficient;
  return reactionHasPolymers ? (equivalent * 100)
    : ((equivalent <= 1 ? equivalent : 1) * 100);
}

function updateYields(variationsRow, reactionHasPolymers) {
  const updatedVariationsRow = cloneDeep(variationsRow);
  const referenceMaterial = getReferenceMaterial(updatedVariationsRow);

  Object.entries(updatedVariationsRow.products).forEach(([productName, productMaterial]) => {
    updatedVariationsRow.products[productName].aux.yield = computePercentYield(
      productMaterial,
      referenceMaterial,
      reactionHasPolymers
    );
  });

  return updatedVariationsRow;
}

function updateEquivalents(variationsRow) {
  const updatedVariationsRow = cloneDeep(variationsRow);
  const referenceMaterial = getReferenceMaterial(updatedVariationsRow);

  ['startingMaterials', 'reactants'].forEach((materialType) => {
    Object.entries(updatedVariationsRow[materialType]).forEach(([materialName, material]) => {
      if (material.aux.isReference) { return; }
      updatedVariationsRow[materialType][materialName].aux.equivalent = computeEquivalent(material, referenceMaterial);
    });
  });
  return updatedVariationsRow;
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

function getMaterialData(material, materialType) {
  const unit = materialType === 'solvents' ? volumeUnits[0] : massUnits[0];
  let value = materialType === 'solvents' ? (material.amount_l ?? null) : (material.amount_g ?? null);
  value = materialType === 'solvents' ? convertUnit(value, 'l', unit) : convertUnit(value, 'g', unit);
  const aux = {
    coefficient: material.coefficient ?? null,
    isReference: material.reference ?? false,
    loading: (Array.isArray(material.residues) && material.residues.length) ? material.residues[0].custom_info?.loading : null,
    purity: material.purity ?? null,
    molarity: material.molarity_value ?? null,
    molecularWeight: material.molecule_molecular_weight ?? null,
    sumFormula: material.molecule_formula ?? null,
    yield: null,
    equivalent: null
  };
  return { value, unit, aux };
}

function createVariationsRow(reaction, id) {
  const { dispValue: durationValue = null, dispUnit: durationUnit = 'None' } = reaction.durationDisplay ?? {};
  const { userText: temperatureValue = null, valueUnit: temperatureUnit = 'None' } = reaction.temperature ?? {};
  let row = {
    id,
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
    row[materialType] = reaction[reactionAttributeName].reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v, materialType) }), {});
  });

  row = updateYields(row, reaction.has_polymers);
  row = updateEquivalents(row);

  return row;
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
  getReferenceMaterial,
  getSequentialId,
  computePercentYield,
  getReactionMaterials,
  getMaterialHeaderNames,
  getVariationsRowName,
};
