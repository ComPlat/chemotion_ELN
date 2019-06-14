import {
  last,
  slice,
  intersectionWith,
  findIndex,
} from 'lodash';
import Aviator from 'aviator';
import alt from '../alt';

import UserStore from './UserStore';
import ElementActions from '../actions/ElementActions';
import CollectionActions from '../actions/CollectionActions';
import UIActions from '../actions/UIActions';
import UserActions from '../actions/UserActions';
import UIStore from './UIStore';
import ClipboardStore from './ClipboardStore';
import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';

import Device from '../models/Device';
import Container from '../models/Container';
import AnalysesExperiment from '../models/AnalysesExperiment';
import DeviceAnalysis from '../models/DeviceAnalysis';
import DeviceSample from '../models/DeviceSample';
import SamplesFetcher from '../fetchers/SamplesFetcher';
import DeviceFetcher from '../fetchers/DeviceFetcher';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import ModalImportConfirm from '../contextActions/ModalImportConfirm';

import { extraThing } from '../utils/Functions';
import Xlisteners from '../extra/ElementStoreXlisteners';
import Xhandlers from '../extra/ElementStoreXhandlers';
import Xstate from '../extra/ElementStoreXstate';
import { elementShowOrNew } from '../routesUtils';

import DetailActions from '../actions/DetailActions';
import { SameEleTypId, UrlSilentNavigation } from '../utils/ElementUtils';


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
        },
        research_plans: {
          elements: [],
          totalElements: 0,
          page: null,
          pages: null,
          perPage: null
        }
      },
      currentElement: null,
      elementWarning: false,
      moleculeSort: false,
      // formerly from DetailStore
      selecteds: [],
      activeKey: 0,
      deletingElement: null,
      ////
      ...extraThing(Xstate)
    };



    for (let i = 0; i < Xlisteners.count; i++){
      Object.keys(Xlisteners["content"+i]).map((k) => {
        this.bindAction(Xlisteners["content" + i][k],
                        Xhandlers["content" + i][k].bind(this))
      });
    }

    this.bindListeners({
      //
      handleFetchAllDevices: ElementActions.fetchAllDevices,
      handleFetchDeviceById: ElementActions.fetchDeviceById,
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
      handleToggleTypeOfDeviceSample: ElementActions.toggleTypeOfDeviceSample,
      handleChangeDeviceProp: ElementActions.changeDeviceProp,
      handleFetchDeviceAnalysisById: ElementActions.fetchDeviceAnalysisById,
      handleSaveDeviceAnalysis: ElementActions.saveDeviceAnalysis,
      handleOpenDeviceAnalysis: ElementActions.openDeviceAnalysis,
      handleCreateDeviceAnalysis: ElementActions.createDeviceAnalysis,
      handleChangeAnalysisExperimentProp: ElementActions.changeAnalysisExperimentProp,
      handleDeleteAnalysisExperiment: ElementActions.deleteAnalysisExperiment,
      handleDuplicateAnalysisExperiment: ElementActions.duplicateAnalysisExperiment,

      handleFetchBasedOnSearchSelection: ElementActions.fetchBasedOnSearchSelectionAndCollection,

      handleFetchSamplesByCollectionId: ElementActions.fetchSamplesByCollectionId,
      handleFetchReactionsByCollectionId: ElementActions.fetchReactionsByCollectionId,
      handleFetchWellplatesByCollectionId: ElementActions.fetchWellplatesByCollectionId,
      handleFetchScreensByCollectionId: ElementActions.fetchScreensByCollectionId,
      handlefetchResearchPlansByCollectionId: ElementActions.fetchResearchPlansByCollectionId,

      handleFetchSampleById: ElementActions.fetchSampleById,
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
      handleImportSamplesFromFileConfirm: ElementActions.importSamplesFromFileConfirm,
      handleImportReactionsFromChemScanner: ElementActions.importReactionsFromChemScanner,

      handleSetCurrentElement: ElementActions.setCurrentElement,
      handleDeselectCurrentElement: ElementActions.deselectCurrentElement,
      handleChangeSorting: ElementActions.changeSorting,

      handleFetchReactionById: ElementActions.fetchReactionById,
      handleTryFetchReactionById: ElementActions.tryFetchReactionById,
      handleCloseWarning: ElementActions.closeWarning,
      handleCreateReaction: ElementActions.createReaction,
      handleCopyReactionFromId: ElementActions.copyReactionFromId,
      handleOpenReactionDetails: ElementActions.openReactionDetails,

      handleBulkCreateWellplatesFromSamples:
        ElementActions.bulkCreateWellplatesFromSamples,
      handleFetchWellplateById: ElementActions.fetchWellplateById,
      handleCreateWellplate: ElementActions.createWellplate,
      handleGenerateWellplateFromClipboard:
        ElementActions.generateWellplateFromClipboard,
      handleGenerateScreenFromClipboard:
        ElementActions.generateScreenFromClipboard,

      handleFetchScreenById: ElementActions.fetchScreenById,
      handleCreateScreen: ElementActions.createScreen,

      handlefetchResearchPlanById: ElementActions.fetchResearchPlanById,
      handleCreateResearchPlan: ElementActions.createResearchPlan,

      // FIXME ElementStore listens to UIActions?
      handleUnselectCurrentElement: UIActions.deselectAllElements,
      handleSetPagination: UIActions.setPagination,

      handleRefreshElements: ElementActions.refreshElements,
      handleGenerateEmptyElement:
        [
          ElementActions.generateEmptyWellplate,
          ElementActions.generateEmptyScreen,
          ElementActions.generateEmptyResearchPlan,
          ElementActions.generateEmptySample,
          ElementActions.generateEmptyReaction,
          ElementActions.showReportContainer,
          ElementActions.showFormatContainer,
          ElementActions.showComputedPropsGraph,
          ElementActions.showDeviceControl,
          ElementActions.showLiteratureDetail,
        ],
      handleFetchMoleculeByMolfile: ElementActions.fetchMoleculeByMolfile,
      handleDeleteElements: ElementActions.deleteElements,

      handleUpdateElementsCollection: ElementActions.updateElementsCollection,
      handleAssignElementsCollection: ElementActions.assignElementsCollection,
      handleRemoveElementsCollection: ElementActions.removeElementsCollection,
      handleSplitAsSubsamples: ElementActions.splitAsSubsamples,
      handleSplitAsSubwellplates: ElementActions.splitAsSubwellplates,
      // formerly from DetailStore
      handleSelect: DetailActions.select,
      handleClose: DetailActions.close,
      handleDeletingElements: ElementActions.deleteElementsByUIState,
      handleConfirmDelete: DetailActions.confirmDelete,
      handleChangeCurrentElement: DetailActions.changeCurrentElement,
      handleGetMoleculeCas: DetailActions.getMoleculeCas,
      handleUpdateMoleculeNames: DetailActions.updateMoleculeNames,
      handleUpdateMoleculeCas: DetailActions.updateMoleculeCas,
      handleUpdateLinkedElement: [
        ElementActions.updateReaction,
        ElementActions.updateSample,
      ],
      handleUpdateElement: [
        // ElementActions.updateReaction,
        // ElementActions.updateSample,
        ElementActions.updateWellplate,
        ElementActions.updateScreen,
        ElementActions.updateResearchPlan
      ],
      handleRefreshComputedProp: ElementActions.refreshComputedProp,
    })
  }

  handleFetchAllDevices(devices) {
    this.state.elements['devices'].devices = devices
  }

  handleFetchDeviceById(device) {
    this.state.currentElement = device
  }

  findDeviceIndexById(deviceId) {
    const {devices} = this.state.elements['devices']
    return devices.findIndex((e) => e.id === deviceId)
  }

  handleSaveDevice(device) {
    const {devices} = this.state.elements['devices']
    const deviceKey = devices.findIndex((e) => e._checksum === device._checksum)
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

  handleAddSampleToDevice({sample, device, options = {save: false}}) {
    const deviceSample = DeviceSample.buildEmpty(device.id, sample)
    device.samples.push(deviceSample)
    if(options.save) {
      ElementActions.saveDevice(device)
      ElementActions.fetchDeviceById.defer(device.id)
    }
  }

  handleAddSampleWithAnalysisToDevice({sample, analysis, device}) {
    switch (analysis.kind) {
      case '1H NMR':
        // add sample to device
        const deviceSample = DeviceSample.buildEmpty(device.id, {id: sample.id, short_label: sample.short_label})
        deviceSample.types = ["NMR"]
        device.samples.push(deviceSample)
        DeviceFetcher.update(device)
        .then(device => {
          const savedDeviceSample = last(device.samples)
          // add sampleAnalysis to experiments
          let deviceAnalysis = device.devicesAnalyses.find(a => a.analysisType === "NMR")
          if(!deviceAnalysis) {
            deviceAnalysis = DeviceAnalysis.buildEmpty(device.id, "NMR")
          }
          const newExperiment = AnalysesExperiment.buildEmpty(sample.id, sample.short_label, analysis.id, savedDeviceSample.id)
          deviceAnalysis.experiments.push(newExperiment)
          ElementActions.saveDeviceAnalysis.defer(deviceAnalysis)
        })
        break
    }
  }

  handleToggleTypeOfDeviceSample({device, sample, type}) {
    const sampleKey = device.samples.findIndex(s => s.id === sample.id)
    if (sample.types.includes(type)) {
      sample.types = sample.types.filter(t => t !== type)
    } else {
      sample.types.push(type)
    }
    device.samples[sampleKey] = sample
  }

  handleOpenDeviceAnalysis({device, type}){
    switch(type) {
      case "NMR":
        const {currentCollection, isSync} = UIStore.getState();
        const deviceAnalysis = device.devicesAnalyses.find((a) => a.analysisType === "NMR")

        // update Device in case of sample was added by dnd and device was not saved
        device.updateChecksum()
        ElementActions.saveDevice(device)

        if (deviceAnalysis) {
          Aviator.navigate(isSync
            ? `/scollection/${currentCollection.id}/devicesAnalysis/${deviceAnalysis.id}`
            : `/collection/${currentCollection.id}/devicesAnalysis/${deviceAnalysis.id}`
          )
        } else {
          Aviator.navigate(isSync
            ? `/scollection/${currentCollection.id}/devicesAnalysis/new/${device.id}/${type}`
            : `/collection/${currentCollection.id}/devicesAnalysis/new/${device.id}/${type}`
          )
        }
        break
    }
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

//TODO move these in Element Action ??
  createSampleAnalysis(sampleId, type) {
    return new Promise((resolve, reject) => {
      SamplesFetcher.fetchById(sampleId)
      .then(sample => {
        let analysis = Container.buildAnalysis()
        switch (type) {
          case 'NMR':
            analysis =  Container.buildAnalysis("1H NMR")
            break
        }
        sample.addAnalysis(analysis)
        SamplesFetcher.update(sample)
        resolve(analysis)
      })
    })
  }

  createAnalysisExperiment (deviceSample, deviceAnalysis) {
    return new Promise((resolve, reject) => {
      this.createSampleAnalysis(deviceSample.sampleId, deviceAnalysis.analysisType)
      .then(sampleAnalysis => {
        const experiment = AnalysesExperiment.buildEmpty(
          deviceSample.sampleId,
          deviceSample.shortLabel,
          sampleAnalysis.id,
          deviceSample.id
        )
        resolve(experiment)
      })
    })
  }

  handleCreateDeviceAnalysis({device, analysisType}) {
    const analysis = DeviceAnalysis.buildEmpty(device.id, analysisType)
    const samplesOfAnalysisType = device.samples.filter(s => s.types.includes(analysisType))
    const promises = samplesOfAnalysisType.map(s => this.createAnalysisExperiment(s, analysis))
    Promise.all(promises)
    .then(experiments => {
      experiments.map(experiment => analysis.experiments.push(experiment))
      ElementActions.saveDeviceAnalysis(analysis)
    })
  }

  handleFetchDeviceAnalysisById({analysis, device}) {
    const {experiments} = analysis
    const samplesOfAnalysisType = device.samples.filter(s => s.types.includes(analysis.analysisType))
    const samplesWithoutOld = slice(samplesOfAnalysisType, experiments.length)
    const promises = samplesWithoutOld.map(s => this.createAnalysisExperiment(s, analysis))
    Promise.all(promises)
    .then(experiments => {
      experiments.map(experiment => analysis.experiments.push(experiment))
      ElementActions.saveDeviceAnalysis(analysis)
    })
  }

  handleSaveDeviceAnalysis(analysis) {
    const {currentCollection, isSync} = UIStore.getState();
    this.state.currentElement = analysis

    Aviator.navigate( isSync
      ? `/scollection/${currentCollection.id}/devicesAnalysis/${analysis.id}`
      : `/collection/${currentCollection.id}/devicesAnalysis/${analysis.id}`
    )
  }

  handleChangeAnalysisExperimentProp({analysis, experiment, prop, value}) {
    const experimentKey = analysis.experiments.findIndex((e) => e.id === experiment.id)
    analysis.experiments[experimentKey][prop] = value
    this.state.currentElement = analysis
  }

  handleDeleteAnalysisExperiment({device, analysis, experiment}) {
    const sample = device.samples.find(s => s.id === experiment.deviceSampleId)
    const sampleKey = device.samples.findIndex(s => s.id === experiment.deviceSampleId)
    device.samples[sampleKey].types = sample.types.filter(t => t !== analysis.analysisType)
    ElementActions.saveDevice(device)
    ElementActions.fetchDeviceAnalysisById.defer(analysis.id)
  }

  handleDuplicateAnalysisExperiment({device, analysis, experiment}) {
    const sample = device.samples.find(s => s.id === experiment.deviceSampleId)
    const newSample = DeviceSample.buildEmpty(analysis.deviceId, {id: sample.sampleId, short_label: sample.shortLabel})
    newSample.types = [analysis.analysisType]
    device.samples.push(newSample)
    ElementActions.saveDevice(device)
    ElementActions.fetchDeviceAnalysisById.defer(analysis.id)
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

  // -- Elements --
  handleDeleteElements(options) {
    this.waitFor(UIStore.dispatchToken);
    const ui_state = UIStore.getState();
    const { sample, reaction, wellplate, screen, research_plan, currentCollection } = ui_state;
    const selecteds = this.state.selecteds.map(s => ({ id: s.id, type: s.type }));
    ElementActions.deleteElementsByUIState({
      options,
      sample,
      reaction,
      wellplate,
      screen,
      research_plan,
      currentCollection,
      selecteds
    });
  }

  handleUpdateElementsCollection() {
    CollectionActions.fetchUnsharedCollectionRoots();
    UIActions.uncheckWholeSelection.defer();
    this.fetchElementsByCollectionIdandLayout();
  }

  handleAssignElementsCollection() {
    CollectionActions.fetchUnsharedCollectionRoots();
    UIActions.uncheckWholeSelection.defer();
    this.fetchElementsByCollectionIdandLayout();
  }

  handleRemoveElementsCollection() {
    // CollectionActions.fetchUnsharedCollectionRoots();
    // UIActions.clearSearchSelection.defer()
    UIActions.uncheckWholeSelection.defer();
    this.waitFor(UIStore.dispatchToken)

    this.fetchElementsByCollectionIdandLayout();
  }

  fetchElementsByCollectionIdandLayout() {
    const { currentSearchSelection, currentCollection } = UIStore.getState();
    const isSync = !!(currentCollection && currentCollection.is_sync_to_me);
    if (currentSearchSelection != null) {
      const { currentType } = UserStore.getState();
      this.handleRefreshElements(currentType);
    } else {
      const { profile } = UserStore.getState();
      if (profile && profile.data && profile.data.layout) {
        const { layout } = profile.data;
        if (layout.sample && layout.sample > 0) { this.handleRefreshElements('sample'); }
        if (layout.reaction && layout.reaction > 0) { this.handleRefreshElements('reaction'); }
        if (layout.wellplate && layout.wellplate > 0) { this.handleRefreshElements('wellplate'); }
        if (layout.screen && layout.screen > 0) { this.handleRefreshElements('screen'); }
        if (!isSync && layout.research_plan && layout.research_plan > 0) { this.handleRefreshElements('research_plan'); }
      }
    }
  }

  handleFetchSamplesByCollectionId(result) {
    this.state.elements.samples = result;
  }

  handleFetchReactionsByCollectionId(result) {
    this.state.elements.reactions = result;
  }

  handleFetchWellplatesByCollectionId(result) {
    this.state.elements.wellplates = result;
  }

  handleFetchScreensByCollectionId(result) {
    this.state.elements.screens = result;
  }

  handlefetchResearchPlansByCollectionId(result) {
    this.state.elements.research_plans = result;
  }

  // -- Samples --

  handleFetchSampleById(result) {
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      this.changeCurrentElement( result );
    }
  }

  handleCreateSample({ element, closeView }) {
    UserActions.fetchCurrentUser();

    this.handleRefreshElements('sample');
    if (!closeView) {
      this.navigateToNewElement(element);
    }
  }

  handleCreateSampleForReaction({ newSample, reaction, materialGroup }) {
    UserActions.fetchCurrentUser();
    reaction.addMaterial(newSample, materialGroup);
    this.handleRefreshElements('sample');
    this.changeCurrentElement(reaction);
  }

  handleEditReactionSample(result) {
    const sample = result.sample;
    sample.belongTo = result.reaction;
    this.changeCurrentElement(sample);
  }

  handleEditWellplateSample(result) {
    const sample = result.sample;
    sample.belongTo = result.wellplate;
    this.changeCurrentElement(sample);
  }

  handleUpdateSampleForReaction({ reaction, sample, closeView }) {
    // UserActions.fetchCurrentUser();
    if (closeView) {
      this.changeCurrentElement(reaction);
    } else {
      this.changeCurrentElement(sample);
    }
    // TODO: check if this is needed with the new handling of changing CE
    // maybe this.handleRefreshElements is enough
    this.handleUpdateElement(sample);
  }

  handleUpdateLinkedElement({ element, closeView }) {
    if (closeView) {
      this.deleteCurrentElement(element);
    } else {
      this.changeCurrentElement(element);
    }
    this.handleUpdateElement(element);
  }

  handleUpdateSampleForWellplate(wellplate) {
    // UserActions.fetchCurrentUser()
    this.state.currentElement = null;
    this.handleRefreshElements('sample');

    const wellplateID = wellplate.id;
    ElementActions.fetchWellplateById(wellplateID);
  }

  handleSplitAsSubsamples(ui_state) {
    ElementActions.fetchSamplesByCollectionId(
      ui_state.currentCollection.id, {},
      ui_state.isSync, this.state.moleculeSort
    );
  }

  handleSplitAsSubwellplates(ui_state) {
    ElementActions.fetchWellplatesByCollectionId(ui_state.currentCollection.id);
    ElementActions.fetchSamplesByCollectionId(
      ui_state.currentCollection.id, {},
      ui_state.isSync, this.state.moleculeSort
    );
  }

  // Molecules
  handleFetchMoleculeByMolfile(result) {
    // Attention: This is intended to update SampleDetails
    this.state.currentElement.molecule = result;
    // this.state.currentElement.molfile = result.molfile;
    this.state.currentElement.molecule_id = result.id;
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
    const clipboardSamples = ClipboardStore.getState().samples;
    this.changeCurrentElement(Sample.copyFromSampleAndCollectionId(clipboardSamples[0], collection_id, true));
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
    reaction.changed = true;
    this.changeCurrentElement(sample);
  }

  handleShowReactionMaterial(params) {
    const { reaction, sample } = params;
    sample.belongTo = reaction;
    this.changeCurrentElement(sample);
    //this.state.currentElement = sample;
  }

  handleImportSamplesFromFile(data) {
    if (data.sdf){
      UIActions.updateModalProps.defer({
        show: true,
        component: ModalImportConfirm,
        title: "Sample Import Confirmation",
        action: null,
        listSharedCollections: false,
        customModal: "custom-modal",
        data: data.data,
        //raw_data: data.raw_data,
        custom_data_keys: data.custom_data_keys,
        mapped_keys: data.mapped_keys,
        collection_id: data.collection_id,
      })
    } else {
      this.handleRefreshElements('sample');
    }

    this.handleRefreshElements('sample');
  }

  handleImportSamplesFromFileConfirm(data) {
    if (data.sdf){
      this.handleRefreshElements('sample');
    }
  }

  handleImportReactionsFromChemScanner(data) {
    this.handleRefreshElements('sample');
    this.handleRefreshElements('reaction');
  }

  // -- Wellplates --

  handleBulkCreateWellplatesFromSamples() {
    this.handleRefreshElements('wellplate');
    this.handleRefreshElements('sample');
  }

  handleFetchWellplateById(result) {
    this.changeCurrentElement(result);
    //this.state.currentElement = result;
  //  this.navigateToNewElement(result)
  }


  handleCreateWellplate(wellplate) {
    this.handleRefreshElements('wellplate');
    this.navigateToNewElement(wellplate);
  }

  handleGenerateWellplateFromClipboard(collection_id) {
    let clipboardSamples = ClipboardStore.getState().samples;

    this.changeCurrentElement(Wellplate.buildFromSamplesAndCollectionId(clipboardSamples, collection_id));
    //this.state.currentElement = Wellplate.buildFromSamplesAndCollectionId(clipboardSamples, collection_id);
  }
  // -- Screens --

  handleFetchScreenById(result) {
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      this.changeCurrentElement(result);
      //this.state.currentElement = result;
    }
  }

  handleCreateScreen(screen) {
    this.handleRefreshElements('screen');
    this.navigateToNewElement(screen);
  }

  handleGenerateScreenFromClipboard(collection_id) {
    let clipboardWellplates = ClipboardStore.getState().wellplates;
    this.changeCurrentElement(Screen.buildFromWellplatesAndCollectionId(clipboardWellplates, collection_id));
  }

  // -- ResearchPlans --

  handlefetchResearchPlanById(result) {
    this.changeCurrentElement(result);
    //this.state.currentElement = result;
  }

  handleCreateResearchPlan(research_plan) {
    this.handleRefreshElements('research_plan');
    this.navigateToNewElement(research_plan);
  }

  // -- Reactions --

  handleFetchReactionById(result) {
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      this.changeCurrentElement(result);
      this.state.elements.reactions.elements = this.refreshReactionsListForSpecificReaction(result);
    //  this.navigateToNewElement(result);
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
      this.changeCurrentElement(result);
      // this.state.currentElement = result
      this.navigateToNewElement(result)
    }
  }

  handleCloseWarning() {
    this.state.elementWarning = false
  }


  handleCreateReaction(reaction) {
    UserActions.fetchCurrentUser();
    this.handleRefreshElements('reaction');
    this.navigateToNewElement(reaction);
  }

  handleCopyReactionFromId(reaction) {
    this.waitFor(UIStore.dispatchToken);
    const uiState = UIStore.getState();
    this.changeCurrentElement(Reaction.copyFromReactionAndCollectionId(reaction, uiState.currentCollection.id));
  }

  handleOpenReactionDetails(reaction) {
    this.changeCurrentElement(reaction);
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

  // -- Generic --

  navigateToNewElement(element = {}) {
    this.waitFor(UIStore.dispatchToken);
    const { type, id } = element;
    const { uri, namedParams } = Aviator.getCurrentRequest();
    const uriArray = uri.split(/\//);
    if (!type) {
      Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}`, { silent: true });
      return null;
    }
    namedParams[`${type}ID`] = id;
    Aviator.navigate(`/${uriArray[1]}/${uriArray[2]}/${type}/${id}`, { silent: true });
    elementShowOrNew({ type, params: namedParams });
    return null;
  }

  handleGenerateEmptyElement(element) {
    const { currentElement } = this.state;

    const newElementOfSameTypeIsPresent =
      currentElement && currentElement.isNew && currentElement.type ==
      element.type;
    if(!newElementOfSameTypeIsPresent) {
      this.changeCurrentElement(element);
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
    const uiState = UIStore.getState();
    if (!uiState.currentCollection || !uiState.currentCollection.id) return;

    const { page } = uiState[type];
    const { moleculeSort } = this.state;
    this.state.elements[`${type}s`].page = page;

    // TODO if page changed -> fetch
    // if there is a currentSearchSelection
    //    we have to execute the respective action
    const { currentSearchSelection } = uiState;
    if (currentSearchSelection != null) {
      currentSearchSelection.page_size = uiState.number_of_results;
      ElementActions.fetchBasedOnSearchSelectionAndCollection.defer({
        selection: currentSearchSelection,
        collectionId: uiState.currentCollection.id,
        page,
        isSync: uiState.isSync,
        moleculeSort
      });
    } else {
      const per_page = uiState.number_of_results;
      const { fromDate, toDate, productOnly } = uiState;
      const params = { page, per_page, fromDate, toDate, productOnly };
      const fnName = type.split('_').map(x => x[0].toUpperCase() + x.slice(1)).join("") + 's';
      const fn = `fetch${fnName}ByCollectionId`;
      const allowedActions = [
        'fetchSamplesByCollectionId',
        'fetchReactionsByCollectionId',
        'fetchWellplatesByCollectionId',
        'fetchScreensByCollectionId',
        'fetchResearchPlansByCollectionId',
      ];
      if (allowedActions.includes(fn)) {
        ElementActions[fn](uiState.currentCollection.id, params, uiState.isSync, moleculeSort);
      }
    }
  }

  // CurrentElement
  handleSetCurrentElement(result) {
    this.changeCurrentElement(result);
  }

  handleDeselectCurrentElement() {
    this.changeCurrentElement(null);
  }

  handleChangeSorting(sort) {
    this.state.moleculeSort = sort;
    this.waitFor(UIStore.dispatchToken);
    this.handleRefreshElements("sample");
  }

  // //////////////////////
  // formerly DetailStore
  // TODO: clean this section
  handleSelect(index) {
    this.resetCurrentElement(index, this.state.selecteds);
  }

  handleClose({ deleteEl, force }) {
    // Currently ignore report "isPendingToSave"
    if (force || deleteEl.type === 'report' || this.isDeletable(deleteEl)) {
      this.deleteCurrentElement(deleteEl);
    } else {
      this.setState({ deletingElement: deleteEl });
    }
  }

  handleConfirmDelete(confirm) {
    const deleteEl = this.state.deletingElement
    if(confirm) {
      this.deleteCurrentElement(deleteEl)
    }
    this.setState({ deletingElement: null })
  }

  handleChangeCurrentElement({ oriEl, nextEl }) {
    const { selecteds } = this.state;
    const index = this.elementIndex(selecteds, nextEl);
    this.synchronizeElements(oriEl);

    if (index === -1) {
      this.state.activeKey = selecteds.length;
      this.state.selecteds = this.addElement(nextEl);
    } else {
      this.state.activeKey = index;
      this.state.selecteds = this.updateElement(nextEl, index);
    }

    return true
  }

  changeCurrentElement(nextEl) {
    const { selecteds } = this.state;
    const index = this.elementIndex(selecteds, nextEl);
    this.synchronizeElements(this.state.currentElement);

    if (index === -1) {
      this.state.activeKey = selecteds.length;
      this.state.selecteds = this.addElement(nextEl);
    } else {
      this.state.activeKey = index;
      this.state.selecteds = this.updateElement(nextEl, index);
    }
    // this.synchronizeElements(this.state.currentElement);
    this.state.currentElement = nextEl;
  }


  handleGetMoleculeCas(updatedSample) {
    const selecteds = this.state.selecteds
    const index = this.elementIndex(selecteds, updatedSample)
    const newSelecteds = this.updateElement(updatedSample, index)
    this.setState({ selecteds: newSelecteds })
  }

  UpdateMolecule(updatedSample) {
    if (updatedSample) {
      const selecteds = this.state.selecteds;
      const index = this.elementIndex(selecteds, updatedSample);
      const newSelecteds = this.updateElement(updatedSample, index);
      this.setState({ selecteds: newSelecteds });
    }
  }

  UpdateResearchPlanAttaches(updatedResearchPlan) {
    const { selecteds } = this.state;
    ResearchPlansFetcher.fetchById(updatedResearchPlan.id)
      .then((result) => {
        this.changeCurrentElement(result);
        const index = this.elementIndex(selecteds, result);
        const newSelecteds = this.updateElement(result, index);
        this.setState({ selecteds: newSelecteds });
      });
  }

  handleUpdateResearchPlanAttaches(updatedResearchPlan) {
    this.UpdateResearchPlanAttaches(updatedResearchPlan);
  }

  handleUpdateMoleculeNames(updatedSample) {
    this.UpdateMolecule(updatedSample);
  }

  handleUpdateMoleculeCas(updatedSample) {
    this.UpdateMolecule(updatedSample);
  }

  handleUpdateElement(updatedElement) {
    switch (updatedElement.type) {
      case 'sample':
        this.handleRefreshElements('sample');
        break;
      case 'reaction':
        this.handleRefreshElements('reaction');
        this.handleRefreshElements('sample');
        break;
      case 'screen':
        this.handleRefreshElements('screen');
        break;
      case 'research_plan':
        this.handleRefreshElements('research_plan');
        this.handleUpdateResearchPlanAttaches(updatedElement);
        break;
      case 'wellplate':
        this.handleRefreshElements('wellplate');
        this.handleRefreshElements('sample');
        break;
      default:
        break;
    }

    return true;
  }

  synchronizeElements(previous) {
    const { selecteds } = this.state;

    if (previous instanceof Sample) {
      const rId = previous.tag && previous.tag.taggable_data
        && previous.tag.taggable_data.reaction_id;
      const openedReaction = selecteds.find(el => SameEleTypId(el, { type: 'reaction', id: rId }));
      if (openedReaction) {
        openedReaction.updateMaterial(previous);
        if (previous.isPendingToSave) {
          openedReaction.changed = previous.isPendingToSave;
        }
      }
    }

    if (previous instanceof Reaction) {
      const samples = previous.samples;
      selecteds.map((nextSample) => {
        const previousSample = samples.find(s => SameEleTypId(nextSample, s));
        if (previousSample) {
          nextSample.amount_value = previousSample.amount_value;
          nextSample.amount_unit = previousSample.amount_unit;
          nextSample.container = previousSample.container;
          nextSample.density = previousSample.density;
          nextSample._molarity_unit = previousSample._molarity_unit;
          nextSample._molarity_value = previousSample._molarity_value;
        }
        return nextSample;
      });
    }

    return previous;
  }

  addElement(addEl) {
    const selecteds = this.state.selecteds
    return [...selecteds, addEl]
  }

  updateElement(updateEl, index) {
    const selecteds = this.state.selecteds;
    return [
      ...selecteds.slice(0, index),
      updateEl,
      ...selecteds.slice(index + 1)
    ];
  }

  deleteElement(deleteEl) {
    return this.state.selecteds.filter(el => !SameEleTypId(el, deleteEl));
  }

  elementIndex(selecteds, newSelected) {
    let index = -1;
    if (newSelected) {
      selecteds.forEach((s, i) => {
        if (SameEleTypId(s, newSelected)) { index = i; }
      });
    }
    return index;
  }

  resetCurrentElement(newKey, newSelecteds) {
    const newCurrentElement = newKey < 0 ? newSelecteds[0] : newSelecteds[newKey]

    if (newSelecteds.length === 0) {
      this.changeCurrentElement(null);
    } else {
      this.changeCurrentElement(newCurrentElement);
    }

    UrlSilentNavigation(newCurrentElement)
    return true
  }

  deleteCurrentElement(deleteEl) {
    const newSelecteds = this.deleteElement(deleteEl)
    const left = this.state.activeKey - 1
    this.setState(
      prevState => ({ ...prevState, selecteds: newSelecteds }),
      this.resetCurrentElement(left, newSelecteds)
    )
  }

  isDeletable(deleteEl) {
    return deleteEl && deleteEl.isPendingToSave ? false : true
  }

  handleDeletingElements(response) {
    const elements = response && response.selecteds;
    const { currentElement } = this.state;
    const currentNotDeleted = intersectionWith([currentElement], elements, SameEleTypId)[0];
    const newSelecteds = intersectionWith(this.state.selecteds, elements, SameEleTypId);
    const ui_state = UIStore.getState();

    if (currentNotDeleted) {
      const currentIdx = findIndex(newSelecteds, o => o.id === currentElement.id) || 0;
      this.setState({ selecteds: newSelecteds, activeKey: currentIdx });
    } else {
      this.setState({ selecteds: newSelecteds }, this.resetCurrentElement(-1, newSelecteds));
    }

    this.fetchElementsByCollectionIdandLayout();
  }

  handleRefreshComputedProp(cprop) {
    const { selecteds, currentElement } = this.state;
    const samples = selecteds.concat([currentElement]).filter(x => (
      x instanceof Sample && x.id == cprop.sample_id
    ));
    if (samples.length === 0) return this.handleRefreshElements('sample');

    samples.forEach(el => {
      const found = el.molecule_computed_props.find(x => x.id == cprop.id);
      if (!found) {
        el.molecule_computed_props.push(cprop);
        return;
      }

      const foundDate = Date.parse(found.updated_at);
      const propDate = Date.parse(cprop.updated_at);
      if (propDate > foundDate) {
        found.max_potential = cprop.max_potential;
        found.min_potential = cprop.min_potential;
        found.mean_potential = cprop.mean_potential;
        found.lumo = cprop.lumo;
        found.homo = cprop.homo;
        found.ip = cprop.ip;
        found.ea = cprop.ea;
        found.dipol_debye = cprop.dipol_debye;
        found.mean_abs_potential = cprop.mean_abs_potential;
        found.status = cprop.status;
      }
    });

    this.handleRefreshElements('sample');
  }

  // End of DetailStore
  /////////////////////
}

export default alt.createStore(ElementStore, 'ElementStore');
