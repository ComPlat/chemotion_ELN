import expect from 'expect';
import {
  getReactionMaterials, updateVariationsRowOnReferenceMaterialChange, removeObsoleteMaterialColumns,
  updateVariationsRowOnCatalystMaterialChange, getMaterialColumnGroupChild, getReactionMaterialsIDs,
  resetColumnDefinitionsMaterials, updateVariationsAux, cellIsEditable, getReactionMaterialsHashes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  EquivalentParser
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  setUpReaction, setUpGaseousReaction, getColumnDefinitionsMaterialIDs, getColumnGroupChild
} from 'helper/reactionVariationsHelpers';
import {
  materialTypes,

} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { cloneDeep } from 'lodash';
import { getMaterialIdsAsList } from '../../../../../../../../helper/reactionVariationsHelpers';

describe('ReactionVariationsMaterials', () => {
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

    const updatedVariations = updateVariationsAux(reaction.variations, updatedMaterials, false, null);

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

    const updatedColumnDefinitions = resetColumnDefinitionsMaterials(
      columnDefinitions,
      reactionMaterials,
      getMaterialIdsAsList(reactionMaterials),
      true
    );

    const productIDs = getColumnDefinitionsMaterialIDs(updatedColumnDefinitions, 'products');
    const productColumnDefinition = getColumnGroupChild(
      updatedColumnDefinitions,
      'products',
      `products.${productIDs[0]}`
    );
    expect(productColumnDefinition.cellDataType).toBe('gas');
    expect(productColumnDefinition.entryDefs.currentEntry).toBe('duration');
    expect(productColumnDefinition.entryDefs.displayUnit).toBe('Second(s)');

    const reactantIDs = getColumnDefinitionsMaterialIDs(updatedColumnDefinitions, 'reactants');
    const reactantColumnDefinition = getColumnGroupChild(
      updatedColumnDefinitions,
      'reactants',
      `reactants.${reactantIDs[0]}`
    );
    expect(reactantColumnDefinition.cellDataType).toBe('feedstock');
    const { currentEntry } = reactantColumnDefinition.entryDefs;

    expect(currentEntry).toBe('mass');
  });
  it('determines cell editability based on entry', async () => {
    const colDef = {
      field: 'foo',
      entryDefs: {
        currentEntry: 'equivalent',
        displayUnit: null
      }
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
    const columns = getMaterialIdsAsList(materials);
    materials.products.pop();

    expect(columns.products.length).toEqual(2);

    const updatedColumns = removeObsoleteMaterialColumns(materials, columns);

    expect(updatedColumns.products.length).toEqual(1);
  });
});
