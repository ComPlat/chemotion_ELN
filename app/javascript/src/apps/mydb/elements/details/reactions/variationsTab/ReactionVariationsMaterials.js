import { get, cloneDeep } from 'lodash';
import {
  materialTypes, getStandardUnits, getCellDataType, getStandardValue, convertUnit,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  MaterialOverlay, EntrySelectionHeader, UnitToggleHeader,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import { calculateTON, calculateFeedstockMoles } from 'src/utilities/UnitsConversion';

const concentrationEnabledMaterialTypes = ['startingMaterials', 'reactants'];

function isConcentrationEnabledMaterial(material) {
  const { aux = {} } = material || {};
  return concentrationEnabledMaterialTypes.includes(aux.materialType)
    && !['feedstock', 'catalyst'].includes(aux.gasType);
}

function canDeriveReactionVolumeFromMaterial(material) {
  if (!isConcentrationEnabledMaterial(material)) {
    return false;
  }

  const amount = material.amount?.value;
  const concentration = material.concentration?.value;
  return Number.isFinite(amount)
    && Number.isFinite(concentration)
    && concentration > 0;
}

function deriveReactionVolumeFromMaterial(material) {
  if (!canDeriveReactionVolumeFromMaterial(material)) {
    return null;
  }

  return material.amount.value / material.concentration.value;
}

function updateConcentrationsForReactionMaterials(row, reactionVolume, editedField = null) {
  const updatedRow = cloneDeep(row);

  if (!Number.isFinite(reactionVolume) || reactionVolume <= 0) {
    return updatedRow;
  }

  const [editedMaterialType, editedMaterialId] = typeof editedField === 'string'
    ? editedField.split('.')
    : [];

  ['startingMaterials', 'reactants'].forEach((materialType) => {
    Object.entries(updatedRow[materialType] || {}).forEach(([materialId, material]) => {
      if (!isConcentrationEnabledMaterial(material)) {
        return;
      }

      if (materialType === editedMaterialType && materialId === editedMaterialId) {
        return;
      }

      const amount = material.amount?.value;
      if (!Number.isFinite(amount) || amount < 0 || !material.concentration) {
        return;
      }

      material.concentration.value = amount / reactionVolume;
    });
  });

  return updatedRow;
}

function materialContributesToCombinedVolumeVariations(material) {
  const volume = material?.volume?.value;
  if (!Number.isFinite(volume) || volume <= 0) {
    return false;
  }

  const gasType = material?.aux?.gasType;
  if (gasType === 'feedstock') {
    return false;
  }

  if (gasType === 'catalyst') {
    const purity = material?.aux?.purity;
    return Number.isFinite(purity) && purity > 0;
  }

  return true;
}

function computeCombinedReactionVolume(row = {}) {
  let totalVolume = 0;

  Object.values(row.solvents || {}).forEach((solvent) => {
    const solventVolume = solvent?.volume?.value;
    if (Number.isFinite(solventVolume) && solventVolume > 0) {
      totalVolume += solventVolume;
    }
  });

  ['startingMaterials', 'reactants'].forEach((materialType) => {
    Object.values(row[materialType] || {}).forEach((material) => {
      if (materialContributesToCombinedVolumeVariations(material)) {
        totalVolume += material.volume.value;
      }
    });
  });

  return totalVolume > 0 ? totalVolume : null;
}

function getValidReactionVolume(value) {
  return Number.isFinite(value) && value > 0 ? value : null;
}

function getContextReactionVolumeByRowId(context = {}) {
  if (context.reactionVolumeByRowId && typeof context.reactionVolumeByRowId === 'object') {
    return context.reactionVolumeByRowId;
  }

  if (context.reactionVolumeByRowIdRef?.current && typeof context.reactionVolumeByRowIdRef.current === 'object') {
    return context.reactionVolumeByRowIdRef.current;
  }

  return {};
}

function getReactionVolumeForRow(context = {}, row = {}) {
  const rowVolumes = getContextReactionVolumeByRowId(context);
  const rowVolume = rowVolumes?.[row.id];

  return getValidReactionVolume(rowVolume);
}

function resolveReactionVolumeFromContext(context = {}, row = {}) {
  const {
    useReactionVolume,
    lockReactionVolume,
  } = context;

  const validReactionVolume = getReactionVolumeForRow(context, row);
  const validCombinedReactionVolume = computeCombinedReactionVolume(row);

  if (useReactionVolume) {
    return validReactionVolume ?? validCombinedReactionVolume;
  }

  if (lockReactionVolume) {
    return validCombinedReactionVolume;
  }

  return validCombinedReactionVolume ?? validReactionVolume;
}

function shouldPropagateConcentrationOnEdit(material, changedEntry, concentrationContext = {}) {
  if (material?.aux?.gasType === 'feedstock') {
    return false;
  }

  if (changedEntry !== 'concentration') {
    return false;
  }

  const lockReactionVolume = !!concentrationContext?.lockReactionVolume;
  const useReactionVolume = !!concentrationContext?.useReactionVolume;

  return lockReactionVolume !== useReactionVolume;
}

function updateVariationsRowOnConcentrationMaterialChange(
  row,
  field,
  changedEntry,
  concentrationContext = {}
) {
  const updatedRow = cloneDeep(row);
  const material = get(updatedRow, field);

  if (!material || !material.aux) {
    return { row: updatedRow, contextUpdate: null };
  }

  const shouldAutoEnableConcentration = !concentrationContext.lockReactionVolume
    && !concentrationContext.useReactionVolume
    && changedEntry === 'concentration'
    && material.aux.gasType !== 'feedstock';

  const effectiveConcentrationContext = shouldAutoEnableConcentration
    ? { ...concentrationContext, useReactionVolume: true }
    : concentrationContext;

  if (!shouldPropagateConcentrationOnEdit(material, changedEntry, effectiveConcentrationContext)) {
    return { row: updatedRow, contextUpdate: null };
  }

  let reactionVolume = resolveReactionVolumeFromContext(effectiveConcentrationContext, updatedRow);
  let contextUpdate = shouldAutoEnableConcentration
    ? { useReactionVolume: true }
    : null;

  if (!effectiveConcentrationContext.lockReactionVolume && effectiveConcentrationContext.useReactionVolume) {
    const derivedReactionVolume = deriveReactionVolumeFromMaterial(material);
    if (Number.isFinite(derivedReactionVolume) && derivedReactionVolume > 0) {
      reactionVolume = derivedReactionVolume;
      contextUpdate = {
        ...(contextUpdate || {}),
        reactionVolumeByRowIdPatch: { [updatedRow.id]: derivedReactionVolume },
        useReactionVolume: true,
      };
    }
  }

  const rowWithUpdatedConcentrations = updateConcentrationsForReactionMaterials(
    updatedRow,
    reactionVolume,
    field
  );

  return { row: rowWithUpdatedConcentrations, contextUpdate };
}

function getVariationsSbmmID(id) {
  return `sbmm:${id}`;
}

function normalizeSbmmForVariations(material) {
  return {
    ...material,
    id: getVariationsSbmmID(material.id),
    molecule_molecular_weight:
      material.molecule_molecular_weight
      ?? material.sequence_based_macromolecule?.molecular_weight
      ?? null,
  };
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
  const { molecularWeight } = material.aux;
  const purity = material.aux.purity || 1.0;

  return (mol / purity) * molecularWeight;
}

function getVolumeFromGram(gram, material) {
  if (material.aux.molarity) {
    return (gram * material.aux.purity) / (material.aux.molarity * material.aux.molecularWeight);
  } if (material.aux.density) {
    return gram / (material.aux.density * 1000);
  }
  return 0;
}

function getGramFromVolume(volume, material) {
  if (material.aux.molarity) {
    return volume * material.aux.molarity * material.aux.molecularWeight;
  } if (material.aux.density) {
    return volume * material.aux.density * 1000;
  }
  return 0;
}

function getReferenceMaterial(row) {
  const rowCopy = cloneDeep(row);
  const potentialReferenceMaterials = { ...rowCopy.startingMaterials, ...rowCopy.reactants };
  return Object.values(potentialReferenceMaterials).find((material) => material.aux?.isReference || false);
}

function getCatalystMaterial(row) {
  const rowCopy = cloneDeep(row);
  const potentialCatalystMaterials = { ...rowCopy.startingMaterials, ...rowCopy.reactants };
  return Object.values(potentialCatalystMaterials).find((material) => material.aux?.gasType === 'catalyst' || false);
}

function getFeedstockMaterial(row) {
  const rowCopy = cloneDeep(row);
  const potentialFeedstockMaterials = { ...rowCopy.startingMaterials, ...rowCopy.reactants };
  return Object.values(potentialFeedstockMaterials).find((material) => material.aux?.gasType === 'feedstock' || false);
}

function computeEquivalent(material, referenceMaterial) {
  return getMolFromGram(material.mass.value, material)
  / getMolFromGram(referenceMaterial.mass.value, referenceMaterial);
}

function computePercentYield(material, referenceMaterial, reactionHasPolymers) {
  const stoichiometryCoefficient = (material.aux.coefficient ?? 1.0)
    / (referenceMaterial.aux.coefficient ?? 1.0);
  const equivalent = computeEquivalent(material, referenceMaterial)
    / stoichiometryCoefficient;
  return reactionHasPolymers ? (equivalent * 100)
    : ((equivalent <= 1 ? equivalent : 1) * 100);
}

function computePercentYieldGas(materialAmount, feedstockMaterial, vesselVolume) {
  const feedstockPurity = feedstockMaterial?.aux.purity || 1;
  const feedstockAmount = calculateFeedstockMoles(vesselVolume, feedstockPurity);
  return (materialAmount / feedstockAmount) * 100;
}

function getReactionMaterials(reaction) {
  const reactionCopy = cloneDeep(reaction);
  return Object.entries(materialTypes).reduce((materialsByType, [materialType, { reactionAttributeName }]) => {
    const materials = reactionCopy[reactionAttributeName] || [];
    if (materialType === 'reactants') {
      materialsByType[materialType] = [
        ...materials,
        ...(reactionCopy.reactant_sbmm_samples || []).map(normalizeSbmmForVariations)
      ].filter((material) => !material.isNew);
    } else {
      materialsByType[materialType] = materials.filter((material) => !material.isNew);
    }
    return materialsByType;
  }, {});
}

function getReactionMaterialsIDsToLabels(materials) {
  return Object.fromEntries(
    Object.entries(materials).map(([materialType, materialsOfType]) => [
      materialType,
      Object.fromEntries(
        materialsOfType.map(
          ({ id, preferred_label, short_label }) => [id, preferred_label || short_label || id.toString()]
        )
      )
    ])
  );
}

function updateYields(row, reactionHasPolymers) {
  const updatedRow = cloneDeep(row);
  const referenceMaterial = getReferenceMaterial(updatedRow);
  if (!referenceMaterial) { return updatedRow; }

  Object.values(updatedRow.products).forEach((productMaterial) => {
    if (productMaterial.aux.gasType === 'gas') { return; }
    productMaterial.yield.value = computePercentYield(
      productMaterial,
      referenceMaterial,
      reactionHasPolymers
    );
  });

  return updatedRow;
}

function updateEquivalents(row) {
  const updatedRow = cloneDeep(row);
  const referenceMaterial = getReferenceMaterial(updatedRow);
  if (!referenceMaterial) { return updatedRow; }

  ['startingMaterials', 'reactants'].forEach((materialType) => {
    Object.values(updatedRow[materialType]).forEach((material) => {
      if (material.aux.isReference) { return; }
      const updatedEquivalent = computeEquivalent(material, referenceMaterial);
      material.equivalent.value = updatedEquivalent;
    });
  });
  return updatedRow;
}

function getMaterialEntries(materialType, gasType) {
  switch ((gasType !== 'off') ? gasType : materialType) {
    case 'solvents':
      return ['volume'];
    case 'products':
      return ['mass', 'amount', 'volume', 'yield'];
    case 'startingMaterials':
    case 'reactants':
    case 'feedstock':
      return ['mass', 'amount', 'volume', 'equivalent', 'concentration'];
    case 'catalyst':
      return ['mass', 'amount', 'volume', 'equivalent'];
    case 'gas':
      return [
        'duration',
        'temperature',
        'concentration',
        'turnoverNumber',
        'turnoverFrequency',
        'mass',
        'amount',
        'volume',
        'yield'
      ];
    default:
      return [];
  }
}

function cellIsEditable(params) {
  const { data, colDef } = params;
  const { entry, field } = colDef;
  const cellData = get(data, field);
  const { isReference, gasType, materialType } = cellData.aux;

  switch (entry) {
    case 'equivalent':
      return !isReference;
    case 'mass':
      return !['feedstock', 'gas'].includes(gasType);
    case 'amount':
      return materialType !== 'products';
    case 'volume':
      return gasType !== 'gas';
    case 'yield':
    case 'turnoverNumber':
    case 'turnoverFrequency':
      return false;
    default:
      return true;
  }
}

function getMaterialGasType(material, gasMode) {
  const gasType = material.gas_type ?? 'off';
  return gasMode ? gasType : 'off';
}

function getMaterialAux(material, materialType, gasMode, vesselVolume) {
  return {
    coefficient: material.coefficient ?? null,
    isReference: material.reference ?? false,
    loading: (Array.isArray(material.residues) && material.residues.length) ? material.residues[0].custom_info?.loading : null,
    purity: material.purity ?? null,
    density: material.density ?? null,
    molarity: material.molarity_value ?? null,
    molecularWeight: material.molecule_molecular_weight ?? null,
    sumFormula: material.molecule_formula ?? null,
    gasType: getMaterialGasType(material, gasMode),
    vesselVolume,
    materialType,
  };
}

function getMaterialData(material, materialType, gasMode = false, vesselVolume = null) {
  const materialCopy = cloneDeep(material);
  const gasType = getMaterialGasType(materialCopy, gasMode);

  // User-editable data is represented as "entries", e.g., `foo: {value: bar, unit: baz}.
  const entries = getMaterialEntries(materialType, gasType);
  const materialData = entries.reduce((data, entry) => {
    data[entry] = { value: getStandardValue(entry, materialCopy), unit: getStandardUnits(entry, gasType)[0] };
    return data;
  }, {});

  // Non-user-editable data (i.e., read-only entries) is represented as "aux", e.g., `foo: bar`.
  materialData.aux = getMaterialAux(
    materialCopy,
    materialType,
    gasMode,
    vesselVolume
  );

  return materialData;
}

function updateVariationsOnAuxChange(variations, materials, gasMode, vesselVolume) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.keys(materialTypes).forEach((materialType) => {
      materials[materialType].forEach((material) => {
        if (!Object.prototype.hasOwnProperty.call(row[materialType], material.id.toString())) {
          return;
        }
        if (row[materialType][material.id].aux.gasType !== getMaterialGasType(material, gasMode)) {
          // Re-instantiate the entire material data because we need another set of entries if gas type changes.
          row[materialType][material.id] = getMaterialData(
            material,
            materialType,
            gasMode,
            vesselVolume
          );
        } else {
          row[materialType][material.id].aux = getMaterialAux(material, materialType, gasMode, vesselVolume);
        }
      });
    });
  });
  return updatedVariations;
}

