import expect from 'expect';
import sinon from 'sinon';
import Container from 'src/models/Container';
import ReactionFactory from 'factories/ReactionFactory';
import {
  getReactionAnalyses, autofillVariationFromAnalysis
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';

function buildAnalysis(name) {
  const analysis = Container.buildEmpty();
  analysis.container_type = 'analysis';
  analysis.name = name;
  analysis.is_new = false;
  analysis.is_deleted = false;
  return analysis;
}

/*
A variation stores the ids of the analyses it is linked to and nothing else, so the only thing to
check here is which of the reaction's analyses are offered to link to in the first place.
*/
describe('ReactionVariationsAnalyses', () => {
  describe('getReactionAnalyses', () => {
    let reaction;
    let analysisFoo;
    let analysisBar;

    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      analysisFoo = buildAnalysis('foo');
      analysisBar = buildAnalysis('bar');
      reaction.container.children[0].children.push(analysisFoo, analysisBar);
    });

    it('returns the analyses of the reaction', () => {
      expect(getReactionAnalyses(reaction).map((analysis) => analysis.name)).toEqual(['foo', 'bar']);
    });

    it('leaves out an analysis marked as deleted', () => {
      analysisBar.is_deleted = true;
      expect(getReactionAnalyses(reaction).map((analysis) => analysis.name)).toEqual(['foo']);
    });

    // An unsaved analysis has no id yet, so a variation could not reference it.
    it('leaves out an analysis that is new', () => {
      analysisBar.is_new = true;
      expect(getReactionAnalyses(reaction).map((analysis) => analysis.name)).toEqual(['foo']);
    });

    it('copies, so that editing what it returns does not reach the reaction', () => {
      getReactionAnalyses(reaction)[0].name = 'renamed';
      expect(analysisFoo.name).toBe('foo');
    });
  });

  /*
  A dataset's reaction_variation.json is applied as the edits the grid cells would make: each triple
  becomes a change event on the row's update handler, so the recalculation is the handler's problem,
  not the autofill's.
  */
  describe('autofillVariationFromAnalysis', () => {
    let reaction;
    let handler;

    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.starting_materials[0].name = 'water-a';
      reaction.starting_materials[1].external_label = 'water-b';
      handler = { handleMaterialsChange: sinon.spy() };
    });

    it('fills an amount, converted to the base unit, on the material matching by name', () => {
      autofillVariationFromAnalysis(reaction, handler, [['water-a', 500, 'mg']]);

      expect(handler.handleMaterialsChange.calledOnce).toBe(true);
      expect(handler.handleMaterialsChange.firstCall.args[0]).toEqual({
        type: 'amountChanged',
        sampleID: reaction.starting_materials[0].id,
        amount: { value: 0.5, unit: 'g' },
      });
    });

    it('matches by any of the sample labels', () => {
      autofillVariationFromAnalysis(reaction, handler, [['water-b', 2, 'ml']]);

      expect(handler.handleMaterialsChange.firstCall.args[0]).toEqual({
        type: 'amountChanged',
        sampleID: reaction.starting_materials[1].id,
        amount: { value: 0.002, unit: 'l' },
      });
    });

    it("fills the equivalent for a '%' entry", () => {
      autofillVariationFromAnalysis(reaction, handler, [['water-a', 0.5, '%']]);

      expect(handler.handleMaterialsChange.firstCall.args[0]).toEqual({
        type: 'equivalentChanged',
        sampleID: reaction.starting_materials[0].id,
        equivalent: 0.5,
      });
    });

    it('applies every entry of the file', () => {
      autofillVariationFromAnalysis(reaction, handler, [
        ['water-a', 1, 'g'],
        ['water-b', 2, 'mmol'],
      ]);
      expect(handler.handleMaterialsChange.callCount).toBe(2);
      expect(handler.handleMaterialsChange.secondCall.args[0].amount).toEqual({ value: 0.002, unit: 'mol' });
    });

    // The file may describe more than this reaction holds; what it cannot place, it leaves alone.
    it('skips unknown identifiers, unknown units and non-numeric values', () => {
      autofillVariationFromAnalysis(reaction, handler, [
        ['no-such-material', 1, 'g'],
        ['water-a', 1, 'furlongs'],
        ['water-a', 'a lot', 'g'],
      ]);
      expect(handler.handleMaterialsChange.notCalled).toBe(true);
    });
  });
});
