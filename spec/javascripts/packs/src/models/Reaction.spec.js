import ReactionFactory from 'factories/ReactionFactory';
import SampleFactory from 'factories/SampleFactory';
import expect from 'expect';
import {
  createVariationsRow,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  computeYield
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function getReactionMaterials(reaction) {
  return {
    startingMaterials: reaction.starting_materials,
    reactants: reaction.reactants,
    products: reaction.products
  };
}

async function setUpMaterial() {
  return SampleFactory.build('water_100g');
}
async function setUpReaction() {
  const reaction = await ReactionFactory.build('water+water=>water+water');
  reaction.starting_materials[0].reference = true;
  const variations = [];
  for (let id = 0; id < 3; id++) {
    variations.push(createVariationsRow(reaction, id, 'Equiv'));
  }
  reaction.variations = variations;
  return reaction;
}

describe('Reaction', async () => {
  const reaction = await ReactionFactory.build('water+water=>water+water');
  describe('Reaction.updateMaxAmountOfProducts()', () => {
    context('when no referenceStartingMaterial is available', () => {
      it('no change of product maxAmounts', () => {
        reaction.starting_materials[0].reference = false;
        reaction.starting_materials[1].reference = false;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBe(undefined);
        expect(reaction.products[1].maxAmount).toBe(undefined);
      });
    });

    context('when first starting material is reference', () => {
      it('correct max amounts calculated (40,80)', () => {
        reaction.starting_materials[0].reference = true;
        reaction.starting_materials[1].reference = false;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBeCloseTo(40, 5);
        expect(reaction.products[1].maxAmount).toBeCloseTo(80, 5);
      });
    });
    context('when second starting material is reference', () => {
      it('correct max amounts calculated (200,400)', () => {
        reaction.starting_materials[0].reference = false;
        reaction.starting_materials[1].reference = true;

        reaction.updateMaxAmountOfProducts();

        expect(reaction.products[0].maxAmount).toBeCloseTo(200, 5);
        expect(reaction.products[1].maxAmount).toBeCloseTo(400, 5);
      });
    });

    context('when no product present', () => {
      it('no changes happened', () => {
        reaction.starting_materials[0].reference = true;
        reaction.starting_materials[1].reference = false;
        const { products } = reaction;
        reaction.products = [];
        reaction.updateMaxAmountOfProducts();

        reaction.products = products;
      });
    });
  });
  describe('variations', () => {
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
      expect(reaction.variations[0].products[productID].aux.yield).toBe('100');
      reaction.variations[0].products[productID].value = '2';
      const updatedVariations = computeYield(reaction.variations, reaction.hasPolymers());
      expect(updatedVariations[0].products[productID].aux.yield).toBe('5');
    });
  });
});
