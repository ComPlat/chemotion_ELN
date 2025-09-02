import React, { Fragment, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';
import GatePushButton from 'src/components/common/GatePushButton';

import { aviatorNavigation } from 'src/utilities/routesUtils';

const ALL_COLLECTIONS_KEY = 'collections';
const CHEMOTION_REPOSITORY_KEY = 'chemotionRepository';

function containsCollection(collections, collectionId) {
  if (!collections || collections.length === 0) return false;
  return collections.some((collection) => {
    if (collection.id === collectionId) return true;
    return containsCollection(collection.children, collectionId);
  });
}

function CollectionTree({ isCollapsed }) {
  const collectionsStore = useContext(StoreContext).collections;
  const activeCollection = collectionsStore.active_collection;
  const ownCollections = collectionsStore.ownCollections;
  const sharedWithMeCollections = collectionsStore.sharedWithMeCollections;
  const chemotionRepositoryCollection = collectionsStore.chemotion_repository_collection;

  const [collections, setCollections] = useState(CollectionStore.getState());
  //const [activeCollection, setActiveCollection] = useState(ALL_COLLECTIONS_KEY);
  const [expandedCollection, setExpandedCollection] = useState(ALL_COLLECTIONS_KEY);

  const toggleCollection = (collectionKey) => {
    setExpandedCollection((prev) => ((prev === collectionKey) ? null : collectionKey));
  };

  const expandCollection = (collectionKey) => {
    if (isCollapsed) UIActions.expandSidebar.defer();
    setExpandedCollection(collectionKey);
  };

  const setCollection = (collection) => {
    expandCollection(collection);
    if (collection !== activeCollection) setActiveCollection(collection);
  };

  const setActiveCollection = (collection) => {
    //if (isCollapsed) expandSidebar();
    if (collection !== activeCollection) collectionsStore.setActiveCollection(collection);
  };
  useEffect(() => {
    collectionsStore.fetchCollections();

    // 'All' and 'chemotion-repository.net' are special collections that we
    // expect to be returned by `fetchLockedCollectionRoots`. We check the UI
    // state here to correctly restore the active collection on page load.
    // do we still need this???
    const onUiStoreChange = ({ currentCollection }) => {
      if (!currentCollection) return;

      if (currentCollection.label === 'All') {
        setActiveCollection(ALL_COLLECTIONS_KEY);
      }

      if (currentCollection.label === 'chemotion-repository.net') {
        setActiveCollection(CHEMOTION_REPOSITORY_KEY);
      }
    };

    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);

  // useEffect(() => {
  //  CollectionActions.fetchLockedCollectionRoots();
  //  CollectionActions.fetchUnsharedCollectionRoots();
  //  CollectionActions.fetchSharedCollectionRoots();
  //  CollectionActions.fetchRemoteCollectionRoots();
  //  CollectionActions.fetchSyncInCollectionRoots();//

  //  // Create a copy of the collection store state to trigger a re-render
  //  const onCollectionStoreChange = (s) => setCollections({ ...s });
  //  CollectionStore.listen(onCollectionStoreChange);
  //  return () => CollectionStore.unlisten(onCollectionStoreChange);
  //}, []);

  // Set the active collection based on the currentCollection in UIStore
  //useEffect(() => {
  //  const onUiStoreChange = ({ currentCollection }) => {
  //    if (!currentCollection) return;
  //
  //    const group = collectionGroups.find(({ roots }) => containsCollection(roots, currentCollection.id));
  //    if (group) setCollection(group.collectionKey);
  //  };
  //
  //  UIStore.listen(onUiStoreChange);
  //  return () => UIStore.unlisten(onUiStoreChange);
  //}, [collectionGroups]);

  const collectionGroups = [
    {
      label: 'My Collections',
      icon: 'icon-collection',
      collectionKey: ALL_COLLECTIONS_KEY,
      collections: ownCollections,
      onClickOpenCollection: 'all',
    },
    {
      label: 'Shared with me',
      icon: 'icon-incoming',
      collectionKey: 'sharedWithMe',
      collections: sharedWithMeCollections,
    },
  ];

  if (chemotionRepositoryCollection) {
    collectionGroups.push({
      label: 'chemotion-repo',
      icon: 'fa fa-cloud',
      collectionKey: CHEMOTION_REPOSITORY_KEY,
      onClickOpenCollection: chemotionRepositoryCollection.id,
      collections: chemotionRepositoryCollection.children,
    });
  }

  return (
    <div className="mh-100 d-flex flex-column">
      <div className="sidebar-button-frame tree-view_frame flex-column">
        {collectionGroups.map(({
          label, icon, collectionKey, collections, onClickOpenCollection,
        }) => {
          const isActive = activeCollection === collectionKey;
          const isExpanded = expandedCollection === collectionKey;
          return (
            <Fragment key={collectionKey}>
              <SidebarButton
                label={label}
                icon={icon}
                isCollapsed={isCollapsed}
                onClick={() => {
                  if (onClickOpenCollection !== undefined) {
                    setCollection(collectionKey);
                    setActiveCollection(collectionKey);
                    aviatorNavigation('collection', onClickOpenCollection, true, true)
                  } else {
                    expandCollection(collectionKey);
                  }
                }}
                expandable
                isExpanded={isExpanded}
                onToggleExpansion={() => toggleCollection(collectionKey)}
                appendComponent={collectionKey === CHEMOTION_REPOSITORY_KEY ? (
                  <GatePushButton collectionId={chemotionRepositoryCollection.id} />
                ) : null}
                active={isActive}
              />
              {isExpanded && !isCollapsed && collections !== undefined && (
                <div className="tree-view_container">
                  {collections.length === 0
                    ? <div className="text-muted text-center p-2">No collections</div>
                    : collections.map((collection) => <CollectionSubtree key={collection.id} root={collection} level={1} />)}
                </div>
              )}
            </Fragment>
          );
        })}
        <CollectionManagementButton isCollapsed={isCollapsed} />
      </div>
    </div>
  );
}

CollectionTree.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
};

export default observer(CollectionTree);
