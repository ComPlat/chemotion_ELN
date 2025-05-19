import React from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, Form } from 'react-bootstrap';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import SyncedCollectionsUsersModal from 'src/apps/mydb/collections/SyncedCollectionsUsersModal';

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

      isChange: false,
      sharingModal: {
        action: null,
        show: false
      },
      syncListModalNodeId: null,
    };

    this.onStoreChange = this.onStoreChange.bind(this);
    this.bulkUpdate = this.bulkUpdate.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.renderNode = this.renderNode.bind(this);
    this.handleModalHide = this.handleModalHide.bind(this);
    this.openSyncListModal = this.openSyncListModal.bind(this);
    this.closeSyncListModal = this.closeSyncListModal.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange);
    CollectionActions.fetchUnsharedCollectionRoots();
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange);
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
      tree,
      isChange: true
    });
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
    }
    return (
      <Form.Control
        className="ms-3 w-75"
        size="sm"
        type="text"
        value={node.label || ''}
        onChange={(e) => { this.handleLabelChange(e, node); }}
      />
    );
  }

  handleLabelChange(e, node) {
    node.label = e.target.value;
    this.forceUpdate();
  }

  // TODO: confirmation before start the updating process?
  bulkUpdate() {
    // filter empty objects
    const collections = this.state.tree.children.filter((child) => child.label);

    const params = {
      collections,
      deleted_ids: this.state.deleted_ids
    };

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
      );
    }

    return (
      <ButtonGroup>
        {this.renderSyncButton(node)}

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
    );
  }

  renderSyncButton(node) {
    const syncUsers = node.sync_collections_users ?? [];
    if (syncUsers.length === 0) return null;

    return (
      <Button
        id={`sync-users-button_${node.id}`}
        className="d-flex align-items-center gap-1"
        onClick={() => this.openSyncListModal(node)}
        size="sm"
        variant="warning"
        disabled={node.isNew === true}
      >
        <i className="fa fa-users" />
        <i className="fa fa-share-alt" />
        {`(${syncUsers.length})`}
      </Button>
    );
  }

  doSync(node, action) {
    this.setState({
      sharingModal: { show: true, action },
      active: node,
    });
  }

  addCollectionButton(node) {
    return (
      <Button
        id="add-new-collection-button"
        size="sm"
        variant="success"
        onClick={() => this.addSubcollection(node)}
        onMouseDown={(e) => { e.stopPropagation(); }}
      >
        <i className="fa fa-plus" />
      </Button>
    );
  }

  openSyncListModal(node) {
    this.setState({
      syncListModalNodeId: node.id,
    });
  }

  closeSyncListModal() {
    this.setState({
      syncListModalNodeId: null,
    });
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
    );
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
    this.forceUpdate();
  }

  deleteCollection(node) {
    const children = node.children || [];
    const parent = this.findParentById(this.state.tree, node.id);

    this.removeNodeById(parent, node.id);
    this.appendChildrenToParent(parent, children);

    if (!node.isNew) {
      const deleted_ids = this.state.deleted_ids.concat([node.id]);

      this.setState({
        deleted_ids
      });
    }
    this.forceUpdate();
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

    const { children } = root;

    for (let i = 0; i < children.length; i++) {
      if (children[i].id == id) {
        return root;
      }
      const parent = this.findParentById(children[i], id);
      if (parent) {
        return parent;
      }
    }
  }

  findNodeById(node, id) {
    if (node.id === id) return node;
    if (!node.children) return null;

    const { children } = node;
    for (let i = 0; i < children.length; i += 1) {
      const found = this.findNodeById(children[i], id);
      if (found) return found;
    }

    return null;
  }

  removeNodeById(parent, id) {
    parent.children = parent.children.filter((child) => child.id != id);
  }

  handleModalHide() {
    this.setState({
      sharingModal: {
        show: false,
        action: null,
      }
    });
  }

  renderNode(node) {
    return (
      <div className="collection-node py-1 d-flex justify-content-between">
        {this.label(node)}
        {this.actions(node)}
      </div>
    );
  }

  render() {
    const {
      tree, sharingModal, syncListModalNodeId, active
    } = this.state;
    return (
      <div className="tree">
        <Tree
          paddingLeft={20}
          tree={tree}
          onChange={this.handleChange}
          renderNode={this.renderNode}
        />
        {active.id !== null && sharingModal.show && (
          <ManagingModalSharing
            title={sharingModal.action === 'CreateSync'
              ? `Synchronize '${active.label}'`
              : 'Edit Synchronization'}
            collectionId={active.id}
            onHide={this.handleModalHide}
            permissionLevel={active.permission_level}
            sampleDetailLevel={active.sample_detail_level}
            reactionDetailLevel={active.reaction_detail_level}
            wellplateDetailLevel={active.wellplate_detail_level}
            screenDetailLevel={active.screen_detail_level}
            selectUsers={sharingModal.action === 'CreateSync'}
            collAction={sharingModal.action}
          />
        )}

        {syncListModalNodeId && (
          <SyncedCollectionsUsersModal
            node={this.findNodeById(tree, syncListModalNodeId)}
            updateSync={(collection) => {
              this.doSync(collection, 'EditSync');
            }}
            deleteSync={(collection) => {
              CollectionActions.deleteSync({ id: collection.id, is_syncd: false });
            }}
            onHide={this.closeSyncListModal}
          />
        )}
      </div>
    );
  }
}
