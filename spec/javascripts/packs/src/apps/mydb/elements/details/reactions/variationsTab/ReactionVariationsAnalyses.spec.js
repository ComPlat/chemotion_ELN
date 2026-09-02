import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, shallow } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import Container from 'src/models/Container';
import ReactionFactory from 'factories/ReactionFactory';
import AppModal from 'src/components/common/AppModal';
import {
  getReactionAnalyses, autofillVariationFromAnalysis, resolveAutofillSamples,
  AutofillVariationSamplesModal
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsAnalyses';
import { createCompleteGasPhaseReaction } from 'helper/gasPhaseReactionTestHelpers';

configure({ adapter: new Adapter() });

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

  /*
  Reading the file is a step of its own, because the user confirms what it says before any of it is
  written. What resolving returns is therefore both what will be applied and what is put in front of
  the user, so an entry this variation cannot take must not be in it.
  */
  describe('resolveAutofillSamples', () => {
    let reaction;

    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.starting_materials[0].name = 'water-a';
      reaction.starting_materials[1].external_label = 'water-b';
    });

    it('quotes the file and names the material group, for the confirmation dialog', () => {
      const resolved = resolveAutofillSamples(reaction, [['water-a', 500, 'mg']]);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].identifier).toBe('water-a');
      expect(resolved[0].matGroup).toBe('starting_materials');
      expect(resolved[0].value).toBe(500);
      expect(resolved[0].unit).toBe('mg');
      expect(resolved[0].change).toEqual({
        type: 'amountChanged',
        sampleID: reaction.starting_materials[0].id,
        amount: { value: 0.5, unit: 'g' },
      });
    });

    it('matches a sum formula the sample carries itself', () => {
      reaction.starting_materials[1].sum_formula = 'H2O';

      const resolved = resolveAutofillSamples(reaction, [['H2O', 1, 'g']]);

      expect(resolved).toHaveLength(1);
      expect(resolved[0].change.sampleID).toBe(reaction.starting_materials[1].id);
    });

    it('keeps one entry per applicable triple, in the order of the file', () => {
      const resolved = resolveAutofillSamples(reaction, [
        ['water-a', 1, 'g'],
        ['water-b', 2, '%'],
      ]);

      expect(resolved.map(({ identifier }) => identifier)).toEqual(['water-a', 'water-b']);
      expect(resolved[1].change.type).toBe('equivalentChanged');
    });

    it('leaves out what this variation has no material or no usable unit for', () => {
      expect(resolveAutofillSamples(reaction, [
        ['no-such-material', 1, 'g'],
        ['water-a', 1, 'furlongs'],
        ['water-a', 'a lot', 'g'],
      ])).toEqual([]);
    });

    describe('gas entries', () => {
      let gasReaction;

      beforeEach(() => {
        gasReaction = createCompleteGasPhaseReaction();
      });

      it('fills the gas field the unit names', () => {
        const resolved = resolveAutofillSamples(gasReaction, [['CU1-R15-A', 250, 'ppm']]);

        expect(resolved[0].change).toEqual({
          type: 'gasFieldsChanged',
          sampleID: gasReaction.products[0].id,
          materialGroup: 'products',
          field: 'part_per_million',
          value: 250,
        });
      });

      // The gas field event writes in the unit the material currently shows the field in.
      it('converts into the unit the material displays', () => {
        const resolved = resolveAutofillSamples(gasReaction, [['CU1-R15-A', 25, '°C']]);

        expect(resolved[0].change.field).toBe('temperature');
        expect(resolved[0].change.value).toBe(298.15); // The product shows its temperature in K.
      });

      // Only a gas product has these fields, so on anything else the entry has nowhere to go.
      it('leaves out a gas entry on a material that is not a gas product', () => {
        expect(resolveAutofillSamples(gasReaction, [['CaCl2', 250, 'ppm']])).toEqual([]);
      });
    });
  });

  /*
  The data file is a foreign document, so what it is about to write into the variation is shown
  first. It lists what resolving returned, which is exactly what will be assigned.
  */
  describe('AutofillVariationSamplesModal', () => {
    const buildAutofill = () => ({
      samples: [
        {
          identifier: 'water-a', matGroup: 'starting_materials', value: 1.5, unit: 'g'
        },
        {
          identifier: 'benzene', matGroup: 'products', value: 42, unit: '%'
        },
      ],
    });

    const renderModal = (autofill, handlers = {}) => shallow(
      <AutofillVariationSamplesModal
        autofill={autofill}
        onConfirm={handlers.onConfirm ?? (() => {})}
        onCancel={handlers.onCancel ?? (() => {})}
      />
    );

    it('renders nothing while no autofill is pending', () => {
      expect(renderModal(null).isEmptyRender()).toBe(true);
    });

    it('lists every entry with its material label, value and unit', () => {
      const items = renderModal(buildAutofill()).find('li');

      expect(items).toHaveLength(2);
      expect(items.at(0).text()).toContain('Starting material: water-a');
      expect(items.at(0).text()).toContain('to 1.5 g');
      expect(items.at(1).text()).toContain('Product: benzene');
      expect(items.at(1).text()).toContain('to 42 %');
    });

    it('falls back to the raw material group when it has no title', () => {
      const autofill = buildAutofill();
      autofill.samples[0].matGroup = 'somethingElse';

      expect(renderModal(autofill).find('li').at(0).text()).toContain('somethingElse: water-a');
    });

    // Nothing to confirm, so the modal says so rather than offering a confirmation.
    it('says so when the file matched nothing, and offers no primary action', () => {
      const wrapper = renderModal({ samples: [] });

      expect(wrapper.find('li')).toHaveLength(0);
      expect(wrapper.find('p').text()).toContain('None of the materials identified in the analysis were found');
      expect(wrapper.find(AppModal).prop('primaryActionLabel')).toBe(undefined);
    });

    it('confirms and cancels through the modal', () => {
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
