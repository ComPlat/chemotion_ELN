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

    if (node.is_locked) {
      toggleExpansion(e, node);
    } else {
      setVisible(visible || isVisible(node, uiState.currentCollection));
      aviatorNavigationWithCollectionId(node.id, element?.type, (element?.isNew ? 'new' : element?.id), true, true);
    }
  };

  const handleTakeOwnershipKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleTakeOwnership();
    }
  };

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
          {sharedWithMe && !root.is_locked && (
            <OverlayTrigger
              placement="top"
              overlay={<SharedToMeInfosTooltip collectionId={root.id} owner={root.owner} />}
            >
              <i className="fa fa-info-circle" />
            </OverlayTrigger>
          )}
        </>
      )}
      actions={<CollectionSubtreeFunctions collection={root} />}
    >
      {children.map((child) => (
        <CollectionSubtree
          key={child.id}
          root={child}
          sharedWithMe={sharedWithMe}
          isExpanded={isExpanded}
          level={level + 1}
        />
      ))}
    </TreeViewItem>
  );
}

export default observer(CollectionSubtree);

CollectionSubtree.propTypes = {
  sharedWithMe: PropTypes.bool.isRequired,
  isExpanded: PropTypes.bool.isRequired,
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