function getReactionMaterialsHashes(materials, gasMode, vesselVolume) {
  // Hash in the sense of "a string that uniquely identifies the material".
  return Object.fromEntries(
    Object.entries(materials).map(([materialType, materialsOfType]) => [
      materialType,
      materialsOfType.map(
        (material) => material.id.toString()
        + JSON.stringify(getMaterialAux(material, materialType, gasMode, vesselVolume))
      )
    ])
  );
}

function getMaterialColumnGroupChild(material, materialType, gasMode) {
  const materialCopy = cloneDeep(material);
  const gasType = getMaterialGasType(materialCopy, gasMode);
  const entries = getMaterialEntries(materialType, gasType);
  let names = new Set([]);
  ['short_label', 'external_label', 'name', 'molecule_formula', 'molecule_iupac_name'].forEach((name) => {
    if (materialCopy[name]) {
      names.add(materialCopy[name]);
    }
  });
  names.add(`ID: ${materialCopy.id}`);
  names = Array.from(names);

  return {
    headerGroupComponent: EntrySelectionHeader,
    headerGroupComponentParams: { names, gasType },
    headerName: names[0],
    groupId: `${materialCopy.id}`,
    children: entries.map((entry, index) => (
      {
        field: `${materialType}.${materialCopy.id}`, // Must be unique.
        colId: `${materialType}.${materialCopy.id}.${entry}`,
        headerComponentParams: { innerHeaderComponent: UnitToggleHeader },
        tooltipField: `${materialType}.${materialCopy.id}`,
        tooltipComponent: MaterialOverlay,
        editable: (params) => cellIsEditable(params),
        cellDataType: getCellDataType(entry, gasType),
        displayUnit: getStandardUnits(entry, gasType)[0],
        units: getStandardUnits(entry, gasType),
        entry,
        hide: index !== 0,
      })),
  };
}

