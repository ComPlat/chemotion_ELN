import React from 'react';
import Tree from 'react-ui-tree';
import {Button, ButtonGroup, Input} from 'react-bootstrap';

import ShareSettingsModal from './ShareSettingsModal';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';

export default class MySharedCollections extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      active: null,
      deleted_ids: [],

      tree: {
        label: 'My Shared Collections',
        id: -1,
        children: [{}]
      }
    }
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange.bind(this));
    CollectionActions.fetchSharedCollectionRoots();
  }

  onStoreChange(state) {
    this.setState({
      tree: {
        label: 'My Shared Collections',
        children: state.sharedRoots
      }
    });
  }

  handleChange(tree) {
    this.setState({
      tree: tree
    });
  }

  isActive(node) {
    return node === this.state.active ? "node is-active" : "node";
  }

  hasChildren(node) {
    return node.children && node.children.length > 0
  }

  label(node) {
    if(node.label == "My Shared Collections") {
      return (
        <div className="root-label">
          My Shared Collections
        </div>
      )
    } else {
      return (
        <Input className="collection-label" type="text" id={node.id} value={node.label} onChange={this.handleLabelChange.bind(this, node)}/>
      )
    }
  }

  handleLabelChange(node) {
    node.label = document.getElementById(node.id).value;

    this.setState({
      tree: this.state.tree
    });
  }

  // TODO: confirmation before start the updating process?
  bulkUpdate() {
    // filter empty objects
    let collections = this.state.tree.children.filter((child) => {
      return child.label
    });
    
    let params = {
      collections: this.state.tree.children,
      deleted_ids: this.state.deleted_ids
    }

    CollectionActions.bulkUpdateUnsharedCollections(params);
  }

  actions(node) {
    if(node.label == "My Shared Collections") {
      return (
        <div className="root-actions">
          <Button bsSize="xsmall" bsStyle="warning" onClick={this.bulkUpdate.bind(this)}>Update</Button>
        </div>
      )
    } else {
      return (
        <ButtonGroup className="actions">
          <Button bsSize="xsmall" bsStyle="primary" onClick={this.editShare.bind(this, node)}>
            <i className="fa fa-share"></i>
          </Button>
        </ButtonGroup>
      )
    }
  }

  editShare(node) {
    React.render(<ShareSettingsModal node={node}/>, document.getElementById('modal'));
  }

  renderNode(node) {
    if(!Object.keys(node).length == 0) {
      return (
        <span className={this.isActive(node)} onClick={this.onClickNode.bind(this, node)}>
          {this.label(node)}
          {this.actions(node)}
        </span>
      );
    }
  }

  onClickNode(node) {
    this.setState({
      active: node
    });
  }

  render() {
    return (
      <div className="tree">
        <Tree
          paddingLeft={20}                         // left padding for children nodes in pixels
          tree={this.state.tree}                   // tree object
          isNodeCollapsed={this.isNodeCollapsed}
          onChange={this.handleChange.bind(this)}  // onChange(tree) tree object changed
          renderNode={this.renderNode.bind(this)}  // renderNode(node) return react element
        />
      </div>
    )
  }
}
