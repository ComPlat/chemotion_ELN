import alt from '../alt';
import PermissionsFetcher from '../fetchers/PermissionsFetcher';

class PermissionActions {
  fetchTopSecretStatus(params) {
    return (dispatch) => { PermissionsFetcher.fetchTopSecretStatus(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchSharingAllowedStatus(params) {
    return (dispatch) => { PermissionsFetcher.fetchSharingAllowedStatus(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchDeletionAllowedStatus(params) {
    return (dispatch) => { PermissionsFetcher.fetchDeletionAllowedStatus(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }
}

export default alt.createActions(PermissionActions);
