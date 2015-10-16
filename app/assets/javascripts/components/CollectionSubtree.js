import React from 'react';
import {Button} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ElementStore from './stores/ElementStore';
import ElementActions from './actions/ElementActions';
import CollectionActions from './actions/CollectionActions';

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
  }

  isVisible(node, uiState) {
    if(node.descendant_ids) {
      return node.descendant_ids.indexOf(parseInt(uiState.currentCollection.id)) > -1;
    } else {
      return false;
    }
  }

  componentDidMount() {
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      root: nextProps.root,
      label: nextProps.root.label
    });
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange.bind(this));
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

  collectionManagementButton() {
    if(this.state.root.id == 'all') {
      return  (
        <div className="take-ownership-btn">
          <Button bsStyle="danger" bsSize="xsmall" onClick={this.navigateToCollectionManagement.bind(this)}>
            <i className="fa fa-cog"></i>
          </Button>
        </div>
      )
    }
  }

  navigateToCollectionManagement() {
    Aviator.navigate('/collection/management');
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
    let isTakeOwnershipAllowed = this.state.root.permission_level == 4;

    if(isRemote && isTakeOwnershipAllowed) {
      return (
        <div className="take-ownership-btn">
          <Button bsStyle="danger" bsSize="xsmall" onClick={(e) => this.handleTakeOwnership()}>
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
    Aviator.navigate('/collection/'+this.state.root.id);
  }

  toggleExpansion(e) {
    e.stopPropagation();
    this.setState({visible: !this.state.visible});
  }

  render() {
    let style;

    if (!this.state.visible) {
      style = {display: "none"};
    }

    return (
      <div className="tree-view" key={this.state.root.id}>
        {this.collectionManagementButton()}
        {this.takeOwnershipButton()}
        <div className={"title " + this.selectedCssClass()} onClick={this.handleClick.bind(this)}>
          {this.expandButton()}
          {this.state.label}
        </div>
        <ul style={style}>
          {this.subtrees()}
        </ul>
      </div>
    )
  }
}
