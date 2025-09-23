import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';

export const OwnCollection = types.model({
  ancestry: types.string,
  children: types.late(() => types.array(OwnCollection)),
  id: types.identifierNumber,
  inventory_id: types.maybeNull(types.integer),
  inventory_name: types.maybeNull(types.string),
  inventory_prefix: types.maybeNull(types.string),
  label: types.string,
  locked: types.boolean,
  position: types.number,
  tabs_segment: types.optional(types.frozen({}), {}),
});

export const SharedCollection = types.model({
  ancestry: types.string,
  children: types.late(() => types.array(SharedCollection)),
  id: types.identifierNumber,
  inventory_id: types.maybeNull(types.integer),
  inventory_name: types.maybeNull(types.string),
  inventory_prefix: types.maybeNull(types.string),
  label: types.string,
  locked: types.boolean,
  owner: types.string,
  position: types.number,
  tabs_segment: types.optional(types.frozen({}), {}),
});

const insert_into_collection_tree = (tree, traversed_parent_ids, remaining_parent_ids, collection) => {
  if (remaining_parent_ids.length == 0) { tree.push(collection) }
  if (remaining_parent_ids.length > 0) {
    const next_parent_id = remaining_parent_ids.shift()
    traversed_parent_ids.push(next_parent_id)
    const index_of_next_parent = tree.indexOf(element => element.id == next_parent_id)
    tree[index_of_next_parent].children = insert_into_collection_tree(
      tree[index_of_next_parent].children,
      traversed_parent_ids,
      remaining_parent_ids,
      collection
    )
  }

  return tree;
}

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
    shared_with_me_collections: types.map(SharedCollection),
  })
  .actions(self => ({
    fetchCollections: flow(function* fetchCollections() {
      let all_collections = yield CollectionsFetcher.fetchCollections();
      const own_collections_tree = []

      // basic presorting, so we can assume that parent objects are encountered before child objects when iterating the collection array
      all_collections.own.sort(presort);
      all_collections.own.map(
        collection => { return OwnCollection.create({ ...collection, children: [] }) }
      ).forEach(collection => {
        if (collection.label == 'All') {
          self.all_collection = collection;
        } else if (collection.label == 'chemotion-repository.net') {
          self.chemotion_repository_collection = collection;
        } else {
          const all_parent_ids = collection.ancestry.split('/').filter(Number);

          insert_into_collection_tree(own_collections_tree, [], all_parent_ids, collection)
        }
      });
      recursively_sort_by_position(own_collections_tree)

      self.own_collections = own_collections_tree

      // group shared collections by owner
      all_collections.shared_with_me.map(
        collection => { return SharedCollection.create({ ...collection, children: [] }) }
      ).forEach(shared_collection => {
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
    addCollection(node, ownCollection = true) {
      // TODO: send new collection to fetcher and api => create endpoint

      // Temporary for testing
      let collections = ownCollection ? [...self.own_collections] : [...self.shared_with_me_collections];
      if (node.children.length >= 1) {
        // Add collection after last position
        collections.push({
          ancestry: '/',
          children: [],
          id: Math.random(),
          label: "New Collection",
          owner: node.children[0]?.owner,
          shares: [],
          tabs_segment: {},
          isNew: true
        });
      } else {
        // Add collection as child of node
        const ancestry = node.ancestry.split('/').filter(Number);
        const children = {
          ancestry: `${node.ancestry}${node.id}/`,
          children: [],
          id: Math.random(),
          label: "New Collection",
          owner: node.owner,
          shares: [],
          tabs_segment: {},
          isNew: true
        };
        // buggy, is easier with api request ...
        collections.forEach((collection) => {
          if (collection.id == node.id) {
            Object.assign({}, collection, { children: children });
          }
          if (ancestry.length >= 1 && collection.id == ancestry[0]) {
            collection.children.forEach((child) => {
              // ancestry.includes(child.id)
              if (child.id == node.id) {
                Object.assign({}, child, { children: children });
              }
            })
          }
        });
      }
      self.own_collections = collections;
    },
  }))
  .views(self => ({
    get ownCollections() { return values(self.own_collections) },
    get sharedWithMeCollections() { return values(self.shared_with_me_collections) },
  }));
