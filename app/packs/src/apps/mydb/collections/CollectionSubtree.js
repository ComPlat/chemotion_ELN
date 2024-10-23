import React from 'react';
import PropTypes from 'prop-types';
import Aviator from 'aviator';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UserInfos from 'src/apps/mydb/collections/UserInfos';
import GatePushButton from 'src/components/common/GatePushButton';
import { collectionShow, scollectionShow } from 'src/utilities/routesUtils';

export default class CollectionSubtree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isRemote: props.isRemote,
      label: props.root.label,
      inventoryPrefix: props.root.inventory_prefix,
      selected: false,
      root: props.root,
      visible: false
    }

    this.onChange = this.onChange.bind(this)
    this.toggleExpansion = this.toggleExpansion.bind(this)
    this.handleClick = this.handleClick.bind(this)
    this.handleTakeOwnership = this.handleTakeOwnership.bind(this)
  }


  componentDidMount() {
    UIStore.listen(this.onChange);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      root: nextProps.root,
      label: nextProps.root.label,
      inventoryPrefix: nextProps.root.inventory_prefix
    });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange);
  }

  onChange(state) {
    if (state.currentCollection) {
      const visible = this.isVisible(this.state.root, state)
      const { root } = this.state;

      const selectedCol = (
        state.currentCollection.id == root.id &&
        state.currentCollection.is_synchronized == root.is_synchronized
      ) || (
          state.currentCollection.id == root.id &&
          state.currentCollection.isRemote == root.isRemote
        )

      if (selectedCol) {
        this.setState({
          selected: true,
          visible
        });
      } else {
        this.setState({
          selected: false,
          visible
        });
      }
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

  children() {
    return this.state.root.children || [];
  }

  hasChildren() {
    return this.children().length > 0;
  }

  canTakeOwnership() {
    const { root, isRemote } = this.state;
    const isTakeOwnershipAllowed = root.permission_level === 5;
    const isSync = !!((root.sharer && root.user && root.user.type !== 'Group'));
    return (isRemote || isSync) && isTakeOwnershipAllowed;
  }

  handleTakeOwnership() {
    const { root: { sharer, id } } = this.state;
    const isSync = !!sharer;
    CollectionActions.takeOwnership({ id, isSync });
  }

  handleClick(e) {
    const { fakeRoot } = this.props;
    if (fakeRoot) {
      e.stopPropagation();
      return;
    }

    const { root } = this.state;
    let { visible } = this.state;
    const uiState = UIStore.getState();

    visible = visible || this.isVisible(root, uiState);
    this.setState({ visible });
    let collectionID = 'all';
    if (root.label === 'All' && root.is_locked) {
      Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`, { silent: true });
      collectionShow({ params: { collectionID } });
      return;
    }
    const url = (this.props.root.sharer)
      ? `/scollection/${root.id}/${this.urlForCurrentElement()}`
      : `/collection/${root.id}/${this.urlForCurrentElement()}`;
    Aviator.navigate(url, { silent: true });
    collectionID = this.state.root.id;
    const collShow = this.props.root.sharer ? scollectionShow : collectionShow;
    collShow({ params: { collectionID } });
  }

  urlForCurrentElement() {
    const { currentElement } = ElementStore.getState();
    if (currentElement) {
      if (currentElement.isNew) {
        return `${currentElement.type}/new`;
      }
      return `${currentElement.type}/${currentElement.id}`;
    }
    return '';
  }

  toggleExpansion(e) {
    e.stopPropagation()
    let { visible, root } = this.state
    visible = !visible
    this.setState({ visible: visible })

    let { visibleRootsIds } = CollectionStore.getState()
    if (visible) {
      visibleRootsIds.push(root.id)
    } else {
      let descendantIds = root.descendant_ids
        ? root.descendant_ids
        : root.children.map(function (s) { return s.id })
      descendantIds.push(root.id)
      visibleRootsIds = visibleRootsIds.filter(x => descendantIds.indexOf(x) == -1)
    }

    // Remove duplicate
    let newIds = Array.from(new Set(visibleRootsIds))
    CollectionActions.updateCollectrionTree(newIds)
  }

  render() {
    const { label, root, inventoryPrefix, visible, selected } = this.state;
    const sharedUsers = root.sync_collections_users;
    const children = this.children();

    const showGatePushButton = root && root.is_locked && label === 'chemotion-repository.net';

    return (
      <div className="tree-view" key={root.id}>
        <div
          id={`tree-id-${root.label}`}
          className={`title ${selected ? 'selected' : ''} d-flex align-items-baseline gap-1`}
          onClick={this.handleClick}
        >
          {showGatePushButton && (<GatePushButton collectionId={root.id} />)}
          <span className="me-auto">{label}</span>
          {inventoryPrefix && (
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip id="collection_inventory_label">Inventory Label</Tooltip>}
            >
              <Badge bg="secondary">{inventoryPrefix}</Badge>
            </OverlayTrigger>
          )}
          {this.canTakeOwnership() && (
            <i
              className="fa fa-exchange"
              onClick={this.handleTakeOwnership}
            />
          )}
          {(sharedUsers && sharedUsers.length > 0) && (
            <OverlayTrigger placement="bottom" overlay={UserInfos({ users: sharedUsers })}>
              <i className="fa fa-share-alt" />
            </OverlayTrigger>
          )}
          {this.hasChildren() && (
            <i
              className={`fa fa-${visible ? 'minus' : 'plus'}`}
              onClick={this.toggleExpansion}
            />
          )}
        </div>
        {visible && (
          <ul>
            {children.map((child) => (
              <li key={`collection-${child.id}`}>
                <CollectionSubtree root={child} isRemote={this.state.isRemote} />
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }
}

CollectionSubtree.propTypes = {
  isRemote: PropTypes.bool,
  root: PropTypes.object
};
