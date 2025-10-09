import React, { useState, useEffect, useContext } from 'react';
import Tree from 'react-ui-tree';
import { Button, ButtonGroup, Form, OverlayTrigger, Popover } from 'react-bootstrap';
import { cloneDeep } from 'lodash';
import ManagingModalSharing from 'src/components/managingActions/ManagingModalSharing';
import SyncedCollectionsUsersModal from 'src/apps/mydb/collections/SyncedCollectionsUsersModal';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

const MyCollections = () => {
  const collectionsStore = useContext(StoreContext).collections;
  const [isModified, setIsModified] = useState(false);
  const [tree, setTree] = useState({ label: 'My Collections', id: -1, children: cloneDeep(collectionsStore.own_collections) });
  const [sharingModal, setSharingModal] = useState({ action: null, show: false, node: {} });

  useEffect(() => {
    if (collectionsStore.update_tree) {
      collectionsStore.setUpdateTree(false);
      setTree({ label: 'My Collections', id: -1, children: cloneDeep(collectionsStore.own_collections) });
    }
  }, [collectionsStore.update_tree])

  const handleChange = (tree) => {
    setTree(tree)
  }

  const addCollectionNode = (node) => {
    collectionsStore.addCollectionNode(node);
  }

  const changeCollectionLabel = (e, node) => {
    collectionsStore.updateCollectionLabel(e.target.value, node);
    setIsModified(true);
  }

  const deleteCollection = (node) => {
    collectionsStore.deleteCollectionNode(node);
    //     const children = node.children || [];
    //     const parent = this.findParentById(this.state.tree, node.id);
    // 
    //     this.removeNodeById(parent, node.id);
    //     this.appendChildrenToParent(parent, children);
    // 
    //     if (!node.isNew) {
    //       const deleted_ids = this.state.deleted_ids.concat([node.id]);
    // 
    //       this.setState({
    //         deleted_ids
    //       });
    //     }
    //     this.forceUpdate();
  }

  // TODO: confirmation before start the updating process?
  const bulkUpdate = () => {
    // filter empty objects
    const collections = tree.children.filter((child) => child.label);
    
    //const params = {
    //  collections,
    //  deleted_ids: this.state.deleted_ids
    //};
    
    //CollectionActions.bulkUpdateUnsharedCollections(params);
  }

  const addCollectionShares = (node) => {
    console.log(node);
    setSharingModal({ action: 'Create Shared', show: true, node: node });
  }

  const editCollectionShares = (node) => {
    // 'EditShare'
    // wird in syncedCollectionsUsersModal verwendet
  }

  const handleSharingModalHide = () => {
    setSharingModal({ action: null, show: false, node: {} });
  }

  const openSyncListModal = (node) => {
    //     this.setState({
    //       syncListModalNodeId: node.id,
    //     });
  }

  const closeSyncListModal = () => {
    //     this.setState({
    //       syncListModalNodeId: null,
    //     });
  }

  const renderSyncButton = (node) => {
    //     const syncUsers = node.sync_collections_users ?? [];
    //     if (syncUsers.length === 0) return null;
    // 
    //     return (
    //       <Button
    //         id={`sync-users-button_${node.id}`}
    //         className="d-flex align-items-center gap-1"
    //         onClick={() => this.openSyncListModal(node)}
    //         size="sm"
    //         variant="warning"
    //         disabled={node.isNew === true}
    //       >
    //         <i className="fa fa-users" />
    //         <i className="fa fa-share-alt" />
    //         {`(${syncUsers.length})`}
    //       </Button>
    //     );
  }

  const addCollectionButton = (node) => {
    return (
      <Button
        size="sm"
        variant="success"
        onClick={() => addCollectionNode(node)}
      >
        <i className="fa fa-plus" />
      </Button>
    );
  }

  const actions = (node) => {
    if (node.id == -1) {
      return (
        <div>
          {isModified && (
            <Button
              id="save-collections-button"
              size="sm"
              variant="warning"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={bulkUpdate()}
            >
              Save
            </Button>
          )}
          {addCollectionButton(node)}
        </div>
      );
    }

    const popover = (
      <Popover>
        <Popover.Body>
          <div className="mb-2">Do you really want to delete "{node.label}"?</div>
          <ButtonGroup>
            <Button
              variant="danger"
              size="sm"
              className="me-2"
              onClick={() => deleteCollection(node)}
            >
              Yes
            </Button>
            <Button
              variant="warning"
              size="sm"
              onClick={() => {}}
            >
              No
            </Button>
          </ButtonGroup>
        </Popover.Body>
      </Popover>
    );

    return (
      <ButtonGroup>
        {renderSyncButton(node)}
    
        <Button
          id="sync-users-btn"
          size="sm"
          variant="primary"
          disabled={node.isNew === true}
          onClick={() => addCollectionShares(node)}
        >
          <i className="fa fa-plus" />
          <i className="fa fa-share-alt ms-1" />
        </Button>
    
        {addCollectionButton(node)}
    
        <OverlayTrigger
          animation
          placement="bottom"
          root
          trigger="focus"
          overlay={popover}
        >
          <Button size="sm" variant="danger">
            <i className="fa fa-trash-o" />
          </Button>
        </OverlayTrigger>
      </ButtonGroup>
    );
  }

  const label = (node) => {
    if (node.id == -1) {
      return (
        <div className="ms-3 mb-2 fs-5">{node.label}</div>
      );
    }
    return (
      <Form.Control
        className="ms-3 w-75"
        size="sm"
        type="text"
        value={node.label || ''}
        onChange={(e) => { changeCollectionLabel(e, node); }}
      />
    );
  }

  const renderNode = (node) => {
    return (
      <div className="collection-node py-1 d-flex justify-content-between">
        {label(node)}
        {actions(node)}
      </div>
    );
  }

 

  //{syncListModalNodeId && (
  //      <SyncedCollectionsUsersModal
  //        node={this.findNodeById(tree, syncListModalNodeId)}
  //        updateSync={(collection) => {
  //          editCollectionShares(collection);
  //        }}
  //        deleteSync={(collection) => {
  //          CollectionActions.deleteSync({ id: collection.id, is_syncd: false });
  //        }}
  //        onHide={this.closeSyncListModal}
  //      />
  //    )}

  return (
    <div className="tree mt-2">
      <Tree
        paddingLeft={20}
        tree={tree}
        onChange={handleChange}
        renderNode={renderNode}
      />
      {Object.keys(sharingModal.node).length >= 1 && sharingModal.show && (
        <ManagingModalSharing
          title={sharingModal.action === 'Create Shared'
            ? `Collection Share of '${sharingModal.node.label}'`
            : 'Edit Collection Share'}
          collectionId={sharingModal.node.id}
          onHide={handleSharingModalHide}
          permissionLevel={sharingModal.node.permission_level}
          sampleDetailLevel={sharingModal.node.sample_detail_level}
          reactionDetailLevel={sharingModal.node.reaction_detail_level}
          wellplateDetailLevel={sharingModal.node.wellplate_detail_level}
          screenDetailLevel={sharingModal.node.screen_detail_level}
          selectUsers={sharingModal.action === 'Create Shared'}
          collAction={sharingModal.action}
        />
      )}
    </div>
  );
}

