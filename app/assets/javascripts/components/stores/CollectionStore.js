import alt from '../alt';
import CollectionActions from '../actions/CollectionActions';
import extra from '../extra/CollectionStoreExtra';

let extraThing = (name)=> {
  let obj = {}
  for (let i=0;i<extra[name+'Count'];i++){obj={...obj,...extra[name+i]} }
  return obj;
}

let extended= (store)=>{
  for (let i=0;i<extra.handlersCount;i++){
    Object.keys(extra["handlers"+i]).map((k)=>{store.prototype[k]=extra["handlers"+i][k]});
  }

  for (let i=0;i<extra.staticsCount;i++){
    Object.keys(extra["statics"+i]).map((k)=>{store[k]=extra["statics"+i][k]});
  }
  return store;
}

class CollectionStore {
  constructor() {
    this.state = {
      unsharedRoots: [],
      sharedRoots: [],
      remoteRoots: [],
      lockedRoots: [],
      ...extraThing("state")
    };


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
      ...extraThing("listeners")
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

  for (let i=0;i<extra.handlersCount;i++){
    Object.keys(extra["handlers"+i]).map((k)=>{return this[k]=extra["handlers"+i][k]});
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
