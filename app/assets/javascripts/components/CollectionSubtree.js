import React from 'react';
import {Button, OverlayTrigger} from 'react-bootstrap';
import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import CollectionActions from './actions/CollectionActions';
import UserInfos from './UserInfos';
import Aviator from 'aviator';

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
  }

  isVisible(node, uiState) {
    if(node.descendant_ids) {
      return node.descendant_ids.indexOf(parseInt(uiState.currentCollection.id)) > -1;
    } else {
      return false;
    }
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
      let visible = this.isVisible(this.state.root, state);

      if(state.currentCollection.id == this.state.root.id) {
        this.setState({
          selected: true,
          visible: visible
        });
      } else {
        this.setState({
          selected: false,
          visible: visible
        });
      }
    }
  }

  selectedCssClass() {
    return this.state.selected ? "selected" : "";
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
    let label = this.state.visible ? '-' : '+';

    if(this.hasChildren()) {
      return (
        <Button bsStyle="success" bsSize="xsmall" onClick={this.toggleExpansion.bind(this)}>
          {label}
        </Button>
      )
    }
  }

  takeOwnershipButton() {
    let isRemote = this.state.isRemote;
    let isTakeOwnershipAllowed = this.state.root.permission_level == 5;

    if(isRemote && isTakeOwnershipAllowed) {
      return (
        <div className="take-ownership-btn">
          <Button bsStyle="danger" bsSize="xsmall" onClick={(e) => this.handleTakeOwnership(e)}>
            <i className="fa fa-exchange"></i>
          </Button>
        </div>
      )
    }
  }

  handleTakeOwnership() {
    CollectionActions.takeOwnership({id: this.state.root.id});
  }

  handleClick() {
    const { root } = this.state;

    if(root.label == 'All') {
      Aviator.navigate(`/collection/all/${this.urlForCurrentElement()}`);
    } else {
      (this.props.root.sharer) ? Aviator.navigate(`/scollection/${this.state.root.id}/${this.urlForCurrentElement()}`)
        : Aviator.navigate(`/collection/${this.state.root.id}/${this.urlForCurrentElement()}`)
    }
  }

  urlForCurrentElement() {
    const {currentElement} = ElementStore.getState();
    if(currentElement) {
      if(currentElement.isNew) {
        return `${currentElement.type}/new`;
      }
      else{
        return `${currentElement.type}/${currentElement.id}`;
      }
    }
    else {
      return '';
    }
  }

  toggleExpansion(e) {
    e.stopPropagation();
    this.setState({visible: !this.state.visible});
  }

  synchronizedIcon(){
    let sharedUsers = this.state.root.shared_users
    return(
      sharedUsers && sharedUsers.length > 0
        ? <OverlayTrigger placement="bottom" overlay={UserInfos({users:sharedUsers})}>
            <i className="fa fa-share-alt"></i>
          </OverlayTrigger>
        : null
    )
  }


  render() {
    let style;

    if (!this.state.visible) {
      style = {display: "none"};
    }

    return (
      <div className="tree-view" key={this.state.root.id}>
        {this.takeOwnershipButton()}
        <div className={"title " + this.selectedCssClass()} onClick={this.handleClick.bind(this)}>
          {this.expandButton()}
          {this.state.label}
          {this.synchronizedIcon()}
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
  label: React.PropTypes.string,
  selected: React.PropTypes.bool,
  root: React.PropTypes.object,
  visible: React.PropTypes.bool,
  // isSync: React.PropTypes.bool,
};
// CollectionSubtree.defaultProps = {
//   isSync: false,
// }
