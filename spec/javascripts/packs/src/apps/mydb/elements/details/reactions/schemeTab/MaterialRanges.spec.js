import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import { makeVariationReaction } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

configure({ adapter: new Adapter() });

/*
A material field of the scheme tab of a reaction with variations shows the range its variations
span. A variation without an amount has no mass, volume, moles or concentration - not 0 of them.
*/
describe('Scheme tab ranges of a material', () => {
  let reaction;
  let variations;

  const handlerFor = (materialGroup, index) => new MaterialHandler({
    variations,
    material: reaction[materialGroup][index],
    reaction,
    materialGroup,
    index,
  });

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    const withAmount = makeVariationReaction(reaction, {});
    withAmount.products[0].setAmount({ value: 50, unit: 'g' });
    const withoutAmount = makeVariationReaction(reaction, {});
    withoutAmount.products[0].amount_value = null;
    variations = [{ idx: 0, data: withAmount }, { idx: 1, data: withoutAmount }];
  });

  it('leaves a variation without an amount out of the amount range', () => {
    const range = handlerFor('products', 0).findMinMayUnit(
      'mol',
      (material) => material.amount_mol,
      { needsAmount: true }
    );

    expect(range.min).toBeGreaterThan(0);
    expect(range.min).toBe(range.max);
    expect(range.isRangeField).toBe(true);
  });

  it('keeps it in the range of a value that does not depend on the amount', () => {
    const range = handlerFor('products', 0).findMinMayUnit('', (material) => material.coefficient);

    expect(range.isRangeField).toBe(false);
  });

  describe('as shown in the input', () => {
    const shown = (props) => {
      const wrapper = mount(
        <NumeralInputWithUnitsCompo unit="g" metricPrefix="n" metricPrefixes={['n', 'm']} isRangeField {...props} />
      );
      const input = wrapper.find('input').first();
      const result = { value: input.prop('value'), title: input.prop('title') };
      wrapper.unmount();
      return result;
    };

    it('shows one value where the variations agree', () => {
      const { value, title } = shown({ value: 1, rangeStart: 0.25, rangeEnd: 0.25 });
      expect(value).toBe('0.25');
      expect(title).toBe('0.25');
    });

    it('shows a range, with the full range as its title, where they do not', () => {
      const { value, title } = shown({ value: 1, rangeStart: 0.25, rangeEnd: 1.5 });
      expect(value).toBe('0.25-1.5');
      expect(title).toBe('0.25-1.5');
    });
  });
});
