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
      handleFetchUnsharedCollectionRoots: CollectionActions.fetchUnsharedCollectionRoots,
      handleFetchSharedCollectionRoots: CollectionActions.fetchSharedCollectionRoots,
      handleFetchRemoteCollectionRoots: CollectionActions.fetchRemoteCollectionRoots,
      handleCreateSharedCollections: CollectionActions.createSharedCollections
    })
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
}

export default alt.createStore(CollectionStore, 'CollectionStore');
