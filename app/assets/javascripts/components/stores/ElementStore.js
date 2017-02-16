import alt from '../alt';
import ElementActions from '../actions/ElementActions';
import UIActions from '../actions/UIActions';
import UIStore from './UIStore';
import UserStore from './UserStore';
import ClipboardStore from './ClipboardStore';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';
import Device from '../models/Device'
import Analysis from '../models/Analysis'
import AnalysesExperiment from '../models/AnalysesExperiment'

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
        },
        devices: {
          devices: [],
          activeAccordionDevice: 0,
          selectedDeviceId: -1 
        }
      },
      currentElement: null,
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

      handleFetchAllDevices: ElementActions.fetchAllDevices,
      handleFetchDeviceById: ElementActions.fetchDeviceById,
      handleFetchDeviceAnalysisByIdAndType: ElementActions.fetchDeviceAnalysisByIdAndType,
      handleCreateDevice: ElementActions.createDevice,
      handleSaveDevice: ElementActions.saveDevice,
      handleDeleteDevice: ElementActions.deleteDevice,
      handleToggleDeviceType: ElementActions.toggleDeviceType,
      handleChangeActiveAccordionDevice: ElementActions.changeActiveAccordionDevice,
      handleChangeSelectedDeviceId: ElementActions.changeSelectedDeviceId,
      handleSetSelectedDeviceId: ElementActions.setSelectedDeviceId,
      handleAddSampleToDevice: ElementActions.addSampleToDevice,
      handleAddSampleWithAnalysisToDevice: ElementActions.addSampleWithAnalysisToDevice,
      handleRemoveSampleFromDevice: ElementActions.removeSampleFromDevice,
      handleChangeDeviceProp: ElementActions.changeDeviceProp,
      handleChangeAnalysisExperimentProp: ElementActions.changeAnalysisExperimentProp,
      handleDeleteAnalysisExperiment: ElementActions.deleteAnalysisExperiment,
      handleCreateAnalysisExperiment: ElementActions.createAnalysisExperiment,
      handleSaveDeviceAnalysis: ElementActions.saveDeviceAnalysis,
      handleCreateDeviceAnalysis: ElementActions.createDeviceAnalysis,
      handleChangeActiveAccordionExperiment: ElementActions.changeActiveAccordionExperiment,

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
      handleShowReactionMaterial: ElementActions.showReactionMaterial,
      handleImportSamplesFromFile: ElementActions.importSamplesFromFile,
      handleSetCurrentElement: ElementActions.setCurrentElement,
      handleDeselectCurrentElement: ElementActions.deselectCurrentElement,

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
          ElementActions.showReportContainer,
          ElementActions.showDeviceContainer
        ],
      handleFetchMoleculeByMolfile: ElementActions.fetchMoleculeByMolfile,
      handleDeleteElements: ElementActions.deleteElements,

      handleUpdateElementsCollection: ElementActions.updateElementsCollection,
      handleAssignElementsCollection: ElementActions.assignElementsCollection,
      handleRemoveElementsCollection: ElementActions.removeElementsCollection,
      handleSplitAsSubsamples: ElementActions.splitAsSubsamples,
    })
  }

  handleFetchAllDevices(devices) {
    this.state.elements['devices'].devices = devices
  }

  handleFetchDeviceById(device) {
    this.state.currentElement = device
  }
  
  handleFetchDeviceAnalysisByIdAndType(analysis) {
    this.state.currentElement = analysis
    console.log(analysis)
  }

  findDeviceIndexById(deviceId) {
    const {devices} = this.state.elements['devices']
    return devices.findIndex((e) => e.id === deviceId)
  }

  handleSaveDevice(device) {
    const deviceKey = this.findDeviceIndexById(device.id)
    if (deviceKey === -1) {
      this.state.elements['devices'].devices.push(device)
    } else {
      this.state.elements['devices'].devices[deviceKey] = device
    }
  }

  handleToggleDeviceType({device, type}) {
    if (device.types.includes(type)) {
      device.types = device.types.filter((e) => e !== type)
    } else {
      device.types.push(type)
    }
    const deviceKey = this.findDeviceIndexById(device.id)
    this.state.elements['devices'].devices[deviceKey] = device
  }

  handleCreateDevice() {
    const {devices} = this.state.elements['devices']
    const newDevice = Device.buildEmpty()
    const newKey = devices.length
    this.state.elements['devices'].activeAccordionDevice = newKey
    this.state.elements['devices'].devices.push(newDevice)
  }
  
  handleDeleteDevice(device) {
    const {devices, activeAccordionDevice} = this.state.elements['devices']
    this.state.elements['devices'].devices = devices.filter((e) => e.id !== device.id)
  }

  handleAddSampleToDevice({sample, device}) {
    const deviceHasSample = device.samples.findIndex(
      (s) => s.id === sample.id
    ) !== -1 
    const sampleHasAnalysisOfTypeNMR =
      sample.analyses.length !== 0 &&
      sample.analyses.findIndex((a) => a.kind === "1H NMR") !== -1

    // FIXME show notification for user, why drop is prevented
    if (!deviceHasSample &&
        !sampleHasAnalysisOfTypeNMR
    ) { 
      this.handleAddSampleWithAnalysisToDevice({sample, device})
    }
  }

  handleAddSampleWithAnalysisToDevice({sample, device}) { 
    device.samples.push(sample)
    const deviceKey = this.findDeviceIndexById(device.id)
    this.state.elements['devices'].devices[deviceKey] = device
  }
  
  handleRemoveSampleFromDevice({sample, device}) {
    device.samples = device.samples.filter((e) => e.id !== sample.id)
    const deviceKey = this.findDeviceIndexById(device.id)
    this.state.elements['devices'].devices[deviceKey] = device
  }

  handleChangeDeviceProp({device, prop, value}) {
    device[prop] = value
    const deviceKey = this.findDeviceIndexById(device.id)
    this.state.elements['devices'].devices[deviceKey] = device
  }

  handleChangeActiveAccordionDevice(key) {
    this.state.elements['devices'].activeAccordionDevice = key
  }
  
  handleChangeSelectedDeviceId(deviceId) {
    this.state.elements['devices'].selectedDeviceId = deviceId
  }
  
  handleSetSelectedDeviceId(deviceId) {
    this.state.elements['devices'].selectedDeviceId = deviceId
  }

  handleCreateDeviceAnalysis(analysis) {
    // do nothing
  }

  handleSaveDeviceAnalysis(analysis) {
    this.state.currentElement = analysis
  }
  
  handleCreateAnalysisExperiment(analysis) {
    const experiment = AnalysesExperiment.buildEmpty(analysis.id)
    console.log(experiment)
    analysis.experiments.push(experiment)
    analysis.activeAccordionExperiment = analysis.experiments.length - 1
    this.state.currentElement = analysis
  }

  handleChangeAnalysisExperimentProp({analysis, experiment, prop, value}) {
    const experimentKey = analysis.experiments.findIndex((e) => e.id === experiment.id)
    analysis.experiments[experimentKey][prop] = value
    this.state.currentElement = analysis
  }

  handleDeleteAnalysisExperiment({analysis, experiment}) {
    analysis.experiments = analysis.experiments.filter((a) => a.id !== experiment.id)
    this.state.currentElement = analysis
  }
  
  handleChangeActiveAccordionExperiment({analysis, key}) {
    analysis.activeAccordionExperiment = key
    this.state.currentElement = analysis
  }


  // SEARCH

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
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      this.state.currentElement = result;
    }
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

  handleCreateSampleForReaction({newSample, reaction, materialGroup}) {
    UserActions.fetchCurrentUser();

    reaction.addMaterial(newSample, materialGroup);

    this.handleRefreshElements('sample');

    this.state.currentElement = reaction;
  }

  handleEditReactionSample(result){
    const sample = result.sample;
    sample.belongTo = result.reaction;
    this.state.currentElement = sample;
  }

  handleEditWellplateSample(result){
    const sample = result.sample;
    sample.belongTo = result.wellplate;
    this.state.currentElement = sample;
  }

  handleUpdateSampleForReaction(reaction) {
    UserActions.fetchCurrentUser();
    this.state.currentElement = reaction;
    this.handleRefreshElements('sample');
  }

  handleUpdateSampleForWellplate(wellplate) {
    UserActions.fetchCurrentUser()
    this.state.currentElement = null;
    this.handleRefreshElements('sample')

    const wellplateID = wellplate.id;
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

    let sample = Sample.buildEmpty(reaction.collection_id)
    sample.molfile = sample.molfile || ''
    sample.molecule = sample.molecule == undefined ? sample : sample.molecule
    sample.sample_svg_file = sample.sample_svg_file
    sample.belongTo = reaction;
    sample.matGroup = materialGroup;
    reaction.changed = true
    this.state.currentElement = sample;
  }

  handleShowReactionMaterial(params) {
    const { reaction, sample } = params;
    sample.belongTo = reaction;
    this.state.currentElement = sample;
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
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      this.state.currentElement = result;
    }
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
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      this.state.currentElement = result;
      this.state.elements.reactions.elements = this.refreshReactionsListForSpecificReaction(result);
      this.navigateToNewElement(result);
    }
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
    this.state.currentElement = reaction;
    this.handleRefreshElements('sample')
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

  // CurrentElement
  handleSetCurrentElement(result) {
    this.state.currentElement = result;
  }

  handleDeselectCurrentElement() {
    this.state.currentElement = null;
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
