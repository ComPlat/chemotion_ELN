import alt from 'src/stores/alt/alt';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';


class CollectionStore {
  constructor() {
    this.state = {
      myCollections: [],
      sharedCollections: [],
      genericEls: [],
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
      handleFetchRemoteCollectionRoots: CollectionActions.fetchRemoteCollectionRoots,
      // handleCreateSharedCollectionAcls: CollectionActions.createSharedCollectionAcls,
      handleBulkUpdateCollections: CollectionActions.bulkUpdateCollections,
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection,
      handleRefreshMyCollection: [
        CollectionActions.createSelectedSharedCollections
      ],
      handleCreateUnsharedCollection: [
        CollectionActions.createUnsharedCollection,
        CollectionActions.createSharedCollections,
        CollectionActions.editSync,
        CollectionActions.deleteSync
      ],
      handleRejectSharedCollection: CollectionActions.rejectShared,
      handleRejectSyncdCollection: CollectionActions.rejectSync,
      handleUpdateCollectrionTree: CollectionActions.updateCollectrionTree
    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchMyCollections();
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

  handleFetchRemoteCollectionRoots(results) {
    this.state.remoteRoots = results.collections;
  }

  handleCreateSharedCollectionAcls() {
    CollectionActions.fetchMyCollections();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleBulkUpdateCollections() {
    CollectionActions.fetchMyCollections();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleUpdateSharedCollection() {
    CollectionActions.fetchSharedCollectionRoots();
  }

  handleRefreshMyCollection() {
    CollectionActions.fetchMyCollections();
  }

  handleCreateUnsharedCollection(results) {
    CollectionActions.fetchMyCollections();
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
    let roots = this.state.roots;
    let foundCollection = roots && roots.filter((root) => {
      return root.id == collectionId;
    }).pop();

    let promise;

    // if not loaded already fetch collection from backend
    if (!foundCollection) {
      //TODO refactor endpoint
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
      promise = fetch('/api/v1/share_collections/' + collectionId, {
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
