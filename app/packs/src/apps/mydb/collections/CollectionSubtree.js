import React from 'react';
import PropTypes from 'prop-types';
import { Glyphicon, OverlayTrigger } from 'react-bootstrap';
import UIStore from 'src/stores/alt/stores/UIStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UserInfos from 'src/apps/mydb/collections/UserInfos';
import GatePushBtn from 'src/components/common/GatePushBtn';
import { collectionShow, AviatorNavigation } from 'src/utilities/routesUtils';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';

export default class CollectionSubtree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isRemote: props.isRemote,
      label: props.root.label,
      selected: false,
      root: props.root,
      visible: false
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
            <CollectionSubtree root={child} isRemote={this.state.isRemote} />
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
    const { root } = this.state;
    const isTakeOwnershipAllowed = root.permission_level === 5;
    if (isTakeOwnershipAllowed) {
      return (
        <div className="take-ownership-btn">
          <i className="fa fa-exchange" onClick={e => this.handleTakeOwnership(e)} />
        </div>
      )
    }
    return (<div />);
  }

  handleTakeOwnership() {
    CollectionActions.takeOwnership({ id: this.state.root.id });
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

    visibleRootsIds = root.descendant_ids
      ? root.descendant_ids
      : [root.uid]

    // Remove duplicate
    let newIds = Array.from(new Set(visibleRootsIds))
    // let newIds = Array.from(visibleRootsIds)
    CollectionActions.updateCollectrionTree(visibleRootsIds)
  }

  synchronizedIcon() {
    let collectionAcls = this.state.root.collection_acls;
    if (collectionAcls === undefined) return;
    let sharedUsers = [];
    collectionAcls.forEach(c => sharedUsers.push(c.user))
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
          {this.synchronizedIcon()}
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
  isRemote: PropTypes.bool,
  root: PropTypes.object
};
