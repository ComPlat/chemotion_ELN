import alt from '../alt';
import PermissionActions from '../actions/PermissionActions';

class PermissionStore {
  constructor() {
    this.state = {
      is_top_secret: false,
      sharing_allowed: false,
      deletion_allowed: false
    };

    this.bindListeners({
      handleFetchTopSecretStatus: PermissionActions.fetchTopSecretStatus,
      handleFetchSharingAllowedStatus: PermissionActions.fetchSharingAllowedStatus,
      handleFetchDeletionAllowedStatus: PermissionActions.fetchDeletionAllowedStatus
    })
  }

  handleFetchTopSecretStatus(result) {
    this.state.is_top_secret = result.is_top_secret;
  }

  handleFetchSharingAllowedStatus(result) {
    this.state.sharing_allowed = result.sharing_allowed;
  }

  handleFetchDeletionAllowedStatus(result) {
    this.state.deletion_allowed = result.deletion_allowed;
  }
}

export default alt.createStore(PermissionStore, 'PermissionStore');
