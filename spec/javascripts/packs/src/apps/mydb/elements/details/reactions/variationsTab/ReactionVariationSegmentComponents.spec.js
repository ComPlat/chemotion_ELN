import React from 'react';
import expect from 'expect';
import sinon from 'sinon';
import { configure, mount } from 'enzyme';
import Adapter from '@wojtekmaj/enzyme-adapter-react-17';
import VariationsGridContext
  from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsGridContext';
import UserStore from 'src/stores/alt/stores/UserStore';
import {
  segmentBuildColumnGroups, segmentKlassOf, findSegment
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationSegmentComponents';
import {
  formatReactionSegments
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { reactionSegments } from 'fixture/reaction';

configure({ adapter: new Adapter() });

/*
The segment half of the variations grid: one column per editable field of the selected segment
klass, reading and writing the variation's own copy of that segment.
*/
describe('ReactionVariationSegmentComponents', () => {
  const klass = {
    id: 5,
    label: 'foo',
    element_klass: { name: 'reaction' },
  };

  let storeStub;
  beforeEach(() => {
    storeStub = sinon.stub(UserStore, 'getState').returns({ segmentKlasses: [klass] });
  });
  afterEach(() => {
    storeStub.restore();
  });

  describe('segmentKlassOf', () => {
    it('finds the reaction klass by its label', () => {
      expect(segmentKlassOf('foo')).toBe(klass);
      expect(segmentKlassOf('bar')).toBe(undefined);
    });
  });

  describe('findSegment', () => {
    it('finds a segment by klass id or label, and reports none as null', () => {
      const byId = { segment_klass_id: 5 };
      expect(findSegment({ segments: [byId] }, klass)).toBe(byId);

      const byLabel = { klass_label: 'foo' };
      expect(findSegment({ segments: [byLabel] }, klass)).toBe(byLabel);

      expect(findSegment({ segments: [] }, klass)).toBe(null);
    });
  });

  describe('segmentBuildColumnGroups', () => {
    const fieldsOf = (label) => formatReactionSegments(reactionSegments)[label];

    it('builds one group per layer of the selected segment', () => {
      const groups = segmentBuildColumnGroups('foo', fieldsOf('foo'));
      expect(groups.map((group) => group.groupId)).toEqual(['segment_layera', 'segment_layerb']);
    });

    it('names one column per editable field, keyed to survive collisions with material ids', () => {
      const [group] = segmentBuildColumnGroups('foo', fieldsOf('foo'));
      expect(group.columns.map((column) => column.colId))
        .toEqual(['segment_layera_fielda', 'segment_layera_fieldb']);
    });

    it('gives only the system-defined columns a unit switching header', () => {
      const [group] = segmentBuildColumnGroups('foo', fieldsOf('foo'));
      const byId = Object.fromEntries(group.columns.map((column) => [column.colId, column]));

      expect(byId.segment_layera_fielda.headerComponent).toBeTruthy(); // system-defined
      expect(byId.segment_layera_fieldb.headerComponent).toBe(undefined); // text
    });

    it('reads the sort value off the variation, numerically for a system-defined field', () => {
      const [group] = segmentBuildColumnGroups('foo', fieldsOf('foo'));
      const column = group.columns.find((entry) => entry.colId === 'segment_layera_fielda');
      const row = {
        data: {
          segments: [{
            segment_klass_id: 5,
            properties: { layers: { layera: { fields: [{ field: 'fielda', value: '7' }] } } },
          }],
        },
      };

      expect(column.valueGetter({ data: row })).toBe(7);
    });

    it('reads a variation without the segment as empty', () => {
      const [group] = segmentBuildColumnGroups('foo', fieldsOf('foo'));
      const column = group.columns.find((entry) => entry.colId === 'segment_layera_fielda');

      expect(column.valueGetter({ data: { data: { segments: [] } } })).toBe(null);
    });

    it('builds nothing without a selected segment', () => {
      expect(segmentBuildColumnGroups('foo', undefined)).toEqual([]);
    });
  });

  /*
  The unit switch in the header of a system-defined column converts every variation's value into the
  next unit, through chem-generic-ui - so the number changes along with the unit label.
  */
  describe('unit switching header', () => {
    const variationWith = (field) => ({
      data: {
        can_update: true,
        segments: field ? [{
          segment_klass_id: 5,
          properties: { layers: { layera: { fields: [{ field: 'fielda', ...field }] } } },
        }] : [],
      },
    });
    const fieldOf = (variation) => variation.data.segments[0].properties.layers.layera.fields[0];

    const clickHeader = (variations, field) => {
      const onReactionChange = sinon.spy();
      const setColumnUnit = sinon.spy();
      const [group] = segmentBuildColumnGroups('foo', {
        'layer<layera>field<fielda>': {
          type: 'system-defined', field: 'fielda', fieldKey: 'fielda', label: 'fielda', layerKey: 'layera', ...field,
        },
      });
      const [column] = group.columns;
      const Header = column.headerComponent;
      const wrapper = mount(
        <VariationsGridContext.Provider
          value={{
            variations,
            getRowHandler: () => ({ props: { onReactionChange } }),
            columnUnits: {},
            setColumnUnit,
          }}
        >
          <Header {...column.headerComponentParams} displayName="fielda" />
        </VariationsGridContext.Provider>
      );
      wrapper.find('button.variations-unit-switch').simulate('click');
      wrapper.unmount();
      return { onReactionChange, setColumnUnit };
    };

    it('converts the value into the next unit', () => {
      const variation = variationWith({ value: 7, value_system: 'ng_l' });

      const { onReactionChange, setColumnUnit } = clickHeader([variation], { option_layers: 'concentration' });

      expect(fieldOf(variation)).toMatchObject({ value: 0.000007, value_system: 'mg_l' });
      expect(setColumnUnit.calledWith('segment_layera_fielda', 'mg_l')).toBe(true);
      expect(onReactionChange.calledOnce).toBe(true);
    });

    it('converts a quantity that does not scale by a ratio', () => {
      const variation = variationWith({ value: 100, value_system: 'C' });

      clickHeader([variation], { option_layers: 'temperature' });

      expect(fieldOf(variation)).toMatchObject({ value_system: 'F' });
      expect(fieldOf(variation).value).toBeCloseTo(212);
    });

    it('converts each row out of the unit it is in', () => {
      const first = variationWith({ value: 7, value_system: 'ng_l' });
      const behind = variationWith({ value: 2, value_system: 'g_l' });

      clickHeader([first, behind], { option_layers: 'concentration' });

      expect(fieldOf(first)).toMatchObject({ value: 0.000007, value_system: 'mg_l' });
      expect(fieldOf(behind)).toMatchObject({ value: 2000, value_system: 'mg_l' });
    });

    it('leaves an empty value empty, and a variation without the segment alone', () => {
      const empty = variationWith({ value: '', value_system: 'ng_l' });
      const without = variationWith(null);

      clickHeader([empty, without], { option_layers: 'concentration' });

      expect(fieldOf(empty)).toMatchObject({ value: '', value_system: 'mg_l' });
      expect(without.data.segments).toEqual([]);
    });
  });
});
