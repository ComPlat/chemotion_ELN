/* eslint-disable import/no-unresolved */
import expect from 'expect';
import sinon from 'sinon';
import { RootStore } from 'src/stores/mobx/RootStore';
import { Collection } from 'src/stores/mobx/CollectionsStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import CollectionElementsFetcher from 'src/fetchers/CollectionElementsFetcher';

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
