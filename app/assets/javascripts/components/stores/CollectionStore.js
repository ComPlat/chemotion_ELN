import alt from '../alt';
import CollectionActions from '../actions/CollectionActions';

import {extraThing} from '../utils/Functions';
import Xlisteners from '../extra/CollectionStoreXlisteners';
import Xhandlers from '../extra/CollectionStoreXhandlers';
import Xstate from '../extra/CollectionStoreXstate';

let extra = {
  ...Xlisteners,//extraElementStore.listeners,
  ...Xhandlers,//extraElementStore.handlers,
  ...Xstate
};
console.log(extra);

class CollectionStore {
  constructor() {
    this.state = {
      unsharedRoots: [],
      sharedRoots: [],
      remoteRoots: [],
      lockedRoots: [],
      ...extraThing("state",Xstate)
    };

    for (let i=0;i<Xlisteners.listenersCount;i++){
     Object.keys(Xlisteners["listeners"+i]).map((k)=>{
        this.bindAction(Xlisteners["listeners"+i][k],Xhandlers["handlers"+i][k].bind(this))
      });
    }

    this.bindListeners({
      handleTakeOwnership: CollectionActions.takeOwnership,
      handleFetchLockedCollectionRoots: CollectionActions.fetchLockedCollectionRoots,
      handleFetchUnsharedCollectionRoots: CollectionActions.fetchUnsharedCollectionRoots,
      handleFetchSharedCollectionRoots: CollectionActions.fetchSharedCollectionRoots,
      handleFetchRemoteCollectionRoots: CollectionActions.fetchRemoteCollectionRoots,
      handleCreateSharedCollections: CollectionActions.createSharedCollections,
      handleBulkUpdateUnsharedCollections: CollectionActions.bulkUpdateUnsharedCollections,
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection,
      handleCreateUnsharedCollection: CollectionActions.createUnsharedCollection,

    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
  }

  handleFetchLockedCollectionRoots(results) {
    this.state.lockedRoots = results.collections;
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
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
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
    let roots = state.unsharedRoots.concat(state.sharedRoots).concat(state.remoteRoots).concat(state.lockedRoots);

    let foundCollection = roots.filter((root) => {
      return root.id == collectionId;
    }).pop();

    let promise;

    // if not loaded already fetch collection from backend
    if(!foundCollection) {
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
        resolve({collection: foundCollection});
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
    if(!foundCollection) {
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
        resolve({collection: foundCollection});
      });
    }
    return promise;
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
