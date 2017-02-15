import alt from '../alt';
import PermissionsFetcher from '../fetchers/PermissionsFetcher';

class PermissionActions {
  fetchPermissionStatus(params) {
    return (dispatch) => { PermissionsFetcher.fetchPermissionStatus(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

}

export default alt.createActions(PermissionActions);
