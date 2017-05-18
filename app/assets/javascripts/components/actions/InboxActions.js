import alt from '../alt';
import InboxFetcher from '../fetchers/InboxFetcher';
import AttachmentFetcher from '../fetchers/AttachmentFetcher'

class InboxActions{

  fetchInbox() {
    return (dispatch) => { InboxFetcher.fetchInbox()
      .then((result) => {
        dispatch(result.inbox);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  removeAttachmentFromList(attachment){
    return attachment;
  }

  removeDatasetFromList(dataset){
    return dataset;
  }

  deleteAttachment(params) {
    return (dispatch) => { AttachmentFetcher.deleteAttachment(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }
}

export default alt.createActions(InboxActions);
