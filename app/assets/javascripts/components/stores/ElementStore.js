import alt from '../alt';
import ElementActions from '../actions/ElementActions';

class ElementStore {
  constructor() {
    this.state = {
      samples: []
    };

    this.bindListeners({
      handleFetchSampleById: ElementActions.fetchSampleById,
      handleUpdateElements: ElementActions.updateElements
    })
  }

  handleFetchSampleById(result) {
    this.state.samples = [result];
  }

  handleUpdateElements(elements) {
    switch(elements.type) {
      case 'sample':
        this.state.samples = elements.samples;
        break;
    }
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
