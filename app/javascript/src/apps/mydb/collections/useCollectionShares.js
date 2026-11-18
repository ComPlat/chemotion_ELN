import React, { useState } from 'react';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import CollectionSharesEditModal from 'src/apps/mydb/collections/CollectionSharesEditModal';
import { DEFAULT_COLLECTION_SHARE_PERMISSIONS } from 'src/utilities/collectionConstants';

// Shared "share a collection" wiring for the collection trees (sidebar +
// management modal). Keeps the create/edit share modal, the manage-shares
// modal, the snake_case -> camelCase permission mapping, and their handlers in
// one place so the three call sites (CollectionTree, MyCollections,
// SharedWithMeCollections) cannot drift out of sync.
//
// Returns opener callbacks plus a `shareModals` element the caller renders once.
export default function useCollectionShares(collectionsStore) {
  const [shareModal, setShareModal] = useState(null);
  const [manageSharesNode, setManageSharesNode] = useState(null);
  const [permissions, setPermissions] = useState(DEFAULT_COLLECTION_SHARE_PERMISSIONS);

  const openAddShare = (node) => {
    setPermissions(DEFAULT_COLLECTION_SHARE_PERMISSIONS);
    setShareModal({ action: 'create', node });
  };

  const openManageShares = (node) => {
    setManageSharesNode({ id: node.id, label: node.label });
  };

  const openEditShare = (node, collectionShare) => {
    setPermissions({
      permissionLevel: collectionShare.permission_level,
      sampleDetailLevel: collectionShare.sample_detail_level,
      reactionDetailLevel: collectionShare.reaction_detail_level,
      wellplateDetailLevel: collectionShare.wellplate_detail_level,
      screenDetailLevel: collectionShare.screen_detail_level,
      elementDetailLevel: collectionShare.element_detail_level,
    });
    setShareModal({
      action: 'edit',
      node: { ...node, collectionShareId: collectionShare.id, sharedWith: collectionShare.shared_with },
    });
  };

  const deleteShare = (node, collectionShare) => {
    collectionsStore.deleteCollectionShare(collectionShare.id, node.id);
  };

  const closeShareModal = () => setShareModal(null);
  const closeManageShares = () => setManageSharesNode(null);

  const shareModals = (
    <>
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
          collectionPermissions={permissions}
          showUserSelect={shareModal.action === 'create'}
          shareType={shareModal.action}
        />
      )}
    </>
  );

  return {
    openAddShare, openManageShares, deleteShare, shareModals,
  };
}
