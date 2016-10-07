import alt from '../alt';
import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';
import UserActions from '../actions/UserActions';
import UIStore from './UIStore';
import ClipboardStore from './ClipboardStore';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';

import {extraThing} from '../utils/Functions';
import Xlisteners from '../extra/ElementStoreXlisteners';
import Xhandlers from '../extra/ElementStoreXhandlers';
import Xstate from '../extra/ElementStoreXstate';

import Aviator from 'aviator'

class ElementStore {
  constructor() {
    this.state = {
      elements: {
        samples: {
          elements: [],
          totalElements: 0,
          page: null,
          pages: null,
          perPage: null
        },
        reactions: {
          elements: [],
          totalElements: 0,
          page: null,
          pages: null,
          perPage: null
        },
        wellplates: {
          elements: [],
          totalElements: 0,
          page: null,
          pages: null,
          perPage: null
        },
        screens: {
          elements: [],
          totalElements: 0,
          page: null,
          pages: null,
          perPage: null
        }
      },
      currentElement: null,
      currentReaction: null,
      currentWellplate: null,
      currentMaterialGroup: null,
      elementWarning: false,
      ...extraThing("state",Xstate)
    };


    for (let i = 0; i < Xlisteners.listenersCount; i++){
      Object.keys(Xlisteners["listeners"+i]).map((k) => {
        this.bindAction(Xlisteners["listeners" + i][k],
                        Xhandlers["handlers" + i][k].bind(this))
      });
    }

    this.bindListeners({

      handleFetchBasedOnSearchSelection:
        ElementActions.fetchBasedOnSearchSelectionAndCollection,
      handleFetchSampleById: ElementActions.fetchSampleById,
      handleFetchSamplesByCollectionId:
        ElementActions.fetchSamplesByCollectionId,
      handleUpdateSample: ElementActions.updateSample,
      handleCreateSample: ElementActions.createSample,
      handleCreateSampleForReaction: ElementActions.createSampleForReaction,
      handleEditReactionSample: ElementActions.editReactionSample,
      handleEditWellplateSample: ElementActions.editWellplateSample,
      handleUpdateSampleForReaction: ElementActions.updateSampleForReaction,
      handleUpdateSampleForWellplate: ElementActions.updateSampleForWellplate,
      handleCopySampleFromClipboard: ElementActions.copySampleFromClipboard,
      handleAddSampleToMaterialGroup: ElementActions.addSampleToMaterialGroup,
      handleImportSamplesFromFile: ElementActions.importSamplesFromFile,
      handleDeselectCurrentElement: ElementActions.deselectCurrentElement,
      handleDeselectCurrentReaction: ElementActions.deselectCurrentReaction,

      handleFetchReactionById: ElementActions.fetchReactionById,
      handleTryFetchReactionById: ElementActions.tryFetchReactionById,
      handleCloseWarning: ElementActions.closeWarning,
      handleFetchReactionsByCollectionId:
        ElementActions.fetchReactionsByCollectionId,
      handleUpdateReaction: ElementActions.updateReaction,
      handleCreateReaction: ElementActions.createReaction,
      handleCopyReactionFromId: ElementActions.copyReactionFromId,
      handleFetchReactionSvgByMaterialsSvgPaths:
        ElementActions.fetchReactionSvgByMaterialsSvgPaths,
      handleOpenReactionDetails: ElementActions.openReactionDetails,

      handleBulkCreateWellplatesFromSamples:
        ElementActions.bulkCreateWellplatesFromSamples,
      handleFetchWellplateById: ElementActions.fetchWellplateById,
      handleFetchWellplatesByCollectionId:
        ElementActions.fetchWellplatesByCollectionId,
      handleUpdateWellplate: ElementActions.updateWellplate,
      handleCreateWellplate: ElementActions.createWellplate,
      handleGenerateWellplateFromClipboard:
        ElementActions.generateWellplateFromClipboard,
      handleGenerateScreenFromClipboard:
        ElementActions.generateScreenFromClipboard,

      handleFetchScreenById: ElementActions.fetchScreenById,
      handleFetchScreensByCollectionId:
        ElementActions.fetchScreensByCollectionId,
      handleUpdateScreen: ElementActions.updateScreen,
      handleCreateScreen: ElementActions.createScreen,

      handleUnselectCurrentElement: UIActions.deselectAllElements,
      // FIXME ElementStore listens to UIActions?
      handleSetPagination: UIActions.setPagination,
      handleRefreshElements: ElementActions.refreshElements,
      handleGenerateEmptyElement:
        [
          ElementActions.generateEmptyWellplate,
          ElementActions.generateEmptyScreen,
          ElementActions.generateEmptySample,
          ElementActions.generateEmptyReaction,
          ElementActions.showReportContainer
        ],
      handleFetchMoleculeByMolfile: ElementActions.fetchMoleculeByMolfile,
      handleDeleteElements: ElementActions.deleteElements,

      handleUpdateElementsCollection: ElementActions.updateElementsCollection,
      handleAssignElementsCollection: ElementActions.assignElementsCollection,
      handleRemoveElementsCollection: ElementActions.removeElementsCollection,
      handleSplitAsSubsamples: ElementActions.splitAsSubsamples,
    })
  }


