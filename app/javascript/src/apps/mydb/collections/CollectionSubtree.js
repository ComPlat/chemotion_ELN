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
  const sharedUsers = root.shares;
  const children = root.children || [];

  const [selected, setSelected] = useState(false);
  const [visible, setVisible] = useState(false);

  const isVisible = (node, currentCollection) => {
    const descendantIds = collectionsStore.descendantIds(node);
    if (descendantIds) {
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
    // TODO: add takeOwnership endpoint
    // CollectionActions.takeOwnership({ root.id });
  }

  const handleClick = () => {
    const { currentElement } = ElementStore.getState();
    // When currentElement is an array, use the first item (special handling for vessel templates)
    const element = Array.isArray(currentElement) && currentElement.length > 0 ? currentElement[0] : currentElement;

    if (uiState.showCollectionManagement) {
      UIActions.toggleCollectionManagement();
    }
    setVisible(visible || isVisible(root, uiState.currentCollection));

    aviatorNavigationWithCollectionId(root.id, element?.type, (element?.isNew ? 'new' : element?.id), true, true);
  }

  const canTakeOwnership = () => {
    const isTakeOwnershipAllowed = root.permission_level === 5;
    return sharedWithMe && isTakeOwnershipAllowed;
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
        onClick={() => handleClick()}
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
        {(sharedUsers && sharedUsers.length > 0) && (
          <OverlayTrigger placement="top" overlay={<UserInfosTooltip users={sharedUsers} />}>
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
