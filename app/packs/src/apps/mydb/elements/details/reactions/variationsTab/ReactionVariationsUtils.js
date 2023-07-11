import cloneDeep from 'lodash/cloneDeep';

function getMaterialData(material, requestedUnit) {
  let value = null;
  let unit = 'None';
  if (requestedUnit === 'Equiv') {
    value = material.equivalent ?? null;
    unit = 'Equiv';
  } else if (requestedUnit === 'Amount') {
    value = material.amount_g ?? null;
    unit = 'g';
  }
  const aux = {
    coefficient: material.coefficient ?? null,
    isReference: material.reference ?? false,
    referenceAmount: material.reference ?? false ? material.amount_g ?? null : null,
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
  const amount = material.aux.isReference ? material.aux.referenceAmount : material.value;

  if (material.aux.loading) {
    return (material.aux.loading * amount) / 1000.0;
  }

  if (material.aux.molarity) {
    const liter = (amount * material.aux.purity)
      / (material.aux.molarity * material.aux.molecularWeight);
    return liter * material.molarity;
  }

  return (amount * material.aux.purity) / material.aux.molecularWeight;
}

function createVariationsRow(reaction, id, materialUnit) {
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
    startingMaterials: reaction.starting_materials.reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v, materialUnit) }), {}),
    reactants: reaction.reactants.reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v, materialUnit) }), {}),
    products: reaction.products.reduce((a, v) => (
      { ...a, [v.id]: getMaterialData(v, 'Amount') }), {})
  };
  return row;
}

function removeObsoleteMaterialsFromVariations(variations, currentMaterials) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    ['startingMaterials', 'reactants', 'products'].forEach((materialType) => {
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
    ['startingMaterials', 'reactants', 'products'].forEach((materialType) => {
      currentMaterials[materialType].forEach((material) => {
        if (!(material.id in row[materialType])) {
          row[materialType][material.id] = getMaterialData(material, 'Equiv');
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

    Object.entries(row.products).forEach(([productName, productProperties]) => {
      const stoichiometryCoefficient = (productProperties.aux.coefficient || 1.0)
      / (referenceMaterial.aux.coefficient || 1.0);
      const equivalent = getMolFromGram(productProperties)
      / getMolFromGram(referenceMaterial) / stoichiometryCoefficient;
      const percentYield = reactionHasPolymers ? (equivalent * 100).toFixed(0)
        : ((equivalent <= 1 ? equivalent : 1) * 100).toFixed(0);

      row.products[productName].aux.yield = percentYield;
    });
  });
  return updatedVariations;
}

export {
  createVariationsRow,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  computeYield
};