  handleFetchBasedOnSearchSelection(result) {
    Object.keys(result).forEach((key) => {
      this.state.elements[key] = result[key];
    });
  }

  handlefetchBasedOnStructureAndCollection(result) {
    Object.keys(result).forEach((key) => {
      this.state.elements[key] = result[key];
    });
  }

  closeElementWhenDeleted(ui_state) {
    let currentElement = this.state.currentElement;
    if (currentElement) {
      let type_state = ui_state[currentElement.type]
      let checked = type_state.checkedIds.indexOf(currentElement.id) > -1
      let checked_all_and_not_unchecked = type_state.checkedAll &&
        type_state.uncheckedIds.indexOf(currentElement.id) == -1

      if (checked_all_and_not_unchecked || checked) {
        this.state.currentElement = null;
      }
    }
  }

  // -- Elements --
  handleDeleteElements(options) {
    this.waitFor(UIStore.dispatchToken);
    const ui_state = UIStore.getState();
    ElementActions.deleteSamplesByUIState(ui_state);
    ElementActions.deleteReactionsByUIState({
      ui_state,
      options
    });
    ElementActions.deleteWellplatesByUIState(ui_state);
    ElementActions.deleteScreensByUIState(ui_state);
    ElementActions.fetchSamplesByCollectionId(ui_state.currentCollection.id);
    ElementActions.fetchReactionsByCollectionId(ui_state.currentCollection.id);
    ElementActions.fetchWellplatesByCollectionId(ui_state.currentCollection.id);
    ElementActions.fetchScreensByCollectionId(ui_state.currentCollection.id);
    this.closeElementWhenDeleted(ui_state);
  }

  handleUpdateElementsCollection(params) {
    let collection_id = params.ui_state.currentCollection.id
    ElementActions.fetchSamplesByCollectionId(collection_id);
    ElementActions.fetchReactionsByCollectionId(collection_id);
    ElementActions.fetchWellplatesByCollectionId(collection_id);
  }

  handleAssignElementsCollection(params) {
    let collection_id = params.ui_state.currentCollection.id
    ElementActions.fetchSamplesByCollectionId(collection_id);
    ElementActions.fetchReactionsByCollectionId(collection_id);
    ElementActions.fetchWellplatesByCollectionId(collection_id);
  }

  handleRemoveElementsCollection(params) {
    let collection_id = params.ui_state.currentCollection.id
    ElementActions.fetchSamplesByCollectionId(collection_id);
    ElementActions.fetchReactionsByCollectionId(collection_id);
    ElementActions.fetchWellplatesByCollectionId(collection_id);
  }

  // -- Samples --

  handleFetchSampleById(result) {
    this.state.currentElement = result;
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.elements.samples = result;
  }

  handleUpdateSample(sample) {
    this.state.currentElement = sample;
    this.handleRefreshElements('sample');
  }

  handleCreateSample(sample) {
    UserActions.fetchCurrentUser();

    this.handleRefreshElements('sample');
    this.navigateToNewElement(sample);
  }

  handleCreateSampleForReaction(sample) {
    UserActions.fetchCurrentUser();
    let materialGroup = this.state.currentMaterialGroup;
    let reaction = this.state.currentReaction;

    reaction.addMaterial(sample, materialGroup);
    reaction.temporary_sample_counter += 1;

    this.handleRefreshElements('sample');

    this.state.currentReaction = null;
    this.state.currentElement = reaction;
  }

