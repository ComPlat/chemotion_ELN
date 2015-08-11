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
    this.state.currentSample = result;
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.samples = result;
  }

  // update stored sample if it has been updated
  handleUpdateSample(sampleId) {
    ElementActions.fetchSampleById(sampleId);
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
