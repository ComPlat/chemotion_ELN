import React from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, Form } from 'react-bootstrap';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';

export default class MySharedCollections extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      active: { id: null },
      deleted_ids: [],

      tree: {
        children: []
      },
      showSharingModal: false,
    }

    this.onStoreChange = this.onStoreChange.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.bulkUpdate = this.bulkUpdate.bind(this);
    this.renderNode = this.renderNode.bind(this);
    this.handleModalHide = this.handleModalHide.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange)
    CollectionActions.fetchSharedCollectionRoots()
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange)
  }

  onStoreChange(state) {
    const { tree } = this.state;
    this.setState({
      tree: {
        ...tree,
        children: state.sharedRoots,
      }
    });
  }

  handleChange(newTree) {
    const { tree } = this.state;
    this.setState({
      tree: {
        children: tree.children.map((child) => {
          return (tree.id === child.id)
            ? newTree
            : child;
        })
      },
    });
  }

  isActive(node) {
    return node === this.state.active;
  }

  hasChildren(node) {
    return node.children && node.children.length > 0
  }

  handleLabelChange(e, node) {
    node.label = e.target.value;
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

  editShare(node) {
    this.setState({
      active: node,
      showSharingModal: true,
    })
  }

  deleteCollection(node) {
    let children = node.children || [];
    let parent = this.findParentById(this.state.tree, node.id);

    this.removeNodeById(parent, node.id)
    this.appendChildrenToParent(parent, children)

    if (!node.isNew) {
      let deleted_ids = this.state.deleted_ids.concat([node.id])

      this.setState({
        deleted_ids: deleted_ids
      })
    }
  }

  appendChildrenToParent(parent, children) {
    if (children.length > 0) {
      children.forEach((child) => {
        parent.children.push(child);
      });
    }
  }

  findParentById(root, id) {
    if (!root.children) {
      root.children = [];
      return null;
    }

    let children = root.children;

    for (let i = 0; i < children.length; i++) {
      if (children[i].id == id) {
        return root;
      } else {
        let parent = this.findParentById(children[i], id);
        if (parent) {
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
    if (node.is_locked) {
      this.setState({
        active: { id: null }
      });
    } else {
      this.setState({
        active: node
      });
    }
  }

  handleModalHide() {
    this.setState({
      showSharingModal: false
    });
  }

  renderNode(node) {
    if (node.is_locked) {
      return (
        <div className="ms-3">
          <h5 onMouseDown={(e) => e.stopPropagation()}>{node.label}</h5>
        </div>
      );
    } else {
      return (
        <div
          className={`${this.isActive(node) ? 'bg-dark-subtle' : ''} d-flex justify-content-between mb-2`}
          onClick={() => this.onClickNode(node)}
        >
          <Form.Control
            className="ms-3 w-75"
            size="sm"
            type="text"
            value={node.label || ''}
            onChange={(e) => { this.handleLabelChange(e, node) }}
          />
          <ButtonGroup>
            <Button
              size="sm"
              variant="primary"
              onClick={() => this.editShare(node)}
            >
              <i className="fa fa-share-alt" />
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={() => this.deleteCollection(node)}
            >
              <i className="fa fa-trash-o" />
            </Button>
          </ButtonGroup>
        </div>
      );
    }
  }



  render() {
    const { tree, active: actNode, showSharingModal } = this.state;

    return (
      <div>
        <div className="d-flex justify-content-between">
          <h4>My Shared Collections</h4>
          <Button
            size="sm"
            variant="warning"
            onClick={this.bulkUpdate}
            onMouseDown={(e) => e.stopPropagation()}
          >
            Update
          </Button>
        </div>
        {tree.children.map((e, i) => (
          <Tree
            key={i}
            paddingLeft={20}
            tree={e}
            onChange={this.handleChange}
            renderNode={this.renderNode}
          />
        ))}
        {actNode && showSharingModal && (
          <ManagingModalSharing
            title={`Update Share Settings for '${actNode.label}'`}
            collectionId={actNode.id}
            onHide={this.handleModalHide}
            permissionLevel={actNode.permission_level}
            sampleDetailLevel={actNode.sample_detail_level}
            reactionDetailLevel={actNode.reaction_detail_level}
            wellplateDetailLevel={actNode.wellplate_detail_level}
            screenDetailLevel={actNode.screen_detail_level}
            selectUsers={false}
            collAction="Update" />
        )}
      </div>
    )
  }
}
