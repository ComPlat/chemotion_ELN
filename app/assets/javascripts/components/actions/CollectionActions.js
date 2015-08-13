import alt from '../alt';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';

class CollectionActions {
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
}

export default alt.createActions(CollectionActions);
