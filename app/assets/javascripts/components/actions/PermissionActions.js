import alt from '../alt';
import PermissionsFetcher from '../fetchers/PermissionsFetcher';

class PermissionActions {
  fetchTopSecretStatus(params) {
    PermissionsFetcher.fetchTopSecretStatus(params)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchSharingAllowedStatus(params) {
    PermissionsFetcher.fetchSharingAllowedStatus(params)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchDeletionAllowedStatus(params) {
    PermissionsFetcher.fetchDeletionAllowedStatus(params)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}

export default alt.createActions(PermissionActions);
