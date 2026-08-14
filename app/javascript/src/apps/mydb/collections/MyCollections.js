import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import { cloneDeep } from 'lodash';
import { Button, ButtonGroup, Dropdown, Form, OverlayTrigger } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import CollectionTabsEditorModal from 'src/apps/mydb/collections/CollectionTabsEditorModal';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';
import useCollectionShares from 'src/apps/mydb/collections/useCollectionShares';
import ConfirmDeleteButton from 'src/components/common/ConfirmDeleteButton';

const MyCollections = () => {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.own_collection_tree;
  const [clonedTree, setClonedTree] = useState(cloneDeep(tree));
  const [tabsEditorCollection, setTabsEditorCollection] = useState(null);
  const { openAddShare, openManageShares, shareModals } = useCollectionShares(collectionsStore);

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

  const deleteCollection = (node) => {
    collectionsStore.deleteCollection(node.id);
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
          {addCollectionButton(node)}
        </div>
      );
    }

    return (
      <div className="d-flex align-items-center gap-2 flex-shrink-0">
        <span
          className="d-inline-flex justify-content-end align-items-center flex-shrink-0"
          style={{ width: '3rem' }}
        >
          {node.shared && (
            <OverlayTrigger placement="top" overlay={<UserInfosTooltip collectionId={node.id} />}>
              <span
                className="text-warning d-inline-flex align-items-center"
                onMouseDown={(e) => e.stopPropagation()}
                style={{ cursor: 'default' }}
              >
                <i className="fa fa-share-alt" />
              </span>
            </OverlayTrigger>
          )}
        </span>
        <ButtonGroup className="flex-shrink-0">
          <Dropdown onMouseDown={(e) => e.stopPropagation()}>
            <Dropdown.Toggle
              size="sm"
              variant="light"
              id={`collection-more-actions-${node.id}`}
              disabled={node.isNew === true}
            >
              <i className="fa fa-ellipsis-v" />
            </Dropdown.Toggle>
            {/* renderOnMount pre-mounts the menu so Popper has a measurable anchor;
                without it the fixed-strategy menu detaches to the top of the viewport
                inside the modal's positioning context. */}
            <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
              <Dropdown.Item onClick={() => openAddShare(node)}>
                <i className="fa fa-plus me-1" />
                <i className="fa fa-share-alt me-1" />
                Add share
              </Dropdown.Item>
              {node.shared && (
                <Dropdown.Item onClick={() => openManageShares(node)}>
                  <i className="fa fa-users me-1" />
                  <i className="fa fa-share-alt me-1" />
                  Manage shares
                </Dropdown.Item>
              )}
              <Dropdown.Divider />
              <Dropdown.Item onClick={() => setTabsEditorCollection(node)}>
                <i className="fa fa-sliders me-1" />
                Edit collection tabs
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
          {addCollectionButton(node)}
          <ConfirmDeleteButton
            id={`confirm-delete-collection-${node.id}`}
            header={`Do you really want to delete "${node.label}"?`}
            placement="bottom"
            stopMouseDownPropagation
            onConfirm={() => deleteCollection(node)}
          />
        </ButtonGroup>
      </div>
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
    <div className="tree pt-2 h-100 overflow-y-auto">
      <Tree
        paddingLeft={20}
        tree={clonedTree}
        onChange={handleChange}
        renderNode={renderNode}
      />
      {shareModals}
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
