import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import CollectionSharesFetcher from 'src/fetchers/CollectionSharesFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';

export const Collection = types.model({
  ancestry: types.string,
  children: types.array(types.late(() => Collection)),
  id: types.identifierNumber,
  inventory_id: types.maybeNull(types.integer),
  inventory_name: types.maybeNull(types.string),
  inventory_prefix: types.maybeNull(types.string),
  label: types.string,
  is_locked: types.boolean,
  owner: types.maybeNull(types.string),
  permission_level: types.maybeNull(types.integer), // temp for testing
  position: types.maybeNull(types.number),
  shared: types.maybeNull(types.boolean),
  tabs_segment: types.optional(types.frozen({}), {}),
}).actions(self => ({
  addChild(collection) {
    if (self.id === 0 || self.isParentOf(collection)) {
      self.children.push(collection)
      self.sortChildren()
    } else if (self.isAncestorOf(collection)) {
      const nextParentIndex = self.children.findIndex(element => element.isAncestorOf(collection))
      self.children[nextParentIndex].addChild(collection)
    }
  },
  sortChildren() {
    self.children.sort((a, b) => {
      if (a.position != null && b.position != null) { return a.position - b.position }
      else if (a.position != null && b.position == null) { return -1 }
      else if (a.position == null && b.position != null) { return 1 }
      else if (a.label.toUpperCase() < b.label.toUpperCase()) { return -1; }
      else if (a.label.toUpperCase() == b.label.toUpperCase()) { return 0 }
      else if (a.label.toUpperCase() > b.label.toUpperCase()) { return 1 }
      else { console.debug('unsortable collections:', a, b); return 0 }
    })
  },
  resetAncestry() {
    self.ancestry = '/'
  },
})).views(self => ({
  get ancestorIds() { return self.ancestry.split('/').filter(Number).map(element => parseInt(element)) },
  get isRootCollection() { return self.ancestry == '/' },
  isAncestorOf(collection) {
    if (!collection.ancestorIds) { return false }
    return collection.ancestorIds.indexOf(self.id) != -1
  },
  isParentOf(collection) { return self.id == collection.ancestorIds.findLast(id => true) },
}));

const recursively_sort_by_position = (tree) => {
  tree.sort((a, b) => { a.position - b.position })
}

const presort = (a, b) => {
  const number_of_parents_a = a.ancestry.split('/').filter(Number).length;
  const number_of_parents_b = b.ancestry.split('/').filter(Number).length;

  if (number_of_parents_a != number_of_parents_b) { return number_of_parents_a - number_of_parents_b }
  else { return a.position - b.position }
}

