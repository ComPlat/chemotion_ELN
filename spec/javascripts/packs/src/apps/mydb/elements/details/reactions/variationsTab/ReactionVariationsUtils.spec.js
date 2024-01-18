import ReactionFactory from 'factories/ReactionFactory';
import SampleFactory from 'factories/SampleFactory';
import Container from 'src/models/Container';
import expect from 'expect';
import {
  createVariationsRow,
  removeObsoleteMaterialsFromVariations,
  addMissingMaterialsToVariations,
  updateYields,
  updateEquivalents,
  getReferenceMaterial,
  getVariationsRowName,
  copyVariationsRow,
  associateAnalysisWithVariationsRow,
  updateAnalyses,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

function buildAnalysis(name) {
  const analysis = Container.buildEmpty();
  analysis.container_type = 'analysis';
  analysis.name = name;
  return analysis;
}

function getReactionMaterials(reaction) {
  return {
    startingMaterials: reaction.starting_materials,
    reactants: reaction.reactants,
    products: reaction.products,
    solvents: reaction.solvents
  };
}

async function setUpMaterial() {
  return SampleFactory.build('SampleFactory.water_100g');
}
async function setUpReaction() {
  const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
  reaction.starting_materials[0].reference = true;
  reaction.reactants = [await SampleFactory.build('SampleFactory.water_100g')];
  for (let i = 0; i < 3; i += 1) {
    const variationsRow = createVariationsRow(reaction);
    reaction.variations = [...reaction.variations, variationsRow];
  }
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
  it('assign correct name to variation', async () => {
    const reaction = await setUpReaction();
    reaction.short_label = 'foo';
    reaction.variations.forEach((variation, index) => {
      expect(getVariationsRowName(reaction, variation)).toBe(`foo-${index + 1}`);
    });
  });
  it('copy variation without analyses and with correct ID', async () => {
    const reaction = await setUpReaction();
    const variation = reaction.variations[0];
    variation.analyses.push(3141);
    const copiedVariation = copyVariationsRow(reaction, variation);
    expect(variation.analyses).toEqual([3141]);
    expect(copiedVariation.analyses).toEqual([]);
    expect(copiedVariation.id).toEqual(Math.max(...reaction.variations.map((v) => (v.id))) + 1);
  });
  it('associate analyses with variation', async () => {
    let { variations } = await setUpReaction();
    variations = associateAnalysisWithVariationsRow(variations, variations[0], 3141);
    variations = associateAnalysisWithVariationsRow(variations, variations[0], 5926);
    expect(variations[0].analyses).toEqual([3141, 5926]);
    variations = associateAnalysisWithVariationsRow(variations, variations[1], 3141);
    expect(variations[1].analyses).toEqual([3141]);
    expect(variations[0].analyses).toEqual([5926]);
    variations = associateAnalysisWithVariationsRow(variations, null, 3141);
    expect(variations[1].analyses).toEqual([]);
  });
  describe('update analyses associated with variations', async () => {
    let reaction;
    let analysisFoo;
    let analysisBar;
    beforeEach(async () => {
      reaction = await setUpReaction();
      analysisFoo = buildAnalysis('foo');
      analysisBar = buildAnalysis('bar');
      reaction.container.children[0].children.push(analysisFoo);
      reaction.container.children[0].children.push(analysisBar);
    });
    it('when no update is necessary', async () => {
      let { variations } = reaction;
      variations = associateAnalysisWithVariationsRow(variations, variations[0], analysisFoo.id);
      variations = associateAnalysisWithVariationsRow(variations, variations[1], analysisBar.id);
      expect(updateAnalyses(variations, reaction)).toEqual(variations);
    });
    it('when analysis is removed', async () => {
      let { variations } = reaction;
      variations = associateAnalysisWithVariationsRow(variations, variations[0], analysisFoo.id);
      expect(updateAnalyses(variations, reaction)[0].analyses).toEqual([analysisFoo.id]);
      reaction.container.children[0].children = reaction.container.children[0].children.filter((child) => child.id !== analysisFoo.id);
      expect(updateAnalyses(variations, reaction)[0].analyses).toEqual([]);
    });
    it('when analysis is marked as deleted', async () => {
      let { variations } = reaction;
      variations = associateAnalysisWithVariationsRow(variations, variations[1], analysisBar.id);
      expect(updateAnalyses(variations, reaction)[1].analyses).toEqual([analysisBar.id]);
      analysisBar.is_deleted = true;
      expect(updateAnalyses(variations, reaction)[1].analyses).toEqual([]);
    });
  });
});
