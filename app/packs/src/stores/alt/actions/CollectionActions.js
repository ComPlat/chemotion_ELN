import alt from 'src/stores/alt/alt';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import Utils from 'src/utilities/Functions';

class CollectionActions {
  takeOwnership(params) {
    return (dispatch) => {
      CollectionsFetcher.takeOwnership(params)
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchMyCollections() {
    return (dispatch) => {
      CollectionsFetcher.fetchMyCollections()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }


  // TODO #2...centralized error handling maybe ErrorActions?

  createSelectedSharedCollections(params) {
    return (dispatch) => {
      CollectionsFetcher.createSelectedSharedCollections(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  createTabsSegment(params) {
    return (dispatch) => {
      CollectionsFetcher.createTabsSegment(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  updateTabsSegment(params) {
    return (dispatch) => {
      CollectionsFetcher.updateTabsLayout(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  bulkUpdateCollections(params) {
    return (dispatch) => {
      CollectionsFetcher.bulkUpdateCollections(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateSharedCollection(params) {
    return (dispatch) => {
      CollectionsFetcher.updateSharedCollection(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  createSharedCollections(params) {
    return (dispatch) => {
      CollectionsFetcher.createSharedCollections(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  editShare(params) {
    return (dispatch) => {
      CollectionsFetcher.editShare(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  deleteShare(params) {
    return (dispatch) => {
      CollectionsFetcher.deleteShare(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateCollectionTree(visibleRootsIds) {
    return visibleRootsIds
  }

  downloadReport(tab) {
    const { currentCollection } = UIStore.getState();

    Utils.downloadFile({ contents: "/api/v1/reports/excel?id=" + currentCollection.id + "&tab=" + tab });
  }

  exportCollectionsToFile(params) {
    return (dispatch) => {
      CollectionsFetcher.createExportJob(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  importCollectionsFromFile(params) {
    return (dispatch) => {
      CollectionsFetcher.createImportJob(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
}

export default alt.createActions(CollectionActions);
