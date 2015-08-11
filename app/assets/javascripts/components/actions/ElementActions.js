import alt from '../alt';
import SamplesFetcher from '../fetchers/SamplesFetcher';

class ElementActions {
  fetchSampleById(id) {
    SamplesFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result.sample);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  fetchSamplesByCollectionId(id) {
    SamplesFetcher.fetchByCollectionId(id)
      .then((result) => {
        // TODO adjust when CollectionAPI fixed
        this.dispatch(result[':id']);
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
}

export default alt.createActions(ElementActions);
