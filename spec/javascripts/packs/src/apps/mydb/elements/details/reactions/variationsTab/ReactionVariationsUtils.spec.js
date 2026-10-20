import expect from 'expect';
import sinon from 'sinon';
import Reaction from 'src/models/Reaction';
import Container from 'src/models/Container';
import UserStore from 'src/stores/alt/stores/UserStore';
import Sample from 'src/models/Sample';
import ReactionFactory from 'factories/ReactionFactory';
import SampleFactory from 'factories/SampleFactory';
import {
  diffObjects, variationDiffOf, formatReactionSegments, getVariationsRowName,
  makeVariationReaction, refreshConcentrations, addNewVariationDataset, parseVariationGroup,
  variationFingerprint, variationsChangedBetween,
  copyVariationDataset, reorderVariationDatasets, getInitialColumnState, persistColumnState,
  adoptLegacyVariationsLayout, convertVariationDatasetToInternalVariations,
  exportVariationsToCsv, columnKind, isHiddenByDefault, persistUserColumnKinds,
  placeUnknownColumns
} from 'src/apps/mydb/elements/details/reactions/variationsTab/ReactionVariationsUtils';
import ReactionUpdateHandler from 'src/apps/mydb/elements/details/reactions/schemeTab/ReactionUpdateUtils';
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

  /*
  `concn` is not stored, and the scheme tab only works it out for the reaction it renders - so a row
  has to derive its own, from its own amounts and volume, or the grid shows 0 or the parent's values.
  */
  /*
  The duration display is a cache of `_duration`. A row rebuilt with the parent's cache, or with the
  partial one older diffs held, lost its unit or showed the parent's duration.
  */
  describe('duration of a variation', () => {
    let reaction;
    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.duration = '5 Minute(s)';
      // As loaded: the display is worked out from the duration when first read.
      delete reaction._durationDisplay;
    });

    it('is derived from its own duration, not the display the parent has worked out', () => {
      expect(reaction.durationDisplay.dispUnit).toBe('Minute(s)');
      const variationReaction = makeVariationReaction(reaction, { _duration: '2 Hour(s)' });

      expect(variationReaction.durationDisplay.dispValue).toBe('2');
      expect(variationReaction.durationUnit).toBe('Hour(s)');
    });

    it('keeps its unit when an older diff holds only part of the display', () => {
      const diff = {
        _duration: '2 Hour(s)',
        _durationDisplay: { dispValue: '2', memValue: '2' },
      };
      const variationReaction = makeVariationReaction(reaction, diff);

      expect(variationReaction.durationUnit).toBe('Hour(s)');
    });

    it('is stored as the duration alone', () => {
      const variationReaction = makeVariationReaction(reaction, {});
      variationReaction.durationDisplay = { nextValue: '3' };

      const diff = variationDiffOf(reaction, variationReaction);
      expect(diff._duration).toBe('3 Minute(s)');
      expect(diff).not.toHaveProperty('_durationDisplay');
    });
  });

  /*
  A row's equivalents and yields follow from its amounts. Stored in its diff, they went stale when
  the parent changed what the row inherits - the reference amount above all.
  */
  describe('equivalents and yields of a variation', () => {
    let reaction;
    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      const [reference, other] = reaction.starting_materials;
      reference.reference = true;
      other.equivalent = other.amount_mol / reference.amount_mol;
    });

    const changeReferenceMass = (target, grams) => {
      target.starting_materials[0].setAmount({ value: grams, unit: 'g' });
    };

    it('takes the equivalent of the parent for a material it did not change', () => {
      reaction.starting_materials[1].equivalent = 0.75;
      const variationReaction = makeVariationReaction(reaction, {});

      expect(variationReaction.starting_materials[1].equivalent).toBe(0.75);
    });

    it('works out the equivalent of a material whose amount it changed', () => {
      const parentRow = makeVariationReaction(reaction, {});
      parentRow.starting_materials[1].setAmount({ value: 50, unit: 'g' });
      const diff = variationDiffOf(reaction, parentRow);

      // The parent's reference amount changes afterwards, in the scheme tab.
      changeReferenceMass(reaction, 200);
      const variationReaction = makeVariationReaction(reaction, diff);
      const [reference, other] = variationReaction.starting_materials;

      expect(reference.amount_g).toBeCloseTo(200, 6);
      expect(other.equivalent).toBeCloseTo(other.amount_mol / reference.amount_mol, 9);
      expect(other.equivalent).toBeCloseTo(0.25, 6);
    });

    it('works out the yield of a product against its own reference amount', () => {
      const edited = makeVariationReaction(reaction, {});
      changeReferenceMass(edited, 400);
      const variationReaction = makeVariationReaction(reaction, variationDiffOf(reaction, edited));
      const [reference] = variationReaction.starting_materials;
      const [product] = variationReaction.products;
      const stoichiometryCoeff = (product.coefficient || 1) / (reference.coefficient || 1);

      expect(reference.amount_g).toBeCloseTo(400, 6);
      expect(product.equivalent)
        .toBeCloseTo(product.amount_mol / reference.amount_mol / stoichiometryCoeff, 9);
    });

    it('brings a stale stored equivalent up to date in the diff', () => {
      const edited = makeVariationReaction(reaction, { id: 'row-reaction' });
      edited.starting_materials[1].setAmount({ value: 50, unit: 'g' });
      // As stored before the parent's reference amount changed.
      edited.starting_materials[1].equivalent = 0.9;
      const data = variationDiffOf(reaction, edited);
      expect(data._starting_materials[1]._equivalent).toBe(0.9);
      reaction.variations = [{ id: 'row', idx: 0, group: [0, 0], analyses: [], notes: '', data }];

      const [row] = convertVariationDatasetToInternalVariations(reaction);
      const [reference, other] = row.data.starting_materials;
      const expected = other.amount_mol / reference.amount_mol;

      expect(expected).toBeCloseTo(0.5, 6);
      expect(other.equivalent).toBeCloseTo(expected, 9);
      expect(reaction.variations[0].data._starting_materials[1]._equivalent).toBeCloseTo(expected, 9);
    });

    it('stores nothing for a row that changed nothing', () => {
      reaction.variations = [{
        id: 'row', idx: 0, group: [0, 0], analyses: [], notes: '', data: { id: 'row-reaction' },
      }];

      convertVariationDatasetToInternalVariations(reaction);

      expect(reaction.variations[0].data).toEqual({ id: 'row-reaction' });
    });
  });

  /*
  A change in the Scheme tab reaches every variation without a value of its own for what it changed;
  those are named in a notice, so a recorded experiment does not change unnoticed.
  */
  describe('variations reached by a change of the parent', () => {
    let reaction;
    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    });

    const rowsOf = (diffs) => diffs.map((diff, idx) => ({
      idx, label: idx + 1, data: makeVariationReaction(reaction, { id: `row-${idx}`, ...diff }),
    }));

    const ownMass = () => {
      const edited = makeVariationReaction(reaction, {});
      edited.starting_materials[1].setAmount({ value: 7, unit: 'g' });
      return variationDiffOf(reaction, edited);
    };

    it('names the variations that come to something else after the change', () => {
      const diffs = [{}, ownMass()];
      const before = rowsOf(diffs);
      reaction.starting_materials[1].setAmount({ value: 60, unit: 'g' });
      const after = rowsOf(diffs);

      expect(variationsChangedBetween(before, after)).toEqual([1]);
    });

    it('names none for a change of something no variation inherits', () => {
      const before = rowsOf([ownMass()]);
      reaction.starting_materials[1].setAmount({ value: 60, unit: 'g' });

      expect(variationsChangedBetween(before, rowsOf([ownMass()]))).toEqual([]);
    });

    it('tells a change of a condition apart', () => {
      const unchanged = variationFingerprint(reaction);
      reaction.duration = '3 Hour(s)';

      expect(variationFingerprint(reaction)).not.toBe(unchanged);
    });
  });

  describe('concentrations of a variation', () => {
    let reaction;
    beforeEach(async () => {
      reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.concentration_mode = Reaction.CONCENTRATION_MODES.REACTION_VOLUME;
      reaction.volume = 2;
      // As on load: nothing has worked out the parent's concentrations yet.
      [...reaction.starting_materials, ...reaction.products].forEach((material) => {
        material.concn = 0;
      });
    });

    it('works them out when the row is built, products included', () => {
      const variationReaction = makeVariationReaction(reaction, {});
      const [startingMaterial] = variationReaction.starting_materials;
      const [product] = variationReaction.products;

      expect(startingMaterial.concn).toBeCloseTo(startingMaterial.amount_mol / 2, 6);
      expect(product.concn).toBeCloseTo(product.amount_mol / 2, 6);
    });

    it('uses the volume of the variation, not the parent', () => {
      const variationReaction = makeVariationReaction(reaction, { volume: 4 });
      const [startingMaterial] = variationReaction.starting_materials;

      expect(startingMaterial.concn).toBeCloseTo(startingMaterial.amount_mol / 4, 6);
    });

    it('does not keep a concentration the parent preserved', () => {
      reaction.starting_materials[0].preserveConcentration = true;
      const variationReaction = makeVariationReaction(reaction, {});
      const [startingMaterial] = variationReaction.starting_materials;

      expect(startingMaterial.preserveConcentration).toBe(false);
      expect(startingMaterial.concn).toBeCloseTo(startingMaterial.amount_mol / 2, 6);
    });

    it('follows an amount edit of the row, keeping a concentration typed in that edit', () => {
      const variationReaction = makeVariationReaction(reaction, {});
      const [first, second] = variationReaction.starting_materials;
      first.setAmount({ value: 200, unit: 'g' });
      second.concn = 1.5;
      second.preserveConcentration = true;

      refreshConcentrations(variationReaction);

      expect(first.concn).toBeCloseTo(first.amount_mol / 2, 6);
      expect(second.concn).toBe(1.5);
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
          removeItem: (key) => { delete storage[key]; },
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

    /*
    A reaction without a layout of its own starts compact, or with what the user last chose for each
    kind of column - so the grid is not some twelve columns wide per material from the start.
    */
    describe('columns of a reaction without a layout of its own', () => {
      it('takes a material column by its kind, without the slot', () => {
        expect(columnKind('starting_materials_2_density')).toBe('starting_materials_density');
        expect(columnKind('reaction_duration')).toBe('reaction_duration');
      });

      it('starts the scheme view with only the main material columns', () => {
        ['mass', 'amount', 'eq', 'ref', 'name'].forEach((field) => {
          expect(isHiddenByDefault(`starting_materials_0_${field}`)).toBe(false);
        });
        ['density', 'purity', 'molar_mass', 'volume', 'concn', 'coefficient'].forEach((field) => {
          expect(isHiddenByDefault(`reactants_1_${field}`)).toBe(true);
        });
      });

      it('keeps solvent, gas phase and reaction columns, and segment views as they are', () => {
        expect(isHiddenByDefault('solvents_0_volume')).toBe(false);
        expect(isHiddenByDefault('products_0_gas_ppm')).toBe(false);
        expect(isHiddenByDefault('reaction_duration')).toBe(false);
        expect(isHiddenByDefault('starting_materials_0_density', 'Some segment')).toBe(false);
      });

      it('follows what the user last chose for that kind of column, in any slot', () => {
        persistUserColumnKinds(['starting_materials_0_density'], false);
        persistUserColumnKinds(['products_0_mass'], true);

        expect(isHiddenByDefault('starting_materials_3_density')).toBe(false);
        expect(isHiddenByDefault('products_1_mass')).toBe(true);
        expect(Object.keys(storage)).toEqual(['user7-reactionVariationsColumnKinds']);
      });
    });

    it('keeps the scheme layout under the key it always had', () => {
      persistColumnState(3, [{ colId: 'a' }]);
      expect(Object.keys(storage)).toEqual(['user7-reaction3-reactionVariationsColumnState']);
      expect(getInitialColumnState(3, 'Schema')).toEqual([{ colId: 'a' }]);
    });

    describe('left behind by the previous variations table', () => {
      const legacyKey = (name) => `user7-reaction3-reactionVariations${name}`;
      const reactionWith = (idxs) => ({
        id: 3, isNew: false, variations: idxs.map((idx) => ({ idx, id: `row-${idx}` })),
      });

      it('removes the grid state and layout, whose columns no longer exist', () => {
        storage[legacyKey('GridState')] = '{}';
        storage[legacyKey('Layout')] = '{}';

        adoptLegacyVariationsLayout(reactionWith([1]));

        expect(storage).toEqual({});
      });

      it('puts the rows in the order they were dragged into, unknown rows last', () => {
        storage[legacyKey('RowOrder')] = JSON.stringify([3, 1]);
        const reaction = reactionWith([1, 2, 3]);

        adoptLegacyVariationsLayout(reaction);

        expect(reaction.variations.map(({ idx }) => idx)).toEqual([3, 1, 2]);
        // Kept until the reaction has been saved in that order.
        expect(storage).toHaveProperty(legacyKey('RowOrder'));
      });

      it('lets the row order go once the reaction is stored in it', () => {
        storage[legacyKey('RowOrder')] = JSON.stringify([3, 1]);
        const reaction = reactionWith([3, 1, 2]);

        adoptLegacyVariationsLayout(reaction);

        expect(reaction.variations.map(({ idx }) => idx)).toEqual([3, 1, 2]);
        expect(storage).toEqual({});
      });

      it('leaves an unsaved reaction alone', () => {
        storage[legacyKey('RowOrder')] = JSON.stringify([2, 1]);
        const reaction = { ...reactionWith([1, 2]), isNew: true };

        adoptLegacyVariationsLayout(reaction);

        expect(reaction.variations.map(({ idx }) => idx)).toEqual([1, 2]);
      });
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
    // As the previous variations table did: an analysis deleted in the Analyses tab, or already gone,
    // is unlinked from every row.
    it('unlinks analyses that are deleted or gone', async () => {
      const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      const analysis = (id, isDeleted = false) => Object.assign(Container.buildEmpty(), {
        id, container_type: 'analysis', is_deleted: isDeleted,
      });
      const analyses = Object.assign(Container.buildEmpty(), {
        container_type: 'analyses', children: [analysis(11), analysis(12, true)],
      });
      reaction.container = Object.assign(Container.init(), { children: [analyses] });
      reaction.variations = [{ id: 'a', idx: 1, group: [1, 0], analyses: [11, 12, 13], data: { id: 'x' } }];

      const [row] = convertVariationDatasetToInternalVariations(reaction);

      expect(reaction.variations[0].analyses).toEqual([11]);
      expect(row.analyses).toEqual([11]);
    });

    it('leaves the links alone for a reaction without analyses loaded', async () => {
      const reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
      reaction.container = Object.assign(Container.init(), { children: [] });
      reaction.variations = [{ id: 'a', idx: 1, group: [1, 0], analyses: [11], data: { id: 'x' } }];

      convertVariationDatasetToInternalVariations(reaction);

      expect(reaction.variations[0].analyses).toEqual([11]);
    });

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
      // The analysis the first row links, which has to exist to stay linked.
      reaction.container = Object.assign(Container.init(), {
        children: [Object.assign(Container.buildEmpty(), {
          container_type: 'analyses',
          children: [Object.assign(Container.buildEmpty(), { id: 9, container_type: 'analysis' })],
        })],
      });
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

/*
A material added to the reaction after its grid layout was stored gets columns the layout does not
know. They go next to the columns before them in the definitions, not behind everything else.
*/
describe('placeUnknownColumns', () => {
  const definitions = [
    'variation_index', 'variation_group',
    'reactants_0_mass', 'reactants_0_eq',
    'reactants_1_mass', 'reactants_1_eq',
    'products_0_mass', 'reaction_temperature',
  ];
  const ids = (state) => state.map(({ colId }) => colId);

  it('puts a second reactant right after the first', () => {
    const stored = ['variation_index', 'variation_group', 'reactants_0_mass', 'reactants_0_eq', 'products_0_mass',
      'reaction_temperature'].map((colId) => ({ colId, width: 100 }));

    expect(ids(placeUnknownColumns(stored, definitions))).toEqual(definitions);
  });

  it('follows the first reactant where the user has moved it', () => {
    const stored = ['variation_index', 'variation_group', 'products_0_mass', 'reactants_0_mass', 'reactants_0_eq',
      'reaction_temperature'].map((colId) => ({ colId }));

    expect(ids(placeUnknownColumns(stored, definitions))).toEqual([
      'variation_index', 'variation_group', 'products_0_mass', 'reactants_0_mass', 'reactants_0_eq',
      'reactants_1_mass', 'reactants_1_eq', 'reaction_temperature',
    ]);
  });

  it('keeps what the stored layout says of the columns it knows', () => {
    const stored = [{ colId: 'variation_index', width: 60, hide: false }, { colId: 'reactants_0_mass', hide: true }];

    const placed = placeUnknownColumns(stored, ['variation_index', 'reactants_0_mass', 'reactants_0_eq']);
    expect(placed).toEqual([
      { colId: 'variation_index', width: 60, hide: false },
      { colId: 'reactants_0_mass', hide: true },
      { colId: 'reactants_0_eq' },
    ]);
  });

  it('puts a column with nothing known before it first', () => {
    expect(ids(placeUnknownColumns([{ colId: 'b' }], ['a', 'b']))).toEqual(['a', 'b']);
  });
});

/*
The reference material is set in the Scheme tab only, and every variation follows it: a change of the
reference recomputes each variation's equivalents and yields against the new one, from the variation's
own amounts.
*/
describe('Reference change of a reaction with variations', () => {
  let reaction;

  const datasetOf = (variationReaction, idx) => ({
    id: `row-${idx}`, idx, group: [idx, 0], analyses: [], notes: '', data: variationDiffOf(reaction, variationReaction),
  });

  const switchReferenceTo = (sample) => {
    let changed = null;
    const handler = new ReactionUpdateHandler({
      reaction,
      onReactionChange: (r) => { changed = r; },
      onLockEquivColChange: () => {},
    });
    handler.handleMaterialsChange({ type: 'referenceChanged', sampleID: sample.id, materialGroup: 'starting_materials' });
    return changed;
  };

  beforeEach(async () => {
    reaction = await ReactionFactory.build('ReactionFactory.water+water=>water+water');
    reaction.starting_materials[0].reference = true;
    reaction.starting_materials[0].equivalent = 1;
    reaction.starting_materials[1].equivalent = 1;

    // A: less of the second starting material; B: less product.
    const lessOther = makeVariationReaction(reaction, { id: 'a' });
    lessOther.starting_materials[1].setAmount({ value: reaction.starting_materials[1].amount_g / 2, unit: 'g' });
    const lessProduct = makeVariationReaction(reaction, { id: 'b' });
    lessProduct.products[0].setAmount({ value: reaction.products[0].amount_g / 4, unit: 'g' });
    // Rebuilt once, as the grid stores them: with the equivalents and yields their amounts give.
    const asStored = (variation) => makeVariationReaction(reaction, variationDiffOf(reaction, variation));
    reaction.variations = [datasetOf(asStored(lessOther), 0), datasetOf(asStored(lessProduct), 1)];
  });

  it('recomputes the equivalents and yields of every variation against the new reference', () => {
    const changed = switchReferenceTo(reaction.starting_materials[1]);
    const rows = convertVariationDatasetToInternalVariations(changed);

    rows.forEach(({ data: variation }) => {
      const [former, reference] = variation.starting_materials;
      const [product] = variation.products;
      expect(reference.reference).toBe(true);
      expect(reference.equivalent).toBe(1);
      expect(former.reference).toBe(false);
      expect(former.equivalent).toBeCloseTo(former.amount_mol / reference.amount_mol, 9);

      const stoichiometryCoeff = (product.coefficient || 1) / (reference.coefficient || 1);
      const maxAmount = reference.amount_mol * stoichiometryCoeff * product.molecule_molecular_weight
        / (product.purity || 1);
      const expectedYield = product.amount_g > maxAmount
        ? 1 : product.amount_mol / reference.amount_mol / stoichiometryCoeff;
      expect(product.equivalent).toBeCloseTo(expectedYield, 9);
    });
    // Variation A has half as much of the new reference, so the former one comes to 2 equivalents.
    expect(rows[0].data.starting_materials[0].equivalent).toBeCloseTo(2, 9);
  });

  it('stores no reference of its own in a variation', () => {
    const changed = switchReferenceTo(reaction.starting_materials[1]);
    convertVariationDatasetToInternalVariations(changed);

    changed.variations.forEach(({ data }) => {
      (data._starting_materials || []).forEach((entry) => {
        expect(entry && 'reference' in entry).toBeFalsy();
        expect(entry && '_reference' in entry).toBeFalsy();
      });
    });
  });

  it('gives a variation saved with a reference of its own the reaction\'s', () => {
    const own = makeVariationReaction(reaction, { id: 'own' });
    own.starting_materials[0].reference = false;
    own.starting_materials[1].reference = true;
    reaction.variations = [datasetOf(own, 0)];

    const [row] = convertVariationDatasetToInternalVariations(reaction);
    expect(row.data.starting_materials.map((material) => !!material.reference)).toEqual([true, false]);
    expect(row.data.starting_materials[0].equivalent).toBe(1);
  });
});
