import alt from '../alt';
import UsersFetcher from '../fetchers/UsersFetcher';
import SegmentsFetcher from '../fetchers/SegmentsFetcher';

import cookie from 'react-cookie'
import DocumentHelper from '../utils/DocumentHelper';

class UserActions {
  fetchOlsRxno() {
    return (dispatch) => {
      UsersFetcher.fetchOls('rxno')
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchOlsChmo() {
    return (dispatch) => {
      UsersFetcher.fetchOls('chmo')
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  fetchCurrentUser() {
    return (dispatch) => { UsersFetcher.fetchCurrentUser()
      .then((result) => {
        dispatch(result.user);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchGenericEls() {
    return (dispatch) => { UsersFetcher.fetchElementKlasses()
      .then((roots) => {
        dispatch(roots);
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
    return (dispatch) => {
      UsersFetcher.fetchProfile()
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  selectTab(tab) {
    return  tab;
  }

  updateUserProfile(params) {
    return (dispatch) => { UsersFetcher.updateUserProfile(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchUserLabels() {
    return (dispatch) => {
      UsersFetcher.listUserLabels(true)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchNoVNCDevices() {
    return (dispatch) => {
      UsersFetcher.fetchNoVNCDevices()
        .then(result => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  fetchSegmentKlasses() {
    return (dispatch) => {
      SegmentsFetcher.fetchKlass()
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
}

export default alt.createActions(UserActions);
