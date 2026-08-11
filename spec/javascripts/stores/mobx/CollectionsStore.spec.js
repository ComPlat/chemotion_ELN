/* eslint-disable import/no-unresolved */
import expect from 'expect';
import sinon from 'sinon';
import { RootStore } from 'src/stores/mobx/RootStore';
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
});
