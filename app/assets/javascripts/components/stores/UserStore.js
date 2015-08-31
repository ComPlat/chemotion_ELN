import alt from '../alt';
import UserActions from '../actions/UserActions';

class UserStore {
  constructor() {
    this.state = {
      visibleUsers: [],
      currentUser: null
    };

    this.bindListeners({
      handleFetchUsers: UserActions.fetchUsers,
      handleFetchCurrentUser: UserActions.fetchCurrentUser
    })
  }

  handleFetchUsers(result) {
    this.state.visibleUsers = result;
  }

  handleFetchCurrentUser(result) {
    this.state.currentUser = result;
  }

}

export default alt.createStore(UserStore, 'UserStore');