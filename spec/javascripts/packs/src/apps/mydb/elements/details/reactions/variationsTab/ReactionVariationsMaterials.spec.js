import expect from 'expect';
import {
  getReactionMaterials, updateYields, updateEquivalents,
  removeObsoleteMaterialsFromVariations, addMissingMaterialsToVariations,
  updateNonReferenceMaterialOnMassChange, EquivalentParser
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { setUpMaterial, setUpReaction } from 'helper/reactionVariationsHelpers';

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
    const updatedVariations = addMissingMaterialsToVariations(reaction.variations, currentMaterials);
    updatedVariations
      .forEach((variation) => {
        expect(Object.keys(variation.startingMaterials)).toEqual(updatedStartingMaterialIDs);
      });
  });
  it('updates yield when product amount changes', async () => {
    const reaction = await setUpReaction();
    const productID = reaction.products[0].id;
    expect(reaction.variations[0].products[productID].aux.yield).toBe(100);
    reaction.variations[0].products[productID].value = 2000;
    const updatedVariationsRow = updateYields(reaction.variations[0], reaction.hasPolymers());
    expect(updatedVariationsRow.products[productID].aux.yield).toBe(5);
  });
  it("updates non-reference materials' equivalents when reference material's amount changes", async () => {
    const reaction = await setUpReaction();
    const reactantID = reaction.reactants[0].id;
    expect(reaction.variations[0].reactants[reactantID].aux.equivalent).toBe(1);
    Object.values(reaction.variations[0].startingMaterials).forEach((material) => {
      if (material.aux.isReference) {
        material.value = 2000;
      }
    });
    const updatedVariationsRow = updateEquivalents(reaction.variations[0]);
    expect(updatedVariationsRow.reactants[reactantID].aux.equivalent).toBeCloseTo(50, 0.01);
  });
  it("updates non-reference materials' equivalents when own amount changes", async () => {
    const reaction = await setUpReaction();
    const reactant = Object.values(reaction.variations[0].reactants)[0];
    reactant.value *= 0.42;
    const updatedReactant = updateNonReferenceMaterialOnMassChange(
      reaction.variations[0],
      reactant,
      'reactants',
      false
    );
    expect(reactant.aux.equivalent).toBeGreaterThan(updatedReactant.aux.equivalent);
  });
  it("updates non-reference materials' yields when own amount changes", async () => {
    const reaction = await setUpReaction();
    const product = Object.values(reaction.variations[0].products)[0];
    product.value *= 0.042;
    const updatedProduct = updateNonReferenceMaterialOnMassChange(
      reaction.variations[0],
      product,
      'products',
      true
    );
    expect(product.aux.yield).toBeGreaterThan(updatedProduct.aux.yield);
  });
  it("updates materials' amount when equivalent changes", async () => {
    const reaction = await setUpReaction();
    const variationsRow = reaction.variations[0];
    const reactant = variationsRow.reactants[Object.keys(variationsRow.reactants)[0]];
    const updatedReactant = EquivalentParser({
      data: variationsRow,
      oldValue: reactant,
      newValue: reactant.aux.equivalent * 0.42
    });
    expect(reactant.value).toBeGreaterThan(updatedReactant.value);
    expect(EquivalentParser({
      data: variationsRow,
      oldValue: reactant,
      newValue: -42
    }).value).toBe(0);
  });
});
