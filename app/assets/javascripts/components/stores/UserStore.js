import alt from '../alt';
import UserActions from '../actions/UserActions';

class UserStore {
  constructor() {
    this.state = {
      users: [],
      currentUser: null
    };

    this.bindListeners({
      handleFetchUsers: UserActions.fetchUsers,
      handleFetchCurrentUser: UserActions.fetchCurrentUser
    })
  }

  handleFetchUsers(result) {
    this.state.users = result;
  }

  handleFetchCurrentUser(result) {
    this.state.currentUser = result;
  }

}

export default alt.createStore(UserStore, 'UserStore');
