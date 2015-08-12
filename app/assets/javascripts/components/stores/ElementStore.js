import alt from '../alt';
import ElementActions from '../actions/ElementActions';

class ElementStore {
  constructor() {
    this.state = {
      samples: [],
      currentSample: null
    };

    this.bindListeners({
      handleFetchSampleById: ElementActions.fetchSampleById,
      handleFetchSamplesByCollectionId: ElementActions.fetchSamplesByCollectionId,
      handleUpdateSample: ElementActions.updateSample
    })
  }

  handleFetchSampleById(result) {
    this.state.currentSample = result; //todo should not be handled here
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.samples = result;
    this.state.currentSample = null; //todo should not be handled here
  }

  // update stored sample if it has been updated
  handleUpdateSample(sampleId) {
    ElementActions.fetchSampleById(sampleId);
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
