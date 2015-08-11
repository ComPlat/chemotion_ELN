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
    CollectionActions.fetchUnsharedCollectionRoots();
    CollectionActions.fetchSharedCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState(state);
  }

  unsharedSubtrees() {
    let roots = this.state.unsharedRoots;

    return this.subtrees(roots);
  }

  sharedSubtrees() {
    let roots = this.state.sharedRoots;

    return this.subtrees(roots);
  }

  subtrees(roots) {
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
      <div>
        <div className="tree-wrapper">
          {this.unsharedSubtrees()}
        </div>
        Shared
        <div className="tree-wrapper">
          {this.sharedSubtrees()}
        </div>
      </div>
    )
  }
}
