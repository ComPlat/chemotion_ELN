import { AgGridReact } from 'ag-grid-react';
import React from 'react';
import PropTypes from 'prop-types';
import { cloneDeep } from 'lodash';
import {
  convertUnit, materialTypes, volumeUnits, massUnits, amountUnits, getStandardUnit,
  getCellDataType
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

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

function getReferenceMaterial(variationsRow) {
  const variationsRowCopy = cloneDeep(variationsRow);
  const potentialReferenceMaterials = { ...variationsRowCopy.startingMaterials, ...variationsRowCopy.reactants };
  return Object.values(potentialReferenceMaterials).find((material) => material.aux?.isReference || false);
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

function getReactionMaterials(reaction) {
  const reactionCopy = cloneDeep(reaction);
  return Object.entries(materialTypes).reduce((materialsByType, [materialType, { reactionAttributeName }]) => {
    materialsByType[materialType] = reactionCopy[reactionAttributeName].filter((material) => !material.isNew);
    return materialsByType;
  }, {});
}

function getReactionMaterialsIDs(reactionMaterials) {
  return Object.values(reactionMaterials).flat().map((material) => material.id);
}

function updateYields(variationsRow, reactionHasPolymers) {
  const updatedVariationsRow = cloneDeep(variationsRow);
  const referenceMaterial = getReferenceMaterial(updatedVariationsRow);

  Object.entries(updatedVariationsRow.products).forEach(([productName, productMaterial]) => {
    updatedVariationsRow.products[productName].aux.yield = computePercentYield(
      productMaterial,
      referenceMaterial,
      reactionHasPolymers
    );
  });

  return updatedVariationsRow;
}

function updateEquivalents(variationsRow) {
  const updatedVariationsRow = cloneDeep(variationsRow);
  const referenceMaterial = getReferenceMaterial(updatedVariationsRow);

  ['startingMaterials', 'reactants'].forEach((materialType) => {
    Object.entries(updatedVariationsRow[materialType]).forEach(([materialName, material]) => {
      if (material.aux.isReference) { return; }
      updatedVariationsRow[materialType][materialName].aux.equivalent = computeEquivalent(material, referenceMaterial);
    });
  });
  return updatedVariationsRow;
}

function getMaterialData(material) {
  const materialCopy = cloneDeep(material);

  const mass = { value: materialCopy.amount_g ?? null, unit: getStandardUnit('mass') };
  const amount = { value: material.amount_mol ?? null, unit: getStandardUnit('amount') };
  const volume = { value: materialCopy.amount_l ?? null, unit: getStandardUnit('volume') };

  const aux = {
    coefficient: materialCopy.coefficient ?? null,
    isReference: materialCopy.reference ?? false,
    loading: (Array.isArray(materialCopy.residues) && materialCopy.residues.length) ? materialCopy.residues[0].custom_info?.loading : null,
    purity: materialCopy.purity ?? null,
    molarity: materialCopy.molarity_value ?? null,
    molecularWeight: materialCopy.molecule_molecular_weight ?? null,
    sumFormula: materialCopy.molecule_formula ?? null,
    yield: null,
    equivalent: null
  };

  return {
    volume, mass, amount, aux
  };
}

function removeObsoleteMaterialsFromVariations(variations, currentMaterials) {
  const updatedVariations = cloneDeep(variations);
  updatedVariations.forEach((row) => {
    Object.keys(materialTypes).forEach((materialType) => {
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
    Object.keys(materialTypes).forEach((materialType) => {
      currentMaterials[materialType].forEach((material) => {
        if (!(material.id in row[materialType])) {
          row[materialType][material.id] = getMaterialData(material);
        }
      });
    });
  });
  return updatedVariations;
}

function MaterialOverlay({
  value: cellData, colDef
}) {
  const { aux = null } = cellData;
  const { entry, displayUnit } = colDef.currentEntryWithDisplayUnit;

  return (
    <div className="tooltip show">
      <div className="tooltip-inner text-start">
        {entry !== 'equivalent' && (
          <div>
            {Number(convertUnit(cellData[entry].value, cellData[entry].unit, displayUnit)).toPrecision(4) + " " + displayUnit}
          </div>
        )}
        {aux?.isReference && (
          <div>Reference</div>
        )}
        {aux?.equivalent !== null && (
          <div>{"Equivalent: " + Number(aux.equivalent).toPrecision(4)}</div>
        )}
        {aux?.coefficient !== null && (
          <div>{"Coefficient: " + Number(aux.coefficient).toPrecision(4)}</div>
        )}
        {aux?.yield !== null && (
          <div>{"Yield: " + Number(aux.yield).toPrecision(4) + "%"}</div>
        )}
        {aux?.molecularWeight !== null && (
          <div>{"Molar mass: " + Number(aux.molecularWeight).toPrecision(2) + " g/mol"}</div>
        )}
      </div>
    </div>
  );
}

MaterialOverlay.propTypes = {
  value: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.number.isRequired,
    unit: PropTypes.string.isRequired,
  })).isRequired,
  colDef: PropTypes.shape({
    currentEntryWithDisplayUnit: PropTypes.shape({
      entry: PropTypes.number.isRequired,
      displayUnit: PropTypes.string.isRequired,
    }).isRequired,
  }).isRequired,
};

function getMaterialColumnGroupChild(material, materialType, headerComponent) {
  const materialCopy = cloneDeep(material);
  let entries = {};
  if (materialType === 'solvents') {
    entries = { volume: volumeUnits };
  }
  if (materialType === 'products') {
    entries = { mass: massUnits };
  }
  if (['startingMaterials', 'reactants'].includes(materialType)) {
    entries = { mass: massUnits, amount: amountUnits };
    if (!materialCopy.reference ?? false) {
      entries.equivalent = [];
    }
  }
  let names = new Set([`ID: ${materialCopy.id.toString()}`]);
  ['external_label', 'name', 'short_label', 'molecule_formula', 'molecule_iupac_name'].forEach((name) => {
    if (materialCopy[name]) {
      names.add(materialCopy[name]);
    }
  });
  names = Array.from(names);

  const entry = materialType === 'solvents' ? 'volume' : 'mass';
  return {
    field: `${materialType}.${materialCopy.id}`, // Must be unique.
    tooltipField: `${materialType}.${materialCopy.id}`,
    tooltipComponent: MaterialOverlay,
    currentEntryWithDisplayUnit: { entry, displayUnit: getStandardUnit(entry) },
    cellDataType: getCellDataType(entry),
    headerComponent,
    headerComponentParams: {
      names,
      entries
    },
  };
}

function updateColumnDefinitionsMaterials(columnDefinitions, currentMaterials, headerComponent) {
  const updatedColumnDefinitions = cloneDeep(columnDefinitions);

  Object.entries(currentMaterials).forEach(([materialType, materials]) => {
    const materialIDs = materials.map((material) => material.id.toString());
    const materialColumnGroup = updatedColumnDefinitions.find((columnGroup) => columnGroup.groupId === materialType);

    // Remove obsolete materials.
    materialColumnGroup.children = materialColumnGroup.children.filter((child) => {
      const childID = child.field.split('.').splice(1).join('.'); // Ensure that IDs that contain "." are handled correctly.
      return materialIDs.includes(childID);
    });
    // Add missing materials.
    materials.forEach((material) => {
      if (!materialColumnGroup.children.some((child) => child.field === `${materialType}.${material.id}`)) {
        materialColumnGroup.children.push(getMaterialColumnGroupChild(material, materialType, headerComponent));
      }
    });
  });

  return updatedColumnDefinitions;
}

function updateNonReferenceMaterialOnMassChange(variationsRow, material, materialType, reactionHasPolymers) {
  const referenceMaterial = getReferenceMaterial(variationsRow);

  // Adapt equivalent to updated mass.
  const equivalent = (!material.aux.isReference && ['startingMaterials', 'reactants'].includes(materialType))
    ? computeEquivalent(material, referenceMaterial) : material.aux.equivalent;

  // Adapt yield to updated mass.
  const percentYield = (materialType === 'products')
    ? computePercentYield(material, referenceMaterial, reactionHasPolymers) : material.aux.yield;

  const updatedAux = { ...material.aux, equivalent, yield: percentYield };

  return {
    ...material, aux: updatedAux
  };
}

function updateVariationsRowOnReferenceMaterialChange(row, reactionHasPolymers) {
  let updatedRow = cloneDeep(row);
  updatedRow = updateEquivalents(updatedRow);
  updatedRow = updateYields(updatedRow, reactionHasPolymers);

  return updatedRow;
}

export {
  MaterialOverlay,
  getMaterialColumnGroupChild,
  getReactionMaterials,
  getReactionMaterialsIDs,
  getMaterialData,
  updateColumnDefinitionsMaterials,
  updateNonReferenceMaterialOnMassChange,
  updateVariationsRowOnReferenceMaterialChange,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  getReferenceMaterial,
  getMolFromGram,
  getGramFromMol,
};
