import alt from '../alt';
import ClipboardFetcher from '../fetchers/ClipboardFetcher';

class ClipboardActions {
  fetchSamplesByUIStateAndLimit(params) {
    ClipboardFetcher.fetchSamplesByUIStateAndLimit(params)
      .then((result) => {
        this.dispatch({samples: result.samples, collection_id: params.sample.collection_id});
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
export default alt.createActions(ClipboardActions);
