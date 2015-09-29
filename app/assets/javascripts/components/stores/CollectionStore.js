import alt from '../alt';
import CollectionActions from '../actions/CollectionActions';

class CollectionStore {
  constructor() {
    this.state = {
      unsharedRoots: [],
      sharedRoots: [],
      remoteRoots: []
    };

    this.bindListeners({
      handleTakeOwnership: CollectionActions.takeOwnership,
      handleFetchUnsharedCollectionRoots: CollectionActions.fetchUnsharedCollectionRoots,
      handleFetchSharedCollectionRoots: CollectionActions.fetchSharedCollectionRoots,
      handleFetchRemoteCollectionRoots: CollectionActions.fetchRemoteCollectionRoots,
      handleCreateSharedCollections: CollectionActions.createSharedCollections,
      handleBulkUpdateUnsharedCollections: CollectionActions.bulkUpdateUnsharedCollections,
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection
    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleFetchUnsharedCollectionRoots(results) {
    this.state.unsharedRoots = results.collections;
  }

  handleFetchSharedCollectionRoots(results) {
    this.state.sharedRoots = results.collections;
  }

  handleFetchRemoteCollectionRoots(results) {
    this.state.remoteRoots = results.collections;
  }

  handleCreateSharedCollections() {
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleBulkUpdateUnsharedCollections() {

  }

  handleUpdateSharedCollection() {
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
