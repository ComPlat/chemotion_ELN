import { get, cloneDeep } from 'lodash';
import {
  materialTypes, getStandardUnits, getCellDataType, updateColumnDefinitions, getStandardValue, convertUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  MaterialOverlay, MenuHeader
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import { calculateTON, calculateFeedstockMoles } from 'src/utilities/UnitsConversion';

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
    materialsByType[materialType] = reactionCopy[reactionAttributeName].filter((material) => !material.isNew);
    return materialsByType;
  }, {});
}

function getReactionMaterialsIDs(materials) {
  return Object.fromEntries(
    Object.entries(materials).map(([materialType, materialsOfType]) => [
      materialType,
      materialsOfType.map((material) => material.id.toString())
    ])
  );
}

function getReactionMaterialsGasTypes(materials) {
  return Object.values(materials).flat().map((material) => material.gas_type);
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
      return ['mass', 'amount', 'yield'];
    case 'startingMaterials':
    case 'reactants':
    case 'catalyst':
      return ['mass', 'amount', 'equivalent'];
    case 'feedstock':
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
        'yield'
      ];
    default:
      return [];
  }
}

function cellIsEditable(params) {
  const entry = params.colDef.entryDefs.currentEntry;
  const cellData = get(params.data, params.colDef.field);
  const { isReference, gasType, materialType } = cellData.aux;

  switch (entry) {
    case 'equivalent':
      return !isReference;
    case 'mass':
      return !['feedstock', 'gas'].includes(gasType);
    case 'amount':
      return materialType !== 'products';
    case 'yield':
    case 'turnoverNumber':
    case 'turnoverFrequency':
      return false;
    default:
      return true;
  }
}

function getMaterialData(material, materialType, gasMode = false, vesselVolume = null) {
  const materialCopy = cloneDeep(material);

  let gasType = materialCopy.gas_type ?? 'off';
  gasType = gasMode ? gasType : 'off';

  // Mutable data is represented as "entries", e.g., `foo: {value: bar, unit: baz}.
  const entries = getMaterialEntries(materialType, gasType);
  const materialData = entries.reduce((data, entry) => {
    data[entry] = { value: getStandardValue(entry, materialCopy), unit: getStandardUnits(entry)[0] };
    return data;
  }, {});

  materialData.aux = {
    coefficient: materialCopy.coefficient ?? null,
    isReference: materialCopy.reference ?? false,
    loading: (Array.isArray(materialCopy.residues) && materialCopy.residues.length) ? materialCopy.residues[0].custom_info?.loading : null,
    purity: materialCopy.purity ?? null,
    molarity: materialCopy.molarity_value ?? null,
    molecularWeight: materialCopy.molecule_molecular_weight ?? null,
    sumFormula: materialCopy.molecule_formula ?? null,
    gasType,
    vesselVolume,
    materialType,
  };

  return materialData;
}

function getMaterialColumnGroupChild(material, materialType, gasMode) {
  const materialCopy = cloneDeep(material);

  let gasType = materialCopy.gas_type ?? 'off';
  gasType = gasMode ? gasType : 'off';

  const entries = getMaterialEntries(
    materialType,
    gasType
  );
  const entry = entries[0];

  let names = new Set([`ID: ${materialCopy.id}`]);
  ['external_label', 'name', 'short_label', 'molecule_formula', 'molecule_iupac_name'].forEach((name) => {
    if (materialCopy[name]) {
      names.add(materialCopy[name]);
    }
  });
  names = Array.from(names);

  return {
    field: `${materialType}.${materialCopy.id}`, // Must be unique.
    tooltipField: `${materialType}.${materialCopy.id}`,
    tooltipComponent: MaterialOverlay,
    entryDefs: {
      currentEntry: entry,
      displayUnit: getStandardUnits(entry)[0],
      availableEntries: entries
    },
    editable: (params) => cellIsEditable(params),
    cellDataType: getCellDataType(entry, gasType),
    headerComponent: MenuHeader,
    headerComponentParams: {
      names,
      gasType,
    },
  };
}

function resetColumnDefinitionsMaterials(columnDefinitions, materials, selectedColumns, gasMode) {
  return Object.entries(materials).reduce((updatedDefinitions, [materialType, materialsOfType]) => {
    const updatedMaterials = materialsOfType
      .filter((material) => selectedColumns[materialType].includes(material.id.toString()))
      .map((material) => getMaterialColumnGroupChild(material, materialType, gasMode));

    return updateColumnDefinitions(
      updatedDefinitions,
      materialType,
      'children',
      updatedMaterials
    );
  }, cloneDeep(columnDefinitions));
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

function updateVariationsGasTypes(variations, materials, gasMode) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.keys(materialTypes).forEach((materialType) => {
      materials[materialType].forEach((material) => {
        const currentGasType = material.gas_type ?? 'off';
        if (!Object.prototype.hasOwnProperty.call(row[materialType], material.id.toString())) {
          return;
        }
        if (currentGasType !== row[materialType][material.id].aux.gasType) {
          row[materialType][material.id] = getMaterialData(material, materialType, gasMode);
        }
      });
    });
  });
  return updatedVariations;
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
  getReactionMaterialsIDs,
  getReactionMaterialsGasTypes,
  getMaterialData,
  resetColumnDefinitionsMaterials,
  updateVariationsRowOnReferenceMaterialChange,
  updateVariationsRowOnCatalystMaterialChange,
  updateVariationsRowOnFeedstockMaterialChange,
  computeDerivedQuantitiesVariationsRow,
  removeObsoleteMaterialColumns,
  updateVariationsGasTypes,
  getReferenceMaterial,
  getCatalystMaterial,
  getFeedstockMaterial,
  getMolFromGram,
  getGramFromMol,
  computeEquivalent,
  computePercentYield,
  computePercentYieldGas,
  cellIsEditable,
};
