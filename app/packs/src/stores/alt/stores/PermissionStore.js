import alt from 'src/stores/alt/alt';
import PermissionActions from 'src/stores/alt/actions/PermissionActions';

class PermissionStore {
  constructor() {
    this.state = {
      is_top_secret: false,
      move_allowed: false,
      assign_allowed: false,
      sharing_allowed: false,
      deletion_allowed: false,
      remove_allowed: false,
    };

    this.bindListeners({
      handleFetchPermissionStatus: PermissionActions.fetchPermissionStatus
    })
  }


  handleFetchPermissionStatus(result) {
    if (result.is_top_secret != null) {this.state.is_top_secret = result.is_top_secret}
    if (result.sharing_allowed !=null) {this.state.sharing_allowed = result.sharing_allowed}
    if (result.deletion_allowed !=null) {this.state.deletion_allowed = result.deletion_allowed}
    if (result.remove_allowed !=null) {this.state.remove_allowed = result.remove_allowed}
    if (result.move_allowed !=null) {this.state.move_allowed = result.move_allowed}
    if (result.assign_allowed !=null) {this.state.assign_allowed = result.assign_allowed}
  }
}

export default alt.createStore(PermissionStore, 'PermissionStore');
