import alt from '../alt';
import AttachmentFetcher from '../fetchers/AttachmentFetcher';
import ContainerFetcher from '../fetchers/ContainerFetcher';

class FreeScanActions {
  fetchFreeScan() {
    return (dispatch) => {
      AttachmentFetcher.fetchFreeScan(false)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchFreeScanCount() {
    return (dispatch) => {
      AttachmentFetcher.fetchFreeScan(true)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  deleteContainer(params) {
    return (dispatch) => { ContainerFetcher.deleteContainerById(params.attachable_id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }
}

export default alt.createActions(FreeScanActions);
