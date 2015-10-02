import alt from '../alt';
import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';
import UIStore from './UIStore';

import Sample from '../models/Sample'

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
        },
        wellplates: {
          elements: [],
          totalElements: 0,
          page: null,
          pages: null,
          per_page: null
        },
        screens: {
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
      handleCreateSample: ElementActions.createSample,

      handleFetchReactionById: ElementActions.fetchReactionById,
      handleFetchReactionsByCollectionId: ElementActions.fetchReactionsByCollectionId,
      handleCreateReactionLiterature: ElementActions.createReactionLiterature,
      handleDeleteReactionLiterature: ElementActions.deleteReactionLiterature,
      handleFetchLiteraturesByReactionId: ElementActions.fetchLiteraturesByReactionId,
      handleFetchReactionSvgByMaterialsInchikeys: ElementActions.fetchReactionSvgByMaterialsInchikeys,
      handleFetchReactionSvgByReactionId: ElementActions.fetchReactionSvgByReactionId,

      handleFetchWellplateById: ElementActions.fetchWellplateById,
      handleFetchWellplatesByCollectionId: ElementActions.fetchWellplatesByCollectionId,

      handleFetchScreenById: ElementActions.fetchScreenById,
      handleFetchScreensByCollectionId: ElementActions.fetchScreensByCollectionId,

      handleUnselectCurrentElement: UIActions.deselectAllElements,
      handleSetPagination: UIActions.setPagination,
      handleRefreshElements: ElementActions.refreshElements,
      handleGenerateEmptySample: ElementActions.generateEmptySample,
      handleFetchMoleculeByMolfile: ElementActions.fetchMoleculeByMolfile,
      handleDeleteElements: ElementActions.deleteElements,

      handleUpdateElementsCollection: ElementActions.updateElementsCollection,
      handleAssignElementsCollection: ElementActions.assignElementsCollection,
      handleRemoveElementsCollection: ElementActions.removeElementsCollection,
      handleSplitAsSubsamples: ElementActions.splitAsSubsamples
    })
  }

  // -- Elements --
  handleDeleteElements(ui_state) {
    ElementActions.deleteSamplesByUIState(ui_state);
    ElementActions.deleteReactionsByUIState(ui_state);
    ElementActions.deleteWellplatesByUIState(ui_state);
    ElementActions.fetchSamplesByCollectionId(ui_state.currentCollectionId);
    ElementActions.fetchReactionsByCollectionId(ui_state.currentCollectionId);
    ElementActions.fetchWellplatesByCollectionId(ui_state.currentCollectionId);
  }

  handleUpdateElementsCollection(paramObj) {
    let collection_id = paramObj.ui_state.currentCollectionId
    ElementActions.fetchSamplesByCollectionId(collection_id);
    ElementActions.fetchReactionsByCollectionId(collection_id);
    ElementActions.fetchWellplatesByCollectionId(collection_id);
  }

  handleAssignElementsCollection(paramObj) {
    let collection_id = paramObj.ui_state.currentCollectionId
    ElementActions.fetchSamplesByCollectionId(collection_id);
    ElementActions.fetchReactionsByCollectionId(collection_id);
    ElementActions.fetchWellplatesByCollectionId(collection_id);
  }

  handleRemoveElementsCollection(paramObj) {
    let collection_id = paramObj.ui_state.currentCollectionId
    ElementActions.fetchSamplesByCollectionId(collection_id);
    ElementActions.fetchReactionsByCollectionId(collection_id);
    ElementActions.fetchWellplatesByCollectionId(collection_id);
  }

  // -- Samples --

  handleFetchSampleById(result) {
    console.log(result)
    this.state.currentElement = result;
  }

  handleGenerateEmptySample(result) {
    this.state.currentElement = new Sample;
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.elements.samples = result
  }

  // update stored sample if it has been updated
  handleUpdateSample(sampleId) {
    ElementActions.fetchSampleById(sampleId);
    this.handleRefreshElements('sample');
  }

  // Update Stored Sample if it has been created
  handleCreateSample(sampleId) {
    ElementActions.fetchSampleById(sampleId);
    this.state.currentElement.id = sampleId;
    this.handleRefreshElements('sample');
  }

  handleSplitAsSubsamples(ui_state) {
    ElementActions.fetchSamplesByCollectionId(ui_state.currentCollectionId);
  }

  // Molecules
  handleFetchMoleculeByMolfile(result) {
    // Attention: This is intended to update SampleDetails
    this.state.currentElement.molecule = result;
    this.handleRefreshElements('sample');
  }

  // -- Wellplates --

  handleFetchWellplateById(result) {
    this.state.currentElement = result;
  }

  handleFetchWellplatesByCollectionId(result) {
    this.state.elements.wellplates = result;
  }

  // -- Screens --

  handleFetchScreenById(result) {
    this.state.currentElement = result;
  }

  handleFetchScreensByCollectionId(result) {
    this.state.elements.screens = result;
  }

  // -- Reactions --

  handleFetchReactionById(result) {
    this.state.currentElement = result;
  }

  handleFetchReactionsByCollectionId(result) {
    this.state.elements.reactions = result;
  }

  handleCreateReactionLiterature(result) {
    this.state.currentElement.literatures.push(result);
  }

  handleDeleteReactionLiterature(reactionId) {
    ElementActions.fetchLiteraturesByReactionId(reactionId);
    this.handleRefreshElements('reaction');
  }

  handleFetchLiteraturesByReactionId(result) {
    console.log("handleFetchLiteraturesByReactionId: ");
    console.log(result);
    this.state.currentElement.literatures = result.literatures;
  }

  handleFetchReactionSvgByMaterialsInchikeys(result) {
    this.state.currentElement.reactionSvg = result;
  }

  handleFetchReactionSvgByReactionId(result) {
    this.state.currentElement.reactionSvg = result;
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
    let page = uiState[type].page;
    switch (type) {
      case 'sample':
        ElementActions.fetchSamplesByCollectionId(uiState.currentCollectionId, {page: page});
        break;
      case 'reaction':
        ElementActions.fetchReactionsByCollectionId(uiState.currentCollectionId, {page: page});
        break;
      case 'wellplate':
        ElementActions.fetchWellplatesByCollectionId(uiState.currentCollectionId, {page: page});
        break;
      case 'screen':
        ElementActions.fetchScreensByCollectionId(uiState.currentCollectionId, {page: page});
        break;
    }
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
