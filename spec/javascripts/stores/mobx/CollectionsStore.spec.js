/* eslint-disable import/no-unresolved */
import expect from 'expect';
import sinon from 'sinon';
import { RootStore } from 'src/stores/mobx/RootStore';
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
});
