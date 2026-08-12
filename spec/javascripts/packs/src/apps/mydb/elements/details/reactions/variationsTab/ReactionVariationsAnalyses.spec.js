import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import Enzyme, { shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import Container from 'src/models/Container';
import AppModal from 'src/components/common/AppModal';
import {
  updateAnalyses, getReactionAnalyses, AutofillVariationSamplesModal
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import { setUpReaction } from 'helper/reactionVariationsHelpers';

Enzyme.configure({ adapter: new Adapter() });

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
    it('when no update is necessary', async () => {
      let { variations } = reaction;
      variations[0].metadata.analyses = [analysisFoo.id];
      variations[1].metadata.analyses = [analysisBar.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))).toEqual(variations);
    });
    it('when analysis is removed', async () => {
      let { variations } = reaction;
      variations[0].metadata.analyses = [analysisFoo.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[0].metadata.analyses).toEqual([analysisFoo.id]);
      reaction.container.children[0].children = reaction.container.children[0].children.filter((child) => child.id !== analysisFoo.id);
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[0].metadata.analyses).toEqual([]);
    });
    it('when analysis is marked as deleted', async () => {
      let { variations } = reaction;
      variations[1].metadata.analyses = [analysisBar.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses).toEqual([analysisBar.id]);
      analysisBar.is_deleted = true;
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses).toEqual([]);
    });
    it('when analysis is new', async () => {
      let { variations } = reaction;
      variations[1].metadata.analyses = [analysisBar.id];
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses).toEqual([analysisBar.id]);
      analysisBar.is_new = true;
      expect(updateAnalyses(variations, getReactionAnalyses(reaction))[1].metadata.analyses).toEqual([]);
    });
  });

  describe('AutofillVariationSamplesModal', () => {
    const buildAutofill = () => ({
      variationRow: { id: 1 },
      samples: [
        {
          sampleIdentifier: 'foo', value: 1.5, unit: 'g', foundMat: { matType: 'startingMaterials' }
        },
        {
          sampleIdentifier: 'bar', value: 42, unit: '%', foundMat: { matType: 'products' }
        },
      ],
    });

    const renderModal = (autofill, handlers = {}) => shallow(
      React.createElement(AutofillVariationSamplesModal, {
        autofill,
        onConfirm: handlers.onConfirm ?? (() => {}),
        onCancel: handlers.onCancel ?? (() => {}),
      })
    );

    it('renders nothing while no autofill is pending', () => {
      expect(renderModal(null).isEmptyRender()).toBe(true);
    });

    it('lists every pending sample with its material label, value and unit', () => {
      const items = renderModal(buildAutofill()).find('li');

      expect(items).toHaveLength(2);
      expect(items.at(0).text()).toContain('Starting material: foo');
      expect(items.at(0).text()).toContain('to 1.5 g');
      expect(items.at(1).text()).toContain('Product: bar');
      expect(items.at(1).text()).toContain('to 42 %');
    });

    it('falls back to the raw material type when it has no single-item label', () => {
      const autofill = buildAutofill();
      autofill.samples[0].foundMat.matType = 'somethingElse';

      expect(renderModal(autofill).find('li').at(0).text()).toContain('somethingElse: foo');
    });

    it('confirms and cancels through the modal, not through the grid', () => {
      const onConfirm = sinon.spy();
      const onCancel = sinon.spy();
      const modal = renderModal(buildAutofill(), { onConfirm, onCancel }).find(AppModal);

      modal.prop('onPrimaryAction')();
      expect(onConfirm.calledOnce).toBe(true);

      modal.prop('onHide')();
      expect(onCancel.calledOnce).toBe(true);
    });
  });
});