  handleEditReactionSample(result){
    this.state.currentReaction = result.reaction;
    this.state.currentElement = result.sample;
  }

  handleEditWellplateSample(result){
    this.state.currentWellplate = result.wellplate;
    this.state.currentElement = result.sample;
  }

  handleDeselectCurrentElement() {
    this.state.currentElement = null;
  }

  handleDeselectCurrentReaction() {
    this.state.currentReaction = null;
  }

  handleUpdateSampleForReaction() {
    UserActions.fetchCurrentUser();
    let reactionID = this.state.currentReaction;
    this.state.currentElement = null;
    this.state.currentReaction = null;

    this.handleRefreshElements('sample');

    ElementActions.fetchReactionById(reactionID)
  }

  handleUpdateSampleForWellplate() {
    UserActions.fetchCurrentUser()
    let wellplateID = this.state.currentWellplate
    this.state.currentElement = null
    this.state.currentWellplate = null

    this.handleRefreshElements('sample')

    ElementActions.fetchWellplateById(wellplateID)
  }

  handleSplitAsSubsamples(ui_state) {
    ElementActions.fetchSamplesByCollectionId(ui_state.currentCollection.id);
  }

  // Molecules
  handleFetchMoleculeByMolfile(result) {
    // Attention: This is intended to update SampleDetails
    this.state.currentElement.molecule = result;
    this.handleRefreshElements('sample');
  }

  // Samples with residues
  handleFetchResidueByMolfile(result) {
    // Attention: This is intended to update SampleDetails
    //this.state.currentElement.molecule = result;
    this.state.currentElement.sample = result;
    this.handleRefreshElements('sample');
  }

  handleCopySampleFromClipboard(collection_id) {
    let clipboardSamples = ClipboardStore.getState().samples;

    this.state.currentElement =
      Sample.copyFromSampleAndCollectionId(clipboardSamples[0],
                                           collection_id, true)
  }

  /**
   * @param {Object} params = { reaction, materialGroup }
   */
  handleAddSampleToMaterialGroup(params) {
    const { materialGroup } = params
    let { reaction } = params
    const { temporary_sample_counter } = reaction

    let sample = Sample.buildReactionSample(reaction.collection_id,
                                            temporary_sample_counter,
                                            materialGroup)

    this.state.currentMaterialGroup = materialGroup
    reaction.changed = true
    this.state.currentReaction = reaction
    this.state.currentElement = sample
  }

  handleImportSamplesFromFile() {
    this.handleRefreshElements('sample');
  }

  // -- Wellplates --

  handleBulkCreateWellplatesFromSamples() {
    this.handleRefreshElements('wellplate');
    this.handleRefreshElements('sample');
  }

  handleFetchWellplateById(result) {
    this.state.currentElement = result;
    this.navigateToNewElement(result)
  }

  handleFetchWellplatesByCollectionId(result) {
    this.state.elements.wellplates = result;
  }

  handleUpdateWellplate(wellplate) {
    this.state.currentElement = wellplate;
    this.handleRefreshElements('wellplate');
    this.handleRefreshElements('sample');
  }

  handleCreateWellplate(wellplate) {
    this.handleRefreshElements('wellplate');
    this.navigateToNewElement(wellplate);
  }

  handleGenerateWellplateFromClipboard(collection_id) {
    let clipboardSamples = ClipboardStore.getState().samples;

    this.state.currentElement =
      Wellplate.buildFromSamplesAndCollectionId(clipboardSamples, collection_id);
  }
  // -- Screens --

  handleFetchScreenById(result) {
    this.state.currentElement = result;
  }

  handleFetchScreensByCollectionId(result) {
    this.state.elements.screens = result;
  }

  handleUpdateScreen(screen) {
    this.state.currentElement = screen;
    this.handleRefreshElements('screen');
  }

  handleCreateScreen(screen) {
    this.handleRefreshElements('screen');
    this.navigateToNewElement(screen);
  }

