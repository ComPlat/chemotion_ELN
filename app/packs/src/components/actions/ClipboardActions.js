import alt from '../alt';
import SamplesFetcher from '../fetchers/SamplesFetcher';
import WellplatesFetcher from '../fetchers/WellplatesFetcher';


class ClipboardActions {
  fetchSamplesByUIStateAndLimit(params, action) {
    return (dispatch) => { SamplesFetcher.fetchSamplesByUIStateAndLimit(params)
      .then((result) => {
        dispatch({samples: result, collection_id: params.sample.collection_id, action: action});
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchWellplatesByUIState(params, action) {
    return (dispatch) => { WellplatesFetcher.fetchWellplatesByUIState(params)
      .then((result) => {
        dispatch({wellplates: result, collection_id: params.wellplate.collection_id, action: action});
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchElementAndBuildCopy(sample, collection_id, action) {
    sample.collection_id = collection_id;
    return (
      { samples: [sample], collection_id: collection_id, action: action}
    )
  }
}
export default alt.createActions(ClipboardActions);
