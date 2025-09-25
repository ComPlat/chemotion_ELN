import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';

export const OwnCollection = types.model({
  ancestry: types.string,
  children: types.array(types.late(() => OwnCollection)),
  id: types.identifierNumber,
  inventory_id: types.maybeNull(types.integer),
  inventory_name: types.maybeNull(types.string),
  inventory_prefix: types.maybeNull(types.string),
  label: types.string,
  locked: types.boolean,
  position: types.maybeNull(types.number),
  tabs_segment: types.optional(types.frozen({}), {}),
}).actions(self => ({
  addChild(collection) {
    if (self.isParentOf(collection)) {
      self.children.push(collection)
      self.sortChildren()
    } else if (self.isAncestorOf(collection)) {
      const nextParentIndex = self.children.findIndex(element => element.isAncestorOf(collection))
      self.children[nextParentIndex].addChild(collection)
    }
  },
  sortChildren() {
    self.children.sort((a,b) => {
      if (a.position != null && b.position != null) { return a.position - b.position }
      else if (a.position != null && b.position == null) { return -1 }
      else if (a.position == null && b.position != null) { return 1 }
      else if (a.label.toUpperCase() < b.label.toUpperCase()) { return -1; }
      else if (a.label.toUpperCase() == b.label.toUpperCase()) { return 0 }
      else if (a.label.toUpperCase() > b.label.toUpperCase()) { return 1 }
      else { console.debug('unsortable collections:', a, b); return 0 }
    })
  }
})).views(self=> ({
  get ancestorIds() { return self.ancestry.split('/').filter(Number).map(element => parseInt(element)) },
  get isRootCollection() { return self.ancestry == '/' },
  isAncestorOf(collection) {
    return collection.ancestorIds.indexOf(self.id) != -1
  },
  isParentOf(collection) { return self.id == collection.ancestorIds.findLast },
}));

export const SharedCollection = types.model({
  ancestry: types.string,
  id: types.identifierNumber,
  inventory_id: types.maybeNull(types.integer),
  inventory_name: types.maybeNull(types.string),
  inventory_prefix: types.maybeNull(types.string),
  label: types.string,
  locked: types.boolean,
  owner: types.string,
  position: types.maybeNull(types.number),
  tabs_segment: types.optional(types.frozen({}), {}),
});

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
    active_collection: types.maybeNull(types.integer),
    all_collection: types.maybeNull(OwnCollection),
    chemotion_repository_collection: types.maybeNull(OwnCollection),
    current_user_id: types.maybeNull(types.integer),
    own_collections: types.array(OwnCollection),
    shared_with_me_collections: types.map(types.array(SharedCollection)),
  })
  .actions(self => ({
    fetchCollections: flow(function* fetchCollections() {
      let all_collections = yield CollectionsFetcher.fetchCollections();
      const own_collections_tree = []

      // basic presorting, so we can assume that parent objects are encountered before child objects when iterating the collection array
      all_collections.own.sort(presort);
      all_collections.own.forEach(collection => {
        if (collection.label == 'All') {
          self.all_collection = OwnCollection.create(collection);
        } else if (collection.label == 'chemotion-repository.net') {
          self.chemotion_repository_collection = OwnCollection.create(collection);
        } else {
          self.addOwnCollection(OwnCollection.create(collection))
        }
      });

      // group shared collections by owner
      all_collections.shared_with_me
        .map(collection => { return SharedCollection.create(collection) })
        .forEach(shared_collection => {
          if (self.shared_with_me_collections[shared_collection.owner] === undefined) {
            self.shared_with_me_collections[shared_collection.owner] = []
          }
          self.shared_with_me_collections[shared_collection.owner].push(shared_collection)
        })
      // sort shared collections by label within their groups
      self.shared_with_me_collections.keys().forEach(owner => {
        self.shared_with_me_collections[owner].sort((a,b) => {
          const label_a = a.label.toUpperCase()
          const label_ = ba.label.toUpperCase()
          if (label_a < label_b) { return -1; }
          if (label_a > label_b) { return 1; }
          return 0;
        })
      })
    }),
    getCurrentUserId() {
      if (Object.keys(self.current_user).length < 1) {
        return self.current_user = (UserStore.getState() && UserStore.getState().currentUser) || {};
      } else {
        return self.current_user;
      }
    },
    setActiveCollection(collection_id) {
      self.active_collection = collection;
    },
    addOwnCollection(collection) {
      if (collection.isRootCollection) {
        self.own_collections.push(collection)
        self.ownCollections.sort((a,b) => {
          if (a.position != null && b.position != null) { return a.position - b.position }
          else if (a.position != null && b.position == null) { return -1 }
          else if (a.position == null && b.position != null) { return 1 }
          else if (a.label < b.label) { return -1; }
          else if (a.label == b.label) { return 0 }
          else if (a.label > b.label) { return 1 }
          else { console.debug('unsortable collections:', a, b); return 0 }
        })
      } else {
        const parentIndex = self.ownCollections.findIndex(element => element.isAncestorOf(collection))

        self.own_collections[parentIndex].addChild(collection)
      }
    },
  }))
  .views(self => ({
    get ownCollections() { return values(self.own_collections) },
    get sharedWithMeCollections() { return values(self.shared_with_me_collections) },
  }));
