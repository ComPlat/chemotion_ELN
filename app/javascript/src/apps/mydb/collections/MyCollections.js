import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import { cloneDeep } from 'lodash';
import { Button, ButtonGroup, Form, OverlayTrigger, Popover } from 'react-bootstrap';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import CollectionSharesEditModal from 'src/apps/mydb/collections/CollectionSharesEditModal';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const MyCollections = () => {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.own_collection_tree;
  const [clonedTree, setClonedTree] = useState(cloneDeep(tree));
  const [sharesModal, setSharesModal] = useState({ action: null, show: false, node: {} });
  const [sharesEditModal, setSharesEditgModal] = useState({ show: false, node: {} });
  const defaultPermissions = {
    permissionLevel: 0,
    sampleDetailLevel: 10,
    reactionDetailLevel: 10,
    wellplateDetailLevel: 10,
    screenDetailLevel: 10,
    elementDetailLevel: 10,
  }
  const [permissions, setPermissions] = useState(defaultPermissions);

  useEffect(() => {
    setClonedTree(cloneDeep(tree));
  }, [tree])

  const handleChange = (tree) => {
    collectionsStore.setOwnCollectionTree(tree);
    collectionsStore.setUpdateTree(true);
  }

  const addCollection = (node) => {
    collectionsStore.addCollection(node);
  }

  const changeCollectionLabel = (e, node) => {
    collectionsStore.updateCollectionLabel(e.target.value, node);
    collectionsStore.setUpdateTree(true);
  }

  const bulkUpdate = () => {
    // filter empty objects
    const collections = tree.children.filter((child) => child.label);
    collectionsStore.bulkUpdateCollection(collections);
    collectionsStore.setUpdateTree(false);
  }

  const deleteCollection = (node) => {
    collectionsStore.deleteCollection(node);
  }

  const openCollectionSharesModal = (node) => {
    setPermissions(defaultPermissions);
    setSharesModal({ action: 'create', show: true, node: node });
  }

  const closeCollectionSharesModal = () => {
    setPermissions(defaultPermissions);
    setSharesModal({ action: null, show: false, node: {} });
  }

  const editCollectionShares = (node, collectionShare) => {
    setPermissions({
      permissionLevel: collectionShare.permission_level,
      sampleDetailLevel: collectionShare.sample_detail_level,
      reactionDetailLevel: collectionShare.reaction_detail_level,
      wellplateDetailLevel: collectionShare.wellplate_detail_level,
      screenDetailLevel: collectionShare.screen_detail_level,
      elementDetailLevel: collectionShare.element_detail_level,
    });
    const nodeWithCollectionShare = {
      ...node, collectionShareId: collectionShare.id, sharedWith: collectionShare.shared_with
    }
    setSharesModal({ action: 'edit', show: true, node: nodeWithCollectionShare });
  }

  const deleteCollectionShares = (node, collectionShare) => {
    collectionsStore.deleteCollectionShare(collectionShare.id, node.id);
  }

  const openCollectionSharesEditModal = (node) => {
    setSharesEditgModal({ show: true, node: { id: node.id, label: node.label } });
  }

  const closeCollectionSharesEditModal = () => {
    setSharesEditgModal({ show: false, node: {} });
  }

  const renderCollectionShareButton = (node) => {
    if (!node.shared) { return null }

    const sharedWithUsers = collectionsStore.sharedWithUsers(node.id);
    const users = sharedWithUsers !== undefined ? sharedWithUsers.shared_with_users : [];
    const count = users.length > 0 ? `(${users.length})` : '';

    return (
      <Button
        id={`collection-share-button-${node.id}`}
        className="d-flex align-items-center gap-1"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => openCollectionSharesEditModal(node)}
        size="sm"
        variant="warning"
        disabled={node.isNew === true}
      >
        <i className="fa fa-users" />
        <i className="fa fa-share-alt" />
        {count}
      </Button>
    );
  }

  const addCollectionButton = (node) => {
    return (
      <Button
        id={`add-new-collection-button${node.id !== -1 ? `-${node.id}` : ''}`}
        size="sm"
        variant="success"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => addCollection(node)}
      >
        <i className="fa fa-plus" />
      </Button>
    );
  }

  const actions = (node) => {
    if (node.id == -1) {
      return (
        <div>
          {collectionsStore.update_tree && (
            <Button
              id="save-collections-button"
              className="me-2"
              size="sm"
              variant="warning"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => bulkUpdate()}
            >
              Save
            </Button>
          )}
          {addCollectionButton(node)}
        </div>
      );
    }

    const popover = (
      <Popover>
        <Popover.Body>
          <div className="mb-2">Do you really want to delete "{node.label}"?</div>
          <ButtonGroup>
            <Button
              variant="danger"
              size="sm"
              className="me-2"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => deleteCollection(node)}
            >
              Yes
            </Button>
            <Button
              variant="warning"
              size="sm"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={() => {}}
            >
              No
            </Button>
          </ButtonGroup>
        </Popover.Body>
      </Popover>
    );

    return (
      <ButtonGroup>
        {renderCollectionShareButton(node)}
    
        <Button
          id="collection-share-btn"
          size="sm"
          variant="primary"
          disabled={node.isNew === true}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => openCollectionSharesModal(node, 'create')}
        >
          <i className="fa fa-plus" />
          <i className="fa fa-share-alt ms-1" />
        </Button>
    
        {addCollectionButton(node)}
    
        <OverlayTrigger
          animation
          placement="bottom"
          root
          trigger="focus"
          overlay={popover}
        >
          <Button size="sm" variant="danger" onMouseDown={(e) => e.stopPropagation()}>
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }

  const label = (node) => {
    if (node.id == -1) {
      return (
        <div className="ms-3 mb-2 fs-5">{node.label}</div>
      );
    }
    return (
      <Form.Control
        className="ms-3 w-75"
        size="sm"
        type="text"
        value={node.label || ''}
        onChange={(e) => { changeCollectionLabel(e, node); }}
      />
    );
  }

  const renderNode = (node) => {
    return (
      <div className="collection-node py-1 d-flex justify-content-between">
        {label(node)}
        {actions(node)}
      </div>
    );
  }

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={20}
        tree={clonedTree}
        onChange={handleChange}
        renderNode={renderNode}
      />
      {Object.keys(sharesModal.node).length >= 1 && sharesModal.show && (
        <ManagingModalSharing
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

export default observer(MyCollections);
