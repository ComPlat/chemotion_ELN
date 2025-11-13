import Component from 'src/models/Component';

const buildHeteroMaterialRows = (components) => {
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
      weightRatioBasedExpCalc,
    } = new Component(item);

    // Only process heterogeneous materials
    if (name !== 'HeterogeneousMaterial') return;

    // Safe numeric conversions
    const molar_mass = parseFloat(item.molar_mass, 10) || 0;
    const weight_ratio_exp = parseFloat(item.weight_ratio_exp, 10) || 0;
    const molarMassStateValue = parseFloat(components[index]?.molar_mass) || 0;
    const weightRatioExpStateValue = parseFloat(components[index]?.weight_ratio_exp) || 0;

    const { weightRatioCalc, component, source: sourceAlias } = parseComponentSource(source);

    const weightRatioCalcProcessed =
      weightRatioCalc > 0 ? weightRatioCalc : calcWeightRatioWithoutWeight(components);

    const molarRatioCalcMM = parseFloat(
      weightRatioBasedExpCalc(weightRatioCalcProcessed, molarMassStateValue)
    );
    const weightRatioCalcMM = parseFloat(
      weightRatioBasedExpCalc(weightRatioExpStateValue, molarMassStateValue)
    );

    totalMolarCalc += molarRatioCalcMM || 0;
    totalMolarExp += weightRatioCalcMM || 0;

    rowsData.push({
      index,
      template_category,
      component,
      sourceAlias,
      molar_mass,
      weight_ratio_exp,
      weightRatioCalcProcessed,
      molarRatioCalcMM,
      weightRatioCalcMM,
    });
  });

  // Compute molar ratio percentages per row
  const rowsWithPercentages = rowsData.map((row) => ({
    ...row,
    molarRatioCalcPercent:
      totalMolarCalc > 0 ? (row.molarRatioCalcMM / totalMolarCalc).toFixed(3) : '-',
    molarRatioExpPercent:
      totalMolarExp > 0 ? (row.weightRatioCalcMM / totalMolarExp).toFixed(3) : '-',
  }));

  return { rowsData: rowsWithPercentages, totalMolarCalc, totalMolarExp };
};

export default buildHeteroMaterialRows;
