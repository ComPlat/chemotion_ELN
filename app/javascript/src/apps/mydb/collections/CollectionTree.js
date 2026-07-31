import React, { Fragment, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import SidebarButton from 'src/apps/mydb/mainNavigation/sidebar/SidebarButton';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';
import GatePushButton from 'src/apps/mydb/collections/GatePushButton';
import useCollectionShares from 'src/apps/mydb/collections/useCollectionShares';

import { aviatorNavigation } from 'src/utilities/routesUtils';

const ALL_COLLECTIONS_KEY = 'all';
const CHEMOTION_REPOSITORY_KEY = 'chemotionRepository';

function CollectionTree({ isCollapsed }) {
  const collectionsStore = useContext(StoreContext).collections;
  const ownCollections = collectionsStore.ownCollections;
  const sharedWithMeCollections = collectionsStore.sharedWithMeCollections;
  const chemotionRepositoryCollection = collectionsStore.chemotion_repository_collection;

  const [activeCollectionType, setActiveCollectionType] = useState(ALL_COLLECTIONS_KEY);
  const [expandedCollection, setExpandedCollection] = useState(ALL_COLLECTIONS_KEY);
  const [hasRadar, setHasRadar] = useState(!!UIStore.getState().hasRadar);

  // Single-instance share modals, lifted out of every CollectionSubtree so the
  // tree does not carry O(N) unused modal slots. Wiring is shared with the
  // management-modal trees via useCollectionShares.
  const { openAddShare, openManageShares, shareModals } = useCollectionShares(collectionsStore);

  const toggleCollection = (collectionType) => {
    setExpandedCollection((prev) => ((prev === collectionType) ? null : collectionType));
  }

  const expandCollection = (collectionType) => {
    if (isCollapsed) UIActions.expandSidebar.defer();
    setExpandedCollection(collectionType);
  }

  const changeActiveCollectionType = (collectionType) => {
    expandCollection(collectionType);
    // setState no-ops when the value is unchanged, so no need to read
    // activeCollectionType here (reading it would make listener closures stale).
    setActiveCollectionType(collectionType);
  }

  const containsCollection = (collections, collectionId) => {
    if (!collections || collections.length === 0) return false;
    return collections.some((collection) => {
      if (collection.id === collectionId) return true;
      return containsCollection(collection.children, collectionId);
    });
  }

  const collectionGroups = [
    {
      label: 'My Collections',
      icon: 'icon-collection',
      collectionType: ALL_COLLECTIONS_KEY,
      collections: ownCollections,
      onClickOpenCollection: 'all',
    },
    {
      label: 'Shared with me',
      icon: 'icon-incoming',
      collectionType: 'sharedWithMe',
      collections: sharedWithMeCollections,
    },
  ];

  if (chemotionRepositoryCollection) {
    collectionGroups.push({
      label: 'chemotion-repo',
      icon: 'fa fa-cloud',
      collectionType: CHEMOTION_REPOSITORY_KEY,
      onClickOpenCollection: chemotionRepositoryCollection.id,
      collections: chemotionRepositoryCollection.children,
    });
  }

  useEffect(() => {
    collectionsStore.fetchCollections();
  }, []);

  useEffect(() => {
    setHasRadar(!!UIStore.getState().hasRadar);

    const onUiStoreChange = ({ currentCollection, hasRadar: storeHasRadar }) => {
      setHasRadar(!!storeHasRadar);
      if (!currentCollection) return;

      // Read the trees fresh from the store on each event. MobX can keep array
      // identity across in-place mutation, so a snapshot captured at subscribe
      // time could miss a just-loaded/moved collection and leave the wrong group
      // highlighted.
      const groups = [
        [ALL_COLLECTIONS_KEY, collectionsStore.ownCollections],
        ['sharedWithMe', collectionsStore.sharedWithMeCollections],
        [CHEMOTION_REPOSITORY_KEY, collectionsStore.chemotion_repository_collection?.children],
      ];
      const match = groups.find(([, collections]) => containsCollection(collections, currentCollection.id));
      if (match) changeActiveCollectionType(match[0]);
    };

    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
    // Intentionally no onUiStoreChange() on subscribe: syncing currentCollection here
    // would snap back to My Collections when opening Shared with me without navigating.
  }, [collectionsStore, isCollapsed]);

  return (
    <div className="mh-100 d-flex flex-column">
      <CollectionManagementButton isCollapsed={isCollapsed} />
      <div className="sidebar-button-frame tree-view__frame flex-column">
        {collectionGroups.map(({
          label, icon, collectionType, collections, onClickOpenCollection,
        }) => {
          const isActive = activeCollectionType === collectionType;
          const isExpanded = expandedCollection === collectionType;
          const sharedWithMe = collectionType === 'sharedWithMe';
          return (
            <Fragment key={collectionType}>
              <SidebarButton
                label={label}
                icon={icon}
                isCollapsed={isCollapsed}
                onClick={() => {
                  changeActiveCollectionType(collectionType);
                  if (onClickOpenCollection !== undefined) {
                    aviatorNavigation('collection', onClickOpenCollection, true, true);
                  }
                }}
                expandable
                isExpanded={isExpanded}
                onToggleExpansion={() => toggleCollection(collectionType)}
                appendComponent={collectionType === CHEMOTION_REPOSITORY_KEY ? (
                  <GatePushButton collectionId={chemotionRepositoryCollection.id} />
                ) : null}
                active={isActive}
              />
              {isExpanded && !isCollapsed && collections !== undefined && (
                <div className="tree-view__container">
                  {collections.length === 0
                    ? <div className="text-muted text-center p-2">No collections</div>
                    : collections.map((collection) => (
                      <CollectionSubtree
                        key={`${collection.id}-${collection.label}`}
                        root={collection}
                        sharedWithMe={sharedWithMe}
                        isExpanded={isExpanded}
                        level={1}
                        hasRadar={hasRadar}
                        onAddShare={openAddShare}
                        onManageShares={openManageShares}
                      />
                    ))}
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {shareModals}
    </div>
  );
}

CollectionTree.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
};

export default observer(CollectionTree);
