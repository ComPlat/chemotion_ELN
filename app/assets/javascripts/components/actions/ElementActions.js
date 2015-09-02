import alt from '../alt';
import SamplesFetcher from '../fetchers/SamplesFetcher';
import ReactionsFetcher from '../fetchers/ReactionsFetcher';

class ElementActions {

  fetchSampleById(id) {
    SamplesFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result.sample);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchSamplesByCollectionId(id, queryParams={}) {
    SamplesFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  updateSample(paramObj) {
    SamplesFetcher.update(paramObj)
      .then((result) => {
        this.dispatch(paramObj.id)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchReactionsByCollectionId(id, queryParams={}) {
    ReactionsFetcher.fetchByCollectionId(id, queryParams)
      .then((result) => {
        this.dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }
}

export default alt.createActions(ElementActions);
