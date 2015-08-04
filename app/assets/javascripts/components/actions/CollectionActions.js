import alt from '../alt';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';

class CollectionActions {
  // TODO #1 unify naming: fetchCollections or fetchCollectionRoots?
  // or do we need both?
  // TODO #2...centralized error handling maybe ErrorActions?
  fetchCollections() {
    CollectionsFetcher.fetchRoots()
      .then((roots) => {
        this.dispatch(roots);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}

export default alt.createActions(CollectionActions);
