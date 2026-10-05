import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import { EquivalentOrYield } from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';

configure({ adapter: new Adapter() });

/*
A product's yield is shown capped at 100 %. Where the amounts give more than that, the field says so,
in the scheme tab and the variations grid alike.
*/
describe('Product yield above 100 %', () => {
  let reaction;

  const handlerFor = (product) => new MaterialHandler({
    variations: [],
    material: product,
    reaction,
    materialGroup: 'products',
    index: 0,
  });

  // The most product the reference material allows for, in grams.
  const maxAmountOf = (product) => {
    const reference = reaction.getReferenceMaterial();
    const stoichiometryCoeff = (product.coefficient || 1) / (reference.coefficient || 1);
    return reference.amount_mol * stoichiometryCoeff * product.molecule_molecular_weight / (product.purity || 1);
  };

  const withProductMass = (fraction) => {
    const [product] = reaction.products;
    product.setAmount({ value: maxAmountOf(product) * fraction, unit: 'g' });
    product.equivalent = Math.min(fraction, 1);
    return product;
  };

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.starting_materials[0].reference = true;
  });

  it('works out the yield the amounts give, uncapped', () => {
    expect(handlerFor(withProductMass(1.21)).uncappedYield()).toBeCloseTo(1.21, 6);
    expect(handlerFor(withProductMass(0.5)).uncappedYield()).toBeCloseTo(0.5, 6);
  });

  it('has nothing to work out for a gas product', () => {
    const product = withProductMass(1.21);
    product.gas_type = 'gas';
    expect(handlerFor(product).uncappedYield()).toBe(null);
  });

  const warningShown = (product) => {
    const wrapper = mount(<EquivalentOrYield mh={handlerFor(product)} displayYieldField />);
    const shown = wrapper.find('[data-testid="yield-above-limit"]').exists();
    const value = wrapper.find('input[name="yield"]').prop('value');
    wrapper.unmount();
    return { shown, value };
  };

  it('warns next to a yield shown as 100 % that is really more', () => {
    const { shown, value } = warningShown(withProductMass(1.21));
    expect(value).toBe('100%');
    expect(shown).toBe(true);
  });

  it('does not warn for a yield up to 100 %', () => {
    expect(warningShown(withProductMass(0.5)).shown).toBe(false);
    expect(warningShown(withProductMass(1)).shown).toBe(false);
  });
});
