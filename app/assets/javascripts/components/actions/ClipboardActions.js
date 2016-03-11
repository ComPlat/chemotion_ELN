import alt from '../alt';
import ClipboardFetcher from '../fetchers/ClipboardFetcher';

class ClipboardActions {
  fetchSamplesByUIStateAndLimit(params, action) {
  return (dispatch) => {  ClipboardFetcher.fetchSamplesByUIStateAndLimit(params)
      .then((result) => {
        dispatch({samples: result, collection_id: params.sample.collection_id, action: action});
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchWellplatesByUIState(params, action) {
  return (dispatch) => {  ClipboardFetcher.fetchWellplatesByUIState(params)
      .then((result) => {
        dispatch({wellplates: result, collection_id: params.wellplate.collection_id, action: action});
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }
}
export default alt.createActions(ClipboardActions);
