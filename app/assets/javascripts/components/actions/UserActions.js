import alt from '../alt';
import UsersFetcher from '../fetchers/UsersFetcher';
import cookie from 'react-cookie';

import DocumentHelper from '../utils/DocumentHelper';


class UserActions {

  fetchUsers() {
    return (dispatch) => { UsersFetcher.fetchUsers()
      .then((result) => {
        dispatch(result.users);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchCurrentUser() {
    return (dispatch) => { UsersFetcher.fetchCurrentUser()
      .then((result) => {
        dispatch(result.user);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  logout() {
    fetch('/users/sign_out', {
      method: 'delete',
      credentials: 'same-origin',
      data: {authenticity_token: DocumentHelper.getMetaContent("csrf-token")}
    })
    .then(response => {
      if (response.status == 204) {
        location.reload();
      }
    });
  }

  fetchProfile() {
    return (dispatch) => { UsersFetcher.fetchProfile()
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  changeLayout(layout) {
    return (dispatch) => { UsersFetcher.updateCurrentUserLayout(layout)
      .then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage)
      })
    }
  }

  selectTab(tab) {
    return  tab;
  }

  updateShowSampleExt(show) {
    return (dispatch) => { UsersFetcher.updateShowSampleExt(show)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

}

export default alt.createActions(UserActions);
