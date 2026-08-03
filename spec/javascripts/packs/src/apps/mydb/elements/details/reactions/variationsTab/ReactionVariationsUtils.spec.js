import expect from 'expect';
import {
  diffObjects, formatReactionSegments, getVariationsRowName
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import { reactionSegments } from 'fixture/reaction';

describe('ReactionVariationsUtils', () => {
  /*
  A variation is stored as the difference between its own reaction and the parent one, so this is
  what decides what a variation costs and what it inherits.
  */
  describe('diffObjects', () => {
    it('reports only what differs', () => {
      expect(diffObjects({ a: 1, b: 2 }, { a: 1, b: 3 })).toEqual({ b: 3 });
    });

    it('is empty for equal objects', () => {
      expect(diffObjects({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toEqual({});
    });

    it('keeps the nesting of a nested difference', () => {
      expect(diffObjects({ a: { b: 1, c: 2 } }, { a: { b: 1, c: 3 } })).toEqual({ a: { c: 3 } });
    });

    it('reports a key the parent does not have at all', () => {
      expect(diffObjects({}, { a: 1 })).toEqual({ a: 1 });
    });

    // Positional, so the diff of a material list says which slot changed.
    it('keeps the position of a changed entry in a list', () => {
      const diff = diffObjects({ a: [{ v: 1 }, { v: 2 }] }, { a: [{ v: 1 }, { v: 9 }] });
      expect(diff.a[1]).toEqual({ v: 9 });
    });

    it('ignores the keys it is told to', () => {
      expect(diffObjects({ a: 1 }, { a: 2, b: 2 }, ['a'])).toEqual({ b: 2 });
    });

    it('ignores functions, which a model brings along and a diff cannot hold', () => {
      expect(diffObjects({}, { a: () => {} })).toEqual({});
    });
  });

  describe('getVariationsRowName', () => {
    it('names a row after its reaction and number', () => {
      expect(getVariationsRowName('R1', 3)).toBe('R1-V#3');
    });
  });

  /*
  Turns the segment klasses into the fields the variations grid offers as columns. Only the four
  types that have a single-line form are taken; the rest stay in the segment tab.
  */
  describe('formatReactionSegments', () => {
    const formatted = formatReactionSegments(reactionSegments);

    it('groups the fields by segment label, one entry per klass', () => {
      expect(Object.keys(formatted)).toEqual(reactionSegments.map((segment) => segment.label));
    });

    it('keys a field by the layer it sits under and its own name', () => {
      expect(Object.keys(formatted.foo)).toContain('layer<layera>field<fielda>');
    });

    it('carries the layer and field identity, so a column need not parse the key back apart', () => {
      expect(formatted.foo['layer<layera>field<fielda>']).toMatchObject({
        type: 'system-defined',
        field: 'fielda',
        fieldKey: 'fielda',
        layerKey: 'layera',
      });
    });

    it('names the layer after its key when the klass gives it no label', () => {
      expect(formatted.foo['layer<layera>field<fielda>'].layerLabel).toBe('layera');
    });

    it('leaves the klass alone rather than writing resolved options into it', () => {
      expect(reactionSegments[0].properties_release.layers.layera.fields[0].layerKey).toBe(undefined);
    });

    it('takes no field of a type that has no single-line form', () => {
      const types = Object.values(formatted.foo).map((field) => field.type);
      expect(types.every((type) => ['integer', 'system-defined', 'select', 'text'].includes(type))).toBe(true);
    });
  });
});
