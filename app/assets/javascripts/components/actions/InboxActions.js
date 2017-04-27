import alt from '../alt';
import InboxFetcher from '../fetchers/InboxFetcher';

class InboxActions{

  fetchInbox() {
    return (dispatch) => { InboxFetcher.fetchInbox()
      .then((result) => {
        dispatch(result.inbox);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }
}

export default alt.createActions(InboxActions);
