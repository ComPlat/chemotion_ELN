import alt from 'src/stores/alt/alt';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';


class CollectionStore {
  constructor() {
    this.state = {
      myCollections: [],
      sharedCollections: [],
      visibleRootsIds: [],
    };


    this.bindListeners({
      handleTakeOwnership: CollectionActions.takeOwnership,
      handleFetchMyCollections: CollectionActions.fetchMyCollections,
      handleFetchCollectionsSharedWithMe: CollectionActions.fetchCollectionsSharedWithMe,
      // handleCreateSharedCollectionAcls: CollectionActions.createSharedCollectionAcls,
      handleBulkUpdateCollections: CollectionActions.bulkUpdateCollections,
      handleUpdateSharedCollection: CollectionActions.updateSharedCollection,
      handleRefreshMyCollection: [
        CollectionActions.createSharedCollections,
        CollectionActions.createSelectedSharedCollections,
        CollectionActions.editShare,
        CollectionActions.deleteShare
      ],
      handleRejectSharedCollection: CollectionActions.rejectShared,
      handleUpdateCollectrionTree: CollectionActions.updateCollectrionTree
    })
  }

  handleTakeOwnership() {
    CollectionActions.fetchMyCollections();
    CollectionActions.fetchCollectionsSharedWithMe();
  }

  handleFetchMyCollections(results) {
    this.setState({ myCollections: results.collections });
  }

  handleFetchCollectionsSharedWithMe(results) {
    this.setState({ sharedCollections: results.collections });
  }

  handleCreateSharedCollectionAcls() {
    CollectionActions.fetchMyCollections();
  }

  handleBulkUpdateCollections() {
    CollectionActions.fetchMyCollections();
  }

  handleUpdateSharedCollection() {
    // CollectionActions.fetchSharedCollectionRoots();
  }

  handleRefreshMyCollection() {
    CollectionActions.fetchMyCollections();
  }

  handleUpdateCollectrionTree(visibleRootsIds) {
    this.state.visibleRootsIds = visibleRootsIds
  }

  handleRejectSharedCollection(results) {
    CollectionActions.fetchMyCollections();
  }


  static findAllCollectionId() {
    const { myCollections } = this.state;

    const foundCollection = myCollections.filter((root) => (root.label === 'All' && root.is_locked === true)).pop();

    return foundCollection?.id;
  }
}

export default alt.createStore(CollectionStore, 'CollectionStore');
