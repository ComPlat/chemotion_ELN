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
    loading: material.residues[0]?.custom_info?.loading ?? null,
    purity: material.purity ?? null,
    molarity: material.molarity_value ?? null,
    molecularWeight: material.molecule_molecular_weight ?? null,
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

module.exports = {
  getMaterialData,
  getMolFromGram,
};
