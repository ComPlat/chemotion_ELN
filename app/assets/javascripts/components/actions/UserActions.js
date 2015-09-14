import alt from '../alt';
import UsersFetcher from '../fetchers/UsersFetcher';
import cookie from 'react-cookie';

import DocumentHelper from '../utils/DocumentHelper';


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
    fetch('/users/sign_out', {
      method: 'delete',
      credentials: 'same-origin',
      data: {authenticity_token: DocumentHelper.getMetaContent("csrf-token")}
    })
    .then(response => {
      console.log(response);
      if (response.status == 204) {
        location.reload();
      }
    });
  }
}

export default alt.createActions(UserActions);
