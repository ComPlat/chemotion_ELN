import Component from 'src/models/Component';
import { findTemplateIdCategoryFromTemplates } from 'src/utilities/ketcherSurfaceChemistry/iconBaseProvider';

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

  // Normalize parent-row mol ratios so the smallest compound = 1.
  // Raw wt%/MM values are tiny for heavy compounds (e.g. 0.0164); dividing by
  // the minimum gives readable ratios (1 : 33.7) without changing stored data.
  const minMolRatio = Math.min(
    ...sortedRows.map(r => r.molarRatioCalcMM).filter(v => v > 0)
  );
  if (minMolRatio > 0) {
    sortedRows.forEach(row => {
      row.molarRatioCalcMM = row.molarRatioCalcMM > 0
        ? parseFloat((row.molarRatioCalcMM / minMolRatio).toFixed(3))
        : 0;
    });
  }

  return {
    rowsData: sortedRows,
    totalExpWtRatio: parseFloat(totalExpWtRatio.toFixed(3)),
  };
};

export default buildHierarchicalMaterialRows;

// Rescales sub-row calcWt values within a segment so their sum stays locked to
// segmentCalcWt when one element's calcWt is changed (Mode B invariant).
// - editedIdx: index in rows of the element being changed
// - newCalcWt: the value the user entered
// Returns a new rows array; rows from other segments are untouched.
export const rescaleSegmentCalcWt = (rows, editedIdx, newCalcWt) => {
  const { segmentFormula, segmentCalcWt } = rows[editedIdx];
  const segTotal = parseFloat(segmentCalcWt) || 0;

  // Cap so one element can never exceed the whole segment
  const capped = segTotal > 0 ? Math.min(newCalcWt, segTotal) : newCalcWt;
  const remaining = segTotal - capped;

  const otherIndices = rows.reduce((acc, r, i) => {
    if (i !== editedIdx && r.segmentFormula === segmentFormula) acc.push(i);
    return acc;
  }, []);

  const otherSum = otherIndices.reduce((s, i) => s + (parseFloat(rows[i].calcWt) || 0), 0);

  // Distribute `remaining` across other elements proportionally.
  // The last element absorbs the rounding remainder so the total is exact.
  let distributed = 0;
  return rows.map((r, i) => {
    if (i === editedIdx) return { ...r, calcWt: capped };
    if (r.segmentFormula !== segmentFormula) return r;
    const isLast = i === otherIndices[otherIndices.length - 1];
    if (isLast) {
      // Absorb the exact arithmetic remainder — no additional rounding — so the
      // sum of all calcWt values equals segTotal exactly.
      return { ...r, calcWt: segTotal - capped - distributed };
    }
    const rescaled = otherSum > 0
      ? parseFloat(((parseFloat(r.calcWt) || 0) / otherSum * remaining).toFixed(3))
      : parseFloat((remaining / otherIndices.length).toFixed(3));
    distributed += rescaled;
    return { ...r, calcWt: rescaled };
  });
};

// Derives skeleton component objects from the TextNode sections embedded in a molfile.
// Used when switching to HierarchicalMaterial for a sample whose components were not
// persisted (e.g. the sample was originally saved as Micromolecule with SSC structure).
// TextNode line format: {polymerIndex}#{alias}#{"paragraphs":[...],"indent":0}
// Alias format: prefix_templateId_uniqueId — split('_')[1] is the integer template_id.
export const deriveComponentsFromMolfile = async (molfile) => {
  if (!molfile || typeof molfile !== 'string') return [];
  const lines = molfile.split('\n');
  const startIdx = lines.indexOf('> <TextNode>');
  const endIdx = lines.indexOf('> </TextNode>');
  if (startIdx === -1 || endIdx === -1 || endIdx <= startIdx) return [];
  const textNodeLines = lines.slice(startIdx + 1, endIdx).filter(Boolean);
  if (!textNodeLines.length) return [];

  const derived = [];
  for (const line of textNodeLines) {
    const firstHash = line.indexOf('#');
    const secondHash = line.indexOf('#', firstHash + 1);
    if (firstHash === -1 || secondHash === -1) continue; // eslint-disable-line no-continue
    const alias = line.slice(firstHash + 1, secondHash);
    const ket2Json = line.slice(secondHash + 1);
    const aliasParts = alias.split('_');
    if (aliasParts.length < 3) continue; // eslint-disable-line no-continue
    const templateId = parseInt(aliasParts[1], 10);
    if (Number.isNaN(templateId)) continue; // eslint-disable-line no-continue
    let label = '';
    try {
      const ket2 = JSON.parse(ket2Json);
      label = (ket2.paragraphs || [])
        .flatMap((p) => p.parts || [])
        .map((part) => part.text || '')
        .join('');
    } catch (_e) {
      label = alias;
    }
    if (!label) continue; // eslint-disable-line no-continue
    // eslint-disable-next-line no-await-in-loop
    const category = await findTemplateIdCategoryFromTemplates(templateId);
    derived.push({
      name: 'HierarchicalMaterial',
      source: label,
      template_id: templateId,
      template_category: category,
      molar_mass: 0,
      weight_ratio_exp: 0,
    });
  }
  return derived;
};
