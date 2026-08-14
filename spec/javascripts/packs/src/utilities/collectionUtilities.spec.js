// eslint-disable-next-line import/no-unresolved
import { collectionHasPermission, collectionOptions, filterParamsFromUIState } from 'src/utilities/collectionUtilities';
// eslint-disable-next-line import/no-unresolved
import { PermissionConst } from 'src/utilities/PermissionConst';
import { List } from 'immutable';
import expect from 'expect';
function createCollectionDummy(collectionShareId = undefined, permissionLevel = 0) {
  const currentCollection = {};
  if (collectionShareId !== undefined) {
    currentCollection.collection_share_id = collectionShareId;
    currentCollection.permission_level = permissionLevel;
  }
  return currentCollection;
}

describe('collectionUtilities', () => {
  describe('.collectionHasPermission', () => {
    describe('when own collection', () => {
      it('has permissions', () => {
        expect(collectionHasPermission(createCollectionDummy())).toBe(true);
      });
    });
    describe('when collection is shared with me', () => {
      it('has no permissions', () => {
        expect(collectionHasPermission(createCollectionDummy(2, 0), 1)).toBe(false);
      });
    });
  });

  describe('.collectionOptions', () => {
    const store = () => ({
      own_collections: [
        {
          id: 1,
          label: 'Project',
          children: [{ id: 2, label: 'Sub', children: [] }],
        },
      ],
      shared_with_me_collections: [
        {
          id: 0,
          label: 'Alice',
          children: [
            { id: 3, label: 'Editable', permission_level: PermissionConst.AddElements, children: [] },
            { id: 4, label: 'ReadOnly', permission_level: 0, children: [] },
          ],
        },
      ],
      chemotion_repository_collection: {
        id: 5,
        label: 'chemotion-repository.net',
        children: [{ id: 6, label: 'transferred', children: [] }],
      },
    });

    it('groups owned collections under a "My Collections" label', () => {
      const [owned] = collectionOptions(store(), false);

      expect(owned.label).toBe('My Collections');
      expect(owned.options.map((o) => o.id)).toEqual([1, 2]);
    });

    it('stamps nesting depth so child collections can be indented', () => {
      const [owned] = collectionOptions(store(), false);

      expect(owned.options.map((o) => o.depth)).toEqual([0, 1]);
    });

    it('omits shared collections when not requested', () => {
      const groups = collectionOptions(store(), false);

      expect(groups).toHaveLength(1);
    });

    it('keeps a per-owner "Shared by" group and drops unassignable collections', () => {
      const groups = collectionOptions(store(), true);

      expect(groups.map((g) => g.label)).toEqual(['My Collections', 'Shared by Alice']);
      // Only the collection the user may add elements into is offered.
      expect(groups[1].options.map((o) => o.id)).toEqual([3]);
    });

    it('omits the repository subtree unless it is asked for', () => {
      const groups = collectionOptions(store(), true);

      expect(groups.map((g) => g.label)).not.toContain('chemotion-repo');
    });

    it('offers the repository root and "transferred" when requested', () => {
      const groups = collectionOptions(store(), false, true);

      expect(groups.map((g) => g.label)).toEqual(['My Collections', 'chemotion-repo']);
      expect(groups[1].options.map((o) => o.id)).toEqual([5, 6]);
      expect(groups[1].options.map((o) => o.depth)).toEqual([0, 1]);
    });

    it('never offers the "All" collection, which is not in any tree', () => {
      const groups = collectionOptions(store(), true, true);
      const labels = groups.flatMap((g) => g.options.map((o) => o.label));

      expect(labels).not.toContain('All');
    });

    it('skips the repository group when the user has no repository collection', () => {
      const storeWithoutRepository = { ...store(), chemotion_repository_collection: null };
      const groups = collectionOptions(storeWithoutRepository, false, true);

      expect(groups).toHaveLength(1);
    });
  });

  describe('.filterParamsFromUIState', () => {
    const selection = (checkedIds) => ({
      checkedAll: false,
      checkedIds: List(checkedIds),
      uncheckedIds: List(),
    });

    it('includes built-in element selections', () => {
      const uiState = {
        currentCollection: { id: 1 },
        sample: selection([7]),
      };

      const params = filterParamsFromUIState(uiState);

      expect(params.sample).toEqual({
        all: false, included_ids: List([7]), excluded_ids: List(), collection_id: 1,
      });
    });

    // Regression: generic (labimotion) klass selections must be collected synchronously from
    // uiState.klasses. They were previously added inside an un-awaited promise callback that
    // resolved after the function returned, so they were silently dropped from the payload.
    it('includes generic element selections synchronously', () => {
      const uiState = {
        currentCollection: { id: 1 },
        klasses: ['my_generic'],
        my_generic: selection([42]),
      };

      const params = filterParamsFromUIState(uiState);

      expect(params.my_generic).toEqual({
        all: false, included_ids: List([42]), excluded_ids: List(), collection_id: 1,
      });
    });

    it('omits generic types with an empty selection', () => {
      const uiState = {
        currentCollection: { id: 1 },
        klasses: ['my_generic'],
        my_generic: selection([]),
      };

      const params = filterParamsFromUIState(uiState);

      expect(params.my_generic).toBe(undefined);
    });
  });
});
