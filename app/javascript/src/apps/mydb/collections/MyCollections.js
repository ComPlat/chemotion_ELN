import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import { cloneDeep } from 'lodash';
import { Button, ButtonGroup, Dropdown, Form, OverlayTrigger } from 'react-bootstrap';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import AppModal from 'src/components/common/AppModal';
import CollectionTabsEditorModal from 'src/apps/mydb/collections/CollectionTabsEditorModal';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';
import useCollectionShares from 'src/apps/mydb/collections/useCollectionShares';
import ConfirmDeleteButton from 'src/components/common/ConfirmDeleteButton';

const MyCollections = () => {
  const collectionsStore = useContext(StoreContext).collections;
  const tree = collectionsStore.own_collection_tree;
  const [clonedTree, setClonedTree] = useState(cloneDeep(tree));
  const [tabsEditorCollection, setTabsEditorCollection] = useState(null);
  const [shareAllConfirm, setShareAllConfirm] = useState(null);
  const { openAddShare, openManageShares, shareModals } = useCollectionShares(collectionsStore);
  const { systemCollections } = collectionsStore;

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

  // The system rows are live store nodes; fetchCollections() clears the locked bucket (see
  // setOwnCollections), which would leave a node captured in React state detached from the tree.
  // Both modals only ever read these three fields, so hand them a plain snapshot instead.
  const systemNodeSnapshot = (node) => ({ id: node.id, label: node.label, tabs_segment: node.tabs_segment });

  // Every other collection shares a bounded set of elements; "All" holds everything the user owns,
  // so sharing it is a different order of decision and is confirmed before the share modal opens.
  // Resolved by id through the store, not by label — the label alone is not reserved.
  const requestAddShare = (node) => {
    if (collectionsStore.isAllCollectionId(node.id)) {
      setShareAllConfirm(systemNodeSnapshot(node));
      return;
    }
    openAddShare(systemNodeSnapshot(node));
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

  // Shared by the draggable tree rows and the pinned system rows. `stopDrag` is the only real
  // difference: react-ui-tree starts a drag on mousedown, so tree rows must swallow it, while the
  // system section is not part of the tree and has nothing to swallow.
  const sharedWithIcon = (node, stopDrag) => (
    <span
      className="d-inline-flex justify-content-end align-items-center flex-shrink-0"
      style={{ width: '3rem' }}
    >
      {node.shared && (
        <OverlayTrigger placement="top" overlay={<UserInfosTooltip collectionId={node.id} />}>
          {/* The handler suppresses react-ui-tree's drag start on a decorative icon; it adds no
              interaction of its own, so there is no keyboard equivalent to provide. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <span
            className="text-warning d-inline-flex align-items-center"
            onMouseDown={stopDrag ? (e) => e.stopPropagation() : undefined}
            style={{ cursor: 'default' }}
          >
            <i className="fa fa-share-alt" />
          </span>
        </OverlayTrigger>
      )}
    </span>
  );

  const moreActionsDropdown = (node, {
    idPrefix, stopDrag, onAddShare, onEditTabs, disabled = false,
  }) => (
    <Dropdown onMouseDown={stopDrag ? (e) => e.stopPropagation() : undefined}>
      <Dropdown.Toggle size="sm" variant="light" id={`${idPrefix}-${node.id}`} disabled={disabled}>
        <i className="fa fa-ellipsis-v" />
      </Dropdown.Toggle>
      {/* renderOnMount pre-mounts the menu so Popper has a measurable anchor;
          without it the fixed-strategy menu detaches to the top of the viewport
          inside the modal's positioning context. */}
      <Dropdown.Menu popperConfig={{ strategy: 'fixed' }} renderOnMount>
        <Dropdown.Item onClick={() => onAddShare(node)}>
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
        <Dropdown.Item onClick={() => onEditTabs(node)}>
          <i className="fa fa-sliders me-1" />
          Edit collection tabs
        </Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
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
        {sharedWithIcon(node, true)}
        <ButtonGroup className="flex-shrink-0">
          {moreActionsDropdown(node, {
            idPrefix: 'collection-more-actions',
            stopDrag: true,
            onAddShare: openAddShare,
            onEditTabs: setTabsEditorCollection,
            disabled: node.isNew === true,
          })}
          {addCollectionButton(node)}
          <ConfirmDeleteButton
            header={`Do you really want to delete "${node.label}"?`}
            placement="bottom"
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

  // The system collections ("All", the repository root and "transferred") are owned like any other
  // collection, but locked: the backend refuses to rename, reparent, delete them or create anything
  // inside them. They are rendered here as a pinned, read-only section rather than as nodes of the
  // tree below, both so no drag can pick them up (react-ui-tree has no per-node opt-out) and so the
  // payload of a tree save stays exactly the set of collections the user may actually move.
  const systemNodeActions = (node) => (
    <div className="d-flex align-items-center gap-2 flex-shrink-0">
      {sharedWithIcon(node, false)}
      <ButtonGroup className="flex-shrink-0">
        {moreActionsDropdown(node, {
          idPrefix: 'system-collection-more-actions',
          stopDrag: false,
          onAddShare: requestAddShare,
          onEditTabs: (systemNode) => setTabsEditorCollection(systemNodeSnapshot(systemNode)),
        })}
      </ButtonGroup>
    </div>
  );

  const systemCollectionsSection = () => {
    if (systemCollections.length === 0) return null;

    return (
      <div className="system-collections border-bottom pb-2 mb-2">
        <div className="ms-3 mb-2 fs-5">System collections</div>
        {systemCollections.map((node) => (
          <div
            key={node.id}
            className="collection-node py-1 d-flex flex-nowrap align-items-center justify-content-between"
          >
            {/* Indent from the node's own ancestry (1.5rem per level, matching Bootstrap's ps-4)
                rather than from a hard-coded label, so a system collection that is nested
                differently later still lines up. */}
            <span
              className="ms-3 flex-grow-1 min-w-0 me-2 text-truncate"
              style={{ paddingLeft: `${node.ancestorIds.length * 1.5}rem` }}
            >
              {node.label}
            </span>
            {systemNodeActions(node)}
          </div>
        ))}
      </div>
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
      {systemCollectionsSection()}
      <Tree
        paddingLeft={20}
        tree={clonedTree}
        onChange={handleChange}
        renderNode={renderNode}
      />
      {shareModals}
      {shareAllConfirm != null && (
        <AppModal
          show
          onHide={() => setShareAllConfirm(null)}
          title={`Share "${shareAllConfirm.label}"?`}
          primaryActionLabel="Continue"
          onPrimaryAction={() => {
            const node = shareAllConfirm;
            setShareAllConfirm(null);
            openAddShare(node);
          }}
        >
          <p>
            {`"${shareAllConfirm.label}" holds every element you own — sharing it grants the `}
            recipient access to all of them at once, including elements you add later.
          </p>
          <p className="mb-0">Share a specific collection instead if that is not what you want.</p>
        </AppModal>
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
