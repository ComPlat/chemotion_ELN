import React, {
  useState, useEffect, useContext
} from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';
import SharedToMeInfosTooltip from 'src/apps/mydb/collections/SharedToMeInfosTooltip';
import TreeViewItem from 'src/components/common/TreeViewItem';
import { aviatorNavigationWithCollectionId } from 'src/utilities/routesUtils';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';
import CollectionSubtreeFunctions from 'src/apps/mydb/collections/CollectionSubtreeFunctions';
import { PermissionConst } from 'src/utilities/PermissionConst';

function CollectionSubtree({
  root,
  sharedWithMe,
  isExpanded,
  level,
  hasRadar,
  onAddShare,
  onManageShares,
}) {
  const { collections: collectionsStore } = useContext(StoreContext);
  const uiState = UIStore.getState();
  const { currentCollection } = uiState;
  const children = root.children || [];

  const [selected, setSelected] = useState(false);
  const [visible, setVisible] = useState(false);

  if (visible) {
    collectionsStore.addToggledTreeItem(root.id, root.label);
  }

  const isVisible = (node, selectedCollection) => {
    const descendantIds = collectionsStore.descendantIds(node);
    if (collectionsStore.toggled_tree_items.indexOf(`${node.id}-${node.label}`) > -1) {
      return true;
    }
    if (descendantIds && selectedCollection?.id) {
      return descendantIds.indexOf(parseInt(selectedCollection.id, 10)) > -1;
    }
    return false;
  };

  const onUiStoreChange = ({ currentCollection: nextCollection }) => {
    if (nextCollection) {
      setVisible(isVisible(root, nextCollection));
      setSelected(nextCollection.id === root.id);
    }
  };

  useEffect(() => {
    if (sharedWithMe || isExpanded) {
      onUiStoreChange(uiState);
    }

    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, [currentCollection, sharedWithMe, isExpanded]);

  // A collection shared to the user at the top rung (pass_ownership) is a pending ownership offer.
  const canTakeOwnership = () => sharedWithMe && root.permission_level === PermissionConst.PassOwnership;

  const handleTakeOwnership = () => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Take ownership of "${root.label}" and all its sub collections?`)) return;
    collectionsStore.takeOwnership(root.id);
  };

  const toggleExpansion = (e, node) => {
    e.stopPropagation();

    if (visible) {
      collectionsStore.removeToggledTreeItem(node.id, node.label);
    } else {
      collectionsStore.addToggledTreeItem(node.id, node.label);
    }

    setVisible(!visible);
  };

  const handleClick = (node, e) => {
    const { currentElement } = ElementStore.getState();
    const element = Array.isArray(currentElement) && currentElement.length > 0 ? currentElement[0] : currentElement;

    if (uiState.showCollectionManagement) {
      UIActions.toggleCollectionManagement();
    }

    // A locked node still toggles, since the locked containers are the ones worth folding away,
    // but it must navigate too: "transferred" is locked and has no sub-collections, so toggling
    // alone would leave the elements a gate transfer moved there unreachable. Expand on the way in
    // and never collapse — folding the subtree shut on the node being selected reads as a failed
    // click, and the chevron already has its own handler.
    if (node.is_locked) {
      if (!visible) toggleExpansion(e, node);
    } else {
      setVisible(visible || isVisible(node, uiState.currentCollection));
    }

    // The shared-with-me tree's owner rows are synthetic grouping nodes with no collection behind
    // them (CollectionsStore.setSharedWithMeCollections gives them id 0). Keyed on the id rather
    // than on is_locked, which is only incidentally true of them: navigating one would request
    // /collections/0, 404, and clear the current collection.
    if (!node.id) return;

    aviatorNavigationWithCollectionId(node.id, element?.type, (element?.isNew ? 'new' : element?.id), true, true);
  };

  const handleTakeOwnershipKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTakeOwnership();
    }
  };

  const handleAddShare = onAddShare ? () => onAddShare(root) : null;
  // Own collections: manage only when there is something shared (root.shared).
  // Shared-with-me: a delegate can manage existing shares regardless of root.shared;
  // visibility is gated by permission_level in CollectionSubtreeFunctions, matching
  // the management modal (which offers Add + Manage together).
  const handleManageShares = ((sharedWithMe || root.shared) && onManageShares)
    ? () => onManageShares(root)
    : null;

  return (
    <TreeViewItem
      id={`tree-id-${root.label}`}
      title={root.label}
      selected={selected}
      level={level}
      hasChildren={children.length > 0}
      expanded={visible}
      onClick={(e) => handleClick(root, e)}
      onToggleExpand={(e) => toggleExpansion(e, root)}
      meta={(
        <>
          {root.inventory_prefix && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="collection_inventory_label">{root.inventory_prefix}</Tooltip>}
            >
              <i className="fa fa-tag" />
            </OverlayTrigger>
          )}
          {canTakeOwnership() && (
            <i
              className="fa fa-exchange"
              onClick={() => handleTakeOwnership()}
              onKeyDown={handleTakeOwnershipKeyDown}
              role="button"
              tabIndex={0}
              aria-label="Take ownership"
            />
          )}
          {root.shared && (
            <OverlayTrigger placement="top" overlay={<UserInfosTooltip collectionId={root.id} />}>
              <i className="fa fa-share-alt" />
            </OverlayTrigger>
          )}
          {/* Suppressed on the synthetic owner-grouping row (id 0), which has no share behind it —
              not on is_locked, which a genuinely shared system collection also carries. */}
          {sharedWithMe && root.id !== 0 && (
            <OverlayTrigger
              placement="top"
              overlay={<SharedToMeInfosTooltip collectionId={root.id} owner={root.owner} />}
            >
              <i className="fa fa-share-alt" />
            </OverlayTrigger>
          )}
        </>
      )}
      actions={(
        <CollectionSubtreeFunctions
          collection={root}
          sharedWithMe={sharedWithMe}
          hasRadar={hasRadar}
          onAddShare={handleAddShare}
          onManageShares={handleManageShares}
        />
      )}
    >
      {children.map((child) => (
        <CollectionSubtree
          key={child.id}
          root={child}
          sharedWithMe={sharedWithMe}
          isExpanded={isExpanded}
          level={level + 1}
          hasRadar={hasRadar}
          onAddShare={onAddShare}
          onManageShares={onManageShares}
        />
      ))}
    </TreeViewItem>
  );
}

export default observer(CollectionSubtree);

CollectionSubtree.propTypes = {
  sharedWithMe: PropTypes.bool.isRequired,
  isExpanded: PropTypes.bool.isRequired,
  hasRadar: PropTypes.bool,
  onAddShare: PropTypes.func,
  onManageShares: PropTypes.func,
  root: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    label: PropTypes.string.isRequired,
    children: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
      label: PropTypes.string,
    })),
    is_locked: PropTypes.bool,
    inventory_prefix: PropTypes.string,
    shared: PropTypes.bool,
    owner: PropTypes.string,
    permission_level: PropTypes.number,
  }).isRequired,
  level: PropTypes.number.isRequired,
};

CollectionSubtree.defaultProps = {
  hasRadar: false,
  onAddShare: null,
  onManageShares: null,
};
