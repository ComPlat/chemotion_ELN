import alt from '../alt';
import UsersFetcher from '../fetchers/UsersFetcher';

class UserActions {

  fetchUsers() {
    UsersFetcher.fetchUsers()
      .then((result) => {
        this.dispatch(result.users);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchCurrentUser() {
    UsersFetcher.fetchCurrentUser()
      .then((result) => {
        this.dispatch(result.user);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

}

export default alt.createActions(UserActions);