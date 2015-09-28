import alt from '../alt';
import PermissionActions from '../actions/PermissionActions';
import Aviator from 'aviator';

class PermissionStore {
  constructor() {
    this.state = {
      is_top_secret: false
    };

    this.bindListeners({
      handleFetchTopSecretStatus: PermissionActions.fetchTopSecretStatus
    })
  }

  handleFetchTopSecretStatus(result) {
    this.state.is_top_secret = result.is_top_secret;

    if(!this.state.is_top_secret) {
      Aviator.navigate('/sharing');
    }
  }
}

export default alt.createStore(PermissionStore, 'PermissionStore');
