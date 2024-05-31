import { AgGridReact } from 'ag-grid-react';
import React from 'react';
import PropTypes from 'prop-types';
import { cloneDeep } from 'lodash';
import {
  convertUnit, materialTypes, massUnits, volumeUnits
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
  return getMolFromGram(convertUnit(material.value, material.unit, 'g'), material)
  / getMolFromGram(convertUnit(referenceMaterial.value, referenceMaterial.unit, 'g'), referenceMaterial);
}

function computePercentYield(material, referenceMaterial, reactionHasPolymers) {
  const stoichiometryCoefficient = (material.aux.coefficient ?? 1.0)
    / (referenceMaterial.aux.coefficient ?? 1.0);
  const equivalent = computeEquivalent(material, referenceMaterial, 'products')
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

function getMaterialData(material, materialType) {
  const materialCopy = cloneDeep(material);
  const unit = materialType === 'solvents' ? volumeUnits[0] : massUnits[0];
  let value = materialType === 'solvents' ? (materialCopy.amount_l ?? null) : (materialCopy.amount_g ?? null);
  value = materialType === 'solvents' ? convertUnit(value, 'l', unit) : convertUnit(value, 'g', unit);
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
  return { value, unit, aux };
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
          row[materialType][material.id] = getMaterialData(material, materialType);
        }
      });
    });
  });
  return updatedVariations;
}

function MaterialOverlay({
  value: cellData, colDef
}) {
  const { aux = null, value, unit: standardUnit } = cellData;
  const { _variationsUnit: displayUnit } = colDef;

  return (
    <div
      className="custom-tooltip"
      style={{
        padding: '3px 8px',
        color: '#fff',
        backgroundColor: '#000',
        borderRadius: '4px',
      }}
    >
      <p>
        <span>
          {Number(convertUnit(value, standardUnit, displayUnit)).toPrecision(4)}
          {' '}
          [
          {displayUnit}
          ]
        </span>
      </p>
      {aux?.isReference ? (
        <p>
          <span>Reference</span>
        </p>
      ) : null}

      {aux?.equivalent !== null && (
        <p>
          <span>
            Equivalent:
          </span>
          {' '}
          {Number(aux.equivalent).toPrecision(4)}
        </p>
      )}

      {aux?.coefficient !== null && (
        <p>
          <span>
            Coefficient:
          </span>
          {' '}
          {Number(aux.coefficient).toPrecision(4)}
        </p>
      )}

      {aux?.yield !== null && (
        <p>
          <span>
            Yield:
          </span>
          {' '}
          {Number(aux.yield).toPrecision(4)}
          %
        </p>
      )}

      {aux?.molecularWeight !== null && (
      <p>
        <span>
          Molar mass:
        </span>
        {' '}
        {Number(aux.molecularWeight).toPrecision(2)}
        {' '}
        g/mol
      </p>
      )}
    </div>
  );
}

MaterialOverlay.propTypes = {
  value: PropTypes.instanceOf(AgGridReact.value).isRequired,
  colDef: PropTypes.instanceOf(AgGridReact.colDef).isRequired,
};

function EquivalentFormatter({ value: cellData }) {
  const { equivalent } = cellData.aux;

  return `${Number(equivalent).toPrecision(4)}`;
}

function EquivalentParser({ data: variationsRow, oldValue: cellData, newValue }) {
  let equivalent = Number(newValue);
  if (equivalent < 0) {
    equivalent = 0;
  }
  // Adapt mass to updated equivalent.
  const referenceMaterial = getReferenceMaterial(variationsRow);
  const referenceMol = getMolFromGram(
    convertUnit(referenceMaterial.value, referenceMaterial.unit, 'g'),
    referenceMaterial
  );
  const value = Number(convertUnit(getGramFromMol(referenceMol * equivalent, cellData), 'g', cellData.unit));

  return { ...cellData, value, aux: { ...cellData.aux, equivalent } };
}

function getMaterialColumnGroupChild(material, materialType, headerComponent) {
  const materialCopy = cloneDeep(material);
  let entries = [null];
  if (materialType === 'solvents') {
    entries = ['volume'];
  }
  if (materialType === 'products') {
    entries = ['mass'];
  }
  if (['startingMaterials', 'reactants'].includes(materialType)) {
    entries = ['mass'];
    if (!materialCopy.reference ?? false) {
      entries.push('equivalent');
    }
  }
  const names = [`ID: ${materialCopy.id.toString()}`];
  ['external_label', 'name', 'short_label', 'molecule_formula', 'molecule_iupac_name'].forEach((name) => {
    if (materialCopy[name]) {
      names.push(materialCopy[name]);
    }
  });
  return {
    field: `${materialType}.${materialCopy.id}`, // Must be unique.
    tooltipField: `${materialType}.${materialCopy.id}`,
    tooltipComponent: MaterialOverlay,
    _variationsUnit: materialTypes[materialType].units[0],
    headerComponent,
    headerComponentParams: {
      units: materialTypes[materialType].units,
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

export {
  MaterialOverlay,
  EquivalentFormatter,
  EquivalentParser,
  getMaterialColumnGroupChild,
  getReactionMaterials,
  getMaterialData,
  updateColumnDefinitionsMaterials,
  updateNonReferenceMaterialOnMassChange,
  updateYields,
  updateEquivalents,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
};
