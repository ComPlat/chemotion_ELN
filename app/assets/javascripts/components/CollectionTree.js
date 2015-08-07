import React from 'react';
import {Button} from 'react-bootstrap';

import CollectionStore from './stores/CollectionStore';
import CollectionActions from './actions/CollectionActions';

import CollectionSubtree from './CollectionSubtree';

export default class CollectionTree extends React.Component {
  constructor(props) {
    super(props);
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
    let roots = this.state.collections;

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
