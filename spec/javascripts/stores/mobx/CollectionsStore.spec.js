/* eslint-disable import/no-unresolved */
import expect from 'expect';
import sinon from 'sinon';
import { RootStore } from 'src/stores/mobx/RootStore';
import { Collection } from 'src/stores/mobx/CollectionsStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import CollectionElementsFetcher from 'src/fetchers/CollectionElementsFetcher';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';

// Pins removeElementsFromCollection's return contract { success, lockedSampleIds }. moveElementsToCollection
// and the lock toast both branch on it, and the fetcher's return-shape change (boolean -> object|null|
// undefined) is otherwise untested: restoring `handleResponseSuccess: (r) => r.ok` on the fetcher would
// make lockedSampleIds empty and the "sample locked" toast silently never fire — these cases catch that.
describe('CollectionsStore', () => {
  const params = { collection_id: 1, ui_state: { currentCollection: { id: 1 } } };
  let deleteStub;
  let refreshStub;
  let store;

  beforeEach(() => {
    // Stub at the fetcher boundary: the store maps deleteElementsFromCollection's
    // null / body / undefined into { success, lockedSampleIds }.
    deleteStub = sinon.stub(CollectionElementsFetcher, 'deleteElementsFromCollection');
    // isolate from the alt dispatcher / element refetch
    refreshStub = sinon.stub(ElementActions, 'refreshElementsAfterCollectionChanges');
    store = RootStore.create({}).collectionsStore;
  });

  afterEach(() => {
    deleteStub.restore();
    refreshStub.restore();
  });

  describe('.removeElementsFromCollection', () => {
    it('maps a 204 No Content to success with no locked samples', async () => {
      deleteStub.resolves(null);

      const result = await store.removeElementsFromCollection(params);

      expect(result).toEqual({ success: true, lockedSampleIds: [] });
    });

    it('maps a 200 body to the reported locked sample ids', async () => {
      deleteStub.resolves({ locked_sample_ids: [7, 9] });

      const result = await store.removeElementsFromCollection(params);

      expect(result).toEqual({ success: true, lockedSampleIds: [7, 9] });
    });

    it('still returns the locked ids when notifyLock is false (the move path relies on this)', async () => {
      deleteStub.resolves({ locked_sample_ids: [3] });

      const result = await store.removeElementsFromCollection(params, { notifyLock: false });

      expect(result).toEqual({ success: true, lockedSampleIds: [3] });
    });

    it('maps a request failure to success:false', async () => {
      deleteStub.resolves(undefined);

      const result = await store.removeElementsFromCollection(params);

      expect(result).toEqual({ success: false, lockedSampleIds: [] });
    });
  });

  // Regression coverage: bulkUpdate (the Collection Management modal's Save handler)
  // used to fire this without awaiting it and always clear the dirty flag right after -
  // so a failed save hid the Save button with the edit unsaved and no error shown. Both
  // failure shapes the fetcher chain can produce (a resolved-falsy 4xx/5xx body, and a
  // rejected promise from a network/parse error) must leave own_collections untouched
  // and report failure so the caller knows not to clear the flag.
  describe('.bulkUpdateCollection', () => {
    let bulkUpdateStub;

    beforeEach(() => {
      bulkUpdateStub = sinon.stub(CollectionsFetcher, 'buldUpdateForOwnCollections');
    });

    afterEach(() => {
      bulkUpdateStub.restore();
    });

    it('applies the returned collections and returns true on success', async () => {
      const updated = [{ id: 1, label: 'Updated', ancestry: '/', is_locked: false }];
      bulkUpdateStub.resolves(updated);

      const result = await store.bulkUpdateCollection([{ id: 1, label: 'Updated' }]);

      expect(result).toBe(true);
      expect(store.own_collections.map((c) => c.label)).toEqual(['Updated']);
    });

    it('leaves own_collections untouched and returns false on a falsy (failed) response', async () => {
      store.setOwnCollections([{ id: 1, label: 'Original', ancestry: '/', is_locked: false }]);
      bulkUpdateStub.resolves(undefined);

      const result = await store.bulkUpdateCollection([{ id: 1, label: 'Attempted' }]);

      expect(result).toBe(false);
      expect(store.own_collections.map((c) => c.label)).toEqual(['Original']);
    });

    it('leaves own_collections untouched and returns false when the request rejects', async () => {
      store.setOwnCollections([{ id: 1, label: 'Original', ancestry: '/', is_locked: false }]);
      bulkUpdateStub.rejects(new Error('network error'));

      const result = await store.bulkUpdateCollection([{ id: 1, label: 'Attempted' }]);

      expect(result).toBe(false);
      expect(store.own_collections.map((c) => c.label)).toEqual(['Original']);
    });
  });

  // Regression coverage for ComPlat/chemotion-eln#598: adding a collection (via the "+"
  // button, or "Assign/Move to Collection" with a brand-new name) used to rebuild
  // own_collection_tree from own_collections unconditionally, silently discarding any
  // pending rename/reorder that only lived in own_collection_tree so far.
  describe('.addNewCollectionToOwnCollection (via .addCollection)', () => {
    let addStub;

    beforeEach(() => {
      addStub = sinon.stub(CollectionsFetcher, 'addCollection');
    });

    afterEach(() => {
      addStub.restore();
    });

    it('preserves a pending rename elsewhere in the tree when adding at root', async () => {
      store.setOwnCollections([{ id: 1, label: 'Original Label', ancestry: '/', is_locked: false }]);
      // Simulate an unsaved rename: own_collection_tree diverges from own_collections.
      store.setOwnCollectionTree({
        children: [{ id: 1, label: 'Pending Rename', ancestry: '/', is_locked: false, children: [] }],
      });
      addStub.resolves({ id: 2, label: 'New Collection', ancestry: '/', is_locked: false });

      await store.addCollection({ label: 'New Collection', parent_id: '' }, true);

      const { children } = store.own_collection_tree;
      // 'New Collection' sorts alphabetically before 'Pending Rename' - and the
      // pending rename itself (not 'Original Label') must still be there.
      expect(children.map((c) => [c.id, c.label])).toEqual([
        [2, 'New Collection'],
        [1, 'Pending Rename'],
      ]);
    });

    it('inserts the new node at its natural sorted position without re-sorting an existing pending reorder', async () => {
      store.setOwnCollections([
        { id: 30, label: 'Zebra', ancestry: '/', is_locked: false },
        { id: 40, label: 'Apple', ancestry: '/', is_locked: false },
      ]);
      // Pending manual drag-reorder: Zebra before Apple (not alphabetical).
      store.setOwnCollectionTree({
        children: [
          { id: 30, label: 'Zebra', ancestry: '/', is_locked: false, children: [] },
          { id: 40, label: 'Apple', ancestry: '/', is_locked: false, children: [] },
        ],
      });
      addStub.resolves({ id: 50, label: 'Mango', ancestry: '/', is_locked: false });

      await store.addCollection({ label: 'Mango', parent_id: '' }, true);

      // Mango slots in ahead of Zebra (alphabetically); Zebra/Apple's pending
      // relative order is left exactly as the user arranged it.
      expect(store.own_collection_tree.children.map((c) => c.id)).toEqual([50, 30, 40]);
    });

    it('inserts under the correct parent without disturbing sibling order (pending reorder)', async () => {
      store.setOwnCollections([
        { id: 10, label: 'B', ancestry: '/', is_locked: false },
        { id: 20, label: 'A', ancestry: '/', is_locked: false },
      ]);
      // Pending reorder: B before A, not the alphabetical order own_collections would sort to.
      store.setOwnCollectionTree({
        children: [
          { id: 10, label: 'B', ancestry: '/', is_locked: false, children: [] },
          {
            id: 20, label: 'A', ancestry: '/', is_locked: false, children: [
              { id: 21, label: 'A-child', ancestry: '/20/', is_locked: false, children: [] },
            ],
          },
        ],
      });
      addStub.resolves({ id: 22, label: 'New Sub', ancestry: '/20/', is_locked: false });

      await store.addCollection({ label: 'New Sub', parent_id: 20 }, true);

      const { children } = store.own_collection_tree;
      expect(children.map((c) => c.id)).toEqual([10, 20]);
      expect(children[1].children.map((c) => c.id)).toEqual([21, 22]);
    });

    it('falls back to a sorted top-level push when the parent cannot be found', async () => {
      store.setOwnCollections([{ id: 1, label: 'X', ancestry: '/', is_locked: false }]);
      store.setOwnCollectionTree({
        children: [{ id: 1, label: 'X', ancestry: '/', is_locked: false, children: [] }],
      });
      // ancestry points at a parent (999) not present in the current tree.
      addStub.resolves({ id: 2, label: 'Orphaned', ancestry: '/999/', is_locked: false });

      await store.addCollection({ label: 'Orphaned', parent_id: 999 }, true);

      // 'Orphaned' sorts alphabetically before 'X'.
      expect(store.own_collection_tree.children.map((c) => c.id)).toEqual([2, 1]);
    });

    it('rebuilds from own_collections when own_collection_tree has not been initialized yet', async () => {
      store.setOwnCollections([{ id: 1, label: 'X', ancestry: '/', is_locked: false }]);
      // Before the first fetch/setOwnCollectionTree call, own_collection_tree is the
      // frozen type's default `{}` (no `children` array yet) - not null.
      expect(store.own_collection_tree.children).toEqual(undefined);
      addStub.resolves({ id: 2, label: 'New Collection', ancestry: '/', is_locked: false });

      await store.addCollection({ label: 'New Collection', parent_id: '' }, true);

      expect(store.own_collection_tree.children.map((c) => c.id).sort()).toEqual([1, 2]);
    });
  });

  // Regression coverage: closing the Collection Management modal without saving used to
  // clear only the update_tree dirty flag, leaving own_collection_tree with the unsaved
  // edit still in it. Reopening the modal reseeded the tree from that stale state, but
  // update_tree was already false, so the Save button (gated on update_tree) never
  // reappeared - the user was stuck viewing unsaved changes with no way to save or discard
  // them.
  describe('.discardOwnCollectionTreeChanges', () => {
    it('rebuilds own_collection_tree from own_collections and clears the dirty flag', () => {
      store.setOwnCollections([{ id: 1, label: 'Original Label', ancestry: '/', is_locked: false }]);
      // Simulate an unsaved rename: own_collection_tree diverges from own_collections.
      store.setOwnCollectionTree({
        children: [{ id: 1, label: 'Pending Rename', ancestry: '/', is_locked: false, children: [] }],
      });
      store.setUpdateTree(true);

      store.discardOwnCollectionTreeChanges();

      expect(store.own_collection_tree.children.map((c) => [c.id, c.label])).toEqual([
        [1, 'Original Label'],
      ]);
      expect(store.update_tree).toBe(false);
    });
  });

  // The repository subtree is the one place where the array being built cannot contain the node's
  // parent (the repository collection is held on its own store field, never pushed into its own
  // `children`). Routing a `transferred` collection into `own_collections` instead is what put it
  // into the collection-management payload, where UpdateTree persisted it as a root.
  describe('.setOwnCollections', () => {
    const repositoryRoot = {
      id: 1, label: 'chemotion-repository.net', ancestry: '/', position: null, is_locked: true,
    };
    // an ordinary collection an archive import recreated under the same label
    const importedDuplicate = {
      id: 2, label: 'chemotion-repository.net', ancestry: '/', position: 3, is_locked: false,
    };
    const transferred = {
      id: 3, label: 'transferred', ancestry: '/1/', position: null, is_locked: false,
    };

    it('keeps the repository subtree out of own_collections when a duplicate label exists', () => {
      store.setOwnCollections([repositoryRoot, importedDuplicate, transferred]);

      expect(store.chemotion_repository_collection.id).toEqual(1);
      expect(store.chemotion_repository_collection.children.map((c) => c.id)).toEqual([3]);
      expect(store.own_collections.map((c) => c.id)).not.toContain(3);
    });

    it('surfaces the unlocked duplicate as an ordinary collection', () => {
      store.setOwnCollections([repositoryRoot, importedDuplicate, transferred]);

      expect(store.own_collections.map((c) => c.id)).toEqual([2]);
    });

    // The state the lock migration leaves behind: is_locked takes a different arm of the skip
    // condition, and the collection must still reach the repository subtree rather than vanish.
    it('routes a locked "transferred" into the repository subtree', () => {
      store.setOwnCollections([repositoryRoot, { ...transferred, is_locked: true }]);

      expect(store.chemotion_repository_collection.children.map((c) => c.id)).toEqual([3]);
      expect(store.own_collections.map((c) => c.id)).toEqual([]);
    });

    it('rebuilds the repository node on each pass instead of accumulating children', () => {
      store.setOwnCollections([repositoryRoot, transferred]);
      store.setOwnCollections([repositoryRoot, transferred]);

      expect(store.chemotion_repository_collection.children.map((c) => c.id)).toEqual([3]);
    });
  });

  describe('.addCollectionToTree', () => {
    it('shows a collection whose parent is missing without rewriting its ancestry', () => {
      const orphan = Collection.create({
        id: 9, label: 'transferred', ancestry: '/1/', position: null, is_locked: false,
      });

      store.addCollectionToTree(orphan, store.own_collections);

      expect(store.own_collections.map((c) => c.id)).toEqual([9]);
      expect(store.own_collections[0].ancestry).toEqual('/1/');
    });
  });
});