function updateColumnDefinitionsMaterialsOnAuxChange(columnDefinitions, materials, gasMode) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  Object.keys(materialTypes).forEach((materialType) => {
    const group = updatedColumnDefinitions.find((groupColDef) => groupColDef.groupId === materialType);
    group.children = group.children.map((subGroup) => {
      const material = materials[materialType].find((m) => m.id.toString() === subGroup.groupId);
      const gasType = getMaterialGasType(material, gasMode);

      if (gasType !== subGroup.headerGroupComponentParams.gasType) {
        return getMaterialColumnGroupChild(material, materialType, gasMode);
      }

      return subGroup;
    });
  });

  return updatedColumnDefinitions;
}

function removeObsoleteMaterialColumns(materials, columns) {
  const updatedColumns = cloneDeep(columns);

  Object.entries(materials).forEach(([materialType, materialsOfType]) => {
    updatedColumns[materialType] = updatedColumns[materialType].filter(
      (materialID) => materialsOfType.map((material) => material.id.toString()).includes(materialID.toString())
    );
  });

  return updatedColumns;
}

function updateVariationsRowOnReferenceMaterialChange(row, reactionHasPolymers) {
  let updatedRow = cloneDeep(row);
  updatedRow = updateEquivalents(updatedRow);
  updatedRow = updateYields(updatedRow, reactionHasPolymers);

  return updatedRow;
}

