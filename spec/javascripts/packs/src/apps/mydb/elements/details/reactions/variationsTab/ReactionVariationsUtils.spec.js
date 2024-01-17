import ReactionFactory from 'factories/ReactionFactory';
import SampleFactory from 'factories/SampleFactory';
import expect from 'expect';
import {
  createVariationsRow,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  updateYields,
  updateEquivalents,
  getReferenceMaterial
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function getReactionMaterials(reaction) {
  return {
    startingMaterials: reaction.starting_materials,
    reactants: reaction.reactants,
    products: reaction.products,
    solvents: reaction.solvents
  };
}

async function setUpMaterial() {
  return SampleFactory.build('water_100g');
}
async function setUpReaction() {
  const reaction = await ReactionFactory.build('water+water=>water+water');
  reaction.starting_materials[0].reference = true;
  reaction.reactants = [await SampleFactory.build('water_100g')];
  const variations = [];
  for (let id = 0; id < 3; id++) {
    variations.push(createVariationsRow(reaction));
  }
  reaction.variations = variations;
  return reaction;
}

describe('ReactionVariationsUtils', async () => {
  it('remove obsolete materials', async () => {
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
  it('add missing materials', async () => {
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
  it('update yield when product amount changes', async () => {
    const reaction = await setUpReaction();
    const productID = reaction.products[0].id;
    expect(reaction.variations[0].products[productID].aux.yield).toBe(100);
    reaction.variations[0].products[productID].value = 2;
    const updatedVariations = updateYields(reaction.variations, reaction.hasPolymers());
    expect(updatedVariations[0].products[productID].aux.yield).toBe(5);
  });
  it("update non-reference materials' equivalents when reference material's amount changes ", async () => {
    const reaction = await setUpReaction();
    const reactantID = reaction.reactants[0].id;
    expect(reaction.variations[0].reactants[reactantID].aux.equivalent).toBe(1);
    const referenceMaterial = getReferenceMaterial(reaction.variations[0]);
    referenceMaterial.value = 2;
    const updatedVariations = updateEquivalents(reaction.variations);
    expect(updatedVariations[0].reactants[reactantID].aux.equivalent).toBeCloseTo(50, 0.01);
  });
});
