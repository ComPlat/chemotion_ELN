import expect from 'expect';
import {
  getReactionMaterials, updateVariationsRowOnReferenceMaterialChange, removeObsoleteMaterialColumns,
  updateVariationsRowOnCatalystMaterialChange, getMaterialColumnGroupChild,
  updateColumnDefinitionsMaterialsOnAuxChange, updateVariationsOnAuxChange,
  updateVariationsRowOnConcentrationMaterialChange,
  cellIsEditable, getReactionMaterialsHashes, computeCombinedReactionVolume
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  EquivalentParser
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  setUpReaction, setUpGaseousReaction, getColumnDefinitionsMaterialIDs, getColumnGroupChild, getReactionMaterialsIDs
} from 'helper/reactionVariationsHelpers';
import {
  materialTypes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { cloneDeep } from 'lodash';

describe('ReactionVariationsMaterials', () => {
  it('applies concentration edit rules across every combination of lock mode, calculation mode, reference material, and feedstock', async () => {
    const nonGaseousReaction = await setUpReaction();
    const gaseousReaction = await setUpGaseousReaction();

    const nonGaseousBaseRow = cloneDeep(nonGaseousReaction.variations[0]);
    const gaseousBaseRow = cloneDeep(gaseousReaction.variations[0]);

    const nonReferenceID = Object.keys(nonGaseousBaseRow.reactants)[0];
    const referenceID = Object.keys(nonGaseousBaseRow.startingMaterials).find(
      (materialID) => nonGaseousBaseRow.startingMaterials[materialID].aux.isReference
    );
    const feedstockID = Object.keys(gaseousBaseRow.reactants)[0];

    const cases = [];
    let caseID = 1;
    [false, true].forEach((volumeLocked) => {
      [false, true].forEach((calculateConcentration) => {
        [false, true].forEach((isReference) => {
          [false, true].forEach((isFeedstock) => {
            cases.push({
              caseID,
              volumeLocked,
              calculateConcentration,
              isReference,
              isFeedstock,
            });
            caseID += 1;
          });
        });
      });
    });

    cases.forEach(({ caseID: id, volumeLocked, calculateConcentration, isReference, isFeedstock }) => {
      const row = cloneDeep(isFeedstock ? gaseousBaseRow : nonGaseousBaseRow);
      const materialType = isFeedstock ? 'reactants' : (isReference ? 'startingMaterials' : 'reactants');
      const materialID = isFeedstock ? feedstockID : (isReference ? referenceID : nonReferenceID);
      const field = `${materialType}.${materialID}`;

      const selectedMaterial = row[materialType][materialID];
      selectedMaterial.aux.isReference = isReference;
      selectedMaterial.concentration.value = 2;

      const firstStartingMaterial = Object.values(row.startingMaterials)[0];
      const firstReactant = Object.values(row.reactants)[0];
      firstStartingMaterial.volume.value = 2;
      firstReactant.volume.value = 3;

      const combinedReactionVolume = computeCombinedReactionVolume(row);
      const derivedReactionVolume = selectedMaterial.amount.value / selectedMaterial.concentration.value;

      const before = cloneDeep(row);
      const { row: updatedRow, contextUpdate } = updateVariationsRowOnConcentrationMaterialChange(
        row,
        field,
        'concentration',
        {
          useReactionVolume: calculateConcentration,
          lockReactionVolume: volumeLocked,
          reactionVolumeByRowId: { [row.id]: 99 },
        }
      );

      const shouldPropagate = !isFeedstock && (volumeLocked !== calculateConcentration || !volumeLocked);
      const expectsDerivedVolume = !isFeedstock && !volumeLocked;
      const expectsCombinedVolume = !isFeedstock && volumeLocked && !calculateConcentration;
      const expectsNoPropagation = isFeedstock || (volumeLocked && calculateConcentration);
      const expectsAutoEnable = !isFeedstock && !volumeLocked && !calculateConcentration;

      if (expectsNoPropagation) {
        expect(updatedRow).toEqual(before);
        expect(contextUpdate).toBe(null);
        return;
      }

      expect(shouldPropagate).toBe(true);

      const expectedReactionVolume = expectsDerivedVolume ? derivedReactionVolume : combinedReactionVolume;
      Object.entries(updatedRow.startingMaterials).forEach(([id, material]) => {
        if (material.aux.gasType !== 'feedstock' && id.toString() !== materialID.toString()) {
          expect(material.concentration.value).toBeCloseTo(material.amount.value / expectedReactionVolume);
        }
      });
      Object.entries(updatedRow.reactants).forEach(([id, material]) => {
        if (material.aux.gasType !== 'feedstock' && id.toString() !== materialID.toString()) {
          expect(material.concentration.value).toBeCloseTo(material.amount.value / expectedReactionVolume);
        }
      });
      expect(updatedRow[materialType][materialID].concentration.value)
        .toBe(selectedMaterial.concentration.value);

      if (expectsDerivedVolume) {
        expect(contextUpdate.useReactionVolume).toBe(true);
        expect(contextUpdate.reactionVolumeByRowIdPatch[row.id]).toBeCloseTo(derivedReactionVolume);
      }

      if (expectsCombinedVolume) {
        expect(contextUpdate).toBe(null);
      }

      if (expectsAutoEnable) {
        expect(contextUpdate.useReactionVolume).toBe(true);
      }

      expect(id).toBeGreaterThanOrEqual(1);
      expect(id).toBeLessThanOrEqual(16);
    });
  });

  it('does not fall back to stored reaction volume when locked mode requires combined volume', async () => {
    const reaction = await setUpReaction();
    const row = cloneDeep(reaction.variations[0]);
    const reactantID = reaction.reactants[0].id;

    Object.values(row.startingMaterials).forEach((material) => {
      material.volume.value = 0;
    });
    Object.values(row.reactants).forEach((material) => {
      material.volume.value = 0;
    });

    row.reactants[reactantID].concentration.value = 2;

    const before = cloneDeep(row);
    const { row: updatedRow } = updateVariationsRowOnConcentrationMaterialChange(
      row,
      `reactants.${reactantID}`,
      'concentration',
      {
        useReactionVolume: false,
        lockReactionVolume: true,
        reactionVolumeByRowId: { [row.id]: 42 },
      }
    );

    expect(updatedRow).toEqual(before);
  });

  it('updates yield when product mass changes', async () => {
    const reaction = await setUpReaction();
    const productID = reaction.products[0].id;
    expect(reaction.variations[0].products[productID].yield.value).toBe(100);
    reaction.variations[0].products[productID].mass.value = 2;
    const updatedVariationsRow = updateVariationsRowOnReferenceMaterialChange(
      reaction.variations[0],
      reaction.hasPolymers()
    );
    expect(updatedVariationsRow.products[productID].yield.value).toBe(5);
  });
  it("updates non-reference materials' equivalents when reference material's mass changes", async () => {
    const reaction = await setUpReaction();
    const reactantID = reaction.reactants[0].id;
    expect(reaction.variations[0].reactants[reactantID].equivalent.value).toBe(1);
    Object.values(reaction.variations[0].startingMaterials).forEach((material) => {
      if (material.aux.isReference) {
        material.mass.value = 2;
      }
    });
    const updatedVariationsRow = updateVariationsRowOnReferenceMaterialChange(reaction.variations[0]);
    expect(updatedVariationsRow.reactants[reactantID].equivalent.value).toBeCloseTo(50, 0.01);
  });
  it("updates materials' mass when equivalent changes", async () => {
    const reaction = await setUpReaction();
    const variationsRow = reaction.variations[0];
    const reactant = variationsRow.reactants[Object.keys(variationsRow.reactants)[0]];
    const updatedReactant = EquivalentParser({
      data: variationsRow,
      oldValue: reactant,
      newValue: Number(reactant.equivalent.value * 0.42).toString()
    });
    expect(reactant.mass.value).toBeGreaterThan(updatedReactant.mass.value);
    expect(EquivalentParser({
      data: variationsRow,
      oldValue: reactant,
      newValue: Number(-42).toString()
    }).mass.value).toBe(0);
  });
  it('retrieves reaction material IDs', async () => {
    const reaction = await setUpReaction();
    const reactionMaterials = getReactionMaterials(reaction);
    const reactionMaterialsIDs = getReactionMaterialsIDs(reactionMaterials);
    expect(typeof reactionMaterialsIDs).toBe('object');
    expect(Object.values(reactionMaterialsIDs).flat().length).toEqual(5);
  });
  it('retrieves reaction material hashes', async () => {
    const reaction = await setUpReaction();
    const reactionMaterials = getReactionMaterials(reaction);
    const updatedReactionMaterials = cloneDeep(reactionMaterials);
    updatedReactionMaterials.startingMaterials[0].gas_type = 'feedstock';

    const reactionMaterialsHashes = getReactionMaterialsHashes(reactionMaterials, true, null);
    const updatedReactionMaterialsHashes = getReactionMaterialsHashes(updatedReactionMaterials, true, null);
    expect(Object.values(reactionMaterialsHashes).flat().length).toEqual(5);
    expect(reactionMaterialsHashes).not.toEqual(updatedReactionMaterialsHashes);
  });
  it("updates materials' aux data", async () => {
    const reaction = await setUpGaseousReaction();
    const currentMaterials = getReactionMaterials(reaction);

    const updatedMaterials = cloneDeep(currentMaterials);
    updatedMaterials.startingMaterials[0].gas_type = 'feedstock';
    updatedMaterials.startingMaterials[0].coefficient = 42;
    updatedMaterials.reactants[0].gas_type = 'catalyst';
    updatedMaterials.products[0].gas_type = 'off';

    const updatedVariations = updateVariationsOnAuxChange(reaction.variations, updatedMaterials, false, null);

    const variationsRow = reaction.variations[0];
    const updatedVariationsRow = updatedVariations[0];

    expect(variationsRow.startingMaterials[Object.keys(variationsRow.startingMaterials)[0]].aux.gasType).not.toBe(
      updatedVariationsRow.startingMaterials[Object.keys(updatedVariationsRow.startingMaterials)[0]].aux.gasType
    );
    expect(variationsRow.startingMaterials[Object.keys(variationsRow.startingMaterials)[0]].aux.coefficient).not.toBe(
      updatedVariationsRow.startingMaterials[Object.keys(updatedVariationsRow.startingMaterials)[0]].aux.coefficient
    );
    expect(variationsRow.reactants[Object.keys(variationsRow.reactants)[0]].aux.gasType).not.toBe(
      updatedVariationsRow.reactants[Object.keys(updatedVariationsRow.reactants)[0]].aux.gasType
    );
    expect(variationsRow.products[Object.keys(variationsRow.products)[0]].aux.gasType).not.toBe(
      updatedVariationsRow.products[Object.keys(updatedVariationsRow.products)[0]].aux.gasType
    );
  });
  it('updates column definitions of gaseous materials', async () => {
    const reaction = await setUpReaction();

    const reactionMaterials = getReactionMaterials(reaction);
    const columnDefinitions = Object.entries(reactionMaterials).map(([materialType, materials]) => ({
      groupId: materialType,
      children: materials.map((material) => getMaterialColumnGroupChild(material, materialType, false))
    }));

    Object.keys(materialTypes).forEach((materialType) => {
      reactionMaterials[materialType].forEach((material) => {
        switch (materialType) {
          case 'startingMaterials':
            material.gas_type = 'catalyst';
            break;
          case 'reactants':
            material.gas_type = 'feedstock';
            break;
          case 'products':
            material.gas_type = 'gas';
            break;
          default:
            break;
        }
      });
    });

    const updatedColumnDefinitions = updateColumnDefinitionsMaterialsOnAuxChange(
      columnDefinitions,
      reactionMaterials,
      true
    );

    const productIDs = getColumnDefinitionsMaterialIDs(updatedColumnDefinitions, 'products');
    const productColumnDefinition = getColumnGroupChild(
      updatedColumnDefinitions,
      'products',
      productIDs[0]
    );

    expect(productColumnDefinition.cellDataType).toBe('gas');
    expect(productColumnDefinition.entry).toBe('duration');
    expect(productColumnDefinition.displayUnit).toBe('Second(s)');

    const reactantIDs = getColumnDefinitionsMaterialIDs(updatedColumnDefinitions, 'reactants');
    const reactantColumnDefinition = getColumnGroupChild(
      updatedColumnDefinitions,
      'reactants',
      reactantIDs[0]
    );
    expect(reactantColumnDefinition.cellDataType).toBe('feedstock');
    expect(reactantColumnDefinition.entry).toBe('mass');
  });
  it('determines cell editability based on entry', async () => {
    const colDef = {
      field: 'foo',
      entry: 'equivalent'
    };
    const data = {
      foo: {
        aux: {
          isReference: true,
          gasType: 'off',
          materialType: 'startingMaterials'
        }
      }
    };
    const params = { colDef, data };
    expect(cellIsEditable(params)).toBe(false);
  });
  it("updates turnoverNumber and turnoverFrequency when catalyst material's amount changes", async () => {
    const reaction = await setUpGaseousReaction();
    const productID = reaction.products[0].id;
    const catalystID = reaction.starting_materials[0].id;
    const variationsRow = reaction.variations[0];
    const initialTurnoverNumber = variationsRow.products[productID].turnoverNumber.value;
    const initialTurnoverFrequency = variationsRow.products[productID].turnoverFrequency.value;

    variationsRow.startingMaterials[catalystID].amount.value /= 2;
    const updatedVariationsRow = updateVariationsRowOnCatalystMaterialChange(variationsRow);

    expect(updatedVariationsRow.products[productID].turnoverNumber.value).toBe(initialTurnoverNumber * 2);
    expect(updatedVariationsRow.products[productID].turnoverFrequency.value).toBe(initialTurnoverFrequency * 2);
  });
  it('updates non-feedstock concentrations when concentration propagation is enabled', async () => {
    const reaction = await setUpReaction();
    const variationsRow = reaction.variations[0];
    const reactantID = reaction.reactants[0].id;

    variationsRow.reactants[reactantID].concentration.value = 2;
    const expectedReactionVolume = variationsRow.reactants[reactantID].amount.value / 2;

    const { row: updatedVariationsRow } = updateVariationsRowOnConcentrationMaterialChange(
      variationsRow,
      `reactants.${reactantID}`,
      'concentration',
      {
        useReactionVolume: true,
        lockReactionVolume: false,
        reactionVolumeByRowId: { [variationsRow.id]: 42 },
      }
    );

    Object.values(updatedVariationsRow.startingMaterials).forEach((material) => {
      if (material.aux.gasType !== 'feedstock') {
        expect(material.concentration.value).toBeCloseTo(material.amount.value / expectedReactionVolume);
      }
    });
    Object.entries(updatedVariationsRow.reactants).forEach(([materialId, material]) => {
      if (materialId.toString() !== reactantID.toString()) {
        expect(material.concentration.value).toBeCloseTo(material.amount.value / expectedReactionVolume);
      }
    });
    expect(updatedVariationsRow.reactants[reactantID].concentration.value).toBe(2);
  });
  it('derives reaction volume and returns context update on unlocked concentration edit', async () => {
    const reaction = await setUpReaction();
    const variationsRow = reaction.variations[0];
    const reactantID = reaction.reactants[0].id;

    variationsRow.reactants[reactantID].concentration.value = 2;

    const { contextUpdate } = updateVariationsRowOnConcentrationMaterialChange(
      variationsRow,
      `reactants.${reactantID}`,
      'concentration',
      {
        useReactionVolume: false,
        lockReactionVolume: false,
        reactionVolumeByRowId: {},
      }
    );

    expect(contextUpdate.useReactionVolume).toBe(true);
    expect(contextUpdate.reactionVolumeByRowIdPatch[variationsRow.id]).toBeCloseTo(
      variationsRow.reactants[reactantID].amount.value / 2
    );
  });
  it('uses row-computed combined reaction volume when explicit combined volume is unavailable', async () => {
    const reaction = await setUpReaction();
    const variationsRow = reaction.variations[0];
    const reactantID = reaction.reactants[0].id;

    const firstStartingMaterial = Object.values(variationsRow.startingMaterials)[0];
    const firstReactant = Object.values(variationsRow.reactants)[0];
    firstStartingMaterial.volume.value = 2;
    firstReactant.volume.value = 3;

    const expectedReactionVolume = computeCombinedReactionVolume(variationsRow);

    const { row: updatedVariationsRow } = updateVariationsRowOnConcentrationMaterialChange(
      variationsRow,
      `reactants.${reactantID}`,
      'concentration',
      {
        useReactionVolume: false,
        lockReactionVolume: true,
        reactionVolumeByRowId: {},
      }
    );

    Object.values(updatedVariationsRow.startingMaterials).forEach((material) => {
      if (material.aux.gasType !== 'feedstock') {
        expect(material.concentration.value).toBeCloseTo(material.amount.value / expectedReactionVolume);
      }
    });
    Object.entries(updatedVariationsRow.reactants).forEach(([materialId, material]) => {
      if (materialId.toString() !== reactantID.toString()) {
        expect(material.concentration.value).toBeCloseTo(material.amount.value / expectedReactionVolume);
      }
    });
    expect(updatedVariationsRow.reactants[reactantID].concentration.value).toBe(
      variationsRow.reactants[reactantID].concentration.value
    );
  });
  it('uses edit-scoped reaction volume for locked concentration propagation when edited volume changes', async () => {
    const reaction = await setUpReaction();
    const variationsRow = cloneDeep(reaction.variations[0]);
    const reactantID = reaction.reactants[0].id;
    const editedReactant = variationsRow.reactants[reactantID];

    const firstStartingMaterial = Object.values(variationsRow.startingMaterials)[0];
    firstStartingMaterial.volume.value = 2;
    editedReactant.volume.value = 3;

    const preEditReactionVolume = computeCombinedReactionVolume(variationsRow);

    editedReactant.concentration.value = 2;
    editedReactant.amount.value = 2 * preEditReactionVolume;
    editedReactant.volume.value = 7;

    const postEditReactionVolume = computeCombinedReactionVolume(variationsRow);
    expect(postEditReactionVolume).not.toBe(preEditReactionVolume);

    const { row: updatedVariationsRow } = updateVariationsRowOnConcentrationMaterialChange(
      variationsRow,
      `reactants.${reactantID}`,
      'concentration',
      {
        useReactionVolume: false,
        lockReactionVolume: true,
        reactionVolumeByRowId: {},
        editScopedReactionVolume: preEditReactionVolume,
      }
    );

    Object.values(updatedVariationsRow.startingMaterials).forEach((material) => {
      if (material.aux.gasType !== 'feedstock') {
        expect(material.concentration.value).toBeCloseTo(material.amount.value / preEditReactionVolume);
      }
    });

    Object.entries(updatedVariationsRow.reactants).forEach(([materialId, material]) => {
      if (materialId.toString() !== reactantID.toString() && material.aux.gasType !== 'feedstock') {
        expect(material.concentration.value).toBeCloseTo(material.amount.value / preEditReactionVolume);
      }
    });
  });
  it('initializes gas product yield', async () => {
    const reaction = await setUpGaseousReaction();
    const productID = reaction.products[0].id;
    const variationsRow = reaction.variations[0];
    const initialYield = variationsRow.products[productID].yield.value;

    expect(initialYield).not.toBe(null);
  });
  it('removes obsolete material columns', async () => {
    const reaction = await setUpReaction();
    const materials = getReactionMaterials(reaction);
    const columns = getReactionMaterialsIDs(materials);
    materials.products.pop();

    expect(columns.products.length).toEqual(2);

    const updatedColumns = removeObsoleteMaterialColumns(materials, columns);

    expect(updatedColumns.products.length).toEqual(1);
  });
});
