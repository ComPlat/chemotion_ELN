import alt from '../alt';
import UserActions from '../actions/UserActions';

class UserStore {
  constructor() {
    this.state = {
      users: [],
      currentUser: null,
      profile: null
    };

    this.bindListeners({
      handleFetchUsers: UserActions.fetchUsers,
      handleFetchCurrentUser: UserActions.fetchCurrentUser,
      handleFetchProfile: UserActions.fetchProfile
    })
  }

  handleFetchUsers(result) {
    this.state.users = result;
  }

  handleFetchCurrentUser(result) {
    this.state.currentUser = result
  }

  handleFetchProfile(result) {
    this.state.profile = result;
  }
}

export default alt.createStore(UserStore, 'UserStore');
