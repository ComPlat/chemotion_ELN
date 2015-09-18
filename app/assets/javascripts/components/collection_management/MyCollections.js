import React from 'react';
import Tree from 'react-ui-tree';
import {Button, ButtonGroup, Input} from 'react-bootstrap';

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

  onStoreChange(state) {
    this.setState({
      tree: {
        label: 'My Collections',
        children: state.unsharedRoots
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

    let paramObj = {
      collections: collections,
      deleted_ids: this.state.deleted_ids
    }

    CollectionActions.bulkUpdateUnsharedCollections(paramObj);
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
          {
            // Add subcollection
            // Edit name
            // Delete
          }
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
    // TODO Name nicht eindeutig! Probleme beim Löschen
    let parent = this.findParentByName(this.state.tree, node.label);

    this.removeNodeByName(parent, node.label)
    this.appendChildrenToParent(parent, children)

    if(!node.isNew) {
      let deleted_ids = this.state.deleted_ids.concat([node.id])

      this.setState({
        deleted_ids: deleted_ids
      })
    }
  }

  appendChildrenToParent(parent, children) {
    children.forEach((child) => {
      parent.children.push(child)
    });
  }

  findParentByName(root, name) {
    if(!root.children) {
      return null
      root.children = [];
    }

    let children = root.children;

    for(let i = 0; i < children.length; i++) {
      if(children[i].label == name) {
        return root;
        break;
      } else {
        let parent = this.findParentByName(children[i], name);
        if(parent) {
          return parent
        }
      }
    }
  }

  removeNodeByName(parent, name) {
    parent.children = parent.children.filter((child) => {
      return child.label != name
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
