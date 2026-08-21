import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import { sanitizeGroupEntry } from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import {
  EquivalentParser, PropertyFormatter, PropertyParser, MaterialFormatter, MaterialParser, FeedstockParser, GasParser,
  SegmentParser, SegmentFormatter, GroupCellEditor
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsComponents';
import {
  computeCombinedReactionVolume
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsMaterials';
import { setUpReaction, setUpGaseousReaction } from 'helper/reactionVariationsHelpers';

configure({ adapter: new Adapter() });

describe('ReactionVariationsComponents', async () => {
  describe('FormatterComponents', () => {
    it('PropertyFormatter returns number string with correct precision', () => {
      const cellData = { value: 1.2345, unit: 'Second(s)' };
      const colDef = { entry: 'duration', displayUnit: 'Minute(s)' };

      expect(PropertyFormatter({ value: cellData, colDef })).toEqual(0.02057);
    });
    it('MaterialFormatter returns number string with correct precision', () => {
      const cellData = { amount: { value: 1.2345, unit: 'mol' } };
      const colDef = { entry: 'amount', displayUnit: 'mmol' };

      expect(MaterialFormatter({ value: cellData, colDef })).toEqual(1235);
    });
    it('MaterialFormatter returns placeholder for missing legacy entries', () => {
      const cellData = { amount: { value: 1.2345, unit: 'mol' } };
      const colDef = { entry: 'concentration', displayUnit: 'mol/l' };

      expect(MaterialFormatter({ value: cellData, colDef })).toEqual('_');
    });
    it('SegmentFormatter returns number string with correct precision', () => {
      const entryName = 'layer<foo>field<bar>';
      const cellData = {
        [entryName]: {
          type: 'system-defined',
          unit: 'g_l',
          label: 'bar',
          value: 1.2345,
          quantity: 'concentration'
        }
      };
      const colDef = {
        entry: entryName,
        displayUnit: 'mg_l',
        units: [
          'ng_l',
          'mg_l',
          'g_l'
        ]
      };

      expect(SegmentFormatter({ value: cellData, colDef })).toBe(1235);
    });
    it('SegmentFormatter returns string ', () => {
      const cellData = {
        'layer<foo>field<bar>': {
          type: 'text',
          unit: null,
          label: 'bar',
          value: 'baz',
          quantity: null
        }
      };
      const colDef = {
        entry: 'layer<foo>field<bar>',
        displayUnit: null,
        units: [null]
      };

      expect(SegmentFormatter({ value: cellData, colDef })).toEqual('baz');
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
      const colDef = { entry: 'duration', displayUnit: 'Minute(s)' };

      const newValue = '-1';
      const updatedCellData = PropertyParser({ oldValue: cellData, newValue, colDef });

      expect(updatedCellData.value).toEqual(0);
    });
    it('accepts negative value for temperature', () => {
      const cellData = { value: 120, unit: '°C' };
      const colDef = { entry: 'temperature', displayUnit: 'K' };
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
      const colDef = { field: 'foo.bar', entry: 'amount', displayUnit: 'mmol' };
      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '-1', colDef, context
      });

      expect(updatedCellData.amount.value).toEqual(0);
    });
    it('adapts mass when updating amount', () => {
      const colDef = { field: 'foo.bar', entry: 'amount', displayUnit: 'mmol' };

      expect(cellData.mass.value).toBe(100);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.mass.value).toBeCloseTo(0.756);
    });
    it('adapts amount when updating mass', () => {
      const colDef = { field: 'foo.bar', entry: 'mass', displayUnit: 'g' };

      expect(cellData.amount.value).toBeCloseTo(5.55);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.amount.value).toBeCloseTo(2.33);
    });
    it("adapts non-reference materials' equivalent when updating mass", async () => {
      const colDef = { field: 'foo.bar', entry: 'mass', displayUnit: 'g' };

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.mass.value * 2}`, colDef, context
      });

      expect(updatedCellData.equivalent.value).toBe(cellData.equivalent.value * 2);
    });
    it("adapts non-reference materials' yield when updating mass", async () => {
      cellData = Object.values(variationsRow.products)[0];
      const colDef = { field: 'foo.bar', entry: 'mass', displayUnit: 'g' };

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.mass.value * 0.1}`, colDef, context
      });

      expect(updatedCellData.yield.value).toBeLessThan(cellData.yield.value);
    });
    it('adapts volume when updating mass', async () => {
      const colDef = { field: 'foo.bar', entry: 'mass', displayUnit: 'g' };
      cellData.volume.value = 3;
      cellData.aux.molarity = 5;

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.volume.value).toBeCloseTo(0.466);
    });
    it('adapts volume when updating amount', async () => {
      const colDef = { field: 'foo.bar', entry: 'amount', displayUnit: 'mmol' };
      cellData.volume.value = 3;
      cellData.aux.molarity = 5;

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.volume.value).toBeCloseTo(0.008);
    });
    it('adapts mass when updating volume', async () => {
      const colDef = { field: 'foo.bar', entry: 'volume', displayUnit: 'ml' };
      cellData.aux.molarity = 5;

      expect(cellData.mass.value).toBe(100);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.mass.value).toBeCloseTo(3.78);
    });
    it('adapts amount when updating volume', async () => {
      const colDef = { field: 'foo.bar', entry: 'volume', displayUnit: 'ml' };
      cellData.aux.molarity = 5;

      expect(cellData.amount.value).toBeCloseTo(5.55);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.amount.value).toBeCloseTo(0.21);
    });
    it('adapts equivalent when updating volume', async () => {
      const colDef = { field: 'foo.bar', entry: 'volume', displayUnit: 'ml' };
      cellData.aux.molarity = 5;

      expect(cellData.equivalent.value).toBe(1);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.equivalent.value).toBeCloseTo(0.037);
    });
    it('adapts yield when updating volume', async () => {
      cellData = Object.values(variationsRow.products)[0];
      const colDef = { field: 'foo.bar', entry: 'volume', displayUnit: 'ml' };
      cellData.aux.molarity = 5;

      expect(cellData.yield.value).toBe(100);

      const updatedCellData = MaterialParser({
        data: variationsRow, oldValue: cellData, newValue: '42', colDef, context
      });

      expect(updatedCellData.yield.value).toBeCloseTo(9.455);
    });
    it('adapts amount, mass and volume when updating concentration', async () => {
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'mol/l' };
      const localContext = {
        reactionHasPolymers: false,
        concentrationContext: {
          lockReactionVolume: true,
          useReactionVolume: true,
          reactionVolumeByRowId: { [variationsRow.id]: 10 },
        }
      };

      const updatedCellData = MaterialParser({
        data: variationsRow,
        oldValue: {
          ...cellData,
          concentration: { value: 1, unit: 'mol/l' }
        },
        newValue: '2',
        colDef,
        context: localContext
      });

      expect(updatedCellData.amount.value).toBe(20);
      expect(updatedCellData.mass.value).toBeGreaterThan(0);
      expect(updatedCellData.volume.value).toBeDefined();
    });
    it('keeps amount, mass and volume unchanged when concentration updates while volume is unlocked', async () => {
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'mol/l' };
      const localContext = {
        reactionHasPolymers: false,
        concentrationContext: {
          lockReactionVolume: false,
          useReactionVolume: true,
          reactionVolumeByRowId: { [variationsRow.id]: 10 },
        }
      };

      const baseCellData = {
        ...cellData,
        concentration: { value: 1, unit: 'mol/l' }
      };

      const updatedCellData = MaterialParser({
        data: variationsRow,
        oldValue: baseCellData,
        newValue: '2',
        colDef,
        context: localContext
      });

      expect(updatedCellData.amount.value).toBe(baseCellData.amount.value);
      expect(updatedCellData.mass.value).toBe(baseCellData.mass.value);
      expect(updatedCellData.volume.value).toBe(baseCellData.volume.value);
    });
    it('derives amount from row combined volume when reaction volume is locked and not explicitly used', async () => {
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'mol/l' };
      const localContext = {
        reactionHasPolymers: false,
        concentrationContext: {
          lockReactionVolume: true,
          useReactionVolume: false,
          reactionVolumeByRowId: {},
        }
      };
      const firstStartingMaterial = Object.values(variationsRow.startingMaterials)[0];
      const firstReactant = Object.values(variationsRow.reactants)[0];
      firstStartingMaterial.volume.value = 2;
      firstReactant.volume.value = 3;

      const rowCombinedReactionVolume = computeCombinedReactionVolume(variationsRow);

      const updatedCellData = MaterialParser({
        data: variationsRow,
        oldValue: {
          ...cellData,
          concentration: { value: 1, unit: 'mol/l' }
        },
        newValue: '2',
        colDef,
        context: localContext
      });

      expect(updatedCellData.amount.value).toBeCloseTo(2 * rowCombinedReactionVolume);
      expect(updatedCellData.mass.value).toBeGreaterThan(0);
      expect(updatedCellData.volume.value).toBeDefined();
    });
    it('backfills missing legacy concentration entry when editing concentration', async () => {
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'mol/l' };
      const localContext = {
        reactionHasPolymers: false,
        concentrationContext: {
          lockReactionVolume: true,
          useReactionVolume: true,
          reactionVolumeByRowId: { [variationsRow.id]: 10 },
        }
      };

      const legacyCellData = { ...cellData };
      delete legacyCellData.concentration;

      const updatedCellData = MaterialParser({
        data: variationsRow,
        oldValue: legacyCellData,
        newValue: '2',
        colDef,
        context: localContext
      });

      expect(updatedCellData.concentration).toEqual({ value: 2, unit: 'mol/l' });
      expect(updatedCellData.amount.value).toBe(20);
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
      const colDef = { field: 'foo.bar', entry: 'equivalent' };
      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: '-1', colDef, context
      });

      expect(updatedCellData.equivalent.value).toEqual(0);
    });
    it('adapts nothing when updating equivalent', () => {
      const colDef = { field: 'foo.bar', entry: 'equivalent' };

      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.equivalent.value * 2}`, colDef, context
      });

      expect(updatedCellData.equivalent.value).toBe(cellData.equivalent.value * 2);
      expect(updatedCellData.mass.value).toBe(cellData.mass.value);
      expect(updatedCellData.amount.value).toBe(cellData.amount.value);
      expect(updatedCellData.volume.value).toBe(cellData.volume.value);
    });
    it('adapts other entries when updating volume', () => {
      const colDef = { field: 'foo.bar', entry: 'volume', displayUnit: 'l' };

      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.volume.value * 2}`, colDef, context
      });

      expect(updatedCellData.volume.value).toBe(cellData.volume.value * 2);
      expect(updatedCellData.mass.value).toBeGreaterThan(cellData.mass.value);
      expect(updatedCellData.amount.value).toBeGreaterThan(cellData.amount.value);
      expect(updatedCellData.equivalent.value).toBeGreaterThan(cellData.equivalent.value);
    });
    it('adapts other entries when updating amount', () => {
      const colDef = { field: 'foo.bar', entry: 'amount', displayUnit: 'mol' };

      const updatedCellData = FeedstockParser({
        data: variationsRow, oldValue: cellData, newValue: `${cellData.amount.value * 2}`, colDef, context
      });

      expect(updatedCellData.amount.value).toBe(cellData.amount.value * 2);
      expect(updatedCellData.mass.value).toBeGreaterThan(cellData.mass.value);
      expect(updatedCellData.volume.value).toBeGreaterThan(cellData.volume.value);
      expect(updatedCellData.equivalent.value).toBeGreaterThan(cellData.equivalent.value);
    });
    it('adapts mass, amount, volume and equivalent when updating concentration', () => {
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'mol/l' };
      const updatedCellData = FeedstockParser({
        data: variationsRow,
        oldValue: {
          ...cellData,
          concentration: { value: 1, unit: 'mol/l' }
        },
        newValue: '2',
        colDef,
        context
      });

      expect(updatedCellData.amount.value).toBe(20);
      expect(updatedCellData.mass.value).toBeGreaterThan(cellData.mass.value);
      expect(updatedCellData.volume.value).toBeGreaterThan(cellData.volume.value);
      expect(updatedCellData.equivalent.value).toBeGreaterThan(cellData.equivalent.value);
    });
    it('backfills missing legacy concentration entry when updating concentration', () => {
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'mol/l' };
      const legacyCellData = { ...cellData };
      delete legacyCellData.concentration;

      const updatedCellData = FeedstockParser({
        data: variationsRow,
        oldValue: legacyCellData,
        newValue: '2',
        colDef,
        context
      });

      expect(updatedCellData.concentration).toEqual({ value: 2, unit: 'mol/l' });
      expect(updatedCellData.amount.value).toBe(20);
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
      const colDef = { field: 'foo.bar', entry: 'duration', displayUnit: 'Hours(s)' };
      const updatedCellData = GasParser({
        data: variationsRow, oldValue: cellData, newValue: '-1', colDef, context
      });

      expect(updatedCellData.duration.value).toEqual(0);
    });
    it('adapts only turnover frequency when updating duration', () => {
      const colDef = { field: 'foo.bar', entry: 'duration', displayUnit: 'Hour(s)' };

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
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'ppm' };

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
    it('backfills missing legacy concentration entry when updating concentration', () => {
      const colDef = { field: 'foo.bar', entry: 'concentration', displayUnit: 'ppm' };
      const legacyCellData = { ...cellData };
      delete legacyCellData.concentration;

      const updatedCellData = GasParser({
        data: variationsRow,
        oldValue: legacyCellData,
        newValue: '20000',
        colDef,
        context
      });

      expect(updatedCellData.concentration).toEqual({ value: 20000, unit: 'ppm' });
      expect(updatedCellData.amount.value).toBeGreaterThan(0);
    });
    it('adapts other entries when updating temperature', () => {
      const colDef = { field: 'foo.bar', entry: 'temperature', displayUnit: 'K' };

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
  describe('SegmentParser', async () => {
    it('rejects non-integer value for type integer', () => {
      const entryName = 'layer<foo>field<bar>';
      const cellData = {
        [entryName]: {
          type: 'integer',
          unit: null,
          label: 'bar',
          value: 1.2345,
          quantity: null
        }
      };
      const colDef = {
        entry: entryName,
        isSelected: true,
        displayUnit: null,
        units: [null]
      };
      const newValue = 'foo';
      const updatedCellData = SegmentParser({ oldValue: cellData, newValue, colDef });

      expect(updatedCellData[entryName].value).toEqual(null);
    });
    it('converts unit for type system-defined', () => {
      const entryName = 'layer<foo>field<bar>';
      const cellData = {
        [entryName]: {
          type: 'system-defined',
          unit: 'g_l',
          label: 'bar',
          value: 1.2345,
          quantity: 'concentration'
        }
      };
      const colDef = {
        entry: entryName,
        isSelected: true,
        displayUnit: 'mg_l',
        units: [
          'ng_l',
          'mg_l',
          'g_l'
        ]
      };
      const newValue = '4.2';
      const updatedCellData = SegmentParser({ oldValue: cellData, newValue, colDef });

      expect(updatedCellData[entryName].value).toBeCloseTo(0.0042, 4);
    });
  });
  describe('GroupCellEditor', () => {
    it('sanitized group identifier', () => {
      expect(sanitizeGroupEntry('')).toBe('');
      expect(sanitizeGroupEntry('-')).toBe('');
      expect(sanitizeGroupEntry('a')).toBe('');
      expect(sanitizeGroupEntry('a.')).toBe('.');
      expect(sanitizeGroupEntry('.')).toBe('.');
      expect(sanitizeGroupEntry('1')).toBe('1');
      expect(sanitizeGroupEntry('0')).toBe('');
      expect(sanitizeGroupEntry('.1')).toBe('.1');
      expect(sanitizeGroupEntry('1.')).toBe('1.');
      expect(sanitizeGroupEntry('1.0')).toBe('1.');
      expect(sanitizeGroupEntry('0.1')).toBe('.1');
      expect(sanitizeGroupEntry('1..')).toBe('1.');
      expect(sanitizeGroupEntry('01.1')).toBe('1.1');
      expect(sanitizeGroupEntry('1.01')).toBe('1.1');
    });
    describe('key handling', () => {
      let onValueChange;
      let stopEditing;
      let wrapper;

      beforeEach(() => {
        onValueChange = sinon.spy();
        stopEditing = sinon.spy();
        wrapper = mount(
          React.createElement(GroupCellEditor, {
            value: { group: 1, subgroup: 1 },
            onValueChange,
            stopEditing,
          })
        );
        wrapper.find('input').simulate('change', { target: { value: '9.1' } });
      });

      afterEach(() => {
        wrapper.unmount();
      });

      it('commits the edit on Enter', () => {
        const preventDefault = sinon.spy();
        wrapper.find('input').simulate('keydown', { key: 'Enter', preventDefault });

        expect(preventDefault.calledOnce).toBe(true);
        expect(stopEditing.calledOnce).toBe(true);
      });
      it('leaves Escape to ag-grid, which cancels rather than commits the edit', () => {
        const preventDefault = sinon.spy();
        wrapper.find('input').simulate('keydown', { key: 'Escape', preventDefault });

        // Calling `stopEditing()` would commit the in-progress value, and `preventDefault()`
        // would keep ag-grid's own handler from ever seeing the key.
        expect(preventDefault.called).toBe(false);
        expect(stopEditing.called).toBe(false);
      });
      it('commits the edit when focus moves away without Enter or Escape', () => {
        wrapper.find('input').simulate('blur');

        expect(stopEditing.calledOnce).toBe(true);
      });
      it('does not commit on the blur that follows an Escape cancel', () => {
        wrapper.find('input').simulate('keydown', { key: 'Escape', preventDefault: sinon.spy() });
        wrapper.find('input').simulate('blur');

        expect(stopEditing.called).toBe(false);
      });
    });
  });
});
