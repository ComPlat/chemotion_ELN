import Component from 'src/models/Component';

// Builds the flat array of parent-row data for the composition table.
// Mol% and exp mol ratio are computed inside HierarchicalCompositionTable (gridRowData useMemo)
// because they require element-level sub-row data that is only available in the component.
const buildHierarchicalMaterialRows = (components) => {
  const rowsData = [];
  let totalExpWtRatio = 0;

  components?.forEach((item, index) => {
    const {
      source,
      template_category,
      template_id,
      name,
      parseComponentSource,
      calcWeightRatioWithoutWeight,
    } = new Component(item);

    if (name !== 'HierarchicalMaterial') return;

    const molar_mass = parseFloat(item.molar_mass, 10) || 0;
    const weight_ratio_exp = parseFloat(item.weight_ratio_exp, 10) || 0;
    const molarMassStateValue = parseFloat(components[index]?.molar_mass) || 0;
    const weightRatioExpStateValue = parseFloat(components[index]?.weight_ratio_exp) || 0;

    const { weightRatioCalc, component, source: sourceAlias } = parseComponentSource(source);

    const weightRatioCalcFloat = parseFloat(weightRatioCalc) || 0;
    const weightRatioCalcProcessed = weightRatioCalcFloat > 0
      ? weightRatioCalcFloat
      : parseFloat(calcWeightRatioWithoutWeight(components)) || 0;

    if (!component || !sourceAlias) return;

    // Calc mol ratio at compound level (calc_wt / MM) — used in col 4 for parent rows
    const molarRatioCalcMM = molarMassStateValue > 0
      ? parseFloat((weightRatioCalcProcessed / molarMassStateValue).toFixed(3))
      : 0.0;

    totalExpWtRatio = parseFloat((totalExpWtRatio + (weightRatioExpStateValue || 0.0)).toFixed(10));

    rowsData.push({
      index,
      template_category,
      template_id,
      component,
      sourceAlias,
      molar_mass,
      weight_ratio_exp,
      weightRatioCalcProcessed,
      molarRatioCalcMM, // col 4: Calc. mol ratio / Stoich. for parent rows
    });
  });

  // Sort by Calc. wt. ratio ascending (smallest on top)
  const sortedRows = rowsData.sort((a, b) => {
    const aVal = parseFloat(a.weightRatioCalcProcessed) || 0;
    const bVal = parseFloat(b.weightRatioCalcProcessed) || 0;
    return aVal - bVal;
  });

  return {
    rowsData: sortedRows,
    totalExpWtRatio: parseFloat(totalExpWtRatio.toFixed(3)),
  };
};

export default buildHierarchicalMaterialRows;
