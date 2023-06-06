export default function getMaterialData(material, requestedUnit) {
  let value = '';
  let unit = 'None';
  if (requestedUnit === 'Equiv') {
    value = material.equivalent ?? '';
    unit = 'Equiv';
  } else if (requestedUnit === 'Amount') {
    ({ value = '', unit = 'None' } = material.amount ?? {});
  }
  const aux = {
    coefficient: material.coefficient ?? null,
    isReference: material.reference ?? false,
  };
  return { value, unit, aux };
}
