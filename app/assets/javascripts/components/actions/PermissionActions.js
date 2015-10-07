import alt from '../alt';
import PermissionsFetcher from '../fetchers/PermissionsFetcher';

class PermissionActions {
  fetchTopSecretStatus(paramObj) {
    PermissionsFetcher.fetchTopSecretStatus(paramObj)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchSharingAllowedStatus(paramObj) {
    PermissionsFetcher.fetchSharingAllowedStatus(paramObj)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchDeletionAllowedStatus(paramObj) {
    PermissionsFetcher.fetchDeletionAllowedStatus(paramObj)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}

export default alt.createActions(PermissionActions);
