import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import { OverlayTrigger } from 'react-bootstrap';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import NumeralInputWithUnitsCompo from 'src/apps/mydb/elements/details/NumeralInputWithUnitsCompo';
import {
  makeVariationReaction, variationDiffOf,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { EquivalentOrYield } from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';

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
      const result = {
        value: input.prop('value'),
        readOnly: input.prop('readOnly'),
        disabled: input.prop('disabled'),
        tooltip: wrapper.find(OverlayTrigger).last().prop('overlay').props.children,
      };
      wrapper.unmount();
      return result;
    };

    it('shows one value where the variations agree', () => {
      const { value, tooltip } = shown({ value: 1, rangeStart: 0.25, rangeEnd: 0.25 });
      expect(value).toBe('0.25');
      expect(tooltip[0]).toBe('Variations: 0.25 g');
    });

    it('shows a range where they do not', () => {
      const { value, tooltip } = shown({ value: 1, rangeStart: 0.25, rangeEnd: 1.5 });
      expect(value).toBe('0.25-1.5');
      expect(tooltip[0]).toBe('Variations: 0.25-1.5 g');
    });

    /*
    A disabled input gets no mouse events, so a tooltip or title on it never shows: the range is
    read-only instead, and the field cut short to fit has the full range in its tooltip.
    */
    it('shortens a long range and has it in full in a tooltip that can show', () => {
      const {
        value, tooltip, readOnly, disabled,
      } = shown({
        value: 1, precision: 4, metricPrefix: 'm', rangeStart: 0.1836726, rangeEnd: 0.3673452, rangeHint: 'molar mass: 158 g/mol',
      });
      expect(value).toBe('183.7-367.3');
      expect(tooltip[0]).toBe('Variations: 183.6726-367.3452 mg');
      expect(mount(<div>{tooltip[1]}</div>).text()).toBe('molar mass: 158 g/mol');
      expect(readOnly).toBe(true);
      expect(disabled).toBeFalsy();
    });

    it('shows the range of a field without a unit, such as the equivalent', () => {
      const wrapper = mount(<NumeralInputWithUnitsCompo isRangeField value={1} rangeStart={0.5} rangeEnd={1} />);
      const input = wrapper.find('input').first();
      expect(input.prop('value')).toBe('0.5-1');
      expect(input.prop('readOnly')).toBe(true);
      wrapper.unmount();
    });
  });

  /*
  CU1-R12: the reference amount differs between the variations, the reactant's amount does not, so
  the reactant's equivalent does - and has to be shown as their range, which cannot be edited.
  */
  it('shows the range of a reactant equivalent that follows from a varied reference amount', () => {
    const [reference, reactant] = reaction.starting_materials;
    reference.reference = true;
    reference.equivalent = 1;
    reactant.equivalent = 1;
    reaction.starting_materials = [reference];
    reaction.reactants = [reactant];
    const withReferenceAmount = (factor) => {
      const variation = makeVariationReaction(reaction, {});
      variation.starting_materials[0].setAmount({ value: reference.amount_mol * factor, unit: 'mol' });
      return makeVariationReaction(reaction, variationDiffOf(reaction, variation));
    };
    variations = [{ idx: 0, data: withReferenceAmount(1) }, { idx: 1, data: withReferenceAmount(2) }];

    const wrapper = mount(<EquivalentOrYield mh={handlerFor('reactants', 0)} />);
    const input = wrapper.find('.reaction-material__equivalent-data input').first();
    expect(input.prop('value')).toBe('0.5-1');
    expect(input.prop('readOnly')).toBe(true);
    wrapper.unmount();
  });
});
