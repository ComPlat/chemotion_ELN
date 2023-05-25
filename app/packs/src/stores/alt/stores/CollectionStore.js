import alt from 'src/stores/alt/alt';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';


class CollectionStore {
  constructor() {
    this.state = {
      myCollections: [],
      sharedCollections: [],
      visibleRootsIds: [],
    };


    this.bindListeners({
      handleTakeOwnership: CollectionActions.takeOwnership,
      handleFetchMyCollections: CollectionActions.fetchMyCollections,
      handleFetchCollectionsSharedWithMe: CollectionActions.fetchCollectionsSharedWithMe,
      // handleCreateSharedCollectionAcls: CollectionActions.createSharedCollectionAcls,
      handleBulkUpdateCollections: CollectionActions.bulkUpdateCollections,
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection,
      handleRefreshMyCollection: [
        CollectionActions.createSharedCollections,
        CollectionActions.createSelectedSharedCollections,
        CollectionActions.editShare,
        CollectionActions.deleteShare
      ],
      handleRejectSharedCollection: CollectionActions.rejectShared,
      handleUpdateCollectrionTree: CollectionActions.updateCollectrionTree
    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchMyCollections();
    CollectionActions.fetchCollectionsSharedWithMe();
  }

  handleFetchMyCollections(results) {
    this.setState({ myCollections: results.collections });
  }

  handleFetchCollectionsSharedWithMe(results) {
    this.setState({ sharedCollections: results.collections });
  }

  handleCreateSharedCollectionAcls() {
    CollectionActions.fetchMyCollections();
  }

  handleBulkUpdateCollections() {
    CollectionActions.fetchMyCollections();
  }

  handleUpdateSharedCollection() {
    // CollectionActions.fetchSharedCollectionRoots();
  }

  handleRefreshMyCollection() {
    CollectionActions.fetchMyCollections();
  }

  handleUpdateCollectrionTree(visibleRootsIds) {
    this.state.visibleRootsIds = visibleRootsIds
  }

  handleRejectSharedCollection(results) {
    CollectionActions.fetchMyCollections();
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

  static findAllCollection() {
    let state = this.state;
    let roots = state.myCollections;

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
