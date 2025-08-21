import React, { Fragment, useState, useEffect } from 'react';
import PropTypes from 'prop-types';

import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import SidebarButton from 'src/apps/mydb/layout/sidebar/SidebarButton';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';
import GatePushButton from 'src/components/common/GatePushButton';

import Aviator from 'aviator';
import { collectionShow } from 'src/utilities/routesUtils';

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
  const [collections, setCollections] = useState(CollectionStore.getState());
  const [activeCollection, setActiveCollection] = useState(ALL_COLLECTIONS_KEY);
  const [expandedCollections, setExpandedCollections] = useState([ALL_COLLECTIONS_KEY]);

  const toggleCollection = (collectionKey) => {
    setExpandedCollections((prev) => {
      if (prev.includes(collectionKey)) {
        return prev.filter((key) => key !== collectionKey);
      }
      return [...prev, collectionKey];
    });
  };

  const expandCollection = (collectionKey) => {
    if (isCollapsed) UIActions.expandSidebar.defer();
    setExpandedCollections((prev) => {
      if (prev.includes(collectionKey)) return prev;
      return [...prev, collectionKey];
    });
  };

  const setCollection = (collection) => {
    expandCollection(collection);
    if (collection !== activeCollection) setActiveCollection(collection);
  };

  useEffect(() => {
    CollectionActions.fetchLockedCollectionRoots();
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
    CollectionActions.fetchRemoteCollectionRoots();
    CollectionActions.fetchSyncInCollectionRoots();

    // Create a copy of the collection store state to trigger a re-render
    const onCollectionStoreChange = (s) => setCollections({ ...s });
    CollectionStore.listen(onCollectionStoreChange);
    return () => CollectionStore.unlisten(onCollectionStoreChange);
  }, []);

  const {
    lockedRoots, unsharedRoots, sharedRoots, remoteRoots, syncInRoots
  } = collections;

  const collectionGroups = [
    {
      label: 'My Collections',
      icon: 'icon-collection',
      collectionKey: ALL_COLLECTIONS_KEY,
      roots: unsharedRoots,
      onClickOpenCollection: 'all',
    },
    {
      label: 'Shared by me',
      icon: 'icon-outgoing',
      collectionKey: 'sharedByMe',
      roots: sharedRoots,
    },
    {
      label: 'Shared with me',
      icon: 'icon-incoming',
      collectionKey: 'sharedWithMe',
      roots: remoteRoots,
    },
    {
      label: 'Synchronized with me',
      icon: 'fa fa-refresh',
      collectionKey: 'syncedWithMe',
      roots: syncInRoots,
    },
  ];

  const chemotionRepository = lockedRoots.find((r) => r.label === 'chemotion-repository.net');
  if (chemotionRepository) {
    collectionGroups.push({
      label: 'chemotion-repo',
      icon: 'fa fa-cloud',
      collectionKey: CHEMOTION_REPOSITORY_KEY,
      onClickOpenCollection: chemotionRepository.id,
      roots: chemotionRepository.children,
    });
  }

  // Set the active collection based on the currentCollection in UIStore
  useEffect(() => {
    const onUiStoreChange = ({ currentCollection }) => {
      if (!currentCollection) return;

      const group = collectionGroups.find(({ roots }) => containsCollection(roots, currentCollection.id));
      if (group) setCollection(group.collectionKey);
    };

    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, [collectionGroups]);

  return (
    <div className="mh-100 d-flex flex-column">
      <div className="sidebar-button-frame tree-view_frame flex-column">
        {collectionGroups.map(({
          label, icon, collectionKey, roots, onClickOpenCollection
        }) => {
          const isActive = activeCollection === collectionKey;
          const isExpanded = expandedCollections.includes(collectionKey);
          return (
            <Fragment key={collectionKey}>
              <SidebarButton
                label={label}
                icon={icon}
                isCollapsed={isCollapsed}
                onClick={() => {
                  if (onClickOpenCollection !== undefined) {
                    setCollection(collectionKey);
                    Aviator.navigate(`/collection/${onClickOpenCollection}`, { silent: true });
                    collectionShow({ params: { collectionID: onClickOpenCollection } });
                  } else {
                    expandCollection(collectionKey);
                  }
                }}
                expandable
                isExpanded={isExpanded}
                onToggleExpansion={() => toggleCollection(collectionKey)}
                appendComponent={collectionKey === CHEMOTION_REPOSITORY_KEY ? (
                  <GatePushButton collectionId={chemotionRepository.id} />
                ) : null}
                active={isActive}
              />
              {isExpanded && !isCollapsed && roots !== undefined && (
                <div className="tree-view_container">
                  {roots.length === 0
                    ? <div className="text-muted text-center p-2">No collections</div>
                    : roots.map((root) => <CollectionSubtree key={root.id} root={root} level={1} />)}
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

export default CollectionTree;
