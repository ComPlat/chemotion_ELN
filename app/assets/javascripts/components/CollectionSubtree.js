import React from 'react';
import Aviator from 'aviator';
import {Glyphicon, Label, Button, OverlayTrigger} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import CollectionStore from './stores/CollectionStore';
import CollectionActions from './actions/CollectionActions';
import UserInfos from './UserInfos';
import GatePushBtn from './common/GatePushBtn'



export default class CollectionSubtree extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      isRemote: props.isRemote,
      isSynchronized: false,
      label: props.root.label,
      selected: false,
      root: props.root,
      visible: false
    }

    this.onChange = this.onChange.bind(this)
    this.toggleExpansion = this.toggleExpansion.bind(this)
    this.handleClick = this.handleClick.bind(this)
  }

  isVisible(node, uiState) {
    if(node.descendant_ids) {
      let currentCollectionId = parseInt(uiState.currentCollection.id)
      if (node.descendant_ids.indexOf(currentCollectionId) > -1) return true
    }

    let {visibleRootsIds} = CollectionStore.getState()
    return (visibleRootsIds.indexOf(node.id) > -1)
  }

  componentDidMount() {
    UIStore.listen(this.onChange);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      root: nextProps.root,
      label: nextProps.root.label
    });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange);
  }

  onChange(state) {
    if(state.currentCollection) {
      let visible = this.isVisible(this.state.root, state)
      const {root} = this.state

      let selectedCol = (
        state.currentCollection.id == root.id &&
        state.currentCollection.is_synchronized == root.is_synchronized
      ) || (
        state.currentCollection.id == root.id &&
        state.currentCollection.isRemote == root.isRemote
      )

      if(selectedCol) {
        this.setState({
          selected: true,
          visible: visible,
          isSynchronized: root.is_synchronized
        })
      } else {
        this.setState({
          selected: false,
          visible: visible,
          isSynchronized: root.is_synchronized
        })
      }
    }
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
    let children = this.children();

    if(this.hasChildren()) {
      return children.map((child, index) => {
        return (
          <li key={index}>
            <CollectionSubtree root={child} isRemote={this.state.isRemote} />
          </li>
        )
      })
    } else {
      return null;
    }
  }


  expandButton() {
    let icon = this.state.visible ? 'minus' : 'plus';

    if (this.hasChildren()) {
      return (
        <Glyphicon glyph={icon} style={{float: "right", marginLeft: "5px"}}
          onClick={this.toggleExpansion}/>
      )
    }
  }

  takeOwnershipButton() {
    let root = this.state.root
    let isRemote = this.state.isRemote;
    let isTakeOwnershipAllowed = this.state.root.permission_level == 5;
    let isSync = (root.sharer && root.user && root.user.type != 'Group') ? true : false
    if ((isRemote || isSync) && isTakeOwnershipAllowed) {
      return (
        <div className="take-ownership-btn">
          <i className="fa fa-exchange"
             onClick={(e) => this.handleTakeOwnership(e)} />
        </div>
      )
    }
  }

  handleTakeOwnership() {
    let isSync = this.state.root.sharer ? true : false
    CollectionActions.takeOwnership({id: this.state.root.id, isSync: isSync});
  }

  handleClick(e) {
    const {fakeRoot} = this.props
    if (fakeRoot) {
      e.stopPropagation()
      return
    }

    const { root } = this.state
    let {visible} = this.state
    const uiState = UIStore.getState()

    visible = visible || this.isVisible(root, uiState)
    this.setState({visible: visible, isClicked: true})

    if(root.label == 'All') {
      Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`);
    } else {
      let url = (this.props.root.sharer)
        ? `/scollection/${this.state.root.id}/${this.urlForCurrentElement()}`
        : `/collection/${this.state.root.id}/${this.urlForCurrentElement()}`

      Aviator.navigate(url)
    }
  }

  urlForCurrentElement() {
    const {currentElement} = ElementStore.getState();
    if (currentElement) {
      if (currentElement.isNew) {
        return `${currentElement.type}/new`;
      }
      else {
        return `${currentElement.type}/${currentElement.id}`;
      }
    }
    else {
      return '';
    }
  }

  toggleExpansion(e) {
    e.stopPropagation()
    let {visible, root} = this.state
    visible = !visible
    this.setState({visible: visible})

    let {visibleRootsIds} = CollectionStore.getState()
    if (visible) {
      visibleRootsIds.push(root.id)
    } else {
      let descendantIds = root.descendant_ids
                          ? root.descendant_ids
                          : root.children.map(function(s) {return s.id})
      descendantIds.push(root.id)
      visibleRootsIds = visibleRootsIds.filter(x => descendantIds.indexOf(x) == -1)
    }

    // Remove duplicate
    let newIds = Array.from(new Set(visibleRootsIds))
    CollectionActions.updateCollectrionTree(newIds)
  }

  synchronizedIcon(){
    let sharedUsers = this.state.root.shared_users
    return(
      sharedUsers && sharedUsers.length > 0
        ? <OverlayTrigger placement="bottom" overlay={UserInfos({users:sharedUsers})}>
            <i className="fa fa-share-alt" style={{float: "right"}}></i>
          </OverlayTrigger>
        : null
    )
  }


  render() {
    const {fakeRoot} = this.props
    const {label, root} = this.state
    let {visible} = this.state

    let style
    if (!visible) {
      style = {
        display: "none",
        marginBottom: 0
      };
    }
    const gated = root && root.is_locked && label=='chemotion.net' ?
      <GatePushBtn collection_id={root.id}/> : null;
    return (
      <div className="tree-view" key={root.id}>
        {this.takeOwnershipButton()}

        <div className={"title " + this.selectedCssClass()}
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
  isRemote: React.PropTypes.bool,
  root: React.PropTypes.object
}
