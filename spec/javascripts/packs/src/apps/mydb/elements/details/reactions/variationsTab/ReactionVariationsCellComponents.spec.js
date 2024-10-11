import expect from 'expect';
import {
  EquivalentFormatter, EquivalentParser, PropertyFormatter, PropertyParser, MaterialFormatter, MaterialParser
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsCellComponents';
import { setUpReaction } from 'helper/reactionVariationsHelpers';

describe('ReactionVariationsCellComponents', async () => {
  describe('FormatterComponents', () => {
    it('EquivalentFormatter returns number string with correct precision', () => {
      const cellData = { aux: { equivalent: 1.2345 } };

      expect(EquivalentFormatter({ value: cellData })).toEqual('1.234');
    });
    it('PropertyFormatter returns number string with correct precision', () => {
      const cellData = { value: 1.2345, unit: 'Second(s)' };
      const colDef = { entryDefs: { displayUnit: 'Minute(s)' } };

      expect(PropertyFormatter({ value: cellData, colDef })).toEqual('0.02057');
    });
    it('MaterialFormatter returns number string with correct precision', () => {
      const cellData = { amount: { value: 1.2345, unit: 'mol' } };
      const colDef = { entryDefs: { currentEntry: 'amount', displayUnit: 'mmol' } };

      expect(MaterialFormatter({ value: cellData, colDef })).toEqual('1235');
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

      expect(updatedCellData.aux.equivalent).toEqual(0);
    });
    it('updates mass and amount', () => {
      const newValue = '2';
      const updatedCellData = EquivalentParser({ data: variationsRow, oldValue: cellData, newValue });

      expect(updatedCellData.mass.value).toBeCloseTo(cellData.mass.value * 2, 0.01);
      expect(updatedCellData.amount.value).toBeCloseTo(cellData.amount.value * 2, 0.01);
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

      expect(updatedCellData.value).toEqual(-274.15);
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
      const colDef = { field: 'reactants.42', entryDefs: { currentEntry: 'amount', displayUnit: 'mmol' } };
      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '-1', colDef, context
      });

      expect(updatedCellData.amount.value).toEqual(0);
    });
    it('adapts mass when updating amount', () => {
      const colDef = { field: 'reactants.42', entryDefs: { currentEntry: 'amount', displayUnit: 'mmol' } };

      expect(cellData.mass.value).toBe(100);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.mass.value).toBeCloseTo(0.75, 0.1);
    });
    it('adapts amount when updating mass', () => {
      const colDef = { field: 'reactants.42', entryDefs: { currentEntry: 'mass', displayUnit: 'g' } };

      expect(cellData.amount.value).toBeCloseTo(5.5, 0.1);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.amount.value).toBeCloseTo(2.33, 0.1);
    });
  });
});
