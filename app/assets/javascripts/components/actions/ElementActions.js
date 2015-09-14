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

  createSample(paramObj) {
    delete paramObj['id'];
    SamplesFetcher.create(paramObj)
      .then((result) => {
        this.dispatch(result.sample.id)
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

  fetchReactionById(id) {
    ReactionsFetcher.fetchById(id)
      .then((result) => {
        this.dispatch(result.reaction);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
  }

  refreshElements(type) {
    this.dispatch(type)
  }

  generateEmptySample() {
    let sample = {
      id: '_new_',
      type: 'sample',
      name: 'New Sample',
      amount_value: 0,
      amount_unit: 'g',
      description: '',
      purity: 0,
      solvent: '',
      impurities: '',
      location: '',
      molfile: '',
      molecule: {}
    }
    this.dispatch(sample)
  }
}

export default alt.createActions(ElementActions);
