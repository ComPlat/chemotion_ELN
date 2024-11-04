import React from 'react';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UserInfosTooltip from 'src/apps/mydb/collections/UserInfosTooltip';
import GatePushButton from 'src/components/common/GatePushButton';
import ChevronIcon from 'src/components/common/ChevronIcon';
import { collectionShow, scollectionShow } from 'src/utilities/routesUtils';

export default class CollectionSubtree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      selected: false,
      visible: false
    }

    this.onChange = this.onChange.bind(this)
    this.toggleExpansion = this.toggleExpansion.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleTakeOwnership = this.handleTakeOwnership.bind(this)
  }

  componentDidMount() {
    this.onChange(UIStore.getState());
    UIStore.listen(this.onChange);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange);
  }

  onChange(state) {
    const { root } = this.props;

    if (state.currentCollection) {
      const visible = this.isVisible(root, state)
      const selectedCol = (
        state.currentCollection.id == root.id
        && (
          state.currentCollection.is_synchronized == root.is_synchronized
          || state.currentCollection.isRemote == root.isRemote
        )
      );

      this.setState({
        selected: selectedCol,
        visible
      });
    }
  }

  isVisible(node, uiState) {
    if (node.descendant_ids) {
      let currentCollectionId = parseInt(uiState.currentCollection.id)
      if (node.descendant_ids.indexOf(currentCollectionId) > -1) return true
    }

    let { visibleRootsIds } = CollectionStore.getState();
    return (visibleRootsIds.indexOf(node.id) > -1)
  }

  canTakeOwnership() {
    const { root, isRemote } = this.props;
    const isTakeOwnershipAllowed = root.permission_level === 5;
    const isSync = !!((root.sharer && root.user && root.user.type !== 'Group'));
    return (isRemote || isSync) && isTakeOwnershipAllowed;
  }

  handleTakeOwnership() {
    const { root: { sharer, id } } = this.props;
    const isSync = !!sharer;
    CollectionActions.takeOwnership({ id, isSync });
  }

  handleClick(e) {
    const { root } = this.props;
    const { visible } = this.state;
    const uiState = UIStore.getState();
    this.setState({ visible: visible || this.isVisible(root, uiState) });

    if (root.label === 'All' && root.is_locked) {
      Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`, { silent: true });
      collectionShow({ params: { collectionID: 'all' } });
      return;
    }

    const url = (root.sharer)
      ? `/scollection/${root.id}/${this.urlForCurrentElement()}`
      : `/collection/${root.id}/${this.urlForCurrentElement()}`;
    Aviator.navigate(url, { silent: true });

    const collShow = root.sharer ? scollectionShow : collectionShow;
    collShow({ params: { collectionID: root.id } });
  }

  urlForCurrentElement() {
    const { currentElement } = ElementStore.getState();
    if (currentElement) {
      return currentElement.isNew
        ? `${currentElement.type}/new`
        : `${currentElement.type}/${currentElement.id}`;
    }
    return '';
  }

  toggleExpansion(e) {
    e.stopPropagation()
    const { root } = this.props;
    let { visible } = this.state
    visible = !visible
    this.setState({ visible: visible })

    let { visibleRootsIds } = CollectionStore.getState()
    if (visible) {
      visibleRootsIds.push(root.id)
    } else {
      let descendantIds = root.descendant_ids
        ? root.descendant_ids
        : root.children.map((s) => s.id);
      descendantIds.push(root.id)
      visibleRootsIds = visibleRootsIds.filter(x => descendantIds.indexOf(x) == -1)
    }

    // Remove duplicate
    let newIds = Array.from(new Set(visibleRootsIds))
    CollectionActions.updateCollectrionTree(newIds)
  }

  render() {
    const { root, isRemote } = this.props;
    const { visible, selected } = this.state;
    const sharedUsers = root.sync_collections_users;
    const children = root.children || [];

    const showGatePushButton = root && root.is_locked && root.label === 'chemotion-repository.net';

    return (
      <div key={root.id}>
        <div
          id={`tree-id-${root.label}`}
          className={`tree-view_item ${selected ? 'tree-view_item--selected' : ''}`}
          onClick={this.handleClick}
        >
          {showGatePushButton && (<GatePushButton collectionId={root.id} />)}
          <span className="tree-view_title">{root.label}</span>
          {root.inventory_prefix && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="collection_inventory_label">Inventory Label</Tooltip>}
            >
              <Badge>{root.inventory_prefix}</Badge>
            </OverlayTrigger>
          )}
          {this.canTakeOwnership() && (
            <i
              className="fa fa-exchange"
              onClick={this.handleTakeOwnership}
            />
          )}
          {(sharedUsers && sharedUsers.length > 0) && (
            <OverlayTrigger placement="top" overlay={<UserInfosTooltip users={sharedUsers} />}>
              <i className="fa fa-share-alt" />
            </OverlayTrigger>
          )}
          {children.length > 0 && (
            <ChevronIcon
              direction={visible ? 'down' : 'right'}
              onClick={this.toggleExpansion}
            />
          )}
        </div>
        {visible && (
          <div className="tree-view">
            {children.map((child) => (
              <CollectionSubtree key={child.id} root={child} isRemote={isRemote} />
            ))}
          </div>
        )}
      </div>
    );
  }
}

CollectionSubtree.propTypes = {
  isRemote: PropTypes.bool,
  root: PropTypes.object
};
