import alt from 'src/stores/alt/alt';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import UIStore from 'src/stores/alt/stores/UIStore';
import Utils from 'src/utilities/Functions';

class CollectionActions {
  fetchGenericEls() {
    return (dispatch) => {
      UsersFetcher.fetchElementKlasses()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

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
      CollectionsFetcher.fetchMyRoots()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  fetchCollectionsSharedWithMe() {
    return (dispatch) => {
      CollectionsFetcher.fetchSharedWithMeRoots()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  // TODO #2...centralized error handling maybe ErrorActions?
  fetchLockedCollectionRoots() {
    return (dispatch) => {
      CollectionsFetcher.fetchLockedRoots()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchUnsharedCollectionRoots() {
    return (dispatch) => {
      CollectionsFetcher.fetchUnsharedRoots()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchSharedCollectionRoots() {
    return (dispatch) => {
      CollectionsFetcher.fetchSharedRoots()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchRemoteCollectionRoots() {
    return (dispatch) => {
      CollectionsFetcher.fetchRemoteRoots()
        .then((roots) => {
          dispatch(roots);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchSyncInCollectionRoots() {
    return (dispatch) => {
      CollectionsFetcher.fetchSyncRemoteRoots()
        .then((roots) => {
          dispatch(roots);
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

  bulkUpdateUnsharedCollections(params) {
    return (dispatch) => {
      CollectionsFetcher.bulkUpdateUnsharedCollections(params)
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

  createUnsharedCollection(params) {
    return (dispatch) => {
      CollectionsFetcher.createUnsharedCollection(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  createSync(params) {
    return (dispatch) => {
      CollectionsFetcher.createSync(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  editSync(params) {
    return (dispatch) => {
      CollectionsFetcher.editSync(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
  deleteSync(params) {
    return (dispatch) => {
      CollectionsFetcher.deleteSync(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
  rejectSync(params) {
    return (dispatch) => {
      CollectionsFetcher.deleteSync(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
  rejectShared(params) {
    return (dispatch) => {
      CollectionsFetcher.rejectShared(params)
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateCollectrionTree(visibleRootsIds) {
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
