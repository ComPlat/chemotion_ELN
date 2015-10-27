import alt from '../alt';
import ClipboardFetcher from '../fetchers/ClipboardFetcher';

class ClipboardActions {
  fetchSamplesByUIStateAndLimit(params, action) {
    ClipboardFetcher.fetchSamplesByUIStateAndLimit(params)
      .then((result) => {
        this.dispatch({samples: result, collection_id: params.sample.collection_id});
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
export default alt.createActions(ClipboardActions);
