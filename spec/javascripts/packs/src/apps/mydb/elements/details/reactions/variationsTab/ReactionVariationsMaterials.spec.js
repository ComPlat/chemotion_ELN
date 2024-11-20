import expect from 'expect';
import {
  getReactionMaterials, updateVariationsRowOnReferenceMaterialChange,
  removeObsoleteMaterialsFromVariations, addMissingMaterialsToVariations,
  updateNonReferenceMaterialOnMassChange, updateColumnDefinitionsMaterials,
  getMaterialColumnGroupChild, getReactionMaterialsIDs, updateColumnDefinitionsMaterialTypes
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import {
  EquivalentParser
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  setUpMaterial, setUpReaction, getColumnDefinitionsMaterialIDs, getColumnGroupChild
} from 'helper/reactionVariationsHelpers';
import { materialTypes } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

describe('ReactionVariationsMaterials', () => {
  it('removes obsolete materials', async () => {
    const reaction = await setUpReaction();
    const productIDs = reaction.products.map((product) => product.id);
    reaction.variations.forEach((variation) => {
      expect(Object.keys(variation.products)).toEqual(productIDs);
    });

    reaction.products.pop();
    const updatedProductIDs = reaction.products.map((product) => product.id);
    const currentMaterials = getReactionMaterials(reaction);
    const updatedVariations = removeObsoleteMaterialsFromVariations(reaction.variations, currentMaterials);
    updatedVariations
      .forEach((variation) => {
        expect(Object.keys(variation.products)).toEqual(updatedProductIDs);
      });
  });
  it('adds missing materials', async () => {
    const reaction = await setUpReaction();
    const material = await setUpMaterial();
    const startingMaterialIDs = reaction.starting_materials.map((startingMaterial) => startingMaterial.id);
    reaction.variations.forEach((variation) => {
      expect(Object.keys(variation.startingMaterials)).toEqual(startingMaterialIDs);
    });

    reaction.starting_materials.push(material);
    const updatedStartingMaterialIDs = reaction.starting_materials.map((startingMaterial) => startingMaterial.id);
    const currentMaterials = getReactionMaterials(reaction);
    const updatedVariations = addMissingMaterialsToVariations(reaction.variations, currentMaterials, false);
    updatedVariations
      .forEach((variation) => {
        expect(Object.keys(variation.startingMaterials)).toEqual(updatedStartingMaterialIDs);
      });
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
  it("updates non-reference materials' equivalents when own mass changes", async () => {
    const reaction = await setUpReaction();
    const reactant = Object.values(reaction.variations[0].reactants)[0];
    reactant.mass.value *= 0.42;
    const updatedReactant = updateNonReferenceMaterialOnMassChange(
      reaction.variations[0],
      reactant,
      false
    );
    expect(reactant.equivalent.value).toBeGreaterThan(updatedReactant.equivalent.value);
  });
  it("updates non-reference materials' yields when own mass changes", async () => {
    const reaction = await setUpReaction();
    const product = Object.values(reaction.variations[0].products)[0];
    product.mass.value *= 0.042;
    const updatedProduct = updateNonReferenceMaterialOnMassChange(
      reaction.variations[0],
      product,
      true
    );
    expect(product.yield.value).toBeGreaterThan(updatedProduct.yield.value);
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
  it('removes obsolete materials from column definitions', async () => {
    const reaction = await setUpReaction();
    const reactionMaterials = getReactionMaterials(reaction);
    const columnDefinitions = Object.entries(reactionMaterials).map(([materialType, materials]) => ({
      groupId: materialType,
      children: materials.map((material) => getMaterialColumnGroupChild(material, materialType, null, false))
    }));

    const startingMaterialIDs = reactionMaterials.startingMaterials.map((material) => material.id);
    expect(getColumnDefinitionsMaterialIDs(columnDefinitions, 'startingMaterials')).toEqual(startingMaterialIDs);

    reactionMaterials.startingMaterials.pop();
    const updatedStartingMaterialIDs = reactionMaterials.startingMaterials.map((material) => material.id);
    const updatedColumnDefinitions = updateColumnDefinitionsMaterials(columnDefinitions, reactionMaterials, null, false);
    expect(getColumnDefinitionsMaterialIDs(
      updatedColumnDefinitions,
      'startingMaterials'
    )).toEqual(updatedStartingMaterialIDs);
  });
  it('retrieves reaction material IDs', async () => {
    const reaction = await setUpReaction();
    const reactionMaterials = getReactionMaterials(reaction);
    const reactionMaterialsIDs = getReactionMaterialsIDs(reactionMaterials);
    expect(Array.isArray(reactionMaterialsIDs)).toBe(true);
    expect(new Set(reactionMaterialsIDs).size).toBe(5);
  });
  it('updates column definitions of gaseous materials', async () => {
    const reaction = await setUpReaction();

    const reactionMaterials = getReactionMaterials(reaction);
    const columnDefinitions = Object.entries(reactionMaterials).map(([materialType, materials]) => ({
      groupId: materialType,
      children: materials.map((material) => getMaterialColumnGroupChild(material, materialType, null, false))
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

    const updatedColumnDefinitions = updateColumnDefinitionsMaterialTypes(
      columnDefinitions,
      reactionMaterials,
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
    expect(reactantColumnDefinition.cellDataType).toBe('material');
    const { currentEntry } = reactantColumnDefinition.entryDefs;

    expect(currentEntry).toBe('mass');
  });
});
