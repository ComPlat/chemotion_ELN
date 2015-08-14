import alt from '../alt';
import ElementActions from '../actions/ElementActions';

class ElementStore {
  constructor() {
    this.state = {
      samples: [],
      currentElement: null
    };

    this.bindListeners({
      handleFetchSampleById: ElementActions.fetchSampleById,
      handleFetchSamplesByCollectionId: ElementActions.fetchSamplesByCollectionId,
      handleUpdateSample: ElementActions.updateSample,
      handleUnloadSample: ElementActions.unloadSample
    })
  }

  handleFetchSampleById(result) {
    this.state.currentElement = result; //todo should not be handled here
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.samples = result;
  }

  // update stored sample if it has been updated
  handleUpdateSample(sampleId) {
    ElementActions.fetchSampleById(sampleId);
  }

  handleUnloadSample() {
    this.state.currentElement = null;
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
