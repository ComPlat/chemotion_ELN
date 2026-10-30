import expect from 'expect';
import ReactionFactory from 'factories/ReactionFactory';
import {
  convertVariationDatasetToInternalVariations
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  needsLegacyConversion
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsLegacyConversion';

/*
Rows converted by the diff-list migration keep their old body under `legacy_data` and a diff naming
only their identity. Reading them must bring the old values back, as a diff.
*/
describe('ReactionVariationsLegacyConversion', () => {
  let reaction;

  const legacyVariation = (legacyData, data = { id: 'row-reaction' }) => ({
    id: 'row', idx: 0, group: [1, 1], analyses: [], notes: '', data, legacy_data: legacyData,
  });

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.starting_materials[0].reference = true;
    reaction.temperature = { data: [], userText: '20', valueUnit: '°C' };
  });

  describe('needsLegacyConversion', () => {
    it('is true for a row the migration left untouched', () => {
      expect(needsLegacyConversion(legacyVariation({}))).toBe(true);
    });

    it('is false once the diff holds more than the identity', () => {
      expect(needsLegacyConversion(legacyVariation({}, { id: 'x', volume: 1 }))).toBe(false);
    });

    it('is false for a row without legacy data', () => {
      expect(needsLegacyConversion({ id: 'row', idx: 0, data: { id: 'x' } })).toBe(false);
    });
  });

  it('writes the old material values into the diff', () => {
    const [, second] = reaction.starting_materials;
    const [product] = reaction.products;
    reaction.variations = [legacyVariation({
      startingMaterials: {
        [second.id]: {
          mass: { value: 0.5, unit: 'g' },
          amount: { value: 0.0277, unit: 'mol' },
          volume: { value: 0.0005, unit: 'l' },
          equivalent: { value: 0.3, unit: null },
          aux: {},
        },
      },
      products: {
        [product.id]: { mass: { value: 2, unit: 'g' }, yield: { value: 40, unit: '%' }, aux: {} },
      },
    })];

    const [row] = convertVariationDatasetToInternalVariations(reaction);
    const variationReaction = row.data;

    const [reference, converted] = variationReaction.starting_materials;
    const [convertedProduct] = variationReaction.products;
    expect(converted.amount_g).toBeCloseTo(0.5);
    // Equivalent and yield follow the old amounts, as the previous table computed them - not the
    // values this row's legacy body happens to hold.
    const equivalent = converted.amount_mol / reference.amount_mol;
    expect(converted.equivalent).toBeCloseTo(equivalent, 9);
    expect(convertedProduct.amount_g).toBeCloseTo(2);
    const stoichiometryCoeff = (convertedProduct.coefficient || 1) / (reference.coefficient || 1);
    expect(convertedProduct.equivalent)
      .toBeCloseTo(convertedProduct.amount_mol / reference.amount_mol / stoichiometryCoeff, 9);
    // The parent is not touched.
    expect(reaction.starting_materials[1].amount_g).not.toBeCloseTo(0.5);
    // The stored row now carries a real diff, keeping its identity and the legacy body.
    const [stored] = reaction.variations;
    expect(stored.data.id).toBe('row-reaction');
    expect(stored.data._starting_materials[0]).toBeNull();
    expect(stored.data._starting_materials[1]._equivalent).toBeCloseTo(equivalent, 9);
    expect(stored.legacy_data).toBeTruthy();
  });

  it('keeps the reference material equivalent of the parent', () => {
    const [reference] = reaction.starting_materials;
    reaction.variations = [legacyVariation({
      startingMaterials: { [reference.id]: { equivalent: { value: 7 }, aux: {} } },
    })];

    const [row] = convertVariationDatasetToInternalVariations(reaction);
    expect(row.data.starting_materials[0].equivalent).toBe(reference.equivalent);
  });

  it('writes temperature and duration in the parent units', () => {
    reaction.duration = '1 Hour(s)';
    reaction.variations = [legacyVariation({
      properties: {
        temperature: { value: 80, unit: '°C' },
        duration: { value: 7200, unit: 'Second(s)' },
      },
    })];

    const [row] = convertVariationDatasetToInternalVariations(reaction);
    expect(row.data.temperature.userText).toBe('80');
    expect(row.data.temperature.valueUnit).toBe('°C');
    expect(row.data.duration).toBe('2 Hour(s)');
  });

  it('skips materials that are no longer part of the reaction', () => {
    reaction.variations = [legacyVariation({
      startingMaterials: { 'gone-sample': { mass: { value: 9, unit: 'g' }, aux: {} } },
    })];

    convertVariationDatasetToInternalVariations(reaction);
    expect(reaction.variations[0].data).toEqual({ id: 'row-reaction' });
  });

  it('leaves a row alone once its diff holds values', () => {
    const [, second] = reaction.starting_materials;
    const data = { id: 'row-reaction', volume: 0.01 };
    reaction.variations = [legacyVariation({
      startingMaterials: { [second.id]: { mass: { value: 0.5, unit: 'g' }, aux: {} } },
    }, data)];

    convertVariationDatasetToInternalVariations(reaction);
    expect(reaction.variations[0].data).toEqual(data);
  });

  it('writes gas product values into gas_phase_data', () => {
    const [product] = reaction.products;
    product.gas_type = 'gas';
    product.gas_phase_data = {
      time: { unit: 'h', value: 1 },
      temperature: { unit: 'K', value: 298 },
      part_per_million: 10,
      turnover_number: null,
      turnover_frequency: { unit: 'TON/h', value: null },
    };
    reaction.variations = [legacyVariation({
      products: {
        [product.id]: {
          concentration: { value: 500, unit: 'ppm' },
          temperature: { value: 30, unit: '°C' },
          duration: { value: 1800, unit: 'Second(s)' },
          turnoverNumber: { value: 12, unit: null },
          turnoverFrequency: { value: 24, unit: null },
          aux: { gasType: 'gas' },
        },
      },
    })];

    const [row] = convertVariationDatasetToInternalVariations(reaction);
    const gasData = row.data.products[0].gas_phase_data;
    expect(gasData.part_per_million).toBe(500);
    expect(gasData.temperature).toEqual({ unit: 'K', value: 303.15 });
    expect(gasData.time).toEqual({ unit: 'h', value: 0.5 });
    expect(gasData.turnover_number).toBe(12);
    expect(gasData.turnover_frequency).toEqual({ unit: 'TON/h', value: 24 });
  });
});
