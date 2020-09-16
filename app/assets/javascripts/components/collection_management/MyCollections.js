import React from 'react';
import Tree from 'react-ui-tree';
import {Button, ButtonGroup, FormControl, Modal} from 'react-bootstrap';
import ManagingModalSharing from '../managing_actions/ManagingModalSharing';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';
import UserInfoIcon from '../UserInfoIcon';
import PermissionIcons from '../PermissionIcons'

export default class MyCollections extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      active: {id: null},
      deleted_ids: [],

      tree: {
        label: 'My Collections',
        id: -1,
        children: [{}]
      },
      modalProps: {
        show: false,
        title: "",
        component: "",
        action: null,
        collection: {},
        selectUsers: true,
      }
    }

    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange)
    CollectionActions.fetchUnsharedCollectionRoots()
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange)
  }

  onStoreChange(state) {
    let children = state.unsharedRoots.length > 0 ? state.unsharedRoots : [{}];

    this.setState({
      tree: {
        label: 'My Collections',
        id: -1,
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
    if(node.id == -1) {
      return (
        <div className="root-label">
          My Collections
        </div>
      )
    } else {
      return (
        <FormControl className="collection-label" type="text"
          value={node.label || ''}
          onChange={(e)=>{this.handleLabelChange(e,node)}}
        />
      )
    }
  }

  handleLabelChange(e,node) {
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
    if(node.id == -1) {
      return (
        <div className="root-actions">
          <Button id="my-collections-update-btn" bsSize="xsmall" bsStyle="warning"
            onClick={this.bulkUpdate.bind(this)}>
            Update
          </Button>
          {this.addButton(node)}
        </div>
      )
    } else {
      return (
        <ButtonGroup className="actions">
          <Button id="sync-users-btn" bsSize="xsmall" bsStyle="primary" disabled={node.isNew === true}
            onClick={()=>this.doSync(node,'CreateSync')}>
              <i className="fa fa-plus"></i> <i className="fa fa-share-alt"></i>
          </Button>
          {this.addButton(node)}
          <Button bsSize="xsmall" bsStyle="danger" onClick={this.deleteCollection.bind(this, node)}>
            <i className="fa fa-trash-o"></i>
          </Button>
        </ButtonGroup>
      )
    }
  }

  renderSync(node) {
    let syncOut = node.sync_collections_users;
    let users = [];

    if (syncOut) {
      users = syncOut.map((collection,ind)=>{
        return(
          <div className="node">
            <span key={ind} className="collection-sync-info">
              <UserInfoIcon type={collection.type}/> {collection.name}
              &nbsp; <PermissionIcons pl={collection.permission_level}/>
            </span>
            <ButtonGroup className="actions">
              <Button bsSize="xsmall" bsStyle="primary"
                onClick={()=>this.doSync(collection,'EditSync')}>
                   <i className="fa fa-share-alt">edit</i>
              </Button>
              <Button bsSize="xsmall" bsStyle="danger"
                onClick={()=>CollectionActions.deleteSync({id: collection.id, is_syncd: false})}
              >
              <i className="fa fa-share-alt"/> <i className="fa fa-trash-o"></i>
              </Button>
            </ButtonGroup>


          </div>
        )
      })
    }
    return(
      <div>{users.map(u=>u)}</div>
    )
  }

  doSync(node,action){
    let {modalProps,active} = this.state
    modalProps.title = action == "CreateSync"
      ? "Synchronize '"+node.label+"'"
      : "Edit Synchronization"
    modalProps.show = true
    modalProps.action = action
    modalProps.collection = node
    modalProps.selectUsers =  action == "CreateSync"
      ? true
      : false
    active = node
    this.setState({modalProps,active})
  }

  addButton(node) {
    return (
      <Button bsSize="xsmall" bsStyle="success" onClick={this.addSubcollection.bind(this, node)}>
        <i className="fa fa-plus"></i>
      </Button>
    )
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
    if (node.is_locked) {
      this.setState({
        active: {id: null}
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
        component: "",
        action: null,
        collection: {},
        selectUsers: true,
      }
    });
  }

  renderNode(node) {
    if(!Object.keys(node).length == 0) {
      return (
        <div>
          <span className={this.isActive(node)} onClick={this.onClickNode.bind(this, node)}>
            {this.label(node)}
            {this.actions(node)}
          </span>
        {this.renderSync(node)}
        </div>
      );
    }
  }
  render() {
    let mPs = this.state.modalProps
    let mPsC = mPs.collection
    return (
      <div className="tree">
        <Tree
          paddingLeft={20}                         // left padding for children nodes in pixels
          tree={this.state.tree}                   // tree object
          isNodeCollapsed={this.isNodeCollapsed}
          onChange={this.handleChange.bind(this)}  // onChange(tree) tree object changed
          renderNode={this.renderNode.bind(this)}  // renderNode(node) return react element
        />
        <Modal animation show={mPs.show} onHide={this.handleModalHide.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>{mPs.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ManagingModalSharing collectionId={mPsC.id}
              onHide={this.handleModalHide.bind(this)}
              permissionLevel={mPsC.permission_level}
              sampleDetailLevel={mPsC.sample_detail_level} reactionDetailLevel={mPsC.reaction_detail_level}
              wellplateDetailLevel={mPsC.wellplate_detail_level} screenDetailLevel={mPsC.screen_detail_level}
              selectUsers={mPs.selectUsers}
              collAction={mPs.action}/>
            </Modal.Body>
        </Modal>
      </div>
    )
  }
}