function updateVariationsRowOnCatalystMaterialChange(row) {
  const updatedRow = cloneDeep(row);
  const catalystMaterialAmount = getCatalystMaterial(updatedRow)?.amount.value;

  Object.values(updatedRow.products).forEach((productMaterial) => {
    if (productMaterial.aux.gasType === 'gas') {
      const updatedTurnoverNumber = calculateTON(
        productMaterial.amount.value,
        catalystMaterialAmount,
      );
      const durationInHours = convertUnit(
        productMaterial.duration.value,
        productMaterial.duration.unit,
        'Hour(s)'
      );
      const updatedTurnoverFrequency = updatedTurnoverNumber / (durationInHours || 1);

      productMaterial.turnoverNumber.value = updatedTurnoverNumber;
      productMaterial.turnoverFrequency.value = updatedTurnoverFrequency;
    }
  });

  return updatedRow;
}

function updateVariationsRowOnFeedstockMaterialChange(row) {
  const updatedRow = cloneDeep(row);

  Object.values(updatedRow.products).forEach((productMaterial) => {
    if (productMaterial.aux.gasType === 'gas') {
      productMaterial.yield.value = computePercentYieldGas(
        productMaterial.amount.value,
        getFeedstockMaterial(updatedRow),
        productMaterial.aux.vesselVolume
      );
    }
  });

  return updatedRow;
}