export default observer(MyCollections);

// export default class MyCollections extends React.Component {
//   static contextType = StoreContext;
// 
//   constructor(props) {
//     super(props);
// 
//     this.state = {
//       active: { id: null },
//       deleted_ids: [],
// 
//       tree: {
//         id: -1,
//         children: []
//       },
// 
//       isChange: false,
//       sharingModal: {
//         action: null,
//         show: false
//       },
//       syncListModalNodeId: null,
//     };
// 
//     this.onStoreChange = this.onStoreChange.bind(this);
//     this.bulkUpdate = this.bulkUpdate.bind(this);
//     this.handleChange = this.handleChange.bind(this);
//     this.renderNode = this.renderNode.bind(this);
//     this.handleModalHide = this.handleModalHide.bind(this);
//     this.openSyncListModal = this.openSyncListModal.bind(this);
//     this.closeSyncListModal = this.closeSyncListModal.bind(this);
//   }
// 
//   componentDidMount() {
//     CollectionStore.listen(this.onStoreChange);
//     //CollectionActions.fetchUnsharedCollectionRoots();
//     this.context.collections.ownCollections;
//   }
// 
//   componentWillUnmount() {
//     CollectionStore.unlisten(this.onStoreChange);
//   }
// 
//   onStoreChange(state) {
//     const { tree } = this.state;
//     this.setState({
//       tree: {
//         ...tree,
//         children: state.unsharedRoots,
//       }
//     });
//   }
// 
//   handleChange(tree) {
//     this.setState({
//       tree,
//       isChange: true
//     });
//   }
// 
//   label(node) {
//     if (node.id == -1) {
//       return (
//         <Form.Control
//           value="My Collections"
//           size="sm"
//           type="text"
//           className="ms-3 w-75"
//           disabled
//         />
//       );
//     }
//     return (
//       <Form.Control
//         className="ms-3 w-75"
//         size="sm"
//         type="text"
//         value={node.label || ''}
//         onChange={(e) => { this.handleLabelChange(e, node); }}
//       />
//     );
//   }
// 
//   handleLabelChange(e, node) {
//     node.label = e.target.value;
//     this.forceUpdate();
//   }
// 
//   // TODO: confirmation before start the updating process?
//   bulkUpdate() {
//     // filter empty objects
//     const collections = this.state.tree.children.filter((child) => child.label);
// 
//     const params = {
//       collections,
//       deleted_ids: this.state.deleted_ids
//     };
// 
//     CollectionActions.bulkUpdateUnsharedCollections(params);
//   }
// 
//   actions(node) {
//     if (node.id == -1) {
//       const { isChange } = this.state;
//       return (
//         <div>
//           {isChange && (
//             <Button
//               id="save-collections-button"
//               size="sm"
//               variant="warning"
//               onMouseDown={(e) => e.stopPropagation()}
//               onClick={this.bulkUpdate}
//             >
//               Save
//             </Button>
//           )}
//           {this.addCollectionButton(node)}
//         </div>
//       );
//     }
// 
//     return (
//       <ButtonGroup>
//         {this.renderSyncButton(node)}
// 
//         <Button
//           id="sync-users-btn"
//           size="sm"
//           variant="primary"
//           disabled={node.isNew === true}
//           onClick={() => this.doSync(node, 'CreateSync')}
//         >
//           <i className="fa fa-plus" />
//           <i className="fa fa-share-alt ms-1" />
//         </Button>
// 
//         {this.addSubcollectionButton(node)}
// 
//         <Button
//           size="sm"
//           variant="danger"
//           id={`delete-collection-button_${node.id}`}
//           onClick={() => this.deleteCollection(node)}
//         >
//           <i className="fa fa-trash-o" />
//         </Button>
//       </ButtonGroup>
//     );
//   }
// 
//   renderSyncButton(node) {
//     const syncUsers = node.sync_collections_users ?? [];
//     if (syncUsers.length === 0) return null;
// 
//     return (
//       <Button
//         id={`sync-users-button_${node.id}`}
//         className="d-flex align-items-center gap-1"
//         onClick={() => this.openSyncListModal(node)}
//         size="sm"
//         variant="warning"
//         disabled={node.isNew === true}
//       >
//         <i className="fa fa-users" />
//         <i className="fa fa-share-alt" />
//         {`(${syncUsers.length})`}
//       </Button>
//     );
//   }
// 
//   doSync(node, action) {
//     this.setState({
//       sharingModal: { show: true, action },
//       active: node,
//     });
//   }
// 
//   addCollectionButton(node) {
//     return (
//       <Button
//         id="add-new-collection-button"
//         size="sm"
//         variant="success"
//         onClick={() => this.addSubcollection(node)}
//         onMouseDown={(e) => { e.stopPropagation(); }}
//       >
//         <i className="fa fa-plus" />
//       </Button>
//     );
//   }
// 
//   openSyncListModal(node) {
//     this.setState({
//       syncListModalNodeId: node.id,
//     });
//   }
// 
//   closeSyncListModal() {
//     this.setState({
//       syncListModalNodeId: null,
//     });
//   }
// 
//   addSubcollectionButton(node) {
//     return (
//       <Button
//         id={`add-subcollection-to-collection_${node.id}`}
//         size="sm"
//         variant="success"
//         onClick={() => this.addSubcollection(node)}
//       >
//         <i className="fa fa-plus" />
//       </Button>
//     );
//   }
// 
//   addSubcollection(node) {
//     if (node.children) {
//       node.children.push({
//         id: Math.random(),
//         label: 'New Collection',
//         isNew: true
//       });
//     } else {
//       node.children = [{
//         id: Math.random(),
//         label: 'New Collection',
//         isNew: true
//       }];
//     }
//     this.forceUpdate();
//   }
// 
//   deleteCollection(node) {
//     const children = node.children || [];
//     const parent = this.findParentById(this.state.tree, node.id);
// 
//     this.removeNodeById(parent, node.id);
//     this.appendChildrenToParent(parent, children);
// 
//     if (!node.isNew) {
//       const deleted_ids = this.state.deleted_ids.concat([node.id]);
// 
//       this.setState({
//         deleted_ids
//       });
//     }
//     this.forceUpdate();
//   }
// 
//   appendChildrenToParent(parent, children) {
//     if (children.length > 0) {
//       children.forEach((child) => {
//         parent.children.push(child);
//       });
//     } else if (parent.label == 'My Collections') {
//       parent.children.push({});
//     }
//   }
// 
//   findParentById(root, id) {
//     if (!root.children) {
//       root.children = [];
//       return null;
//     }
// 
//     const { children } = root;
// 
//     for (let i = 0; i < children.length; i++) {
//       if (children[i].id == id) {
//         return root;
//       }
//       const parent = this.findParentById(children[i], id);
//       if (parent) {
//         return parent;
//       }
//     }
//   }
// 
//   findNodeById(node, id) {
//     if (node.id === id) return node;
//     if (!node.children) return null;
// 
//     const { children } = node;
//     for (let i = 0; i < children.length; i += 1) {
//       const found = this.findNodeById(children[i], id);
//       if (found) return found;
//     }
// 
//     return null;
//   }
// 
//   removeNodeById(parent, id) {
//     parent.children = parent.children.filter((child) => child.id != id);
//   }
// 
//   handleModalHide() {
//     this.setState({
//       sharingModal: {
//         show: false,
//         action: null,
//       }
//     });
//   }
// 
//   renderNode(node) {
//     return (
//       <div className="collection-node py-1 d-flex justify-content-between">
//         {this.label(node)}
//         {this.actions(node)}
//       </div>
//     );
//   }
// 
//   render() {
//     const {
//       tree, sharingModal, syncListModalNodeId, active
//     } = this.state;
//     return (
//       <div className="tree">
//         <Tree
//           paddingLeft={20}
//           tree={tree}
//           onChange={this.handleChange}
//           renderNode={this.renderNode}
//         />
//         {active.id !== null && sharingModal.show && (
//           <ManagingModalSharing
//             title={sharingModal.action === 'CreateSync'
//               ? `Synchronize '${active.label}'`
//               : 'Edit Synchronization'}
//             collectionId={active.id}
//             onHide={this.handleModalHide}
//             permissionLevel={active.permission_level}
//             sampleDetailLevel={active.sample_detail_level}
//             reactionDetailLevel={active.reaction_detail_level}
//             wellplateDetailLevel={active.wellplate_detail_level}
//             screenDetailLevel={active.screen_detail_level}
//             selectUsers={sharingModal.action === 'CreateSync'}
//             collAction={sharingModal.action}
//           />
//         )}
// 
//         {syncListModalNodeId && (
//           <SyncedCollectionsUsersModal
//             node={this.findNodeById(tree, syncListModalNodeId)}
//             updateSync={(collection) => {
//               this.doSync(collection, 'EditSync');
//             }}
//             deleteSync={(collection) => {
//               CollectionActions.deleteSync({ id: collection.id, is_syncd: false });
//             }}
//             onHide={this.closeSyncListModal}
//           />
//         )}
//       </div>
//     );
//   }
// }
