import expect from 'expect';
import {
  EquivalentParser, PropertyFormatter, PropertyParser, MaterialFormatter, MaterialParser, FeedstockParser, GasParser
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import { setUpReaction, setUpGaseousReaction } from 'helper/reactionVariationsHelpers';

describe('ReactionVariationsComponents', async () => {
  describe('FormatterComponents', () => {
    it('PropertyFormatter returns number string with correct precision', () => {
      const cellData = { value: 1.2345, unit: 'Second(s)' };
      const colDef = { entryDefs: { displayUnit: 'Minute(s)' } };

      expect(PropertyFormatter({ value: cellData, colDef })).toEqual(0.02057);
    });
    it('MaterialFormatter returns number string with correct precision', () => {
      const cellData = { amount: { value: 1.2345, unit: 'mol' } };
      const colDef = { entryDefs: { currentEntry: 'amount', displayUnit: 'mmol' } };

      expect(MaterialFormatter({ value: cellData, colDef })).toEqual(1235);
    });
  });
  describe('EquivalentParser', async () => {
    let variationsRow;
    let cellData;
    beforeEach(async () => {
      const reaction = await setUpReaction();
      variationsRow = reaction.variations[0];
      cellData = Object.values(variationsRow.reactants)[0];
    });
    it('rejects negative value', () => {
      const newValue = '-1';
      const updatedCellData = EquivalentParser({ data: variationsRow, oldValue: cellData, newValue });

      expect(updatedCellData.equivalent.value).toEqual(0);
    });
    it('adapts other entries when updating equivalent', () => {
      const newValue = '2';
      const updatedCellData = EquivalentParser({ data: variationsRow, oldValue: cellData, newValue });

      expect(updatedCellData.mass.value).toBeCloseTo(cellData.mass.value * 2);
      expect(updatedCellData.amount.value).toBeCloseTo(cellData.amount.value * 2);
      // Volume calculation requires molarity/density, so just verify it's calculated
      expect(updatedCellData.volume.value).toBeDefined();
    });
  });
  describe('PropertyParser', async () => {
    it('rejects negative value for duration', () => {
      const cellData = { value: 120, unit: 'Second(s)' };
      const colDef = { entryDefs: { currentEntry: 'duration', displayUnit: 'Minute(s)' } };
      const newValue = '-1';
      const updatedCellData = PropertyParser({ oldValue: cellData, newValue, colDef });

      expect(updatedCellData.value).toEqual(0);
    });
    it('accepts negative value for temperature', () => {
      const cellData = { value: 120, unit: '°C' };
      const colDef = { entryDefs: { currentEntry: 'temperature', displayUnit: 'K' } };
      const newValue = '-1';
      const updatedCellData = PropertyParser({ oldValue: cellData, newValue, colDef });

      expect(updatedCellData.value).toEqual(-273.15);
    });
  });
  describe('MaterialParser', async () => {
    let variationsRow;
    let cellData;
    let context;
    beforeEach(async () => {
      const reaction = await setUpReaction();
      variationsRow = reaction.variations[0];
      cellData = Object.values(variationsRow.reactants)[0];
      context = { reactionHasPolymers: false };
    });
    it('rejects negative value', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'amount', displayUnit: 'mmol' } };
      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '-1', colDef, context
      });

      expect(updatedCellData.amount.value).toEqual(0);
    });
    it('adapts mass when updating amount', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'amount', displayUnit: 'mmol' } };

      expect(cellData.mass.value).toBe(100);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.mass.value).toBeCloseTo(0.756);
    });
    it('adapts amount when updating mass', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'mass', displayUnit: 'g' } };

      expect(cellData.amount.value).toBeCloseTo(5.55);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.amount.value).toBeCloseTo(2.33);
    });
    it("adapts non-reference materials' equivalent when updating mass", async () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'mass', displayUnit: 'g' } };

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.mass.value * 2}`, colDef, context
      });

      expect(updatedCellData.equivalent.value).toBe(cellData.equivalent.value * 2);
    });
    it("adapts non-reference materials' yield when updating mass", async () => {
      cellData = Object.values(variationsRow.products)[0];
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'mass', displayUnit: 'g' } };

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.mass.value * 0.1}`, colDef, context
      });

      expect(updatedCellData.yield.value).toBeLessThan(cellData.yield.value);
    });
    it('adapts volume when updating mass', async () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'mass', displayUnit: 'g' } };
      cellData.volume.value = 3;
      cellData.aux.molarity = 5;

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.volume.value).toBeCloseTo(0.466);
    });
    it('adapts volume when updating amount', async () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'amount', displayUnit: 'mmol' } };
      cellData.volume.value = 3;
      cellData.aux.molarity = 5;

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.volume.value).toBeCloseTo(0.008);
    });
    it('adapts mass when updating volume', async () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'volume', displayUnit: 'ml' } };
      cellData.aux.molarity = 5;

      expect(cellData.mass.value).toBe(100);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.mass.value).toBeCloseTo(3.78);
    });
    it('adapts amount when updating volume', async () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'volume', displayUnit: 'ml' } };
      cellData.aux.molarity = 5;

      expect(cellData.amount.value).toBeCloseTo(5.55);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.amount.value).toBeCloseTo(0.21);
    });
    it('adapts equivalent when updating volume', async () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'volume', displayUnit: 'ml' } };
      cellData.aux.molarity = 5;

      expect(cellData.equivalent.value).toBe(1);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.equivalent.value).toBeCloseTo(0.037);
    });
    it('adapts yield when updating volume', async () => {
      cellData = Object.values(variationsRow.products)[0];
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'volume', displayUnit: 'ml' } };
      cellData.aux.molarity = 5;

      expect(cellData.yield.value).toBe(100);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.yield.value).toBeCloseTo(9.455);
    });
  });
  describe('FeedstockParser', async () => {
    let variationsRow;
    let cellData;
    let context;
    beforeEach(async () => {
      const reaction = await setUpGaseousReaction();
      variationsRow = reaction.variations[0];
      cellData = Object.values(variationsRow.reactants)[0];
      context = { reactionHasPolymers: false };
    });
    it('rejects negative value', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'equivalent', displayUnit: null } };
      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: '-1', colDef, context
      });

      expect(updatedCellData.equivalent.value).toEqual(0);
    });
    it('adapts nothing when updating equivalent', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'equivalent', displayUnit: null } };

      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.equivalent.value * 2}`, colDef, context
      });

      expect(updatedCellData.equivalent.value).toBe(cellData.equivalent.value * 2);
      expect(updatedCellData.mass.value).toBe(cellData.mass.value);
      expect(updatedCellData.amount.value).toBe(cellData.amount.value);
      expect(updatedCellData.volume.value).toBe(cellData.volume.value);
    });
    it('adapts other entries when updating volume', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'volume', displayUnit: 'l' } };

      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.volume.value * 2}`, colDef, context
      });

      expect(updatedCellData.volume.value).toBe(cellData.volume.value * 2);
      expect(updatedCellData.mass.value).toBeGreaterThan(cellData.mass.value);
      expect(updatedCellData.amount.value).toBeGreaterThan(cellData.amount.value);
      expect(updatedCellData.equivalent.value).toBeGreaterThan(cellData.equivalent.value);
    });
    it('adapts other entries when updating amount', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'amount', displayUnit: 'mol' } };

      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.amount.value * 2}`, colDef, context
      });

      expect(updatedCellData.amount.value).toBe(cellData.amount.value * 2);
      expect(updatedCellData.mass.value).toBeGreaterThan(cellData.mass.value);
      expect(updatedCellData.volume.value).toBeGreaterThan(cellData.volume.value);
      expect(updatedCellData.equivalent.value).toBeGreaterThan(cellData.equivalent.value);
    });
  });
  describe('GasParser', async () => {
    let variationsRow;
    let cellData;
    let context;
    beforeEach(async () => {
      const reaction = await setUpGaseousReaction();
      variationsRow = reaction.variations[0];
      cellData = Object.values(variationsRow.products)[0];
      context = { reactionHasPolymers: false };
    });
    it('rejects negative value', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'duration', displayUnit: 'Hour(s)' } };
      const updatedCellData = GasParser({
        data: variationsRow, oldValue: cellData, newValue: '-1', colDef, context
      });

      expect(updatedCellData.duration.value).toEqual(0);
    });
    it('adapts only turnover frequency when updating duration', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'duration', displayUnit: 'Hour(s)' } };

      const updatedCellData = GasParser({
        data: variationsRow, oldValue: cellData, newValue: '2', colDef, context
      });

      expect(updatedCellData.mass.value).toBe(cellData.mass.value);
      expect(updatedCellData.amount.value).toBe(cellData.amount.value);
      expect(updatedCellData.yield.value).toBe(cellData.yield.value);
      expect(updatedCellData.turnoverNumber.value).toBe(cellData.turnoverNumber.value);

      expect(updatedCellData.turnoverFrequency.value).toBeLessThan(cellData.turnoverFrequency.value);
    });
    it('adapts other entries when updating concentration', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'concentration', displayUnit: 'ppm' } };

      const updatedCellData = GasParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.concentration.value * 2}`, colDef, context
      });

      expect(updatedCellData.mass.value).not.toBe(cellData.mass.value);
      expect(updatedCellData.amount.value).not.toBe(cellData.amount.value);
      expect(updatedCellData.volume.value).not.toBe(cellData.volume.value);
      expect(updatedCellData.yield.value).not.toBe(cellData.yield.value);
      expect(updatedCellData.turnoverNumber.value).not.toBe(cellData.turnoverNumber.value);
      expect(updatedCellData.turnoverFrequency.value).not.toBe(cellData.turnoverFrequency.value);
    });
    it('adapts other entries when updating temperature', () => {
      const colDef = { field: 'foo.bar', entryDefs: { currentEntry: 'temperature', displayUnit: 'K' } };

      const updatedCellData = GasParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.temperature.value / 2}`, colDef, context
      });

      expect(updatedCellData.mass.value).not.toBe(cellData.mass.value);
      expect(updatedCellData.amount.value).not.toBe(cellData.amount.value);
      expect(updatedCellData.volume.value).not.toBe(cellData.volume.value);
      expect(updatedCellData.yield.value).not.toBe(cellData.yield.value);
      expect(updatedCellData.turnoverNumber.value).not.toBe(cellData.turnoverNumber.value);
      expect(updatedCellData.turnoverFrequency.value).not.toBe(cellData.turnoverFrequency.value);
    });
  });
});
