import alt from '../alt';
import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';
import UIStore from './UIStore';

class ElementStore {
  constructor() {
    this.state = {
      elements: {
        samples: {
          elements: [],
          totalElements: [],
          page: null,
          pages: null,
          per_page: null
        }
      },
      currentElement: null
    };

    this.bindListeners({
      handleFetchSampleById: ElementActions.fetchSampleById,
      handleFetchSamplesByCollectionId: ElementActions.fetchSamplesByCollectionId,
      handleUpdateSample: ElementActions.updateSample,
      handleUnselectCurrentElement: UIActions.deselectAllElements
    })
  }

  handleFetchSampleById(result) {
    this.state.currentElement = result; //todo should not be handled here
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.elements.samples = result;
  }

  // update stored sample if it has been updated
  handleUpdateSample(sampleId) {
    ElementActions.fetchSampleById(sampleId);
  }

  handleUnselectCurrentElement() {
    //this.waitFor(UIStore.dispatchToken);
    this.state.currentElement = null;
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
