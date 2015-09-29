import alt from '../alt';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';

class CollectionActions {
  takeOwnership(paramObj) {
    CollectionsFetcher.takeOwnership(paramObj)
      .then((roots) => {
        this.dispatch(roots);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  // TODO #2...centralized error handling maybe ErrorActions?
  fetchUnsharedCollectionRoots() {
    CollectionsFetcher.fetchUnsharedRoots()
      .then((roots) => {
        this.dispatch(roots);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchSharedCollectionRoots() {
    CollectionsFetcher.fetchSharedRoots()
      .then((roots) => {
        this.dispatch(roots);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchRemoteCollectionRoots() {
    CollectionsFetcher.fetchRemoteRoots()
      .then((roots) => {
        this.dispatch(roots);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  createSharedCollections(paramObj) {
    CollectionsFetcher.createSharedCollections(paramObj)
      .then(() => {
        this.dispatch();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  bulkUpdateUnsharedCollections(paramObj) {
    CollectionsFetcher.bulkUpdateUnsharedCollections(paramObj)
      .then(() => {
        this.dispatch();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateSharedCollection(paramObj) {
    CollectionsFetcher.updateSharedCollection(paramObj)
      .then(() => {
        this.dispatch();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  createUnsharedCollection(paramObj) {
    CollectionsFetcher.createUnsharedCollection(paramObj)
      .then(() => {
        this.dispatch();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateElementsCollection(paramObj) {
    CollectionsFetcher.updateElementsCollection(paramObj)
      .then(() => {
        this.dispatch();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}

export default alt.createActions(CollectionActions);
