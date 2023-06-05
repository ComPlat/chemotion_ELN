import alt from 'src/stores/alt/alt';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import Collection from 'src/models/Collection';
import UserStore from 'src/stores/alt/stores/UserStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

class CollectionStore {
  constructor() {
    this.state = {
      visibleRootsIds: [],
      myCollectionTree: [],
      lockedCollectionTree: [],
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
    this.exportPublicMethods({
      findAllCollectionId: this.findAllCollectionId,
      findCollectionById: this.findCollectionById,
      flattenCollectionOptions: this.flattenCollectionOptions,
      formatedCollectionOptions: this.formatedCollectionOptions,
    });

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
    const lockedCollectionTree = CollectionStore.buildNestedStructure(myLockedCollections);
    const collectionMap = CollectionStore.collectionsToMap(
      [...collectionObjects, ...sharedObjects]
    );


    this.setState({
      myCollectionTree,
      lockedCollectionTree,
      sharedCollectionTree,
      collectionMap,
    });
    const { pendingCollectionId } = UIStore.getState();
    if (pendingCollectionId) {
      UIActions.selectCollection.defer({ id: pendingCollectionId });
    }
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

  findAllCollectionId() {
    const { lockedCollectionTree } = this.state;
    return lockedCollectionTree.find((collection) => (collection.label === 'All'))?.id;
  }

  findCollectionById(id) {
    const { collectionMap } = this.state;
    if (id === 'all') {
      return collectionMap[this.findAllCollectionId()];
    }
    return collectionMap[id];
  }

  flattenCollectionOptions(args = {}) {
    const { 
      includeAll = true, // include the All collection
      onlyOwned = false, // only include collections owned by the current user
      permissionLevel = 0, // only include collections with perm level higher than the one specified
      removeExcludedOptions = false, // filter out excluded options instead
      // of adding disabled property
    } = args;
    const {
      lockedCollectionTree, myCollectionTree, sharedCollectionTree
    } = this.state;

    // Flatten the collection trees
    const flattenLockedTree = CollectionStore.flattenCollectionTree(lockedCollectionTree);
    const flattenCollectionTree = CollectionStore.flattenCollectionTree(myCollectionTree);
    const flattenSharedCollectionTree = CollectionStore.flattenCollectionTree(sharedCollectionTree);

    let filteredSharedCollectionList = [];
    // filter out the All collection
    if (!includeAll) {
      if (removeExcludedOptions) {
        flattenLockedTree.shift();
      } else {
        flattenLockedTree.forEach((collection) => {
          collection.disabled = collection.allCollection();
        });
      }
    }
    // filter out the collections with permission level lower than the one specified
    if (permissionLevel > 0) {
      if (removeExcludedOptions) {
        filteredSharedCollectionList = flattenSharedCollectionTree.filter(
          (collection) => collection.hasPermissionLevel(permissionLevel)
        );
      } else {
        flattenSharedCollectionTree.forEach((collection) => {
          collection.disabled = !collection.hasPermissionLevel(permissionLevel);
        });
        filteredSharedCollectionList = flattenSharedCollectionTree;
      }
    }

    if (onlyOwned) { filteredSharedCollectionList = []; }

    // Add a first property to the first element of each collection list
    if (flattenCollectionTree.length > 0) {
      flattenCollectionTree[0].first = true;
    }
    if (filteredSharedCollectionList.length > 0) {
      filteredSharedCollectionList[0].first = true;
    }

    // Return the flattened collection tree list
    return [
      ...flattenLockedTree,
      ...flattenCollectionTree,
      ...filteredSharedCollectionList,
    ];
  }

  // TODO: move the formatting to a more suitable place
  formatedCollectionOptions(args = {}) {
    return this.flattenCollectionOptions(args).map((collection) => {
      const indent = '\u00A0'.repeat(collection.depth * 3 + 1);

      const className = collection.first ? 'separator' : '';

      return {
        value: collection.id,
        label: indent + collection.label,
        className,
        disabled: collection.disabled,
      };
    });
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
