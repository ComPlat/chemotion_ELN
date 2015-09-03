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
          totalElements: 0,
          page: null,
          pages: null,
          per_page: null
        },
        reactions: {
          elements: [],
          totalElements: 0,
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

      handleFetchReactionById: ElementActions.fetchReactionById,
      handleFetchReactionsByCollectionId: ElementActions.fetchReactionsByCollectionId,

      handleUnselectCurrentElement: UIActions.deselectAllElements
    })
  }


  // -- Samples --

  handleFetchSampleById(result) {
    this.state.currentElement = result;
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.elements.samples = result;
  }

  // update stored sample if it has been updated
  handleUpdateSample(sampleId) {
    ElementActions.fetchSampleById(sampleId);
  }


  // -- Reactions --

  handleFetchReactionById(result) {
    console.log('handleFetchReactionById');
    //console.log(result);
    this.state.currentElement = result;
  }

  handleFetchReactionsByCollectionId(result) {
    console.log('handleFetchReactionsByCollectionId');
    //console.log(result);
    this.state.elements.reactions = result;
  }


  // -- Generic --

  handleUnselectCurrentElement() {
    //this.waitFor(UIStore.dispatchToken);
    this.state.currentElement = null;
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
