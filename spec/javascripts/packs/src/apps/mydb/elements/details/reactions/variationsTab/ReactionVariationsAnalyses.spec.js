import expect from 'expect';
import Container from 'src/models/Container';
import ReactionFactory from 'factories/ReactionFactory';
import {
  getReactionAnalyses
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
});
