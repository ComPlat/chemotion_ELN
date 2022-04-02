import React from 'react';
import Tree from 'react-ui-tree';
import {Button, ButtonGroup, FormControl, Modal} from 'react-bootstrap';
import CollectionStore from '../stores/CollectionStore';

export default class GenericSegmentsTabs extends React.Component {
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
        isChange: false
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
    console.log("child:==", children);

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
      tree: tree,
      isChange: true
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
      const { isChange } = this.state;
      return (
        <div className="root-actions">
          { isChange && <Button id="my-collections-update-btn" bsSize="xsmall" bsStyle="warning" onClick={this.bulkUpdate.bind(this)}> Save </Button> }
          {this.addButton(node)}
        </div>
      )
    } else {
      return (
        <ButtonGroup className="actions">
          <Button id="tab-layout-btn" bsSize="xsmall" bsStyle="primary" disabled={node.isNew === true}
            onClick={()=>this.changeTabLayout(node)}>
              <i className="fa fa-plus"></i>
          </Button>
        </ButtonGroup>
      )
    }
  }

  changeTabLayout(node){
    let { modalProps, active } = this.state;
    // modalProps.title = action == "CreateSync"
    //   ? "Synchronize '"+node.label+"'"
    //   : "Edit Synchronization"
    // modalProps.show = true
    // modalProps.action = action
    // modalProps.collection = node
    // modalProps.selectUsers =  action == "CreateSync"
    //   ? true
    //   : false
    // active = node
    this.setState({ modalProps, active });
  }

  addButton(node) {
    return (
      <Button id={`mycol_${node.id}`} bsSize="xsmall" bsStyle="success" onClick={this.addSubcollection.bind(this, node)}>
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
          paddingLeft={20}
          tree={this.state.tree}
          isNodeCollapsed={this.isNodeCollapsed}
          onChange={this.handleChange.bind(this)}
          renderNode={this.renderNode.bind(this)}
        />
        <Modal animation show={mPs.show} onHide={this.handleModalHide.bind(this)}>
          <Modal.Header closeButton>
            <Modal.Title>Tab Layout</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            </Modal.Body>
        </Modal>
      </div>
    )
  }
}