function computeDerivedQuantitiesVariationsRow(row, reactionHasPolymers, gasMode) {
  let updatedRow = row;
  updatedRow = updateVariationsRowOnReferenceMaterialChange(row, reactionHasPolymers);
  if (gasMode) {
    updatedRow = updateVariationsRowOnCatalystMaterialChange(updatedRow);
    updatedRow = updateVariationsRowOnFeedstockMaterialChange(updatedRow);
  }

  return updatedRow;
}

export {
  getMaterialColumnGroupChild,
  getReactionMaterials,
  getReactionMaterialsIDsToLabels,
  getReactionMaterialsHashes,
  getMaterialData,
  updateColumnDefinitionsMaterialsOnAuxChange,
  updateVariationsRowOnReferenceMaterialChange,
  updateVariationsRowOnCatalystMaterialChange,
  updateVariationsRowOnFeedstockMaterialChange,
  updateVariationsRowOnConcentrationMaterialChange,
  computeDerivedQuantitiesVariationsRow,
  removeObsoleteMaterialColumns,
  updateVariationsOnAuxChange,
  getReferenceMaterial,
  getCatalystMaterial,
  getFeedstockMaterial,
  getMolFromGram,
  getGramFromMol,
  getVolumeFromGram,
  getGramFromVolume,
  computeEquivalent,
  computePercentYield,
  computePercentYieldGas,
  computeCombinedReactionVolume,
  resolveReactionVolumeFromContext,
  cellIsEditable,
};
