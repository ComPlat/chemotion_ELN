import expect from 'expect';
import {
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  updateYields,
  updateEquivalents,
  getReferenceMaterial,
  getReactionMaterials,
  getMaterialHeaderNames,
  getSequentialId,
  getGramFromMol,
  getMolFromGram,
  convertUnit,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { setUpMaterial, setUpReaction } from 'helper/reactionVariationsHelpers';

describe('ReactionVariationsUtils', () => {
  it('gets material names', async () => {
    const material = await setUpMaterial();
    material.id = 42;
    expect(getMaterialHeaderNames(material)).toEqual(['ID: 42', 'NEW SAMPLE']);
  });
  it('gets sequential ID', () => {
    const variations = [];
    expect(getSequentialId(variations)).toBe(1);
    variations.push({ id: 42 });
    expect(getSequentialId(variations)).toBe(43);
  });
  it('converts gram to mol', () => {
    const material = { aux: { loading: 2 } };
    expect(getMolFromGram(1, material)).toBe((1 * 2) / 1e4);
    material.aux.loading = null;
    material.aux.molarity = 1;
    material.aux.purity = 2;
    material.aux.molecularWeight = 3;
    expect(getMolFromGram(1, material)).toBe((1 * 2) / (1 * 3));
  });
  it('converts mol to gram', () => {
    const material = { aux: { loading: 2 } };
    expect(getGramFromMol(1, material)).toBe((1 / 2) * 1e4);
    material.aux.loading = null;
    material.aux.purity = 2;
    material.aux.molecularWeight = 1;
    expect(getGramFromMol(1, material)).toBe(1 / 2);
  });
  it('converts units', () => {
    expect(convertUnit(1, 'g', 'mg')).toBe(1000);
    expect(convertUnit(1, 'mg', 'g')).toBe(0.001);
    expect(convertUnit(1, 'l', 'ml')).toBe(1000);
    expect(convertUnit(1, 'ml', 'l')).toBe(0.001);
    expect(convertUnit(1, '°C', '°F')).toBe(33.8);
    expect(convertUnit(1, '°F', '°C')).toBeCloseTo(-17.2, 0.1);
    expect(convertUnit(1, 'Second(s)', 'Minute(s)')).toBeCloseTo(0.0167, 0.00001);
    expect(convertUnit(1, 'Minute(s)', 'Second(s)')).toBe(60);
  });
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
  it("updates non-reference materials' equivalents when reference material's amount changes ", async () => {
    const reaction = await setUpReaction();
    const reactantID = reaction.reactants[0].id;
    expect(reaction.variations[0].reactants[reactantID].aux.equivalent).toBe(1);
    const referenceMaterial = getReferenceMaterial(reaction.variations[0]);
    referenceMaterial.value = 2000;
    const updatedVariationsRow = updateEquivalents(reaction.variations[0]);
    expect(updatedVariationsRow.reactants[reactantID].aux.equivalent).toBeCloseTo(50, 0.01);
  });
});
