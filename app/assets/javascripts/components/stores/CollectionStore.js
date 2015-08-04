import alt from '../alt';
import CollectionActions from '../actions/CollectionActions';

class CollectionStore {
  constructor() {
    this.state = {
      collections: []
    };

    this.bindListeners({
      handleFetchCollections: CollectionActions.fetchCollections
    })
  }

  handleFetchCollections(results) {
    this.state.collections = results.collections;
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
