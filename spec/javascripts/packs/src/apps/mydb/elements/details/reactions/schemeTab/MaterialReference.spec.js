import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import { OverlayTrigger } from 'react-bootstrap';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import { MaterialRef } from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';
import { isVariationReaction } from 'src/apps/mydb/elements/details/reactions/schemeTab/GasPhaseContext';
import { makeVariationReaction } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

configure({ adapter: new Adapter() });

/*
The reference material is chosen in the reaction's Scheme tab only. A variation - a row of the
Variations tab or its Open panel - shows it, cannot change it, and says where it is set.
*/
describe('Ref of a material in a variation', () => {
  let reaction;

  const refCellOf = (ofReaction, materialGroup, index) => {
    const mh = new MaterialHandler({
      material: ofReaction[materialGroup][index], reaction: ofReaction, materialGroup, index,
    });
    const wrapper = mount(<MaterialRef mh={mh} />);
    const triggers = wrapper.find(OverlayTrigger);
    const tooltips = triggers.map((trigger) => trigger.prop('overlay').props.children);
    const result = {
      radios: wrapper.find('input[type="radio"]').map((radio) => radio.prop('disabled')),
      nested: wrapper.find('[role="radio"]').map((radio) => radio.prop('className').includes('disabled')),
      locked: wrapper.find('.reaction-material__ref-data--locked').exists(),
      // Tooltips a hover can show; a suppressed one is `show={false}`.
      shownTooltips: triggers.filterWhere((trigger) => trigger.prop('show') !== false)
        .map((trigger) => trigger.prop('overlay').props.children),
      tooltips,
    };
    wrapper.unmount();
    return result;
  };

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.starting_materials[0].reference = true;
  });

  it('tells a variation from the reaction itself', () => {
    expect(isVariationReaction(makeVariationReaction(reaction, {}))).toBe(true);
    expect(isVariationReaction(reaction)).toBe(false);
  });

  it('can be set in the Scheme tab of the reaction', () => {
    const { radios, locked, tooltips } = refCellOf(reaction, 'starting_materials', 1);
    expect(radios).toEqual([false]);
    expect(locked).toBe(false);
    expect(tooltips).toEqual([]);
  });

  it('cannot be set in a variation, which says where it is set', () => {
    const { radios, locked, shownTooltips } = refCellOf(makeVariationReaction(reaction, {}), 'starting_materials', 1);
    expect(radios).toEqual([true]);
    expect(locked).toBe(true);
    expect(shownTooltips).toEqual([
      'The reference material is set in the Scheme tab of the reaction and applies to all of its variations.',
    ]);
  });

  describe('with weight percentages', () => {
    beforeEach(() => {
      reaction.weight_percentage = true;
    });

    it('cannot set either reference of a starting material in a variation', () => {
      const { nested, shownTooltips } = refCellOf(makeVariationReaction(reaction, {}), 'starting_materials', 1);
      expect(nested).toEqual([true, true]);
      expect(shownTooltips.length).toBe(1);
    });

    it('cannot set the reference product in a variation', () => {
      const { radios, shownTooltips } = refCellOf(makeVariationReaction(reaction, {}), 'products', 0);
      expect(radios).toEqual([true]);
      expect(shownTooltips.length).toBe(1);
    });

    it('can set both in the reaction itself', () => {
      expect(refCellOf(reaction, 'starting_materials', 1).nested).toEqual([false, false]);
      expect(refCellOf(reaction, 'products', 0).radios).toEqual([false]);
    });
  });

  it('has nothing to lock in the empty Ref cell of a product', () => {
    const { radios, locked } = refCellOf(makeVariationReaction(reaction, {}), 'products', 0);
    expect(radios).toEqual([]);
    expect(locked).toBe(false);
  });
});
