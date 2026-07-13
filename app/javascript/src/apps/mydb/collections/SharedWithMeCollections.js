import React, { useContext, useState } from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, OverlayTrigger, Popover } from 'react-bootstrap';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import CollectionSharesEditModal from 'src/apps/mydb/collections/CollectionSharesEditModal';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const defaultPermissions = {
  permissionLevel: 0,
  sampleDetailLevel: 10,
  reactionDetailLevel: 10,
  wellplateDetailLevel: 10,
  screenDetailLevel: 10,
  elementDetailLevel: 10,
};

function SharedWithMeCollections() {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.shared_with_me_collection_tree;
  const [sharesModal, setSharesModal] = useState({ action: null, show: false, node: {} });
  const [sharesEditModal, setSharesEditModal] = useState({ show: false, node: {} });
  const [permissions, setPermissions] = useState(defaultPermissions);

  const handleChange = (tree) => {
    collectionsStore.setSharedWithMeCollectionTree(tree);
  }

  const rejectShared = (node) => {
    collectionsStore.deleteCollectionShare(node.collection_share_id, node.id);
  }

  // A delegate holding :manage_shares (or higher) on a shared collection may administer its shares.
  const canManageShares = (node) => node.permission_level >= PermissionConst.ManageShares;

  const openCollectionSharesModal = (node) => {
    setPermissions(defaultPermissions);
    setSharesModal({ action: 'create', show: true, node });
  };

  const closeCollectionSharesModal = () => {
    setPermissions(defaultPermissions);
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

  const manageShareButtons = (node) => {
    if (!canManageShares(node)) { return null; }
    return (
      <>
        <Button
          size="sm"
          variant="warning"
          title="Manage shares"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => openCollectionSharesEditModal(node)}
        >
          <i className="fa fa-users" />
          <i className="fa fa-share-alt ms-1" />
        </Button>
        <Button
          size="sm"
          variant="primary"
          title="Add share"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => openCollectionSharesModal(node)}
        >
          <i className="fa fa-plus" />
          <i className="fa fa-share-alt ms-1" />
        </Button>
      </>
    );
  };

  const renderNode = (node) => {
    if (node.id === -1) { 
      return (
        <div className="ms-3 mb-2 fs-5">{node.label}</div>
      );
    }

    if (node.is_locked) {
      return (
        <h5
          className="ms-3"
          onMouseDown={(e) => e.stopPropagation}
        >
          {node.label}
        </h5>
      );
    } else {
      const popover = (
        <Popover>
          <Popover.Body>
            <div>Delete collection?</div>
            <div>"{node.label}"</div>
            <div className="mt-2">
              <ButtonGroup>
                <Button
                  variant="danger"
                  size="sm"
                  className="me-2"
                  onClick={() => rejectShared(node)}
                >
                  Yes
                </Button>
                <Button
                  variant="warning"
                  size="sm"
                  onClick={() => {}}
                >
                  No
                </Button>
              </ButtonGroup>
            </div>
          </Popover.Body>
        </Popover>
      );

      // Without a direct share there is nothing of the user's own to reject: access comes from a
      // group, and the group's share belongs to every member. To drop it, leave the group.
      const canReject = node.collection_share_id != null;

      return (
        <div 
          className="d-flex align-items-center justify-content-between bg-dark-subtle mb-2"
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="ms-3">
            {node.label}
            {node.shared_via_group && (
              <i
                className="fa fa-users ms-2 text-muted"
                title={canReject
                  ? 'Shared with you directly and through one of your groups'
                  : 'Shared with you through one of your groups — leave the group to remove it'}
              />
            )}
          </div>
          <ButtonGroup>
            {manageShareButtons(node)}
            {canReject && (
              <OverlayTrigger
                animation
                placement="bottom"
                root
                trigger="focus"
                overlay={popover}
              >
                <Button size="sm" variant="danger">
                  <i className="fa fa-trash-o" />
                </Button>
              </OverlayTrigger>
            )}
          </ButtonGroup>
        </div>
      );
    }
  }

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={20}
        tree={tree}
        onChange={handleChange}
        renderNode={renderNode}
      />
      {Object.keys(sharesModal.node).length >= 1 && sharesModal.show && (
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
      {Object.keys(sharesEditModal.node).length >= 1 && sharesEditModal.show && (
        <CollectionSharesEditModal
          node={sharesEditModal.node}
          updateNode={editCollectionShares}
          deleteNode={deleteCollectionShares}
          onHide={closeCollectionSharesEditModal}
        />
      )}
    </div>
  );

}

export default observer(SharedWithMeCollections);
