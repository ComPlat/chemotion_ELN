import expect from 'expect';
import sinon from 'sinon';
import Reaction from 'src/models/Reaction';
import UserStore from 'src/stores/alt/stores/UserStore';
import Sample from 'src/models/Sample';
import ReactionFactory from 'factories/ReactionFactory';
import SampleFactory from 'factories/SampleFactory';
import {
  diffObjects, variationDiffOf, formatReactionSegments, getVariationsRowName,
  makeVariationReaction, addNewVariationDataset, parseVariationGroup,
  copyVariationDataset, reorderVariationDatasets, getInitialColumnState, persistColumnState, convertVariationDatasetToInternalVariations,
  exportVariationsToCsv
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

    // Positional, so the diff of a material list says which slot changed - and an unchanged slot
    // is an explicit null hole, which is what lets deepPatch skip it on the way back.
    it('keeps the position of a changed entry in a list, with null for the unchanged', () => {
      const diff = diffObjects({ a: [{ v: 1 }, { v: 2 }] }, { a: [{ v: 1 }, { v: 9 }] });
      expect(diff.a).toEqual([null, { v: 9 }]);
    });

    it('reports an unchanged list as no difference', () => {
      expect(diffObjects({ a: [{ v: 1 }, 2] }, { a: [{ v: 1 }, 2] })).toEqual({});
      expect(diffObjects({ a: { b: [1] } }, { a: { b: [1] } })).toEqual({});
    });

    // A variation's list is sized by its diff, so a list of another length is a change even if every
    // entry it has matches.
    it('reports a shorter list, even with every entry unchanged', () => {
      expect(diffObjects({ a: [1, 2] }, { a: [1] })).toEqual({ a: [null] });
    });

    it('ignores the keys it is told to', () => {
      expect(diffObjects({ a: 1 }, { a: 2, b: 2 }, ['a'])).toEqual({ b: 2 });
    });

    it('ignores functions, which a model brings along and a diff cannot hold', () => {
      expect(diffObjects({}, { a: () => {} })).toEqual({});
    });
  });

  /*
  A stored variation is rebuilt by patching its diff onto the parent reaction; what comes back must
  be a working Reaction again, materials included, or every cell of the grid would fall over.
  */
  describe('makeVariationReaction', () => {
    let reaction;
    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    });

    it('rebuilds a Reaction with Sample materials from an empty diff', () => {
      const variationReaction = makeVariationReaction(reaction, {});
      expect(variationReaction).toBeInstanceOf(Reaction);
      expect(variationReaction.starting_materials[0]).toBeInstanceOf(Sample);
      expect(variationReaction.starting_materials[0].amount_g).toBeCloseTo(100, 6);
    });

    it('applies the diff on top of the parent', () => {
      const diff = { _starting_materials: [{ target_amount_value: 50 }] };
      const variationReaction = makeVariationReaction(reaction, diff);
      expect(variationReaction.starting_materials[0].target_amount_value).toBe(50);
      // The parent stays as it was; the variation is a copy.
      expect(reaction.starting_materials[0].target_amount_value).not.toBe(50);
    });

    it('leaves unpatched positions of a list untouched', () => {
      const diff = { _starting_materials: [null, { target_amount_value: 50 }] };
      const variationReaction = makeVariationReaction(reaction, diff);
      expect(variationReaction.starting_materials[0].amount_g).toBeCloseTo(100, 6);
      expect(variationReaction.starting_materials[1].target_amount_value).toBe(50);
    });

    it('keeps the id its diff carries, so rows stay addressable', () => {
      expect(makeVariationReaction(reaction, { id: 'fixed-id' }).id).toBe('fixed-id');
    });

    it('starts each rebuild with its own container', () => {
      const one = makeVariationReaction(reaction, {});
      const other = makeVariationReaction(reaction, {});
      expect(one.container).not.toBe(other.container);
    });
  });

  describe('addNewVariationDataset', () => {
    it('numbers a first variation into group 1 with idx 1', () => {
      const reaction = { variations: [] };
      const variation = addNewVariationDataset({ reaction });
      expect(variation.group).toEqual([1, 0]);
      expect(variation.idx).toBe(1);
      expect(reaction.variations).toEqual([variation]);
    });

    // The variations tab works on a reaction that has not been saved yet; what it adds has to go
    // out with the reaction's first save.
    it('adds to an unsaved reaction, which sends the variation along when it is created', () => {
      const reaction = Reaction.buildEmpty();
      const variation = addNewVariationDataset({ reaction });
      const [row] = convertVariationDatasetToInternalVariations(reaction);

      expect(reaction.isNew).toBe(true);
      expect(row.data.id).toBe(variation.data.id);
      expect(reaction.serialize().variations).toEqual([variation]);
    });

    // The row is addressed by it; without one every rebuild would make up a new one.
    it('gives the variation reaction an identity right away', () => {
      const variation = addNewVariationDataset({ reaction: { variations: [] } });
      expect(typeof variation.data.id).toBe('string');
    });

    it('continues numbering past the existing variations', () => {
      const reaction = { variations: [{ idx: 3, group: [2, 1] }] };
      const variation = addNewVariationDataset({ reaction });
      expect(variation.group).toEqual([3, 0]);
      expect(variation.idx).toBe(4);
    });

    // Groups saved before they were stored as numbers, or left empty.
    it('reads string and empty groups as numbers', () => {
      const reaction = { variations: [{ idx: 1, group: ['10', '2'] }, { idx: 2, group: [] }] };
      const variation = addNewVariationDataset({ reaction });
      expect(variation.group).toEqual([11, 0]);
    });
  });

  describe('copyVariationDataset', () => {
    const source = {
      id: 'a', idx: 4, group: [2, 1], analyses: [7], notes: 'first run',
      data: { id: 'a-reaction', _starting_materials: [null, { _equivalent: 0.3 }] },
    };

    it('appends a copy with the values and group of the original', () => {
      const reaction = { variations: [source] };
      const copy = copyVariationDataset({ reaction }, 0);

      expect(reaction.variations).toEqual([source, copy]);
      expect(copy.group).toEqual([2, 1]);
      expect(copy.data._starting_materials).toEqual([null, { _equivalent: 0.3 }]);
    });

    it('gives the copy a number and identities of its own, and no analyses or note', () => {
      const reaction = { variations: [source] };
      const copy = copyVariationDataset({ reaction }, 0);

      expect(copy.idx).toBe(5);
      expect(copy.id).not.toBe(source.id);
      expect(copy.data.id).not.toBe(source.data.id);
      expect(copy.analyses).toEqual([]);
      expect(copy.notes).toBe('');
    });

    it('does not share its values with the original', () => {
      const reaction = { variations: [source] };
      const copy = copyVariationDataset({ reaction }, 0);

      copy.data._starting_materials[1]._equivalent = 0.9;
      expect(source.data._starting_materials[1]._equivalent).toBe(0.3);
    });
  });

  describe('reorderVariationDatasets', () => {
    it('puts the variations in the given order and leaves their numbers alone', () => {
      const reaction = { variations: [{ idx: 1 }, { idx: 2 }, { idx: 5 }] };
      reorderVariationDatasets({ reaction }, [2, 0, 1]);
      expect(reaction.variations.map(({ idx }) => idx)).toEqual([5, 1, 2]);
    });
  });

  /*
  The grid's column layout is stored per view - the scheme, or a segment klass picked instead - so
  that looking at a segment does not overwrite how the scheme columns were arranged.
  */
  describe('column layout storage', () => {
    let storage;
    let storeStub;
    let localStorageBefore;

    beforeEach(() => {
      storage = {};
      localStorageBefore = Object.getOwnPropertyDescriptor(window, 'localStorage');
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        value: {
          getItem: (key) => (key in storage ? storage[key] : null),
          setItem: (key, value) => { storage[key] = value; },
        },
      });
      storeStub = sinon.stub(UserStore, 'getState').returns({ currentUser: { id: 7 } });
    });

    afterEach(() => {
      storeStub.restore();
      if (localStorageBefore) {
        Object.defineProperty(window, 'localStorage', localStorageBefore);
      } else {
        delete window.localStorage;
      }
    });

    it('keeps the scheme layout under the key it always had', () => {
      persistColumnState(3, [{ colId: 'a' }]);
      expect(Object.keys(storage)).toEqual(['user7-reaction3-reactionVariationsColumnState']);
      expect(getInitialColumnState(3, 'Schema')).toEqual([{ colId: 'a' }]);
    });

    it('keeps a segment layout apart from the scheme one', () => {
      persistColumnState(3, [{ colId: 'a' }], 'Schema');
      persistColumnState(3, [{ colId: 'segment_x' }], 'foo');

      expect(getInitialColumnState(3, 'Schema')).toEqual([{ colId: 'a' }]);
      expect(getInitialColumnState(3, 'foo')).toEqual([{ colId: 'segment_x' }]);
      expect(getInitialColumnState(3, 'bar')).toBe(null);
    });
  });

  describe('parseVariationGroup', () => {
    it('reads major and minor group as numbers', () => {
      expect(parseVariationGroup('2.1')).toEqual([2, 1]);
      expect(parseVariationGroup('10')).toEqual([10]);
    });

    it('takes any run of non-digits as the separator, and ignores a trailing one', () => {
      expect(parseVariationGroup('3 - 4')).toEqual([3, 4]);
      expect(parseVariationGroup('1.')).toEqual([1]);
      expect(parseVariationGroup('.5')).toEqual([5]);
    });

    it('keeps at most two numbers', () => {
      expect(parseVariationGroup('1.2.3')).toEqual([1, 2]);
    });

    it('is null without any number, so the saved group is kept', () => {
      expect(parseVariationGroup('')).toBe(null);
      expect(parseVariationGroup('.')).toBe(null);
    });
  });

  describe('variationDiffOf', () => {
    it('is only the identity for a variation that changes nothing', async () => {
      const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      const variationReaction = makeVariationReaction(reaction, { id: 'row-reaction' });

      expect(variationDiffOf(reaction, variationReaction)).toEqual({ id: 'row-reaction' });
    });

    it('holds only what was changed, positioned in its list', async () => {
      const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      const variationReaction = makeVariationReaction(reaction, { id: 'row-reaction' });
      variationReaction.starting_materials[1].equivalent = 0.3;

      expect(variationDiffOf(reaction, variationReaction)).toEqual({
        id: 'row-reaction',
        _starting_materials: [null, { _equivalent: 0.3 }],
      });
    });
  });

  describe('convertVariationDatasetToInternalVariations', () => {
    it('gives every variation a material added to the reaction, and keeps its changes in place', async () => {
      const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      const [first] = reaction.starting_materials;
      reaction.variations = [{
        id: 'a', idx: 1, group: [1, 0], analyses: [],
        data: { id: 'a-reaction', _starting_materials: [{ _equivalent: 0.1 }, { _equivalent: 0.2 }] },
      }];
      const added = await SampleFactory.build('SampleFactory.water_100g');

      reaction.addMaterialAt(added, null, first, 'starting_materials');

      const [row] = convertVariationDatasetToInternalVariations(reaction);
      const ids = row.data.starting_materials.map((m) => m.id);
      expect(ids).toEqual(reaction.starting_materials.map((m) => m.id));
      expect(row.data.starting_materials.map((m) => m.equivalent).slice(1)).toEqual([0.1, 0.2]);
    });

    it('labels a row by its stored idx and addresses it by position', async () => {
      const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.variations = [
        { id: 'a', idx: 7, group: [1, 0], analyses: [9], data: {} },
        { id: 'b', idx: 9, group: [2, 0], analyses: [], data: {} },
      ];
      const internal = convertVariationDatasetToInternalVariations(reaction);
      expect(internal.map((row) => row.idx)).toEqual([0, 1]);
      expect(internal.map((row) => row.label)).toEqual([7, 9]);
      expect(internal[0].analyses).toEqual([9]);
      expect(internal[0].notes).toBe('');
      expect(internal[0].data).toBeInstanceOf(Reaction);
    });
  });

  /*
  The exporter writes what the columns' valueGetters hold; only the headers and two cell shapes
  need help. The AG Grid api is stood in for, which is also what pins down the export options.
  */
  describe('exportVariationsToCsv', () => {
    const buildColumn = (colId, headerName, groupName, exportUnit) => ({
      getColId: () => colId,
      getColDef: () => ({ colId, headerName, ...(exportUnit ? { context: { exportUnit } } : {}) }),
      getParent: () => (groupName ? { getColGroupDef: () => ({ headerName: groupName }) } : null),
    });

    const columns = [
      buildColumn('variation_index', '#', 'Variation'),
      buildColumn('variation_control', 'Control', 'Variation'),
      buildColumn('variation_analyses', 'Linked analyses', 'Analyses'),
      buildColumn('starting_materials_0_mass', 'Mass', 'Starting material 1', 'g'),
      buildColumn('reaction_timestamp_start', 'Start', 'Reaction'),
    ];

    let exportParams;
    beforeEach(() => {
      exportParams = null;
      exportVariationsToCsv({
        getAllDisplayedColumns: () => columns,
        exportDataAsCsv: (params) => { exportParams = params; },
      }, 'CU1-R1');
    });

    it('names the file after the reaction', () => {
      expect(exportParams.fileName).toBe('CU1-R1-variations.csv');
    });

    it('exports every displayed column except the button ones', () => {
      expect(exportParams.columnKeys).toEqual(
        ['variation_index', 'starting_materials_0_mass', 'reaction_timestamp_start']
      );
    });

    it('writes headers as group, name and unit', () => {
      const headerOf = (colId) => exportParams.processHeaderCallback({
        column: columns.find((column) => column.getColId() === colId),
      });
      expect(headerOf('variation_index')).toBe('ID');
      expect(headerOf('starting_materials_0_mass')).toBe('Starting material 1 / Mass (g)');
      expect(headerOf('reaction_timestamp_start')).toBe('Reaction / Start');
    });

    it('exports the entered timestamp instead of its sort value', () => {
      const cell = exportParams.processCellCallback({
        value: 1753960000000,
        column: columns[4],
        node: { data: { data: { timestamp_start: '31/07/2026 12:00:00' } } },
      });
      expect(cell).toBe('31/07/2026 12:00:00');
    });

    it('writes the group the way its cell shows it, and empties for null', () => {
      const anyColumn = columns[3];
      expect(exportParams.processCellCallback({ value: [1, 2], column: anyColumn, node: {} })).toBe('1.2');
      expect(exportParams.processCellCallback({ value: null, column: anyColumn, node: {} })).toBe('');
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
