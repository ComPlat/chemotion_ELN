import React from 'react';
import expect from 'expect';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import ReactionFactory from 'factories/ReactionFactory';
import { calculateFeedstockMoles } from 'src/utilities/UnitsConversion';
import MaterialHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialUtils';
import { EquivalentOrYield } from 'src/apps/mydb/elements/details/reactions/schemeTab/material/MaterialComponents';
import {
  makeVariationReaction, variationDiffOf,
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';

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

/*
A reaction whose variations give the product other yields than the reaction itself shows their range,
which cannot be edited there - CU1-R12 showed 0 % for variations with 53 % and 100 %.
*/
describe('Product yield of a reaction with variations', () => {
  let reaction;

  const maxAmountOf = (product) => {
    const reference = reaction.getReferenceMaterial();
    const stoichiometryCoeff = (product.coefficient || 1) / (reference.coefficient || 1);
    return reference.amount_mol * stoichiometryCoeff * product.molecule_molecular_weight / (product.purity || 1);
  };

  const variationWithYield = (fraction) => {
    const variation = makeVariationReaction(reaction, {});
    const [product] = variation.products;
    product.setAmount({ value: maxAmountOf(product) * fraction, unit: 'g' });
    return makeVariationReaction(reaction, variationDiffOf(reaction, variation));
  };

  const yieldShown = (variations) => {
    const mh = new MaterialHandler({
      variations, material: reaction.products[0], reaction, materialGroup: 'products', index: 0,
    });
    const wrapper = mount(<EquivalentOrYield mh={mh} displayYieldField />);
    const input = wrapper.find('input[name="yield"]');
    const result = { value: input.prop('value'), readOnly: input.prop('readOnly') };
    wrapper.unmount();
    return result;
  };

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.starting_materials[0].reference = true;
    reaction.products[0].setAmount({ value: 0, unit: 'g' });
    reaction.products[0].equivalent = 0;
  });

  it('shows the range of the yields of the variations', () => {
    const { value, readOnly } = yieldShown(
      [{ idx: 0, data: variationWithYield(0.53) }, { idx: 1, data: variationWithYield(1) }]
    );
    expect(value).toBe('53-100%');
    expect(readOnly).toBe(true);
  });

  it('shows the one yield variations agree on, where it is not the reaction\'s own', () => {
    expect(yieldShown([{ idx: 0, data: variationWithYield(0.53) }]).value).toBe('53%');
  });

  it('shows the reaction\'s own yield without variations', () => {
    const { value, readOnly } = yieldShown([]);
    expect(value).toBe('0%');
    expect(readOnly).toBeFalsy();
  });
});

/*
A gas product's yield is not stored but worked out from its moles, the vessel size and the feedstock -
each variation's own. Where the variations give other yields than the reaction, the field shows their
range too.
*/
describe('Gas product yield of a reaction with variations', () => {
  let reaction;

  // The moles of gas product that give `fraction` as yield in `ofReaction`.
  const molesForYield = (ofReaction, fraction) => {
    const { vesselSize } = ofReaction.findReactionVesselSizeCatalystMaterialValues();
    const feedstock = ofReaction.findFeedstockMaterial();
    return fraction * calculateFeedstockMoles(vesselSize, feedstock.purity || 1);
  };

  const withGasYield = (ofReaction, fraction) => {
    const [product] = ofReaction.products;
    product.amount_unit = 'mol';
    product.amount_value = molesForYield(ofReaction, fraction);
    return ofReaction;
  };

  const variationWithGasYield = (fraction, data = {}) => (
    withGasYield(makeVariationReaction(reaction, data), fraction)
  );

  const yieldShown = (variations) => {
    const mh = new MaterialHandler({
      variations, material: reaction.products[0], reaction, materialGroup: 'products', index: 0,
    });
    const wrapper = mount(<EquivalentOrYield mh={mh} displayYieldField />);
    const input = wrapper.find('input[name="yield"]');
    const result = { value: input.prop('value'), readOnly: input.prop('readOnly') };
    wrapper.unmount();
    return result;
  };

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.gaseous = true;
    reaction.vessel_size = { amount: 100, unit: 'ml' };
    reaction.starting_materials[0].reference = true;
    reaction.starting_materials[0].gas_type = 'feedstock';
    reaction.products[0].gas_type = 'gas';
    withGasYield(reaction, 0.2);
  });

  it('shows the reaction\'s own gas yield as before', () => {
    expect(new MaterialHandler({
      material: reaction.products[0], reaction, materialGroup: 'products', index: 0,
    }).recalculateYieldForGasProduct()).toBe('20%');
    expect(yieldShown([])).toEqual({ value: '20%', readOnly: undefined });
  });

  it('shows the range of the gas yields of the variations', () => {
    const { value, readOnly } = yieldShown(
      [{ idx: 0, data: variationWithGasYield(0.4) }, { idx: 1, data: variationWithGasYield(0.6) }]
    );
    expect(value).toBe('40-60%');
    expect(readOnly).toBe(true);
  });

  it('works a variation\'s yield out with its own vessel size', () => {
    // The reaction's moles in twice the vessel: half the yield.
    const largerVessel = makeVariationReaction(reaction, { vessel_size: { amount: 200 } });
    expect(yieldShown([{ idx: 0, data: largerVessel }]).value).toBe('10%');
  });

  it('shows no range where the variations give the reaction\'s yield', () => {
    expect(yieldShown([{ idx: 0, data: variationWithGasYield(0.2) }])).toEqual({ value: '20%', readOnly: undefined });
  });
});
