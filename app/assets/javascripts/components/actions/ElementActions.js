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

  updateElements(elements) {
    this.dispatch(elements);
  }
}

export default alt.createActions(ElementActions);
