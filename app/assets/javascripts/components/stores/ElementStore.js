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

      handleUnselectCurrentElement: UIActions.deselectAllElements,
      handleSetPagination: UIActions.setPagination,
      handleRefreshElements: ElementActions.refreshElements
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
    this.handleRefreshElements('sample');
  }


  // -- Reactions --

  handleFetchReactionById(result) {
    this.state.currentElement = result;
  }

  handleFetchReactionsByCollectionId(result) {
    this.state.elements.reactions = result;
  }


  // -- Generic --

  handleUnselectCurrentElement() {
    this.state.currentElement = null;
  }

  handleSetPagination(pagination) {
    this.waitFor(UIStore.dispatchToken);
    this.handleRefreshElements(pagination.type);
  }

  handleRefreshElements(type) {
    this.waitFor(UIStore.dispatchToken);
    let uiState = UIStore.getState();
    let page = uiState[type].page
    switch (type) {
      case 'sample':
        ElementActions.fetchSamplesByCollectionId(uiState.currentCollectionId, {page: page})
        break;
      case 'reaction':
        ElementActions.fetchReactionsByCollectionId(uiState.currentCollectionId, {page: page})
        break;
    }
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
