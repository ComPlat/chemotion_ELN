import { keys, values } from 'mobx';
import { flow, types } from 'mobx-state-tree';

import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import UserStore from 'src/stores/alt/stores/UserStore';

export const CollectionsStore = types
  .model({
    collections: types.optional(types.array(types.frozen({})), []),
    current_user: types.optional(types.frozen({}), {}),
    own_collections: types.optional(types.array(types.frozen({})), []),
    shared_with_me_collections: types.optional(types.array(types.frozen({})), []),
    chemotion_repository_collection: types.optional(types.frozen({}), {}),
    active_collection: types.optional(types.string, 'collections'),
  })
  .actions(self => ({
    fetchCollections: flow(function* fetchCollections() {
      let collections = yield CollectionsFetcher.fetchCollections();
      if (collections) {
        const currentUser = self.getCurrentUser();
        const owner = `${currentUser.name} (${currentUser.initials})`;
        let allCollections = [];
        let collectionEntries = {};

        self.collections = [];
        self.own_collections = [];
        self.shared_with_me_collections = [];
        self.chemotion_repository_collection = {};

        collections.forEach((collection) => {
          if (collection.label == 'All') { return }

          collectionEntries[collection.id] = { ...collection, children: [] };
          const ancestry = collection.ancestry.split('/').filter(Number);

          if (ancestry.length === 0) {
            allCollections.push(collectionEntries[collection.id]);
          } else {
            const parentId = parseInt(ancestry[ancestry.length - 1], 10);
            if (collectionEntries[parentId]) {
              collectionEntries[parentId].children.push(collectionEntries[collection.id]);
            }
          }
        });
        console.log(collections);
        console.log(allCollections);
        console.log(allCollections.filter((f) => f.owner == owner));
        console.log(allCollections.filter((f) => f.owner != owner));
        self.collections = allCollections;
        self.chemotion_repository_collection = allCollections.find((f) => f.label == 'chemotion-repository.net');
        self.own_collections = allCollections.filter((f) => (f.owner == owner && f.label !== 'chemotion-repository.net'));
        self.shared_with_me_collections = allCollections.filter((f) => f.owner != owner);
      }
    }),
    getCurrentUser() {
      if (Object.keys(self.current_user).length < 1) {
        return self.current_user = (UserStore.getState() && UserStore.getState().currentUser) || {};
      } else {
        return self.current_user;
      }
    },
    setActiveCollection(collection) {
      self.active_collection = collection;
    }
  }))
  .views(self => ({
    get ownCollections() { return values(self.own_collections) },
    get sharedWithMeCollections() { return values(self.shared_with_me_collections) },
  }));
