import React, { Fragment, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';
import GatePushButton from 'src/components/common/GatePushButton';

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

  const toggleCollection = (collectionType) => {
    setExpandedCollection((prev) => ((prev === collectionType) ? null : collectionType));
  }

  const expandCollection = (collectionType) => {
    if (isCollapsed) UIActions.expandSidebar.defer();
    setExpandedCollection(collectionType);
  }

  const changeActiveCollectionType = (collectionType) => {
    expandCollection(collectionType);
    if (collectionType !== activeCollectionType) setActiveCollectionType(collectionType);
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

  // Set the active collection based on the currentCollection in UIStore
  useEffect(() => {
    const onUiStoreChange = ({ currentCollection }) => {
      if (!currentCollection) return;
  
      const group = collectionGroups.find(({ collections }) => containsCollection(collections, currentCollection.id));
      if (group) changeActiveCollectionType(group.collectionType);
    };
  
    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, [collectionGroups]);

  return (
    <div className="mh-100 d-flex flex-column">
      <div className="sidebar-button-frame tree-view_frame flex-column">
        {collectionGroups.map(({
          label, icon, collectionType, collections, onClickOpenCollection,
        }) => {
          const isActive = activeCollectionType === collectionType;
          const isExpanded = expandedCollection === collectionType;
          const sharedWithMe = activeCollectionType === 'sharedWithMe';
          return (
            <Fragment key={collectionType}>
              <SidebarButton
                label={label}
                icon={icon}
                isCollapsed={isCollapsed}
                onClick={() => {
                  changeActiveCollectionType(collectionType);
                  if (onClickOpenCollection !== undefined) {
                    aviatorNavigation('collection', onClickOpenCollection, true, true)
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
                <div className="tree-view_container">
                  {collections.length === 0
                    ? <div className="text-muted text-center p-2">No collections</div>
                    : collections.map((collection) => {
                      return <CollectionSubtree
                        key={`${collection.id}-${collection.label}`}
                        root={collection}
                        sharedWithMe={sharedWithMe}
                        isExpanded={isExpanded}
                        level={1}
                      />
                    })}
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
