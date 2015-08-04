import React from 'react';
import {Button} from 'react-bootstrap';

import UIStore from './stores/UIStore';
import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';

class CollectionSubtree extends React.Component {
  constructor(props) {
    super();
    this.state = {
      label: props.root.label,
      selected: false,
      root: props.root,
      visible: false
    }
  }

  componentDidMount() {
    UIStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    UIStore.unlisten(this.onChange.bind(this));
  }

  componentWillUpdate(nextProps, nextState) {
    if(nextState.selected) {
      // TODO updateElements for reactions and so on
      ElementActions.updateElements({samples: this.state.root.samples, type: 'sample'});
    }
  }

  onChange(state) {
    if(state.selectedCollectionIds[0] == this.state.root.id) {
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
    var children = this.children();

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
    var label = this.state.visible ? '-' : '+';

    if(this.hasChildren()) {
      return (
        <Button bsStyle="success" bsSize="xsmall" onClick={this.toggleExpansion.bind(this)}>
          {label}
        </Button>
      )
    }
  }

  handleClick() {
    UIActions.deselectAllElements('collection');
    UIActions.selectElement({type: 'collection', id: this.state.root.id});
  }

  toggleExpansion(e) {
    e.stopPropagation();
    this.setState({visible: !this.state.visible});
  }

  render() {
    var style;

    if (!this.state.visible) {
      style = {display: "none"};
    }

    return (
      <div className="tree-view">
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

module.exports = CollectionSubtree;
