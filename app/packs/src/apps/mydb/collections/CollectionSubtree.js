import React from 'react';
import PropTypes from 'prop-types';
import { Glyphicon, OverlayTrigger } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UserInfos from 'src/apps/mydb/collections/UserInfos';
import GatePushBtn from 'src/components/common/GatePushBtn';
import { collectionShow, AviatorNavigation } from 'src/utilities/routesUtils';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

export default class CollectionSubtree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      label: props.root.label,
      selected: false,
      root: props.root,
      visible: false,
      currentUser: (UserStore.getState() && UserStore.getState().currentUser) || {}
    }

    this.onChange = this.onChange.bind(this)
    this.toggleExpansion = this.toggleExpansion.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }


  componentDidMount() {
    UIStore.listen(this.onChange);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    this.setState({
      root: nextProps.root,
      label: nextProps.root.label
    });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange);
  }

  onChange(state) {
    if (state.currentCollection) {
      const visible = this.isVisible(this.state.root, state)
      const { root } = this.state;

      const selectedCol = state.currentCollection.id == root.id

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
    if (node.children) {
      const currentCollectionId = parseInt(uiState.currentCollection.id);
      if (node.children.find((descendant) => (currentCollectionId === descendant.id))) {
        return true;
      }
    }

    let { visibleRootsIds } = CollectionStore.getState();
    return (visibleRootsIds.indexOf(node.uid) > -1)
  }

  selectedCssClass() {
    return (this.state.selected) ? "selected" : "";
  }

  children() {
    return this.state.root.children || [];
  }

  hasChildren() {
    return this.children().length > 0;
  }

  subtrees() {
    const children = this.children();

    if (this.hasChildren()) {
      return children.map((child, index) => {
        return (
          <li key={index}>
            <CollectionSubtree root={child} />
          </li>
        );
      });
    }
    return null;
  }

  expandButton() {
    let { visibleRootsIds } = CollectionStore.getState();


    let icon = this.state.visible ? 'minus' : 'plus';
    if (this.hasChildren()) {
      return (
        <Glyphicon
          glyph={icon}
          style={{ float: 'right', marginLeft: '5px' }}
          onClick={this.toggleExpansion}
        />
      );
    }
    return (<div />);
  }

  takeOwnershipButton() {
    const root = this.state.root;
    const acls = root.acl;
    if (acls === undefined) return;

    if (root.canTakeOwnership()) {
      return (
        <div className="take-ownership-btn">
          <i className="fa fa-exchange" onClick={() => this.handleTakeOwnership(root)} />
        </div>
      )
    }
    return (<div />);
  }

  handleTakeOwnership(collection) {
    CollectionActions.takeOwnership({ id: collection.id });
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
    // visible = this.isVisible(root, uiState) || visible;
    //   if (this.isVisible(root, uiState) == true){
    // }
    this.setState({ visible });
    let collectionID = 'all';
    // TODO clean collection_id
    let collectionId = root.collection_id ? root.collection_id : root.id;
    if (collectionId === undefined) return;

    AviatorNavigation({ collection: root, silent: true });
    collectionID = this.state.root.collection_id || this.state.root.id;
    collectionShow({ params: { collectionID } });
  }

  toggleExpansion(e) {
    e.stopPropagation()
    let { visible, root } = this.state
    visible = !visible
    this.setState({ visible: visible })

    let { visibleRootsIds } = CollectionStore.getState()

    visibleRootsIds = root.children.map((descendant) => descendant.id)

    // Remove duplicate
    let newIds = Array.from(new Set(visibleRootsIds))
    // let newIds = Array.from(visibleRootsIds)
    CollectionActions.updateCollectionTree(visibleRootsIds)
  }

  sharedByIcon() {
    let collectionAcls = this.state.root.collection_acls;
    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (collectionAcls === undefined) return;

    let sharedUsers = [];
    if (currentUser.id === this.state.root.user_id) {
      collectionAcls.forEach(c => sharedUsers.push(c.user))
    } else {
      sharedUsers.push(this.state.root.user);
    }

    return (
      sharedUsers && sharedUsers.length > 0
        ? <OverlayTrigger placement="bottom" overlay={UserInfos({ users: sharedUsers})}>
            <i className="fa fa-share-alt" style={{ float: "right" }}></i>
          </OverlayTrigger>
        : null
    )
  }


  render() {
    const { fakeRoot } = this.props;
    const { label, root } = this.state;
    let { visible } = this.state;

    let style;
    if (!visible) {
      style = {
        display: 'none',
        marginBottom: 0
      };
    }
    const gated = root && root.is_locked && label == 'chemotion-repository.net' ?
      <GatePushBtn collection_id={root.id} /> : null;
    return (
      <div className="tree-view" key={root.id}>
        {this.takeOwnershipButton()}

        <div id={`tree-id-${root.label}`} className={"title " + this.selectedCssClass()}
          onClick={this.handleClick}>
          {this.expandButton()}
          {this.sharedByIcon()}
          {gated}
          {label}
        </div>
        <ul style={style}>
          {this.subtrees()}
        </ul>
      </div>
    )
  }
}

CollectionSubtree.propTypes = {
  root: PropTypes.object
};
