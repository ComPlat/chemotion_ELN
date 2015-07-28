import React from 'react';
import {Button} from 'react-bootstrap';

import CollectionStore from './stores/CollectionStore';
import CollectionActions from './actions/CollectionActions';

import CollectionSubtree from './CollectionSubtree';

class CollectionTree extends React.Component {
  constructor() {
    super();
    this.state = CollectionStore.getState();
  }

  componentDidMount() {
    CollectionStore.listen(this.onChange.bind(this));
    CollectionActions.fetchCollections();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState(state);
  }

  subtrees() {
    var roots = this.state.collections;

    if(roots.length > 0) {
      return roots.map((root, index) => {
        return <CollectionSubtree key={index} root={root} />
      });
    } else {
      return <div></div>;
    }
  }

  render() {
    return (
      <div className="tree-wrapper">
        {this.subtrees()}
      </div>
    )
  }
}

module.exports = CollectionTree;