  handleGenerateScreenFromClipboard(collection_id) {
    let clipboardWellplates = ClipboardStore.getState().wellplates;

    this.state.currentElement =
      Screen.buildFromWellplatesAndCollectionId(clipboardWellplates,
                                                collection_id);
  }

  // -- Reactions --

  handleFetchReactionById(result) {
    this.state.currentElement = result;
    this.state.elements.reactions.elements = this.refreshReactionsListForSpecificReaction(result);
    this.navigateToNewElement(result);
  }

  refreshReactionsListForSpecificReaction(newReaction) {
    return this.state.elements.reactions.elements.map( reaction => {
      return reaction.id === newReaction.id
        ? newReaction
        : reaction
    });
  }

  handleTryFetchReactionById(result) {
    if (result.hasOwnProperty("error")) {
      this.state.elementWarning = true
    } else {
      this.state.currentElement = result
      this.navigateToNewElement(result)
    }
  }

  handleCloseWarning() {
    this.state.elementWarning = false
  }

  handleFetchReactionsByCollectionId(result) {
    this.state.elements.reactions = result;
  }

  handleUpdateReaction(reaction) {
    UserActions.fetchCurrentUser();

    this.state.currentElement = reaction;
    this.handleRefreshElements('reaction');
    this.handleRefreshElements('sample');
  }

  handleCreateReaction(reaction) {
    UserActions.fetchCurrentUser();
    this.handleRefreshElements('reaction');
    this.navigateToNewElement(reaction);
  }

  handleCopyReactionFromId(reaction) {
    this.waitFor(UIStore.dispatchToken);
    const uiState = UIStore.getState();
    this.state.currentElement =
      Reaction.copyFromReactionAndCollectionId(reaction,
                                               uiState.currentCollection.id);
  }

  handleOpenReactionDetails(reaction) {
    this.state.currentReaction = null;
    this.state.currentElement = reaction;
  }

  // -- Reactions Literatures --

  handleCreateReactionLiterature(result) {
    this.state.currentElement.literatures.push(result);
  }

  handleDeleteReactionLiterature(reactionId) {
    ElementActions.fetchLiteraturesByReactionId(reactionId);
    this.handleRefreshElements('reaction');
  }

  handleFetchLiteraturesByReactionId(result) {
    this.state.currentElement.literatures = result.literatures;
  }

  // -- Reactions SVGs --

  handleFetchReactionSvgByMaterialsSvgPaths(result) {
    this.state.currentElement.reaction_svg_file = result;
  }

  // -- Generic --

  navigateToNewElement(element) {
    this.waitFor(UIStore.dispatchToken);
    const {currentCollection,isSync} = UIStore.getState();
    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/${element.type}/${element.id}`
      : `/collection/${currentCollection.id}/${element.type}/${element.id}`
    );
  }

  handleGenerateEmptyElement(element) {
    let {currentElement} = this.state;

    const newElementOfSameTypeIsPresent =
      currentElement && currentElement.isNew && currentElement.type ==
      element.type;
    if(!newElementOfSameTypeIsPresent) {
      this.state.currentElement = element;
    }
  }

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

    this.state.elements[type+'s'].page = page;
    let currentSearchSelection = uiState.currentSearchSelection;

    // TODO if page changed -> fetch
    // if there is a currentSearchSelection
    //    we have to execute the respective action
    if(currentSearchSelection != null) {
      ElementActions.fetchBasedOnSearchSelectionAndCollection(currentSearchSelection,
        uiState.currentCollection.id, page, uiState.isSync)
    } else {
      ElementActions.fetchSamplesByCollectionId(uiState.currentCollection.id,
        {page: page, per_page: uiState.number_of_results},uiState.isSync);

      switch (type) {
        // fetch samples to handle creation of split samples
        case 'reaction':
          ElementActions.fetchReactionsByCollectionId(uiState.currentCollection.id,
            {page: page, per_page: uiState.number_of_results},uiState.isSync);
          break;
        case 'wellplate':
          ElementActions.fetchWellplatesByCollectionId(uiState.currentCollection.id,
            {page: page, per_page: uiState.number_of_results},uiState.isSync);
          break;
        case 'screen':
          ElementActions.fetchScreensByCollectionId(uiState.currentCollection.id,
            {page: page, per_page: uiState.number_of_results},uiState.isSync);
          break;
      }
    }
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
