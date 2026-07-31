import React, { useContext, useState } from 'react';
import Tree from 'react-ui-tree';
import { Dropdown, OverlayTrigger } from 'react-bootstrap';
import SharedToMeInfosTooltip from 'src/apps/mydb/collections/SharedToMeInfosTooltip';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import CollectionSharesEditModal from 'src/apps/mydb/collections/CollectionSharesEditModal';
import AppModal from 'src/components/common/AppModal';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { DEFAULT_COLLECTION_SHARE_PERMISSIONS } from 'src/utilities/collectionConstants';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function SharedWithMeCollections() {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.shared_with_me_collection_tree;
  const [sharesModal, setSharesModal] = useState({ action: null, show: false, node: {} });
  const [sharesEditModal, setSharesEditModal] = useState({ show: false, node: {} });
  const [rejectNode, setRejectNode] = useState(null);
  const [permissions, setPermissions] = useState(DEFAULT_COLLECTION_SHARE_PERMISSIONS);

  const handleChange = (tree) => {
    collectionsStore.setSharedWithMeCollectionTree(tree);
  }

  const rejectShared = (node) => {
    collectionsStore.deleteCollectionShare(node.collection_share_id, node.id);
  }

  const confirmRejectShared = () => {
    if (rejectNode) rejectShared(rejectNode);
    setRejectNode(null);
  };

  // A delegate holding :manage_shares (or higher) on a shared collection may administer its shares.
  const canManageShares = (node) => node.permission_level >= PermissionConst.ManageShares;

  const openCollectionSharesModal = (node) => {
    setPermissions(DEFAULT_COLLECTION_SHARE_PERMISSIONS);
    setSharesModal({ action: 'create', show: true, node });
  };

  const closeCollectionSharesModal = () => {
    setPermissions(DEFAULT_COLLECTION_SHARE_PERMISSIONS);
    setSharesModal({ action: null, show: false, node: {} });
  };

  const editCollectionShares = (node, collectionShare) => {
    setPermissions({
      permissionLevel: collectionShare.permission_level,
      sampleDetailLevel: collectionShare.sample_detail_level,
      reactionDetailLevel: collectionShare.reaction_detail_level,
      wellplateDetailLevel: collectionShare.wellplate_detail_level,
      screenDetailLevel: collectionShare.screen_detail_level,
      elementDetailLevel: collectionShare.element_detail_level,
    });
    setSharesModal({
      action: 'edit',
      show: true,
      node: { ...node, collectionShareId: collectionShare.id, sharedWith: collectionShare.shared_with },
    });
  };

  const deleteCollectionShares = (node, collectionShare) => {
    collectionsStore.deleteCollectionShare(collectionShare.id, node.id);
  };

  const openCollectionSharesEditModal = (node) => {
    setSharesEditModal({ show: true, node: { id: node.id, label: node.label } });
  };

  const closeCollectionSharesEditModal = () => {
    setSharesEditModal({ show: false, node: {} });
  };

  const renderNode = (node) => {
    if (node.id === -1) {
      return <div className="ms-3 mb-2 fs-5">{node.label}</div>;
    }

    if (node.is_locked) {
      return (
        <div
          className="ms-3 mt-3 mb-1 text-muted small text-uppercase fw-semibold border-bottom pb-1"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {node.label}
        </div>
      );
    }

    // Without a direct share there is nothing of the user's own to reject: access comes from a
    // group, and the group's share belongs to every member. To drop it, leave the group.
    const canReject = node.collection_share_id != null;
    const canManage = canManageShares(node);
    const hasActions = canManage || canReject;

    return (
      <div
        className="collection-node py-1 d-flex flex-nowrap align-items-center justify-content-between"
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="ms-3 flex-grow-1 min-w-0 me-2 d-flex align-items-center">
          <span className="text-truncate">{node.label}</span>
          {node.shared_via_group && (
            <i
              className="fa fa-users ms-2 text-muted"
              title={canReject
                ? 'Shared with you directly and through one of your groups'
                : 'Shared with you through one of your groups — leave the group to remove it'}
            />
          )}
        </div>
        <div className="d-flex flex-shrink-0 align-items-center gap-2">
          <OverlayTrigger
            placement="top"
            overlay={<SharedToMeInfosTooltip collectionId={node.id} owner={node.owner} />}
          >
            <i
              className="fa fa-share-alt text-warning"
              style={{ cursor: 'default' }}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </OverlayTrigger>
          {hasActions && (
            <Dropdown onMouseDown={(e) => e.stopPropagation()}>
              <Dropdown.Toggle
                size="sm"
                variant="light"
                id={`shared-collection-more-actions-${node.id}`}
              >
                <i className="fa fa-ellipsis-v" />
              </Dropdown.Toggle>
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                {canManage && (
                  <>
                    <Dropdown.Item onClick={() => openCollectionSharesModal(node)}>
                      <i className="fa fa-plus me-1" />
                      <i className="fa fa-share-alt me-1" />
                      Add share
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => openCollectionSharesEditModal(node)}>
                      <i className="fa fa-users me-1" />
                      <i className="fa fa-share-alt me-1" />
                      Manage shares
                    </Dropdown.Item>
                  </>
                )}
                {canManage && canReject && <Dropdown.Divider />}
                {canReject && (
                  <Dropdown.Item className="text-danger" onClick={() => setRejectNode(node)}>
                    <i className="fa fa-trash-o me-1" />
                    Remove my access
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={20}
        tree={tree}
        onChange={handleChange}
        renderNode={renderNode}
      />
      {sharesModal.show && (
        <SelectionShareModal
          title={sharesModal.action === 'create'
            ? `Share "${sharesModal.node.label}"`
            : `Edit Permissions of "${sharesModal.node.sharedWith}" at "${sharesModal.node.label}"`}
          collectionId={sharesModal.node.id}
          collectionShareId={sharesModal.node?.collectionShareId}
          onHide={closeCollectionSharesModal}
          collectionPermissions={permissions}
          showUserSelect={sharesModal.action === 'create'}
          shareType={sharesModal.action}
        />
      )}
      {sharesEditModal.show && (
        <CollectionSharesEditModal
          node={sharesEditModal.node}
          updateNode={editCollectionShares}
          deleteNode={deleteCollectionShares}
          onHide={closeCollectionSharesEditModal}
        />
      )}
      {rejectNode && (
        <AppModal
          show
          size="sm"
          title="Remove access"
          onHide={() => setRejectNode(null)}
          primaryActionLabel="Remove my access"
          onPrimaryAction={confirmRejectShared}
        >
          Remove your access to &quot;{rejectNode.label}&quot;? The owner can share it with you
          again later.
        </AppModal>
      )}
    </div>
  );

}

export default observer(SharedWithMeCollections);
