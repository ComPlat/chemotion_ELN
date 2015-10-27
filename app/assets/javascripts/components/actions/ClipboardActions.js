import alt from '../alt';
import ClipboardFetcher from '../fetchers/ClipboardFetcher';

class ClipboardActions {
  fetchSamplesByUIStateAndLimit(params) {
    ClipboardFetcher.fetchSamplesByUIStateAndLimit(params)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}
export default alt.createActions(ClipboardActions);
