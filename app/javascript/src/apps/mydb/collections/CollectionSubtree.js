import React, { useState, useEffect, useContext } from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';
import ChevronIcon from 'src/components/common/ChevronIcon';
import { aviatorNavigationWithCollectionId } from 'src/utilities/routesUtils';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

function CollectionSubtree({ root, sharedWithMe, level }) {
  const collectionsStore = useContext(StoreContext).collections;
  const uiState = UIStore.getState();
  const children = root.children || [];

  const [selected, setSelected] = useState(false);
  const [visible, setVisible] = useState(false);

  const isVisible = (node, currentCollection) => {
    const descendantIds = collectionsStore.descendantIds(node);
    if (descendantIds && currentCollection?.id) {
      return descendantIds.indexOf(parseInt(currentCollection.id)) > -1;
    }
    return false;
  }

  const onUiStoreChange = ({ currentCollection }) => {
    if (currentCollection) {
      setVisible(isVisible(root, currentCollection));
      setSelected(currentCollection.id === root.id);
    }
  }

  useEffect(() => {
    UIStore.listen(onUiStoreChange);
    return () => UIStore.unlisten(onUiStoreChange);
  }, []);

  const handleTakeOwnership = () => {
    // TODO: determine what should happen if take ownership is possible
  }

  const handleClick = (node, e) => {
    const { currentElement } = ElementStore.getState();
    // When currentElement is an array, use the first item (special handling for vessel templates)
    const element = Array.isArray(currentElement) && currentElement.length > 0 ? currentElement[0] : currentElement;

    if (uiState.showCollectionManagement) {
      UIActions.toggleCollectionManagement();
    }
    
    if (node.is_locked) {
      toggleExpansion(e);
    } else {
      setVisible(visible || isVisible(node, uiState.currentCollection));

      aviatorNavigationWithCollectionId(node.id, element?.type, (element?.isNew ? 'new' : element?.id), true, true);
    }
  }

  const canTakeOwnership = () => {
    return false;
    // const isTakeOwnershipAllowed = root.permission_level === 5;
    // return sharedWithMe && isTakeOwnershipAllowed;
  }

  const toggleExpansion = (e) => {
    e.stopPropagation();
    setVisible(!visible);
  }

  return (
    <div key={root.id}>
      <div
        id={`tree-id-${root.label}`}
        className={`tree-view_item ${selected ? 'tree-view_item--selected' : ''}`}
        onClick={(e) => handleClick(root, e)}
        style={{ paddingLeft: `${((level - 0.5) * 12) - 4}px` }}
      >
        {children.length > 0 ? (
          <ChevronIcon
            direction={visible ? 'down' : 'right'}
            onClick={(e) => toggleExpansion(e)}
          />
        )
          : (<i className="fa fa-fw" />)}
        <span className="tree-view_title">{root.label}</span>
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
          />
        )}
        {(root.shared) && (
          <OverlayTrigger placement="top" overlay={<UserInfosTooltip collectionId={root.id} />}>
            <i className="fa fa-share-alt" />
          </OverlayTrigger>
        )}
      </div>
      {visible && (
        <div className="tree-view">
          {children.map((child) => (
            <CollectionSubtree key={child.id} root={child} sharedWithMe={sharedWithMe} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default observer(CollectionSubtree);

CollectionSubtree.propTypes = {
  sharedWithMe: PropTypes.bool,
  root: PropTypes.object,
  level: PropTypes.number
};
