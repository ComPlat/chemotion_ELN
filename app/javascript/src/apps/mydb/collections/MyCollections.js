import React from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, Form, Modal } from 'react-bootstrap';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UserInfoIcon from 'src/apps/mydb/collections/UserInfoIcon';
import PermissionIcons from 'src/apps/mydb/collections/PermissionIcons'

export default class MyCollections extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      active: { id: null },
      deleted_ids: [],

      tree: {
        id: -1,
        children: []
      },
      modalProps: {
        show: false,
        title: "",
        action: null,
        collection: {},
        selectUsers: true,
        isChange: false
      }
    }

    this.onStoreChange = this.onStoreChange.bind(this);
    this.bulkUpdate = this.bulkUpdate.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.renderNode = this.renderNode.bind(this);
    this.handleModalHide = this.handleModalHide.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange)
    CollectionActions.fetchUnsharedCollectionRoots()
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange)
  }

  onStoreChange(state) {
    const { tree } = this.state;
    this.setState({
      tree: {
        ...tree,
        children: state.unsharedRoots,
      }
    });
  }

  handleChange(tree) {
    this.setState({
      tree: tree,
      isChange: true
    });
  }

  isActive(node) {
    return node === this.state.active
  }

  label(node) {
    if (node.id == -1) {
      return (
        <Form.Control
          value="My Collections"
          size="sm"
          type="text"
          className="ms-3 w-75"
          disabled
        />
      );
    } else {
      return (
        <Form.Control
          className="ms-3 w-75"
          size="sm"
          type="text"
          value={node.label || ''}
          onChange={(e) => { this.handleLabelChange(e, node) }}
        />
      )
    }
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

  actions(node) {
    if (node.id == -1) {
      const { isChange } = this.state;
      return (
        <div>
          {isChange && (
            <Button
              id="save-collections-button"
              size="sm"
              variant="warning"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={this.bulkUpdate}
            >
              Save
            </Button>
          )}
          {this.addCollectionButton(node)}
        </div>
      )
    } else {
      return (
        <ButtonGroup>
          <Button
            id="sync-users-btn"
            size="sm"
            variant="primary"
            disabled={node.isNew === true}
            onClick={() => this.doSync(node, 'CreateSync')}
          >
            <i className="fa fa-plus" />
            <i className="fa fa-share-alt ms-1" />
          </Button>

          {this.addSubcollectionButton(node)}

          <Button
            size="sm"
            variant="danger"
            id={`delete-collection-button_${node.id}`}
            onClick={() => this.deleteCollection(node)}
          >
            <i className="fa fa-trash-o" />
          </Button>
        </ButtonGroup>
      )
    }
  }

  renderSync(node) {
    const syncUsers = node.sync_collections_users ?? [];
    if (syncUsers.length === 0) return null;

    return (
      <div>
        {syncUsers.map((collection) => (
          <div
            key={collection.id}
            className="ms-4 mt-2 d-flex justify-content-between"
          >
            <span className="d-flex gap-2 align-items-baseline">
              <UserInfoIcon type={collection.type} />
              {collection.name}
              <PermissionIcons pl={collection.permission_level} />
            </span>
            <ButtonGroup>
              <Button
                size="sm"
                variant="primary"
                onClick={() => this.doSync(collection, 'EditSync')}>
                <i className="fa fa-share-alt me-1" />
                edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => CollectionActions.deleteSync({ id: collection.id, is_syncd: false })}
              >
                <i className="fa fa-share-alt me-1" />
                <i className="fa fa-trash-o" />
              </Button>
            </ButtonGroup>
          </div>
        ))}
      </div>
    );
  }

  doSync(node, action) {
    let { modalProps, active } = this.state
    modalProps.title = action == "CreateSync"
      ? "Synchronize '" + node.label + "'"
      : "Edit Synchronization"
    modalProps.show = true
    modalProps.action = action
    modalProps.collection = node
    modalProps.selectUsers = action == "CreateSync"
      ? true
      : false
    active = node
    this.setState({ modalProps, active })
  }

  addCollectionButton(node) {
    return (
      <Button
        id="add-new-collection-button"
        size="sm"
        variant="success"
        onClick={() => this.addSubcollection(node)}
        onMouseDown={(e)=>{e.stopPropagation();}}
      >
        <i className="fa fa-plus" />
      </Button>
    )
  }

  addSubcollectionButton(node) {
    return (
      <Button
        id={`add-subcollection-to-collection_${node.id}`}
        size="sm"
        variant="success"
        onClick={() => this.addSubcollection(node)}
      >
        <i className="fa fa-plus" />
      </Button>
    )
  }

  addSubcollection(node) {
    if (node.children) {
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
    } else if (parent.label == 'My Collections') {
      parent.children.push({});
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
      modalProps: {
        show: false,
        title: "",
        action: null,
        collection: {},
        selectUsers: true,
      }
    });
  }

  renderNode(node) {
    return (
      <div className="mb-2">
        <div
          className={`${this.isActive(node) ? 'bg-dark-subtle' : ''} d-flex justify-content-between`}
          onClick={() => this.onClickNode(node)}
        >
          {this.label(node)}
          {this.actions(node)}
        </div>
        {this.renderSync(node)}
      </div>
    );
  }

  render() {
    let mPs = this.state.modalProps
    let mPsC = mPs.collection
    return (
      <div className="tree">
        <Tree
          paddingLeft={20}
          tree={this.state.tree}
          isNodeCollapsed={this.isNodeCollapsed}
          onChange={this.handleChange}
          renderNode={this.renderNode}
        />
        <Modal centered animation show={mPs.show} onHide={this.handleModalHide}>
          <Modal.Header closeButton>
            <Modal.Title>{mPs.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ManagingModalSharing collectionId={mPsC.id}
              onHide={this.handleModalHide}
              permissionLevel={mPsC.permission_level}
              sampleDetailLevel={mPsC.sample_detail_level} reactionDetailLevel={mPsC.reaction_detail_level}
              wellplateDetailLevel={mPsC.wellplate_detail_level} screenDetailLevel={mPsC.screen_detail_level}
              selectUsers={mPs.selectUsers}
              collAction={mPs.action} />
          </Modal.Body>
        </Modal>
      </div>
    )
  }
}
