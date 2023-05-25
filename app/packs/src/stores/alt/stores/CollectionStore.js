import alt from 'src/stores/alt/alt';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';


class CollectionStore {
  constructor() {
    this.state = {
      myCollections: [],
      sharedCollections: [],
      visibleRootsIds: [],
      myCollectionTree: [],
      myLockedCollectionTree: [],
      SharedCollectionTree: [],
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
      handleUpdateCollectionTree: CollectionActions.updateCollectionTree
    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchMyCollections();
    CollectionActions.fetchCollectionsSharedWithMe();
  }

  handleFetchMyCollections(results) {
    if (!results || !Array.isArray(results.collections)) {
      return;
    }
    const { collections, shared } = results;
    const { myCollections, myLockedCollections } =
      CollectionStore.filterLockedCollections(collections);
    const myCollectionTree = CollectionStore.buildNestedStructure(myCollections);
    const sharedCollectionsTree = CollectionStore.buildNestedStructure(shared || []);
    const myLockedCollectionTree = CollectionStore.buildNestedStructure(myLockedCollections);
    const collectionMap = CollectionStore.collectionsToMap(collections.concat(shared || []));
    this.setState({
      myCollections: collections,
      myCollectionTree,
      myLockedCollectionTree,
      sharedCollectionsTree,
      collectionMap,
    });
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

  handleUpdateCollectionTree(visibleRootsIds) {
    this.state.visibleRootsIds = visibleRootsIds
  }

  handleRejectSharedCollection(results) {
    CollectionActions.fetchMyCollections();
  }
  
  static filterLockedCollections(collections) {
    const myLockedCollections = collections.filter(collection => collection.is_locked);
    const myCollections = collections.filter(collection => !collection.is_locked);
    return { myCollections, myLockedCollections };
  }


  static collectionsToMap(collections) {
    // Create a map of collections using their ids as keys
    // add a descendants property to each collection
    const collectionMap = {};
    collections.forEach((collection) => {
      collection.descendants = [];
      collectionMap[collection.id] = collection;
    });
    return collectionMap;
  }
 

  static buildNestedStructure(collections) {
    const rootCollections = [];
    const collectionMap = CollectionStore.collectionsToMap(collections);
    collections.forEach((collection) => {
      collection.descendants = [];
      collectionMap[collection.id] = collection;
    });
    // Iterate over the collections and build the nested structure
    collections.forEach((collection) => {
      const { ancestry } = collection;
      const parentIds = (ancestry || '').split('/').filter((id) => id !== '');

      if (parentIds.length === 0) {
        rootCollections.push(collection);
      } else {
        let parentCollection = null;

        for (let i = parentIds.length - 1; i >= 0; i--) {
          const parentId = parentIds[i];
          const currentParent = collectionMap[parentId];
          if (currentParent) {
            parentCollection = currentParent;
            break;
          } else {
            parentIds.splice(i, 1); // Remove missing parent from ancestry
          }
        }

        if (parentCollection) {
          parentCollection.descendants.push(collection);
        } else {
          rootCollections.push(collection);
        }
      }
    });

    CollectionStore.sortCollections(rootCollections);
    return rootCollections;
  }

  static sortCollections(collections) {
    collections.sort((a, b) => a.position - b.position);

    collections.forEach((collection) => {
      if (collection.descendants.length > 0) {
        CollectionStore.sortCollections(collection.descendants);
      }
    });
  }

  static findAllCollectionId() {
    const { myCollections } = this.state;

    const foundCollection = myCollections.filter((root) => (root.label === 'All' && root.is_locked === true)).pop();

    return foundCollection?.id;
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
