import alt from 'src/stores/alt/alt';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';


class CollectionStore {
  constructor() {
    this.state = {
      myCollections: [],
      sharedCollections: [],
      genericEls: [],
      unsharedRoots: [],
      sharedRoots: [],
      remoteRoots: [],
      lockedRoots: [],
      syncInRoots: [],
      visibleRootsIds: [],
    };


    this.bindListeners({
      handleTakeOwnership: CollectionActions.takeOwnership,
      handleFetchMyCollections: CollectionActions.fetchMyCollections,
      handleFetchCollectionsSharedWithMe: CollectionActions.fetchCollectionsSharedWithMe,
      //handleFetchGenericEls: CollectionActions.fetchGenericEls,
      handleFetchLockedCollectionRoots: CollectionActions.fetchLockedCollectionRoots,
      handleFetchUnsharedCollectionRoots: CollectionActions.fetchUnsharedCollectionRoots,
      handleFetchSharedCollectionRoots: CollectionActions.fetchSharedCollectionRoots,
      handleFetchRemoteCollectionRoots: CollectionActions.fetchRemoteCollectionRoots,
      handleFetchSyncInCollectionRoots: CollectionActions.fetchSyncInCollectionRoots,
      handleCreateSharedCollections: CollectionActions.createSharedCollections,
      handleBulkUpdateUnsharedCollections: CollectionActions.bulkUpdateUnsharedCollections,
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection,
      handleCreateUnsharedCollection: [
        CollectionActions.createUnsharedCollection,
        CollectionActions.createSync,
        CollectionActions.editSync,
        CollectionActions.deleteSync
      ],
      handleRejectSharedCollection: CollectionActions.rejectShared,
      handleRejectSyncdCollection: CollectionActions.rejectSync,
      handleUpdateCollectrionTree: CollectionActions.updateCollectrionTree
    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();
  }

  //handleFetchGenericEls(result) {
  //  console.log(result);
  //  this.state.genericEls = result.genericEls;
  //}

  handleFetchLockedCollectionRoots(results) {
    this.state.lockedRoots = results.collections;
  }

  handleFetchMyCollections(results) {
    this.setState({ myCollections: results.collections });
  }

  handleFetchCollectionsSharedWithMe(results) {
    this.setState({ sharedCollections: results.collections });
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

  handleFetchSyncInCollectionRoots(results) {
    this.state.syncInRoots = results.syncCollections;
  }
  handleCreateSharedCollections() {
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleBulkUpdateUnsharedCollections() {
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleUpdateSharedCollection() {
    CollectionActions.fetchSharedCollectionRoots();
  }

  handleCreateUnsharedCollection(results) {
    CollectionActions.fetchUnsharedCollectionRoots();
  }

  handleUpdateCollectrionTree(visibleRootsIds) {
    this.state.visibleRootsIds = visibleRootsIds
  }

  handleRejectSharedCollection(results) {
    CollectionActions.fetchRemoteCollectionRoots();
  }
  handleRejectSyncdCollection(results) {
    CollectionActions.fetchSyncInCollectionRoots();
  }

  // 'repository' methods; returns a promise
  static findById(collectionId) {
    let state = this.state;
    let roots = state.unsharedRoots.concat(state.sharedRoots).concat(state.remoteRoots).concat(state.lockedRoots);

    let foundCollection = roots.filter((root) => {
      return root.id == collectionId;
    }).pop();

    let promise;

    // if not loaded already fetch collection from backend
    if (!foundCollection) {
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
        resolve({ collection: foundCollection });
      });
    }
    return promise;
  }
  static findBySId(collectionId) {
    let roots = this.state.syncInRoots;
    let foundCollection = roots.filter((root) => {
      return root.id == collectionId;
    }).pop();
    let promise;
    if (!foundCollection) {
      promise = fetch('/api/v1/temp_collections/shared/' + collectionId, {
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
        resolve({ collection: foundCollection });
      });
    }
    return promise;
  }


  static findAllCollection() {
    let state = this.state;
    let roots = state.lockedRoots;

    let foundCollection = roots.filter((root) => {
      return root.label == 'All';
    }).pop();

    let promise;

    // if not loaded already fetch collection from backend
    if (!foundCollection) {
      promise = fetch('/api/v1/collections/all/', {
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
        resolve({ collection: foundCollection });
      });
    }
    return promise;
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
