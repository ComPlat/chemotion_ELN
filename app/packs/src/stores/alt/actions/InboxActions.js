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

  showInboxModal() {
    return null;
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

  checkedDeviceAll(params) {
    return params;
  }

  checkedDeviceIds(params) {
    return params;
  }

  checkDeviceAttachments(params) {
    return params;
  }

  prevClick() {
    return null;
  }

  nextClick() {
    return null;
  }

  fetchInbox(queryParams = {}) {
    return (dispatch) => {
      InboxFetcher.fetchInbox(false, queryParams)
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

  fetchInboxContainer(containerId, currentContainerPage) {
    return (dispatch) => {
      InboxFetcher.fetchInboxByContainer(containerId, currentContainerPage)
        .then((result) => {
          dispatch({
            inbox: result.inbox,
            currentContainerPage,
          });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchInboxUnsorted() {
    return (dispatch) => {
      InboxFetcher.fetchInboxUnsorted()
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

  setInboxPagination(pagination) {
    return pagination;
  }

  setInboxVisible(inboxVisible) {
    return inboxVisible;
  }

  setActiveDeviceBoxId(deviceBoxId) {
    return deviceBoxId;
  }

  deleteAttachment(params, fromUnsorted = false) {
    return (dispatch) => {
      AttachmentFetcher.deleteAttachment(params)
        .then((result) => {
          dispatch({
            result,
            fromUnsorted,
          });
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
          dispatch({
            result,
            id: params.id,
          });
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
