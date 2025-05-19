import expect from 'expect';
import Container from 'src/models/Container';
import {
  updateAnalyses, getReactionAnalyses,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import { setUpReaction } from 'helper/reactionVariationsHelpers';

function buildAnalysis(name) {
  const analysis = Container.buildEmpty();
  analysis.container_type = 'analysis';
  analysis.name = name;
  analysis.is_new = false;
  analysis.is_deleted = false;
  return analysis;
}

describe('ReactionVariationsAnalyses', async () => {
  describe('updates analyses associated with variations', async () => {
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
    it('when no update is necessary', async (done) => {
      const { variations } = reaction;
      variations[0].metadata.analyses = [analysisFoo.id];
      variations[1].metadata.analyses = [analysisBar.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction)))
        .toEqual(variations);
      done();
    });
    it('when analysis is removed', async () => {
      const { variations } = reaction;
      
      variations[0].metadata.analyses = [analysisFoo.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[0].metadata.analyses)
        .toEqual([analysisFoo.id]);
      const nc =  reaction.container.children[0].children.filter((child) => child.id !== analysisFoo.id);
      reaction.container.children[0].children = nc;
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[0].metadata.analyses)
        .toEqual([]);
    });
    it('when analysis is marked as deleted', async () => {
      const { variations } = reaction;
      variations[1].metadata.analyses = [analysisBar.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses)
        .toEqual([analysisBar.id]);
      analysisBar.is_deleted = true;
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses)
        .toEqual([]);
    });
    it('when analysis is new', async () => {
      let { variations } = reaction;
      variations[1].metadata.analyses = [analysisBar.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses)
        .toEqual([analysisBar.id]);
      analysisBar.is_new = true;
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses)
        .toEqual([]);
    });
  });
});
