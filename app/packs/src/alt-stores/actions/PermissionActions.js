import alt from 'src/alt-stores/alt';
import PermissionsFetcher from 'src/fetchers/PermissionsFetcher';

class PermissionActions {
  fetchPermissionStatus(params) {
    return (dispatch) => {
      PermissionsFetcher.fetchPermissionStatus(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

}

export default alt.createActions(PermissionActions);
