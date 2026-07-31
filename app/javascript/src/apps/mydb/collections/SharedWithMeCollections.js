import React, { useContext, useState } from 'react';
import Tree from 'react-ui-tree';
import { Dropdown, OverlayTrigger } from 'react-bootstrap';
import SharedToMeInfosTooltip from 'src/apps/mydb/collections/SharedToMeInfosTooltip';
import AppModal from 'src/components/common/AppModal';
import { PermissionConst } from 'src/utilities/PermissionConst';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import useCollectionShares from 'src/apps/mydb/collections/useCollectionShares';

function SharedWithMeCollections() {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.shared_with_me_collection_tree;
  const [rejectNode, setRejectNode] = useState(null);
  const { openAddShare, openManageShares, shareModals } = useCollectionShares(collectionsStore);

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
              {/* renderOnMount pre-mounts the menu so Popper has a measurable anchor;
                  without it the fixed-strategy menu detaches to the top of the viewport
                  inside the modal's positioning context. */}
              <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
                {canManage && (
                  <>
                    <Dropdown.Item onClick={() => openAddShare(node)}>
                      <i className="fa fa-plus me-1" />
                      <i className="fa fa-share-alt me-1" />
                      Add share
                    </Dropdown.Item>
                    <Dropdown.Item onClick={() => openManageShares(node)}>
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
      {shareModals}
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
