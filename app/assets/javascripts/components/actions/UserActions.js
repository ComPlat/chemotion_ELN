import alt from '../alt';
import UsersFetcher from '../fetchers/UsersFetcher';
import cookie from 'react-cookie';

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

  logout() {
    console.log("LOGGING OUT");
    fetch('/api/v1/users/sign_out', {method: 'delete', credentials: 'same-origin'})
      .then(response => {
        console.log(response);
        if (response.status == 204) {
          console.log("DELETING COOKIE");
          cookie.remove('_chemotion_session');
          window.location = '/users/sign_in';
        }
      });
  }

}

export default alt.createActions(UserActions);