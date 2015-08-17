import React from 'react';
import {Button} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ElementStore from './stores/ElementStore';
import ElementActions from './actions/ElementActions';

import Aviator from 'aviator';

export default class CollectionSubtree extends React.Component {
  constructor(props) {
    super(props);
    let uiStoreState = UIStore.getState();
    let selected = uiStoreState.currentCollectionId == props.root.id;
    let childIds = props.root.children.map(c => c.id);
    let visible = childIds.indexOf(parseInt(uiStoreState.currentCollectionId)) > -1

    this.state = {
      label: props.root.label,
      selected: selected,
      root: props.root,
      visible: visible
    }
  }

  componentDidMount() {
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    if(state.currentCollectionId == this.state.root.id) {
      this.setState({selected: true});
    } else {
      this.setState({selected: false});
    }
  }

  selectedCssClass() {
    return this.state.selected ? "selected" : "";
  }

  children() {
    return this.state.root.children;
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
            <CollectionSubtree root={child} />
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
