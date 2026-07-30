import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import { cloneDeep } from 'lodash';
import { Button, ButtonGroup, Dropdown, Form, OverlayTrigger, Popover } from 'react-bootstrap';
import SelectionShareModal from 'src/apps/mydb/elements/list/selectionActions/SelectionShareModal';
import CollectionSharesEditModal from 'src/apps/mydb/collections/CollectionSharesEditModal';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import CollectionTabsEditorModal from 'src/apps/mydb/collections/CollectionTabsEditorModal';
import { DEFAULT_COLLECTION_SHARE_PERMISSIONS } from 'src/utilities/collectionConstants';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';

const MyCollections = () => {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.own_collection_tree;
  const [clonedTree, setClonedTree] = useState(cloneDeep(tree));
  const [tabsEditorCollection, setTabsEditorCollection] = useState(null);
  const [sharesModal, setSharesModal] = useState({ action: null, show: false, node: {} });
  const [sharesEditModal, setSharesEditModal] = useState({ show: false, node: {} });
  const [permissions, setPermissions] = useState(DEFAULT_COLLECTION_SHARE_PERMISSIONS);

  useEffect(() => {
    setClonedTree(cloneDeep(tree));
  }, [tree]);

  const handleChange = (tree) => {
    collectionsStore.setOwnCollectionTree(tree);
    collectionsStore.setUpdateTree(true);
  };

  const addCollection = (node) => {
    const params = {
      label: 'New Collection', parent_id: (node.id == -1 ? '' : node.id), inventory_id: node.inventory_id
    };
    collectionsStore.addCollection(params, true);
  };

  const changeCollectionLabel = (e, node) => {
    // Update the label synchronously on the node already rendered by the tree
    // (react-ui-tree references these node objects, so this is the same object
    // that feeds the input's `value`). Doing it in the same input event lets
    // React preserve the caret position. Without this, the new value only comes
    // back through the async store -> useEffect -> cloneDeep round-trip, which
    // reassigns input.value in a later commit and resets the caret to the end.
    node.label = e.target.value;
    setClonedTree((prev) => ({ ...prev }));
    collectionsStore.updateCollectionLabel(e.target.value, node);
    collectionsStore.setUpdateTree(true);
  };

  const bulkUpdate = () => {
    const collections = tree.children.filter((child) => child.label);
    collectionsStore.bulkUpdateCollection(collections);
    collectionsStore.setUpdateTree(false);
  };

  const deleteCollection = (node) => {
    collectionsStore.deleteCollection(node.id);
  };

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

  const addCollectionButton = (node) => (
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
          <div className="mb-2">Do you really want to delete &quot;{node.label}&quot;?</div>
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

    const sharedWithUsers = node.shared ? collectionsStore.sharedWithUsers(node.id) : null;
    const shareCount = sharedWithUsers?.shared_with_users?.length ?? 0;

    return (
      <ButtonGroup className="flex-shrink-0">
        {node.shared && (
          <OverlayTrigger placement="top" overlay={<UserInfosTooltip collectionId={node.id} />}>
            <span
              className="btn btn-sm btn-warning d-flex align-items-center gap-1"
              onMouseDown={(e) => e.stopPropagation()}
              style={{ cursor: 'default' }}
            >
              <i className="fa fa-share-alt" />
              {shareCount > 0 && ` (${shareCount})`}
            </span>
          </OverlayTrigger>
        )}
        {addCollectionButton(node)}
        <OverlayTrigger animation placement="bottom" root trigger="focus" overlay={popover}>
          <Button size="sm" variant="danger" onMouseDown={(e) => e.stopPropagation()}>
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
        <Dropdown onMouseDown={(e) => e.stopPropagation()}>
          <Dropdown.Toggle
            size="sm"
            variant="light"
            id={`collection-more-actions-${node.id}`}
            disabled={node.isNew === true}
          >
            <i className="fa fa-ellipsis-v" />
          </Dropdown.Toggle>
          <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
            <Dropdown.Item onClick={() => openCollectionSharesModal(node)}>
              <i className="fa fa-plus me-1" />
              <i className="fa fa-share-alt me-1" />
              Add share
            </Dropdown.Item>
            {node.shared && (
              <Dropdown.Item onClick={() => openCollectionSharesEditModal(node)}>
                <i className="fa fa-users me-1" />
                <i className="fa fa-share-alt me-1" />
                Manage shares{shareCount > 0 ? ` (${shareCount})` : ''}
              </Dropdown.Item>
            )}
            <Dropdown.Divider />
            <Dropdown.Item onClick={() => setTabsEditorCollection(node)}>
              <i className="fa fa-sliders me-1" />
              Edit collection tabs
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown>
      </ButtonGroup>
    );
  };

  const label = (node) => {
    if (node.id == -1) {
      return <div className="ms-3 mb-2 fs-5">{node.label}</div>;
    }
    return (
      <Form.Control
        className="ms-3 flex-grow-1 min-w-0 me-2"
        size="sm"
        type="text"
        value={node.label || ''}
        onChange={(e) => { changeCollectionLabel(e, node); }}
      />
    );
  };

  const renderNode = (node) => (
    <div className="collection-node py-1 d-flex flex-nowrap align-items-center justify-content-between">
      {label(node)}
      {actions(node)}
    </div>
  );

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={20}
        tree={clonedTree}
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
      {tabsEditorCollection != null && (
        <CollectionTabsEditorModal
          collection={tabsEditorCollection}
          show
          onHide={() => setTabsEditorCollection(null)}
        />
      )}
    </div>
  );
};

export default observer(MyCollections);
