import expect from 'expect';
import sinon from 'sinon';
import UserStore from 'src/stores/alt/stores/UserStore';
import {
  segmentBuildColumnGroups, segmentKlassOf, findSegment
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationSegmentComponents';
import {
  formatReactionSegments
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { reactionSegments } from 'fixture/reaction';

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
});
