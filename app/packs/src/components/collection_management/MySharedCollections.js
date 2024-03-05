import React from 'react';
import Tree from 'react-ui-tree';
import {Button, ButtonGroup, FormControl, Modal} from 'react-bootstrap';
import ManagingModalSharing from '../managing_actions/ManagingModalSharing';
import CollectionStore from '../stores/CollectionStore';
import CollectionActions from '../actions/CollectionActions';

export default class MySharedCollections extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      active: {id: null},
      deleted_ids: [],

      tree: {
        label: 'My Shared Collections',
        id: -1,
        children: [{}]
      },
      modalProps: {
        show: false,
        title: "",
        component: "",
        action: null
      }
    }

    this.onStoreChange = this.onStoreChange.bind(this);
  }

  componentDidMount() {
    CollectionStore.listen(this.onStoreChange)
    CollectionActions.fetchSharedCollectionRoots()
  }

  componentWillUnmount() {
    CollectionStore.unlisten(this.onStoreChange)
  }

  onStoreChange(state) {
    let children = state.sharedRoots.length > 0 ? state.sharedRoots : [{}];

    this.setState({
      tree: {
        label: 'My Shared Collections',
        children: children
      }
    });
  }

  handleChange(tree) {
    let oldTree = this.state.tree
    let children = oldTree.children
    children.map((child,i) => {
      if ('label' in tree && typeof(tree.label) == 'string' && tree.label == child.label){
        children[i]=tree
        return
      }
    });
    oldTree.children = children
    this.setState({
      tree: oldTree
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
    } else if (node.is_locked) {
      return (
        <FormControl className="collection-label" type="text"
          disabled
          value={node.label || ''}
        />
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
    if(node.label == "My Shared Collections") {
      return (
        <div className="root-actions">
          <Button bsSize="xsmall" bsStyle="warning"
            onClick={this.bulkUpdate.bind(this)}>
            Update
          </Button>
        </div>
      )
    } else if (!node.is_locked) {
      return (
        <ButtonGroup className="actions">
          <Button bsSize="xsmall" bsStyle="primary"
            onClick={()=>this.editShare(node)}>
            <i className="fa fa-share-alt"></i>
          </Button>
          <Button bsSize="xsmall" bsStyle="danger" onClick={this.deleteCollection.bind(this, node)}>
            <i className="fa fa-trash-o"></i>
          </Button>
        </ButtonGroup>
      )
    }
  }

  editShare(node) {
    let {modalProps,active} = this.state
    modalProps.title = "Update Share Settings for '"+node.label+"'"
    modalProps.show = true
    active = node
    this.setState({modalProps,active})
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
    } else if (parent.label == 'My Shared Collections') {
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
        action: null
      }
    });
  }

  renderNode(node) {
    if(!Object.keys(node).length == 0) {
      if (node.is_locked) {
        return (
          <span className={this.isActive(node)} onClick={this.onClickNode.bind(this, node)}>
            {this.label(node)}
            {this.actions(node)}
          </span>
        )
      } else {
        return (
          <span className={this.isActive(node)} onClick={this.onClickNode.bind(this, node)}>
            {this.label(node)}
            {this.actions(node)}
          </span>
        );

      }

    }
  }



  render() {
    let actNode = this.state.active
    let trees = ()=> this.state.tree.children.map((e,i)=> {
      return(
        <Tree
          key={i}
          paddingLeft={20}                         // left padding for children nodes in pixels
          tree={e}                   // tree object
          onChange={this.handleChange.bind(this)}  // onChange(tree) tree object changed
          renderNode={this.renderNode.bind(this)}  // renderNode(node) return react element
        />
      )
    })

    return (
      <div className="tree">
        <Tree
          paddingLeft={20}                         // left padding for children nodes in pixels
          tree={{
            label: 'My Shared Collections',
            id: -1,
          }}                   // tree object
          onChange={this.handleChange.bind(this)}  // onChange(tree) tree object changed
          renderNode={this.renderNode.bind(this)}  // renderNode(node) return react element
        />
        {trees()}
        <Modal animation show={this.state.modalProps.show} onHide={this.handleModalHide.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>{this.state.modalProps.title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <ManagingModalSharing collectionId={actNode.id}
              onHide={this.handleModalHide.bind(this)}
              permissionLevel={actNode.permission_level}
              sampleDetailLevel={actNode.sample_detail_level} reactionDetailLevel={actNode.reaction_detail_level}
              wellplateDetailLevel={actNode.wellplate_detail_level} screenDetailLevel={actNode.screen_detail_level}
              selectUsers={false}
              collAction="Update" />
            </Modal.Body>
        </Modal>
      </div>
    )
  }
}
