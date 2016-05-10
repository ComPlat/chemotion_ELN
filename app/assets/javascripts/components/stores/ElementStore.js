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

import extraES from '../extra/testExtra';
//import extraES from '../extra/ElementStoreExtra';
//import extraCS from '../extra/CollectionStoreExtra';
//import {extraThing} from '../utils/Functions'


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
      currentMaterialGroup: null,
      //...extraThing("state",extraES)
    };

    for (let i=0;i<extraES.listenersCount;i++){
      Object.keys(extraES["listeners"+i]).map((k)=>{
        this.bindAction(extraES["listeners"+i][k],extraES["handlers"+i][k].bind(this))
      });
    }


    this.bindListeners({
      handleFetchBasedOnSearchSelection: ElementActions.fetchBasedOnSearchSelectionAndCollection,
      handleFetchSampleById: ElementActions.fetchSampleById,
      handleFetchSamplesByCollectionId: ElementActions.fetchSamplesByCollectionId,
      handleUpdateSample: ElementActions.updateSample,
      handleCreateSample: ElementActions.createSample,
      handleCreateSampleForReaction: ElementActions.createSampleForReaction,
      handleCopySampleFromClipboard: ElementActions.copySampleFromClipboard,
      handleAddSampleToMaterialGroup: ElementActions.addSampleToMaterialGroup,
      handleImportSamplesFromFile: ElementActions.importSamplesFromFile,

      handleFetchReactionById: ElementActions.fetchReactionById,
      handleFetchReactionsByCollectionId: ElementActions.fetchReactionsByCollectionId,
      handleUpdateReaction: ElementActions.updateReaction,
      handleCreateReaction: ElementActions.createReaction,
      handleCopyReactionFromId: ElementActions.copyReactionFromId,
      handleFetchReactionSvgByMaterialsSvgPaths: ElementActions.fetchReactionSvgByMaterialsSvgPaths,
      handleOpenReactionDetails: ElementActions.openReactionDetails,

      handleBulkCreateWellplatesFromSamples: ElementActions.bulkCreateWellplatesFromSamples,
      handleFetchWellplateById: ElementActions.fetchWellplateById,
      handleFetchWellplatesByCollectionId: ElementActions.fetchWellplatesByCollectionId,
      handleUpdateWellplate: ElementActions.updateWellplate,
      handleCreateWellplate: ElementActions.createWellplate,
      handleGenerateWellplateFromClipboard: ElementActions.generateWellplateFromClipboard,
      handleGenerateScreenFromClipboard: ElementActions.generateScreenFromClipboard,

      handleFetchScreenById: ElementActions.fetchScreenById,
      handleFetchScreensByCollectionId: ElementActions.fetchScreensByCollectionId,
      handleUpdateScreen: ElementActions.updateScreen,
      handleCreateScreen: ElementActions.createScreen,

      handleUnselectCurrentElement: UIActions.deselectAllElements,
      // FIXME ElementStore listens to UIActions?
      handleSetPagination: UIActions.setPagination,
      handleRefreshElements: ElementActions.refreshElements,
      handleGenerateEmptyElement: [ElementActions.generateEmptyWellplate, ElementActions.generateEmptyScreen, ElementActions.generateEmptySample, ElementActions.generateEmptyReaction],
      handleFetchMoleculeByMolfile: ElementActions.fetchMoleculeByMolfile,
      handleDeleteElements: ElementActions.deleteElements,

      handleUpdateElementsCollection: ElementActions.updateElementsCollection,
      handleAssignElementsCollection: ElementActions.assignElementsCollection,
      handleRemoveElementsCollection: ElementActions.removeElementsCollection,
      handleSplitAsSubsamples: ElementActions.splitAsSubsamples
    })
  }

  handleFetchBasedOnSearchSelection(result) {
    Object.keys(result).forEach((key) => {
      this.state.elements[key] = result[key];
    });
  }

  closeElementWhenDeleted(ui_state) {
    let currentElement = this.state.currentElement;
    if (currentElement) {
      let type_state = ui_state[currentElement.type]
      let checked = type_state.checkedIds.indexOf(currentElement.id) > -1
      let checked_all_and_not_unchecked =
        type_state.checkedAll && type_state.uncheckedIds.indexOf(currentElement.id) == -1

      if (checked_all_and_not_unchecked || checked) {
        this.state.currentElement = null;
      }
    }
  }

  // -- Elements --
  handleDeleteElements(options) {
    //const ui_state = UIStore.getState();
    this.waitFor(UIStore.dispatchToken);
    let uiState = UIStore.getState();
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

    this.state.currentElement = Sample.copyFromSampleAndCollectionId(clipboardSamples[0], collection_id, true)
  }

  /**
   * @param {Object} params = { reaction, materialGroup }
   */
  handleAddSampleToMaterialGroup(params) {
    const { reaction, materialGroup } = params;
    const { temporary_sample_counter } = reaction;

    let sample = Sample.buildEmptyWithCounter(reaction.collection_id, temporary_sample_counter, materialGroup);

    this.state.currentMaterialGroup = materialGroup;
    this.state.currentReaction = reaction;
    this.state.currentElement = sample;
  }

  handleImportSamplesFromFile(result) {
    this.handleRefreshElements('sample');
  }

  // -- Wellplates --

  handleBulkCreateWellplatesFromSamples() {
    this.handleRefreshElements('wellplate');
    this.handleRefreshElements('sample');
  }

  handleFetchWellplateById(result) {
    this.state.currentElement = result;
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

    this.state.currentElement = Wellplate.buildFromSamplesAndCollectionId(clipboardSamples, collection_id);
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

    this.state.currentElement = Screen.buildFromWellplatesAndCollectionId(clipboardWellplates, collection_id);
  }

  // -- Reactions --

  handleFetchReactionById(result) {
    this.state.currentElement = result;
  }

  handleFetchReactionsByCollectionId(result) {
    this.state.elements.reactions = result;
  }

  handleUpdateReaction(reaction) {
    this.state.currentElement = reaction;
    this.handleRefreshElements('reaction');
    this.handleRefreshElements('sample');
  }

  handleCreateReaction(reaction) {
    this.handleRefreshElements('reaction');
    this.navigateToNewElement(reaction);
  }

  handleCopyReactionFromId(reaction) {
    this.waitFor(UIStore.dispatchToken);
    let uiState = UIStore.getState();
    //const uiState = UIStore.getState();
    this.state.currentElement = Reaction.copyFromReactionAndCollectionId(reaction, uiState.currentCollection.id);
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
    let uiState = UIStore.getState();
    Aviator.navigate(`/collection/${uiState.currentCollection.id}/${element.type}/${element.id}`);
  }

  handleGenerateEmptyElement(element) {
    let {currentElement} = this.state;

    const newElementOfSameTypeIsPresent = currentElement && currentElement.isNew && currentElement.type == element.type;
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
    // if there is a currentSearchSelection we have to execute the respective action
    if(currentSearchSelection != null) {
      ElementActions.fetchBasedOnSearchSelectionAndCollection(currentSearchSelection, uiState.currentCollection.id, page);
    } else {
      switch (type) {
        case 'sample':
          ElementActions.fetchSamplesByCollectionId(uiState.currentCollection.id, {page: page, per_page: uiState.number_of_results});
          break;
        case 'reaction':
          ElementActions.fetchReactionsByCollectionId(uiState.currentCollection.id, {page: page, per_page: uiState.number_of_results});
          break;
        case 'wellplate':
          ElementActions.fetchWellplatesByCollectionId(uiState.currentCollection.id, {page: page, per_page: uiState.number_of_results});
          break;
        case 'screen':
          ElementActions.fetchScreensByCollectionId(uiState.currentCollection.id, {page: page, per_page: uiState.number_of_results});
          break;
      }
    }
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
