import {get, cloneDeep} from 'lodash';
import {
    materialTypes, getStandardUnits, getCellDataType, updateColumnDefinitions, getStandardValue, convertUnit
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
    MaterialOverlay
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
    MenuHeader
}  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsTableHeader';
import {calculateTON, calculateFeedstockMoles} from 'src/utilities/UnitsConversion';

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

function getVolumeFromGram(gram, material) {
    if (material.aux.molarity) {
        return (gram * material.aux.purity) / (material.aux.molarity * material.aux.molecularWeight);
    }
    if (material.aux.density) {
        return gram / (material.aux.density * 1000);
    }
    return 0;
}

function getGramFromVolume(volume, material) {
    if (material.aux.molarity) {
        return volume * material.aux.molarity * material.aux.molecularWeight;
    }
    if (material.aux.density) {
        return volume * material.aux.density * 1000;
    }
    return 0;
}

function getReferenceMaterial(row) {
    const rowCopy = cloneDeep(row);
    const potentialReferenceMaterials = {...rowCopy.startingMaterials, ...rowCopy.reactants};
    return Object.values(potentialReferenceMaterials).find((material) => material.aux?.isReference || false);
}

function getCatalystMaterial(row) {
    const rowCopy = cloneDeep(row);
    const potentialCatalystMaterials = {...rowCopy.startingMaterials, ...rowCopy.reactants};
    return Object.values(potentialCatalystMaterials).find((material) => material.aux?.gasType === 'catalyst' || false);
}

function getFeedstockMaterial(row) {
    const rowCopy = cloneDeep(row);
    const potentialFeedstockMaterials = {...rowCopy.startingMaterials, ...rowCopy.reactants};
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
    return Object.entries(materialTypes).reduce((materialsByType, [materialType, {reactionAttributeName}]) => {
        materialsByType[materialType] = reactionCopy[reactionAttributeName].filter((material) => !material.isNew);
        return materialsByType;
    }, {});
}

function getReactionMaterialsIDs(materials) {
    return Object.fromEntries(
        Object.entries(materials).map(([materialType, materialsOfType]) => [
            materialType,
            materialsOfType.map((material) => [material.id.toString(), material.short_label])
        ])
    );
}

function updateYields(row, reactionHasPolymers) {
    const updatedRow = cloneDeep(row);
    const referenceMaterial = getReferenceMaterial(updatedRow);
    if (!referenceMaterial) {
        return updatedRow;
    }

    Object.values(updatedRow.products).forEach((productMaterial) => {
        if (productMaterial.aux.gasType === 'gas') {
            return;
        }
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
    if (!referenceMaterial) {
        return updatedRow;
    }

    ['startingMaterials', 'reactants'].forEach((materialType) => {
        Object.values(updatedRow[materialType]).forEach((material) => {
            if (material.aux.isReference) {
                return;
            }
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
        case 'catalyst':
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
                'volume',
                'yield'
            ];
        default:
            return [];
    }
}

function cellIsEditable(params) {
    const entry = params.colDef.entryDefs.currentEntry;
    const cellData = get(params.data, params.colDef.field);
    const {isReference, gasType, materialType} = cellData.aux;

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
  const gasType = material?.gas_type ?? 'off';
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

  // User-editable data is represented as "entries", e.g., `foo: {value: bar, unit: baz}.
  const entries = getMaterialEntries(materialType, getMaterialGasType(materialCopy, gasMode));
  const materialData = entries.reduce((data, entry) => {
    data[entry] = { value: getStandardValue(entry, materialCopy), unit: getStandardUnits(entry)[0] };
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

function updateVariationsAux(variations, materials, gasMode, vesselVolume) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.keys(materialTypes).forEach((materialType) => {
      materials[materialType].forEach((material) => {
        if (!Object.prototype.hasOwnProperty.call(row[materialType], material.id.toString())) {
          return;
        }
        row[materialType][material.id].aux = getMaterialAux(material, materialType, gasMode, vesselVolume);
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
  getReactionMaterialsHashes,
  getMaterialData,
  resetColumnDefinitionsMaterials,
  updateVariationsRowOnReferenceMaterialChange,
  updateVariationsRowOnCatalystMaterialChange,
  updateVariationsRowOnFeedstockMaterialChange,
  computeDerivedQuantitiesVariationsRow,
  removeObsoleteMaterialColumns,
  updateVariationsAux,
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
  cellIsEditable,
};
