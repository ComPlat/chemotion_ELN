import Component from 'src/models/Component';

const buildHierarchicalMaterialRows = (components) => {
  const rowsData = [];
  let totalMolarCalc = 0;
  let totalMolarExp = 0;

  components?.forEach((item, index) => {
    const {
      source,
      template_category,
      name,
      parseComponentSource,
      calcWeightRatioWithoutWeight,
    } = new Component(item);

    // Only process hierarchical materials
    if (name !== 'HierarchicalMaterial') return;

    // Safe numeric conversions
    const molar_mass = parseFloat(item.molar_mass, 10) || 0;
    const weight_ratio_exp = parseFloat(item.weight_ratio_exp, 10) || 0;
    const molarMassStateValue = parseFloat(components[index]?.molar_mass) || 0;
    const weightRatioExpStateValue = parseFloat(components[index]?.weight_ratio_exp) || 0;

    const { weightRatioCalc, component, source: sourceAlias } = parseComponentSource(source);

    // Ensure weightRatioCalc is a float
    const weightRatioCalcFloat = parseFloat(weightRatioCalc) || 0;
    const weightRatioCalcProcessed = weightRatioCalcFloat > 0
      ? weightRatioCalcFloat
      : parseFloat(calcWeightRatioWithoutWeight(components)) || 0;

    // Calculate molar ratio (weight ratio / molar mass) for summing totals
    // This represents moles = weight / molar_mass
    // Ensure all calculations maintain float precision
    const molarRatioCalcMM = molarMassStateValue > 0
      ? parseFloat((weightRatioCalcProcessed / molarMassStateValue).toFixed(10))
      : 0.0;
    const molarRatioExpMM = molarMassStateValue > 0
      ? parseFloat((weightRatioExpStateValue / molarMassStateValue).toFixed(10))
      : 0.0;

    // Accumulate totals as floats
    totalMolarCalc = parseFloat((totalMolarCalc + (molarRatioCalcMM || 0.0)).toFixed(10));
    totalMolarExp = parseFloat((totalMolarExp + (molarRatioExpMM || 0.0)).toFixed(10));

    // Calculate Column 8: weight ratio (calc)/molar mass = weightRatioCalcProcessed / molarMassStateValue
    const weightRatioCalcMMValue = molarRatioCalcMM; // This is already weightRatioCalcProcessed / molarMassStateValue

    rowsData.push({
      index,
      template_category,
      component,
      sourceAlias,
      molar_mass,
      weight_ratio_exp,
      weightRatioCalcProcessed,
      molarRatioCalcMM: weightRatioCalcMMValue, // Column 8: weight ratio (calc)/molar mass
      // Store original for percentage and column 9 calculations
      originalMolarRatioCalcMM: molarRatioCalcMM,
      originalMolarRatioExpMM: molarRatioExpMM,
      molarMassStateValue, // Store for column 9 calculation
    });
  });

  // Compute molar ratio percentages per row and Column 9: molar ratio (calc)/molar mass
  // Column 9 uses the molar ratio calc percentage (as decimal) divided by molar mass
  // Ensure all intermediate calculations maintain float precision
  const rowsWithPercentages = rowsData.map((row) => {
    const molarRatioCalcPercentDecimal = totalMolarCalc > 0
      ? parseFloat((row.originalMolarRatioCalcMM / totalMolarCalc).toFixed(10))
      : 0.0;
    const molarRatioExpPercentDecimal = totalMolarExp > 0
      ? parseFloat((row.originalMolarRatioExpMM / totalMolarExp).toFixed(10))
      : 0.0;

    // Column 9: molar ratio (calc)/molar mass
    // Formula: Weight ratio exp / Molar Mass
    // This is: weight_ratio_exp / molarMassStateValue
    let weightRatioCalcMM = null;
    if (row.molarMassStateValue > 0) {
      // Calculate as: experimental weight ratio / molar mass
      const weightRatioExp = parseFloat(row.weight_ratio_exp) || 0.0;
      weightRatioCalcMM = parseFloat((weightRatioExp / row.molarMassStateValue).toFixed(10));
    }

    // Format all decimal values with toFixed(3)
    return {
      ...row,
      molarRatioCalcPercent:
        totalMolarCalc > 0 ? parseFloat(molarRatioCalcPercentDecimal.toFixed(3)) : '-',
      molarRatioExpPercent:
        totalMolarExp > 0 ? parseFloat(molarRatioExpPercentDecimal.toFixed(3)) : '-',
      molarRatioCalcMM: row.molarRatioCalcMM !== undefined && row.molarRatioCalcMM !== null
        ? parseFloat(row.molarRatioCalcMM.toFixed(3))
        : 0.0, // Column 8: weight ratio (calc)/molar mass
      weightRatioCalcMM: weightRatioCalcMM !== null
        ? parseFloat(weightRatioCalcMM.toFixed(3))
        : null, // Column 9: molar ratio (calc)/molar mass
    };
  });

  // Sort by Weight ratio calc./% (smallest on top)
  const sortedRows = rowsWithPercentages.sort((a, b) => {
    const aVal = parseFloat(a.weightRatioCalcProcessed) || 0;
    const bVal = parseFloat(b.weightRatioCalcProcessed) || 0;
    return aVal - bVal;
  });

  return {
    rowsData: sortedRows,
    totalMolarCalc: parseFloat(totalMolarCalc.toFixed(3)),
    totalMolarExp: parseFloat(totalMolarExp.toFixed(3)),
  };
};

export default buildHierarchicalMaterialRows;

