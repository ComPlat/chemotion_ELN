import React from 'react';
import Tree from 'react-ui-tree';
import {Button, ButtonGroup, FormControl} from 'react-bootstrap';

import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';

// create aktualisiert zunächst den tree state; nach Klick auf Update Button werden
// alle Änderungen persistiert
export default class MyCollections extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      active: null,
      deleted_ids: [],

      tree: {
        label: 'My Collections',
        id: -1,
        children: [{}]
      }
    }
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange.bind(this));
    CollectionActions.fetchUnsharedCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange.bind(this))
  }

  onStoreChange(state) {
    let children = state.unsharedRoots.length > 0 ? state.unsharedRoots : [{}];

    this.setState({
      tree: {
        label: 'My Collections',
        children: children
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
    if(node.label == "My Collections") {
      return (
        <div className="root-label">
          My Collections
        </div>
      )
    } else {
      return (
        <FormControl className="collection-label" type="text"
          id={'i_' + node.id}
          value={node.label}
          onChange={this.handleLabelChange.bind(this, node)}
        />
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
      collections: collections,
      deleted_ids: this.state.deleted_ids
    }

    CollectionActions.bulkUpdateUnsharedCollections(params);
  }

  actions(node) {
    if(node.label == "My Collections") {
      return (
        <div className="root-actions">
          <Button bsSize="xsmall" bsStyle="warning" onClick={this.bulkUpdate.bind(this)}>Update</Button>
          {this.addButton(node)}
        </div>
      )
    } else {
      return (
        <ButtonGroup className="actions">
          {this.addButton(node)}
          <Button bsSize="xsmall" bsStyle="danger" onClick={this.deleteCollection.bind(this, node)}>
            <i className="fa fa-trash-o"></i>
          </Button>
        </ButtonGroup>
      )
    }
  }

  addButton(node) {
    return (
      <Button bsSize="xsmall" bsStyle="success" onClick={this.addSubcollection.bind(this, node)}>
        <i className="fa fa-plus"></i>
      </Button>
    )
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

  addSubcollection(node) {
    if(node.children) {
      node.children.push({
        id: Math.random(),
        label: 'New Collection',
        isNew: true
      });
    } else {
      node.children = [{
        id: Math.random(),
        label: 'New Collection',
        isNew: true
      }];
    }
  }

  deleteCollection(node) {
    let children = node.children || [];
    let parent = this.findParentById(this.state.tree, node.id);

    this.removeNodeById(parent, node.id)
    this.appendChildrenToParent(parent, children)

    if(!node.isNew) {
      let deleted_ids = this.state.deleted_ids.concat([node.id])

      this.setState({
        deleted_ids: deleted_ids
      })
    }
  }

  appendChildrenToParent(parent, children) {
    if(children.length > 0) {
      children.forEach((child) => {
        parent.children.push(child);
      });
    } else if (parent.label == 'My Collections') {
      parent.children.push({});
    }
  }

  findParentById(root, id) {
    if(!root.children) {
      root.children = [];
      return null;
    }

    let children = root.children;

    for(let i = 0; i < children.length; i++) {
      if(children[i].id == id) {
        return root;
        break;
      } else {
        let parent = this.findParentById(children[i], id);
        if(parent) {
          return parent
        }
      }
    }
  }

  removeNodeById(parent, id) {
    parent.children = parent.children.filter((child) => {
      return child.id != id
    });
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
