import alt from 'src/stores/alt/alt';
import InboxFetcher from 'src/fetchers/InboxFetcher';
import AttachmentFetcher from 'src/fetchers/AttachmentFetcher';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';

class InboxActions {
  deleteContainerLinkUnselected(params) {
    return (dispatch) => {
      ContainerFetcher.deleteContainerLinkUnselected(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  toggleInboxModal() {
    return null
  }

  checkedAll(params) {
    return params;
  }

  handleCheckedAll(params) {
    return params;
  }

  checkedIds(params) {
    return params;
  }

  fetchInbox() {
    return (dispatch) => {
      InboxFetcher.fetchInbox(false)
        .then((result) => {
          dispatch(result.inbox);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchInboxCount() {
    return (dispatch) => {
      InboxFetcher.fetchInbox(true)
        .then((result) => {
          dispatch(result.inbox);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  removeAttachmentFromList(attachment) {
    return attachment;
  }

  removeUnlinkedAttachmentFromList(attachment) {
    return attachment;
  }

  removeDatasetFromList(dataset) {
    return dataset;
  }

  deleteAttachment(params) {
    return (dispatch) => {
      AttachmentFetcher.deleteAttachment(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  deleteContainerLink(params) {
    return (dispatch) => {
      AttachmentFetcher.deleteContainerLink(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  deleteContainer(params) {
    return (dispatch) => {
      ContainerFetcher.deleteContainer(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  backToInbox(attachment) {
    return attachment
  }

}

export default alt.createActions(InboxActions);
