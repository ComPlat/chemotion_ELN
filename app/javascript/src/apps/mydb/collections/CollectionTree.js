import React, { Fragment, useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';

import UIStore from 'src/stores/alt/stores/UIStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

import CollectionSubtree from 'src/apps/mydb/collections/CollectionSubtree';
import CollectionSharesEditModal from 'src/apps/mydb/collections/CollectionSharesEditModal';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import SidebarButton from 'src/apps/mydb/mainNavigation/sidebar/SidebarButton';
import CollectionManagementButton from 'src/apps/mydb/collections/CollectionManagementButton';
import GatePushButton from 'src/apps/mydb/collections/GatePushButton';

import { DEFAULT_COLLECTION_SHARE_PERMISSIONS } from 'src/utilities/collectionConstants';
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

  // Single-instance share modal state, lifted out of every CollectionSubtree so
  // the tree does not carry O(N) unused modal slots.
  const [shareModal, setShareModal] = useState(null);
  const [manageSharesNode, setManageSharesNode] = useState(null);
  const [sharePermissions, setSharePermissions] = useState(DEFAULT_COLLECTION_SHARE_PERMISSIONS);

  const openAddShare = (node) => {
    setSharePermissions(DEFAULT_COLLECTION_SHARE_PERMISSIONS);
    setShareModal({ action: 'create', node });
  };

  const openManageShares = (node) => {
    setManageSharesNode({ id: node.id, label: node.label });
  };

  const openEditShare = (node, collectionShare) => {
    setSharePermissions({
      permissionLevel: collectionShare.permission_level,
      sampleDetailLevel: collectionShare.sample_detail_level,
      reactionDetailLevel: collectionShare.reaction_detail_level,
      wellplateDetailLevel: collectionShare.wellplate_detail_level,
      screenDetailLevel: collectionShare.screen_detail_level,
      elementDetailLevel: collectionShare.element_detail_level,
    });
    setShareModal({
      action: 'edit',
      node: {
        ...node,
        collectionShareId: collectionShare.id,
        sharedWith: collectionShare.shared_with,
      },
    });
  };

  const deleteShare = (node, collectionShare) => {
    collectionsStore.deleteCollectionShare(collectionShare.id, node.id);
  };

  const closeShareModal = () => {
    setSharePermissions(DEFAULT_COLLECTION_SHARE_PERMISSIONS);
    setShareModal(null);
  };

  const closeManageShares = () => setManageSharesNode(null);

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
      icon: 'icon-outgoing', // intentional: outgoing glyph visually represents the arrow direction for received shares
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

      const group = collectionGroups.find(({ collections }) => containsCollection(collections, currentCollection.id));
      if (group) changeActiveCollectionType(group.collectionType);
    };

    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
    // Intentionally no onUiStoreChange() on subscribe: syncing currentCollection here
    // would snap back to My Collections when opening Shared with me without navigating.
  }, [ownCollections, sharedWithMeCollections, chemotionRepositoryCollection]);

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

      {manageSharesNode && (
        <CollectionSharesEditModal
          node={manageSharesNode}
          updateNode={openEditShare}
          deleteNode={deleteShare}
          onHide={closeManageShares}
        />
      )}

      {shareModal && (
        <SelectionShareModal
          title={shareModal.action === 'create'
            ? `Share "${shareModal.node.label}"`
            : `Edit Permissions of "${shareModal.node.sharedWith}" at "${shareModal.node.label}"`}
          collectionId={shareModal.node.id}
          collectionShareId={shareModal.node.collectionShareId}
          onHide={closeShareModal}
          collectionPermissions={sharePermissions}
          showUserSelect={shareModal.action === 'create'}
          shareType={shareModal.action}
        />
      )}
    </div>
  );
}

CollectionTree.propTypes = {
  isCollapsed: PropTypes.bool.isRequired,
};

export default observer(CollectionTree);
