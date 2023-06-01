import alt from 'src/stores/alt/alt';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import Collection from 'src/models/Collection';
import UserStore from 'src/stores/alt/stores/UserStore';

class CollectionStore {
  constructor() {
    this.state = {
      visibleRootsIds: [],
      myCollectionTree: [],
      myLockedCollectionTree: [],
      sharedCollectionTree: [],
      collectionMap: {},
    };

    this.bindListeners({
      handleTakeOwnership: CollectionActions.takeOwnership,
      handleFetchMyCollections: CollectionActions.fetchMyCollections,
      // handleCreateSharedCollectionAcls: CollectionActions.createSharedCollectionAcls,
      handleBulkUpdateCollections: CollectionActions.bulkUpdateCollections,
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection,
      handleRefreshMyCollection: [
        CollectionActions.createSharedCollections,
        CollectionActions.createSelectedSharedCollections,
        CollectionActions.editShare,
        CollectionActions.deleteShare
      ],
      handleUpdateCollectionTree: CollectionActions.updateCollectionTree
    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchMyCollections();
  }

  handleFetchMyCollections(results) {
    if (!results || !Array.isArray(results.collections)) {
      return;
    }
    const { collections, shared } = results;
    const collectionObjects = CollectionStore.collectionsToObjects(collections);
    const sharedObjects = CollectionStore.collectionsToObjects(shared || []);
    const { myCollections, myLockedCollections } = CollectionStore.filterLockedCollections(
      collectionObjects
    );

    const myCollectionTree = CollectionStore.buildNestedStructure(myCollections);
    const sharedCollectionTree = CollectionStore.buildNestedStructure(sharedObjects || []);
    const myLockedCollectionTree = CollectionStore.buildNestedStructure(myLockedCollections);
    const collectionMap = CollectionStore.collectionsToMap(
      [...collectionObjects, ...sharedObjects]
    );
    this.setState({
      myCollectionTree,
      myLockedCollectionTree,
      sharedCollectionTree,
      collectionMap,
    });
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

  static collectionsToObjects(collections) {
    const { currentUser } = UserStore.getState();
    return collections.map(collection => {
      collection.currentUser = currentUser;
      return new Collection(collection);
    });
  }

  static filterLockedCollections(collections) {
    const myLockedCollections = collections.filter(collection => collection.is_locked);
    const myCollections = collections.filter(collection => !collection.is_locked);
    return { myCollections, myLockedCollections };
  }


  static collectionsToMap(collections) {
    // Create a map of collections using their ids as keys
    // add a children property to each collection
    const collectionMap = {};
    collections.forEach((collection) => {
      if (collection.children === undefined) {
        collection.children = [];
	collection.depth = 0;
      }
      collectionMap[collection.id] = collection;
    });
    return collectionMap;
  }
 
  static buildNestedStructure(collections) {
    const rootCollections = [];
    const collectionMap = CollectionStore.collectionsToMap(collections);
    // Iterate over the collections and build the nested structure
    collections.forEach((collection) => {
      const { ancestry } = collection;
      const parentIds = (ancestry || '').split('/').filter((id) => id !== '');
      collection.depth = parentIds.length;
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
          parentCollection.children.push(collection);
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
      if (collection.children.length > 0) {
        CollectionStore.sortCollections(collection.children);
      }
    });
  }

  static findAllCollectionId() {
    const { myLockedCollectionTree } = this.state;
    return myLockedCollectionTree.find((collection) => (collection.label === 'All'))?.id;
  }

  static findCollectionById(id) {
    const { collectionMap } = this.state;
    return collectionMap[id];
  }

  static flattenCollectionTree(collectionTree) {
    const flattened = [];
    collectionTree.forEach((collection) => {
      flattened.push(collection);
      if (collection.children.length > 0) {
        flattened.push(...CollectionStore.flattenCollectionTree(collection.children));
      }
    });
    return flattened;
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
