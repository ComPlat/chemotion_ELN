import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
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
  }
})).views(self => ({
  get ancestorIds() { return self.ancestry.split('/').filter(Number).map(element => parseInt(element)) },
  get isRootCollection() { return self.ancestry == '/' },
  isAncestorOf(collection) {
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
  })
  .actions(self => ({
    fetchCollections: flow(function* fetchCollections() {
      let all_collections = yield CollectionsFetcher.fetchCollections();
      self.own_collections.clear();
      self.shared_with_me_collections.clear();

      // basic presorting, so we can assume that parent objects are encountered before child objects when iterating the collection array
      all_collections.own.sort(presort);
      all_collections.own.forEach(collection => {
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
          
          self.addCollection(collectionItem, ownOrChemRepoCollection)
        }
      });

      // group shared collections by owner
      const sharedWithMeCollections = self.presortSharedWithMeCollections(all_collections.shared_with_me)

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
    }),
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
    descendantIds(collection) {
      return collection.children.flatMap(child => [child.id].concat(self.descendantIds(child)))
    },
    addCollection(collection, ownOrSharedCollection) {
      const parentIndex = ownOrSharedCollection.findIndex(element => element.isAncestorOf(collection))

      if (collection.isRootCollection || parentIndex === -1) {
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
  }))
  .views(self => ({
    get ownCollections() { return values(self.own_collections) },
    get sharedWithMeCollections() { return values(self.shared_with_me_collections) },
  }));