export const CollectionsStore = types
  .model({
    all_collection: types.maybeNull(Collection),
    chemotion_repository_collection: types.maybeNull(Collection),
    current_user_id: types.maybeNull(types.integer),
    own_collections: types.array(Collection),
    shared_with_me_collections: types.array(Collection),
    update_tree: types.maybeNull(types.boolean, false),
  })
  .actions(self => ({
    fetchCollections: flow(function* fetchCollections() {
      const all_collections = yield CollectionsFetcher.fetchCollections();
      self.own_collections.clear()
      self.shared_with_me_collections.clear()

      self.setOwnCollections(all_collections.own)
      self.setSharedWithMeCollections(all_collections.shared_with_me)
    }),
    addCollection: flow(function* addCollection(collection) {
      const params = { 
        label: 'New Collection', parent_id: (collection.id == -1 ? '' : collection.id), inventory_id: collection.inventory_id
      }
      const collectionItem = yield CollectionsFetcher.addCollection(params)
      if (collectionItem) {
        self.addCollectionItem(Collection.create(collectionItem), self.own_collections)
        self.update_tree = true
      }
    }),
    bulkUpdateCollection: flow(function* bulkUpdateCollection(collections) {
      const params = { collections: self.prepareForBulkUpdate(collections, []) }
      const all_collections = yield CollectionsFetcher.buldUpdateForOwnCollections(params);
      if (all_collections) {
        self.own_collections.clear()
        self.setOwnCollections(all_collections)
        self.update_tree = true
      }
    }),
    updateCollection: flow(function* updateCollection(collection, tabs_segment) {
      const params = { label: collection.label, tabs_segment: tabs_segment }
      const collectionItem = yield CollectionsFetcher.updateCollection(collection.id, params)
      if (collectionItem) {
        self.changeTabsSegmentInTree(self.own_collections, collectionItem)
        self.update_tree = true
        return self.own_collections
      }
    }),
    deleteCollection: flow(function* deleteCollection(collection) {
      const all_collections = yield CollectionsFetcher.deleteCollection(collection.id)
      self.own_collections.clear()
      self.setOwnCollections(all_collections)
      self.update_tree = true
    }),
    getSharedWith: flow(function* getSharedWith(collectionId) {
      const sharedWith = yield CollectionSharesFetcher.getCollectionSharedWith(collectionId)
      console.log(sharedWith)
    }),
    setOwnCollections(collections) {
      // basic presorting, so we can assume that parent objects are encountered before child objects when iterating the collection array
      collections.sort(presort);
      collections.forEach(collection => {
        const chemRepoCollectionLabels = ['chemotion-repository.net', 'transferred']
        if (collection.is_locked && (collection.label == 'All' || !chemRepoCollectionLabels.includes(collection.label))) {
          return
        }

        if (collection.label == 'chemotion-repository.net') {
          self.chemotion_repository_collection = Collection.create(collection);
        } else {
          const collectionItem = Collection.create(collection)

          const ownOrChemRepoCollection =
            (self.chemotion_repository_collection && collectionItem.ancestorIds.includes(self.chemotion_repository_collection.id))
              ? self.chemotion_repository_collection.children
              : self.own_collections
          
          self.addCollectionItem(collectionItem, ownOrChemRepoCollection)
        }
      });
    },
    setSharedWithMeCollections(collections) {
      // group shared collections by owner
      const sharedWithMeCollections = self.presortSharedWithMeCollections(collections)

      sharedWithMeCollections.forEach((collection, i) => {
        if (i === 0 || i > 0 && sharedWithMeCollections[i - 1].owner !== collection.owner) {
          const ownerCollection = { ancestry: '/', id: 0, label: collection.owner, is_locked: true, owner: collection.owner }
          self.shared_with_me_collections.push(Collection.create(ownerCollection))
        }
        const parentOwnerIndex = self.shared_with_me_collections.findIndex(element => element.owner == collection.owner)
        if (parentOwnerIndex !== -1) {
          self.shared_with_me_collections[parentOwnerIndex].addChild(collection)
        }
      });
    },
    presortSharedWithMeCollections(collections) {
      return collections
        .sort(presort)
        .sort((a, b) => (a.owner > b.owner) ? 1 : ((b.owner > a.owner) ? -1 : 0))
        .filter((c) => !c.is_locked)
    },
    getCurrentUserId() {
      if (Object.keys(self.current_user).length < 1) {
        return self.current_user = (UserStore.getState() && UserStore.getState().currentUser) || {};
      } else {
        return self.current_user;
      }
    },
    allDescendantIds() {
      let allDescendantIds = [];
      self.own_collections.forEach((collection) => {
        allDescendantIds.push(self.descendantIds(collection))
      })
      return allDescendantIds.flat(Infinity);
    },
    descendantIds(collection) {
      return collection.children.flatMap(child => [child.id].concat(self.descendantIds(child)))
    },
    addCollectionItem(collection, ownOrSharedCollection) {
      const parentIndex = ownOrSharedCollection.findIndex(element => element.isAncestorOf(collection))

      if (collection.isRootCollection || parentIndex === -1) {
        if (parentIndex === -1 && !collection.isRootCollection) { collection.resetAncestry() }

        ownOrSharedCollection.push(collection)
        ownOrSharedCollection.sort((a, b) => {
          if (a.position != null && b.position != null) { return a.position - b.position }
          else if (a.position != null && b.position == null) { return -1 }
          else if (a.position == null && b.position != null) { return 1 }
          else if (a.label < b.label) { return -1; }
          else if (a.label == b.label) { return 0 }
          else if (a.label > b.label) { return 1 }
          else { console.debug('unsortable collections:', a, b); return 0 }
        })
      } else {
        ownOrSharedCollection[parentIndex].addChild(collection)
      }
    },
    changeTabsSegmentInTree(collections, node) {
      collections.find((c) => {
        if (c.id == node.id) {
          c.tabs_segment = node.tabs_segment;
        } else if (c.children.length >= 1) {
          self.changeTabsSegmentInTree(c.children, node);
        }
      })
    },
    changeLabelInTree(collections, node, label) {
      collections.find((c) => {
        if (c.id == node.id) {
          c.label = label;
        } else if (c.children.length >= 1) {
          self.changeLabelInTree(c.children, node, label);
        }
      })
    },
    updateCollectionLabel(label, collection) {
      self.changeLabelInTree(self.own_collections, collection, label)
      self.update_tree = true
    },
    setUpdateTree(value) {
      self.update_tree = value
    },
    prepareForBulkUpdate(collections, paramsArray) {
      collections.forEach((collection) => {
        if (collection.children.length > 0) {
          paramsArray.push({ id: collection.id, label: collection.label, children: self.prepareForBulkUpdate(collection.children, []) })
        } else {
          paramsArray.push({ id: collection.id, label: collection.label, children: collection.children })
        }
      })
      return paramsArray
    },
  }))
  .views(self => ({
    get ownCollections() { return values(self.own_collections) },
    get sharedWithMeCollections() { return values(self.shared_with_me_collections) },
  }));
