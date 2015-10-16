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
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection,
      handleCreateUnsharedCollection: CollectionActions.createUnsharedCollection
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
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleBulkUpdateUnsharedCollections() {
    CollectionActions.fetchUnsharedCollectionRoots();
  }

  handleUpdateSharedCollection() {
    CollectionActions.fetchUnsharedCollectionRoots()
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleCreateUnsharedCollection(results) {
    CollectionActions.fetchUnsharedCollectionRoots();
  }

  // 'repository' methods; returns a promise
  static findById(collectionId) {
    let state = this.state;
    let roots = state.unsharedRoots.concat(state.sharedRoots).concat(state.remoteRoots);

    let foundCollection = roots.filter((root) => {
      return root.id == collectionId;
    }).pop();

    let promise;

    // if not loaded already fetch collection from backend
    if(!foundCollection) {
      if(collectionId != 'all') {
        // TODO maybe move to CollectionsFetcher
        promise = fetch('/api/v1/collections/' + collectionId, {
          credentials: 'same-origin',
          method: 'GET'
        }).then((response) => {
          return response.json()
        }).then((json) => {
          return json;
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
      } else {
        promise = new Promise((resolve) => {
          resolve({collection: {id: 'all'}});
        });
      }
    } else {
      promise = new Promise((resolve) => {
        resolve({collection: foundCollection});
      });
    }
    return promise;
    //foundCollection
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
