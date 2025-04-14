import {
  last,
  slice,
  intersectionWith,
  findIndex
} from 'lodash';
import Aviator from 'aviator';
import alt from 'src/stores/alt/alt';
import UserStore from 'src/stores/alt/stores/UserStore';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import ClipboardStore from 'src/stores/alt/stores/ClipboardStore';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import ResearchPlan from 'src/models/ResearchPlan';
import Wellplate from 'src/models/Wellplate';
import Screen from 'src/models/Screen';
import DeviceDescription from 'src/models/DeviceDescription';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';

import Device from 'src/models/Device';
import Container from 'src/models/Container';
import AnalysesExperiment from 'src/models/AnalysesExperiment';
import DeviceAnalysis from 'src/models/DeviceAnalysis';
import DeviceSample from 'src/models/DeviceSample';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import DeviceFetcher from 'src/fetchers/DeviceFetcher';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import ScreensFetcher from 'src/fetchers/ScreensFetcher';

import { elementShowOrNew } from 'src/utilities/routesUtils';

import DetailActions from 'src/stores/alt/actions/DetailActions';
import { SameEleTypId, UrlSilentNavigation } from 'src/utilities/ElementUtils';
import { chmoConversions } from 'src/components/OlsComponent';
import MatrixCheck from 'src/components/common/MatrixCheck';
import GenericEl from 'src/models/GenericEl';

import MessagesFetcher from 'src/fetchers/MessagesFetcher';
import ComponentsFetcher from 'src/fetchers/ComponentsFetcher';
import Component from 'src/models/Component';

const fetchOls = (elementType) => {
  switch (elementType) {
    case 'reaction':
      UserActions.fetchOlsRxno();
      UserActions.fetchOlsChmo();
      break;
    default:
      UserActions.fetchOlsChmo();
      break;
  }
};

class ElementStore {
  constructor() {
    const elements = {
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
      },
      cell_lines: {
        elements: [],
        totalElements: 0,
        page: null,
        pages: null,
        perPage: null
      },
      device_descriptions: {
        elements: [],
        totalElements: 0,
        page: null,
        pages: null,
        perPage: null
      },
      vessels: {
        elements: [],
        totalElements: 0,
        page: null,
        pages: null,
        perPage: null
      },
      sequence_based_macromolecule_samples: {
        elements: [],
        totalElements: 0,
        page: null,
        pages: null,
        perPage: null
      },
    };

    this.state = {
      elements,
      currentElement: null,
      elementWarning: false,
      moleculeSort: false,
      // formerly from DetailStore
      selecteds: [],
      refreshCoefficient: [],
      activeKey: 0,
      deletingElement: null,
    };

    this.bindListeners({
      handleFetchAllDevices: ElementActions.fetchAllDevices,
      handleFetchDeviceById: ElementActions.fetchDeviceById,
      handleCreateDevice: ElementActions.createDevice,
      handleSaveDevice: ElementActions.saveDevice,
      handleDeleteDevice: ElementActions.deleteDevice,
      handleToggleDeviceType: ElementActions.toggleDeviceType,
      handleChangeActiveAccordionDevice: ElementActions.changeActiveAccordionDevice,
      handleChangeSelectedDeviceId: ElementActions.changeSelectedDeviceId,
      handleSetSelectedDeviceId: ElementActions.setSelectedDeviceId,
      handleSetRefreshCoefficient: ElementActions.setRefreshCoefficient,
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
      handleFetchBasedOnSearchResultIds: ElementActions.fetchBasedOnSearchResultIds,
      handleDispatchSearchResult: ElementActions.dispatchSearchResult,

      handleFetchGenericElsByCollectionId: ElementActions.fetchGenericElsByCollectionId,
      handleFetchGenericElById: ElementActions.fetchGenericElById,
      handleCreateGenericEl: ElementActions.createGenericEl,

      handleCreateCellLine: ElementActions.createCellLine,
      handleCreateVessel: ElementActions.createVessel,
      handleCreateVesselTemplate: ElementActions.createVesselTemplate,

      handleFetchSamplesByCollectionId: ElementActions.fetchSamplesByCollectionId,
      handleFetchReactionsByCollectionId: ElementActions.fetchReactionsByCollectionId,
      handleFetchWellplatesByCollectionId: ElementActions.fetchWellplatesByCollectionId,
      handleFetchScreensByCollectionId: ElementActions.fetchScreensByCollectionId,
      handlefetchResearchPlansByCollectionId: ElementActions.fetchResearchPlansByCollectionId,
      handlefetchCellLinesByCollectionId: ElementActions.fetchCellLinesByCollectionId,
      handlefetchDeviceDescriptionsByCollectionId: ElementActions.fetchDeviceDescriptionsByCollectionId,
      handlefetchVesselsByCollectionId: ElementActions.fetchVesselsByCollectionId,
      handlefetchSequenceBasedMacromoleculeSamplesByCollectionId: ElementActions.fetchSequenceBasedMacromoleculeSamplesByCollectionId,

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
      handleImportSamplesFromFileDecline: ElementActions.importSamplesFromFileDecline,
      handleImportSamplesFromFileConfirm: ElementActions.importSamplesFromFileConfirm,

      handleSetCurrentElement: ElementActions.setCurrentElement,
      handleDeselectCurrentElement: ElementActions.deselectCurrentElement,
      handleChangeSorting: ElementActions.changeSorting,
      handleChangeElementsFilter: ElementActions.changeElementsFilter,

      handleFetchReactionById: ElementActions.fetchReactionById,
      handleTryFetchById: [
        ElementActions.tryFetchReactionById,
        ElementActions.tryFetchWellplateById,
        ElementActions.tryFetchGenericElById
      ],
      handleFetchCellLineById: ElementActions.tryFetchCellLineElById,
      handleFetchVesselById: ElementActions.fetchVesselElById,
      handleFetchEmptyVesselTemplate: ElementActions.fetchEmptyVesselTemplate,
      handleFetchVesselTemplateById: ElementActions.fetchVesselTemplateById,
      handleCloseWarning: ElementActions.closeWarning,
      handleCreateReaction: ElementActions.createReaction,
      handleCopyReactionFromId: ElementActions.copyReactionFromId,
      handleCopyReaction: ElementActions.copyReaction,
      handleCopyResearchPlan: ElementActions.copyResearchPlan,
      handleCopyElement: ElementActions.copyElement,
      handleCopyCellLine: ElementActions.copyCellLineFromId,
      handleOpenReactionDetails: ElementActions.openReactionDetails,

      handleBulkCreateWellplatesFromSamples:
        ElementActions.bulkCreateWellplatesFromSamples,
      handleFetchWellplateById: ElementActions.fetchWellplateById,
      handleImportWellplateSpreadsheet: ElementActions.importWellplateSpreadsheet,
      handleCreateWellplate: ElementActions.createWellplate,
      handleGenerateWellplateFromClipboard:
        ElementActions.generateWellplateFromClipboard,
      handleGenerateScreenFromClipboard:
        ElementActions.generateScreenFromClipboard,

      handleAddResearchPlanToScreen: ElementActions.addResearchPlanToScreen,
      handleFetchScreenById: ElementActions.fetchScreenById,
      handleCreateScreen: ElementActions.createScreen,

      handlefetchResearchPlanById: ElementActions.fetchResearchPlanById,
      handleCreateResearchPlan: ElementActions.createResearchPlan,
      handleImportWellplateIntoResearchPlan: ElementActions.importWellplateIntoResearchPlan,
      handleImportTableFromSpreadsheet: ElementActions.importTableFromSpreadsheet,

      handlefetchDeviceDescriptionById: ElementActions.fetchDeviceDescriptionById,
      handleCreateDeviceDescription: ElementActions.createDeviceDescription,
      handleCopyDeviceDescriptionFromClipboard: ElementActions.copyDeviceDescriptionFromClipboard,
      handlefetchSequenceBasedMacromoleculeSampleById: ElementActions.fetchSequenceBasedMacromoleculeSampleById,
      handleCreateSequenceBasedMacromoleculeSample: ElementActions.createSequenceBasedMacromoleculeSample,
      handleCopySequenceBasedMacromoleculeSampleFromClipboard: ElementActions.copySequenceBasedMacromoleculeSampleFromClipboard,

      handleCreatePrivateNote: ElementActions.createPrivateNote,
      handleUpdatePrivateNote: ElementActions.updatePrivateNote,

      // FIXME ElementStore listens to UIActions?
      handleUnselectCurrentElement: UIActions.deselectAllElements,
      handleSetPagination: UIActions.setPagination,

      handleRefreshElements: ElementActions.refreshElements,
      handleGenerateEmptyElement:
        [
          ElementActions.generateEmptyGenericEl,
          ElementActions.generateEmptyWellplate,
          ElementActions.generateEmptyScreen,
          ElementActions.generateEmptyResearchPlan,
          ElementActions.generateEmptySample,
          ElementActions.generateEmptyReaction,
          ElementActions.generateEmptyCellLine,
          ElementActions.generateEmptyDeviceDescription,
          ElementActions.generateEmptyVessel,
          ElementActions.generateEmptyVesselTemplate,
          ElementActions.generateEmptySequenceBasedMacromoleculeSample,
          ElementActions.showReportContainer,
          ElementActions.showFormatContainer,
          ElementActions.showComputedPropsGraph,
          ElementActions.showComputedPropsTasks,
          ElementActions.showLiteratureDetail,
          ElementActions.showPredictionContainer
        ],
      handleFetchMoleculeByMolfile: ElementActions.fetchMoleculeByMolfile,
      handleFetchMetadata: ElementActions.fetchMetadata,
      handleDeleteElements: ElementActions.deleteElements,

      handleUpdateElementsCollection: ElementActions.updateElementsCollection,
      handleAssignElementsCollection: ElementActions.assignElementsCollection,
      handleRemoveElementsCollection: ElementActions.removeElementsCollection,
      handleSplitAsSubsamples: ElementActions.splitAsSubsamples,
      handleSplitElements: ElementActions.splitElements,
      handleSplitAsSubwellplates: ElementActions.splitAsSubwellplates,
      handleSplitAsSubCellLines: ElementActions.splitAsSubCellLines,
      handleSplitAsSubDeviceDescription: ElementActions.splitAsSubDeviceDescription,
      handleSplitAsSubSequenceBasedMacromoleculeSample: ElementActions.splitAsSubSequenceBasedMacromoleculeSample,
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
        ElementActions.updateResearchPlan,
        ElementActions.updateCellLine,
        ElementActions.updateDeviceDescription,
        ElementActions.updateVessel,
        ElementActions.updateVesselTemplate,
        ElementActions.updateSequenceBasedMacromoleculeSample,
        ElementActions.updateGenericEl,
      ],
      handleUpdateEmbeddedResearchPlan: ElementActions.updateEmbeddedResearchPlan,
      handleRefreshComputedProp: ElementActions.refreshComputedProp,
    });
  }

  handleFetchAllDevices(devices) {
    this.state.elements['devices'].devices = devices;
  }

  handleFetchDeviceById(device) {
    this.state.currentElement = device;
  }

  findDeviceIndexById(deviceId) {
    const { devices } = this.state.elements['devices'];
    return devices.findIndex((e) => e.id === deviceId);
  }

  handleSaveDevice(device) {
    const { devices } = this.state.elements['devices'];
    const deviceKey = devices.findIndex((e) => e._checksum === device._checksum);
    if (deviceKey === -1) {
      this.state.elements['devices'].devices.push(device);
    } else {
      this.state.elements['devices'].devices[deviceKey] = device;
    }
  }

  handleToggleDeviceType({ device, type }) {
    if (device.types.includes(type)) {
      device.types = device.types.filter((e) => e !== type);
    } else {
      device.types.push(type);
    }
    const deviceKey = this.findDeviceIndexById(device.id);
    this.state.elements['devices'].devices[deviceKey] = device;
  }

  handleCreateDevice() {
    const { devices } = this.state.elements['devices'];
    const newDevice = Device.buildEmpty();
    const newKey = devices.length;
    this.state.elements['devices'].activeAccordionDevice = newKey;
    this.state.elements['devices'].devices.push(newDevice);
  }

  handleDeleteDevice(device) {
    const { devices, activeAccordionDevice } = this.state.elements['devices'];
    this.state.elements['devices'].devices = devices.filter((e) => e.id !== device.id);
  }

  handleAddSampleToDevice({ sample, device, options = { save: false } }) {
    const deviceSample = DeviceSample.buildEmpty(device.id, sample);
    device.samples.push(deviceSample);
    if (options.save) {
      ElementActions.saveDevice(device);
      ElementActions.fetchDeviceById.defer(device.id);
    }
  }

  handleAddSampleWithAnalysisToDevice({ sample, analysis, device }) {
    // Note: #735
    // this handleAddSampleWithAnalysisToDevice is unused so far but we still update '1H NMR' to the new type from OLS-chmo
    // and 'NMR'(type) of DeviceSample as well
    const kind = (analysis.kind || '').split('|')[0].trim();
    switch (kind) {
      case chmoConversions.nmr_1h.termId:
        // add sample to device
        const deviceSample = DeviceSample.buildEmpty(device.id, { id: sample.id, short_label: sample.short_label });
        deviceSample.types = [chmoConversions.nmr_1h.value];
        device.samples.push(deviceSample);
        DeviceFetcher.update(device)
          .then((device) => {
            const savedDeviceSample = last(device.samples);
            // add sampleAnalysis to experiments
            let deviceAnalysis = device.devicesAnalyses.find((a) => a.analysisType === chmoConversions.nmr_1h.value);
            if (!deviceAnalysis) {
              deviceAnalysis = DeviceAnalysis.buildEmpty(device.id, chmoConversions.nmr_1h.value);
            }
            const newExperiment = AnalysesExperiment.buildEmpty(sample.id, sample.short_label, analysis.id, savedDeviceSample.id);
            deviceAnalysis.experiments.push(newExperiment);
            ElementActions.saveDeviceAnalysis.defer(deviceAnalysis);
          });
        break;
    }
  }

  handleToggleTypeOfDeviceSample({ device, sample, type }) {
    const sampleKey = device.samples.findIndex((s) => s.id === sample.id);
    if (sample.types.includes(type)) {
      sample.types = sample.types.filter((t) => t !== type);
    } else {
      sample.types.push(type);
    }
    device.samples[sampleKey] = sample;
  }

  handleOpenDeviceAnalysis({ device, type }) {
    switch (type) {
      case "NMR":
        const { currentCollection, isSync } = UIStore.getState();
        const deviceAnalysis = device.devicesAnalyses.find((a) => a.analysisType === "NMR");

        // update Device in case of sample was added by dnd and device was not saved
        device.updateChecksum();
        ElementActions.saveDevice(device);

        if (deviceAnalysis) {
          Aviator.navigate(isSync
            ? `/scollection/${currentCollection.id}/devicesAnalysis/${deviceAnalysis.id}`
            : `/collection/${currentCollection.id}/devicesAnalysis/${deviceAnalysis.id}`
          );
        } else {
          Aviator.navigate(isSync
            ? `/scollection/${currentCollection.id}/devicesAnalysis/new/${device.id}/${type}`
            : `/collection/${currentCollection.id}/devicesAnalysis/new/${device.id}/${type}`
          );
        }
        break;
    }
  }

  handleRemoveSampleFromDevice({ sample, device }) {
    device.samples = device.samples.filter((e) => e.id !== sample.id);
    const deviceKey = this.findDeviceIndexById(device.id);
    this.state.elements['devices'].devices[deviceKey] = device;
  }

  handleChangeDeviceProp({ device, prop, value }) {
    device[prop] = value;
    const deviceKey = this.findDeviceIndexById(device.id);
    this.state.elements['devices'].devices[deviceKey] = device;
  }

  handleChangeActiveAccordionDevice(key) {
    this.state.elements['devices'].activeAccordionDevice = key;
  }

  handleChangeSelectedDeviceId(deviceId) {
    this.state.elements['devices'].selectedDeviceId = deviceId;
  }

  handleSetSelectedDeviceId(deviceId) {
    this.state.elements['devices'].selectedDeviceId = deviceId;
  }

  handleSetRefreshCoefficient(obj) {
    this.setState({ refreshCoefficient: [obj] });
  }

  //TODO move these in Element Action ??
  createSampleAnalysis(sampleId, type) {
    return new Promise((resolve, reject) => {
      SamplesFetcher.fetchById(sampleId)
        .then((sample) => {
          let analysis = Container.buildAnalysis(chmoConversions.others.value);
          switch (type) {
            case chmoConversions.nmr_1h.termId:
              analysis = Container.buildAnalysis(chmoConversions.nmr_1h.value);
              break;
          }
          sample.addAnalysis(analysis);
          SamplesFetcher.update(sample);
          resolve(analysis);
        });
    });
  }

  createAnalysisExperiment(deviceSample, deviceAnalysis) {
    return new Promise((resolve, reject) => {
      this.createSampleAnalysis(deviceSample.sampleId, deviceAnalysis.analysisType)
        .then((sampleAnalysis) => {
          const experiment = AnalysesExperiment.buildEmpty(
            deviceSample.sampleId,
            deviceSample.shortLabel,
            sampleAnalysis.id,
            deviceSample.id
          );
          resolve(experiment);
        });
    });
  }

  handleCreateDeviceAnalysis({ device, analysisType }) {
    const analysis = DeviceAnalysis.buildEmpty(device.id, analysisType);
    const samplesOfAnalysisType = device.samples.filter((s) => s.types.includes(analysisType));
    const promises = samplesOfAnalysisType.map((s) => this.createAnalysisExperiment(s, analysis));
    Promise.all(promises)
      .then((experiments) => {
        experiments.map((experiment) => analysis.experiments.push(experiment));
        ElementActions.saveDeviceAnalysis(analysis);
      });
  }

  handleFetchDeviceAnalysisById({ analysis, device }) {
    const { experiments } = analysis;
    const samplesOfAnalysisType = device.samples.filter((s) => s.types.includes(analysis.analysisType));
    const samplesWithoutOld = slice(samplesOfAnalysisType, experiments.length);
    const promises = samplesWithoutOld.map((s) => this.createAnalysisExperiment(s, analysis));
    Promise.all(promises)
      .then((experiments) => {
        experiments.map((experiment) => analysis.experiments.push(experiment));
        ElementActions.saveDeviceAnalysis(analysis);
      });
  }

  handleSaveDeviceAnalysis(analysis) {
    const { currentCollection, isSync } = UIStore.getState();
    this.state.currentElement = analysis;

    Aviator.navigate(isSync
      ? `/scollection/${currentCollection.id}/devicesAnalysis/${analysis.id}`
      : `/collection/${currentCollection.id}/devicesAnalysis/${analysis.id}`
    );
  }

  handleChangeAnalysisExperimentProp({ analysis, experiment, prop, value }) {
    const experimentKey = analysis.experiments.findIndex((e) => e.id === experiment.id);
    analysis.experiments[experimentKey][prop] = value;
    this.state.currentElement = analysis;
  }

  handleDeleteAnalysisExperiment({ device, analysis, experiment }) {
    const sample = device.samples.find((s) => s.id === experiment.deviceSampleId);
    const sampleKey = device.samples.findIndex((s) => s.id === experiment.deviceSampleId);
    device.samples[sampleKey].types = sample.types.filter((t) => t !== analysis.analysisType);
    ElementActions.saveDevice(device);
    ElementActions.fetchDeviceAnalysisById.defer(analysis.id);
  }

  handleDuplicateAnalysisExperiment({ device, analysis, experiment }) {
    const sample = device.samples.find((s) => s.id === experiment.deviceSampleId);
    const newSample = DeviceSample.buildEmpty(analysis.deviceId, { id: sample.sampleId, short_label: sample.shortLabel });
    newSample.types = [analysis.analysisType];
    device.samples.push(newSample);
    ElementActions.saveDevice(device);
    ElementActions.fetchDeviceAnalysisById.defer(analysis.id);
  }

  // SEARCH

  handleFetchBasedOnSearchSelection(result) {
    Object.keys(result).forEach((key) => {
      this.state.elements[key] = result[key];
    });
  }

  handleFetchBasedOnSearchResultIds(result) {
    Object.keys(result).forEach((key) => {
      this.state.elements[key] = result[key];
    });
  }

  handleDispatchSearchResult(result) {
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
    const {
      sample, reaction, wellplate, screen, research_plan, vessel,
      currentCollection, cell_line, device_description, sequence_based_macromolecule_sample
    } = ui_state;
    const selecteds = this.state.selecteds.map(s => ({ id: s.id, type: s.type }));
    const params = {
      options,
      sample,
      reaction,
      wellplate,
      screen,
      research_plan,
      currentCollection,
      selecteds,
      cell_line,
      device_description,
      vessel,
      sequence_based_macromolecule_sample,
    };

    const currentUser = (UserStore.getState() && UserStore.getState().currentUser) || {};
    if (MatrixCheck(currentUser.matrix, 'genericElement')) {
      const { klasses } = UIStore.getState();

      // eslint-disable-next-line no-unused-expressions
      klasses && klasses.forEach((klass) => {
        params[`${klass}`] = ui_state[`${klass}`];
      });
    }

    ElementActions.deleteElementsByUIState(params);
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
    this.waitFor(UIStore.dispatchToken);

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
        if (layout.cell_line && layout.cell_line > 0) { this.handleRefreshElements('cell_line'); }
        if (layout.device_description && layout.device_description > 0) { this.handleRefreshElements('device_description'); }
        if (layout.vessel && layout.vessel > 0) { this.handleRefreshElements('vessel'); }
        if (layout.sequence_based_macromolecule_sample && layout.sequence_based_macromolecule_sample > 0) {
          this.handleRefreshElements('sequence_based_macromolecule_sample');
        }
        if (!isSync && layout.research_plan && layout.research_plan > 0) { this.handleRefreshElements('research_plan'); }

        const { currentUser, genericEls } = UserStore.getState();
        if (MatrixCheck(currentUser.matrix, 'genericElement')) {
          // eslint-disable-next-line no-unused-expressions
          const genericNames = (genericEls.map((el) => el.name)) || [];
          genericNames.forEach((klass) => {
            if (layout[`${klass}`] && layout[`${klass}`] > 0) { this.handleRefreshElements(klass); }
          });
        }
      }
    }
  }

  handleFetchGenericElsByCollectionId(result) {
    //const klassName = result.element_klass && result.element_klass.name;
    let { type } = result;
    if (typeof type === 'undefined' || type == null) {
      type = (result.result.elements && result.result.elements.length > 0 && result.result.elements[0].type) || result.result.type;
    }
    this.state.elements[`${type}s`] = result.result;
  }

  handleFetchGenericElById(result) {
    this.changeCurrentElement(result);
  }

  handleCreateGenericEl(genericEl) {
    UserActions.fetchCurrentUser();
    this.handleRefreshElements((genericEl.element_klass && genericEl.element_klass.name) || 'genericEl');
    //this.handleRefreshElements('genericEl');
    this.navigateToNewElement(genericEl, 'GenericEl');
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

  handlefetchCellLinesByCollectionId(result) {
    this.state.elements.cell_lines = result;
  }

  handlefetchDeviceDescriptionsByCollectionId(result) {
    this.state.elements.device_descriptions = result;
  }

  handlefetchVesselsByCollectionId(result) {
    this.state.elements.vessels = result;
  }

  handlefetchSequenceBasedMacromoleculeSamplesByCollectionId(result) {
    this.state.elements.sequence_based_macromolecule_samples = result;
  }

  // -- Samples --

  handleFetchSampleById(result) {
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      if (result.isMixture()) {
        ComponentsFetcher.fetchComponentsBySampleId(result.id)
          .then(async (components) => {
            const sampleComponents = components.map((component) => {
              const { component_properties, ...rest } = component;
              const sampleData = {
                ...rest,
                ...component_properties
              };
              return new Component(sampleData);
            });
            await result.initialComponents(sampleComponents);
          })
          .catch((errorMessage) => {
            console.log(errorMessage);
          });
      }
      this.changeCurrentElement(result);
    }
  }

  handleCreateSample({ element, closeView, components }) {
    if (element.isMixture()) {
      ComponentsFetcher.saveOrUpdateComponents(element, components)
        .then(async () => {
          await element.initialComponents(components);
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    }
    UserActions.fetchCurrentUser();
    fetchOls('sample');
    this.handleRefreshElements('sample');
    if (!closeView) {
      this.navigateToNewElement(element);
    }
  }

  handleCreateSampleForReaction({ newSample, reaction, materialGroup, components }) {
    UserActions.fetchCurrentUser();
    if (newSample.isMixture()) {
      ComponentsFetcher.saveOrUpdateComponents(newSample, components)
        .then(async () => {
          await newSample.initialComponents(components);
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    }
    reaction.addMaterial(newSample, materialGroup);
    this.handleRefreshElements('sample');
    ElementActions.handleSvgReactionChange(reaction);
    this.changeCurrentElement(reaction);
  }

  handleEditReactionSample(result) {
    const { sample } = result;
    sample.belongTo = result.reaction;
    this.changeCurrentElement(sample);
  }

  handleEditWellplateSample(result) {
    const { sample } = result;
    sample.belongTo = result.wellplate;
    this.changeCurrentElement(sample);
  }

  handleUpdateSampleForReaction({ reaction, sample, closeView, components }) {
    // UserActions.fetchCurrentUser();
    ElementActions.handleSvgReactionChange(reaction);
    if (sample.isMixture()) {
      ComponentsFetcher.saveOrUpdateComponents(sample, components)
        .then(async () => {
          await sample.initialComponents(components);
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    }
    if (closeView) {
      this.changeCurrentElement(reaction);
    } else {
      this.changeCurrentElement(sample);
    }

    // TODO: check if this is needed with the new handling of changing CE
    // maybe this.handleRefreshElements is enough
    this.handleUpdateElement(sample);
  }

  handleUpdateLinkedElement({ element, closeView, components }) {
    if (element instanceof Sample && element.isMixture()) {
      ComponentsFetcher.saveOrUpdateComponents(element, components)
        .then(() => {
          element.initialComponents(components);
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    }
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

  handleSplitAsSubsamples(uiState) {
    ElementActions.fetchSamplesByCollectionId(
      uiState.currentCollection.id,
      {},
      uiState.isSync,
      this.state.moleculeSort
    );
  }

  handleSplitElements(obj) {
    const { name, ui_state } = obj;
    const page = ui_state[name] ? ui_state[name].page : 1;
    const perPage = ui_state.number_of_results;
    const {
      fromDate, toDate, userLabel, productOnly
    } = ui_state;
    const params = {
      page, perPage, fromDate, toDate, userLabel, productOnly, name
    };
    ElementActions.fetchGenericElsByCollectionId(ui_state.currentCollection.id, params, ui_state.isSync, name);
  }

  handleSplitAsSubwellplates(uiState) {
    ElementActions.fetchWellplatesByCollectionId(uiState.currentCollection.id);
    ElementActions.fetchSamplesByCollectionId(
      uiState.currentCollection.id,
      {},
      uiState.isSync,
      this.state.moleculeSort
    );
  }

  handleSplitAsSubCellLines(uiState) {
    ElementActions.fetchCellLinesByCollectionId(uiState.currentCollection.id);
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
    // this.state.currentElement.molecule = result;
    this.state.currentElement.sample = result;
    this.handleRefreshElements('sample');
  }

  handleCopySampleFromClipboard(collectionId) {
    const clipboardSamples = ClipboardStore.getState().samples;
    if (clipboardSamples && clipboardSamples.length > 0) {
      this.changeCurrentElement(Sample.copyFromSampleAndCollectionId(clipboardSamples[0], collectionId, true));
    }
  }

  /**
   * @param {Object} params = { reaction, materialGroup }
   */
  handleAddSampleToMaterialGroup(params) {
    const { materialGroup } = params;
    const { reaction } = params;

    const sample = Sample.buildEmpty(reaction.collection_id);
    sample.molfile = sample.molfile || '';
    sample.molecule = sample.molecule === undefined ? sample : sample.molecule;
    sample.sample_svg_file = sample.sample_svg_file;
    sample.belongTo = reaction;
    sample.matGroup = materialGroup;
    reaction.changed = true;
    this.changeCurrentElement(sample);
  }

  handleShowReactionMaterial(params) {
    const { reaction, sample, coefficient } = params;
    const { selecteds } = this.state;
    sample.belongTo = reaction;
    const obj = {
      sId: sample.id,
      rId: reaction.id,
      coefficient
    };
    this.setState((prevState) => {
      const updatedCoefficient = [...prevState.refreshCoefficient];
      let found = false;
      selecteds.forEach((element) => {
        if (element.type === 'reaction' && element.id === obj.rid) {
          found = true;
        }
      });
      if (!found) {
        updatedCoefficient.push(obj);
      }
      return { refreshCoefficient: updatedCoefficient };
    });

    if (sample.isMixture()) {
      ComponentsFetcher.fetchComponentsBySampleId(sample.id)
        .then(async (components) => {
          const sampleComponents = components.map((component) => {
            const { component_properties, ...rest } = component;
            const sampleData = {
              ...rest,
              ...component_properties
            };
            return new Component(sampleData);
          });
          await sample.initialComponents(sampleComponents);
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    }
    this.changeCurrentElement(sample);
  }

  handleImportSamplesFromFile(data) {
    if (data.sdf) {
      this.setState({ sdfUploadData: data })
    } else {
      this.handleRefreshElements('sample');
    }
  }

  handleImportSamplesFromFileConfirm() {
    this.setState({ sdfUploadData: null })
    this.handleRefreshElements('sample');
  }

  handleImportSamplesFromFileDecline() {
    this.setState({ sdfUploadData: null })
  }

  // -- Wellplates --

  handleBulkCreateWellplatesFromSamples() {
    this.handleRefreshElements('wellplate');
    this.handleRefreshElements('sample');
  }

  handleFetchWellplateById(result) {
    this.changeCurrentElement(result);
    // this.state.currentElement = result;
    // this.navigateToNewElement(result)
  }

  handleImportWellplateSpreadsheet(result) {
    if (result.error) { return; }

    const { selecteds } = this.state;

    const index = this.elementIndex(selecteds, result);
    const newSelecteds = this.updateElement(result, index);
    this.setState({ selecteds: newSelecteds });
  }

  handleCreateWellplate(wellplate) {
    fetchOls('wellplate');
    this.handleRefreshElements('wellplate');
    this.navigateToNewElement(wellplate);
  }

  handleGenerateWellplateFromClipboard(collection_id) {
    let clipboardSamples = ClipboardStore.getState().samples;

    this.changeCurrentElement(Wellplate.buildFromSamplesAndCollectionId(clipboardSamples, collectionId));
    // this.state.currentElement = Wellplate.buildFromSamplesAndCollectionId(clipboardSamples, collectionId);
  }

  // -- Screens --

  handleAddResearchPlanToScreen(screen) {
    fetchOls('screen');
    this.handleRefreshElements('screen');
    this.navigateToNewElement(screen);
  }

  handleFetchScreenById(result) {
    if (!this.state.currentElement || this.state.currentElement._checksum != result._checksum) {
      this.changeCurrentElement(result);
      // this.state.currentElement = result;
    }
  }

  handleCreateScreen(screen) {
    fetchOls('screen');
    this.handleRefreshElements('screen');
    this.navigateToNewElement(screen);
  }

  handleGenerateScreenFromClipboard(collectionId) {
    const clipboardWellplates = ClipboardStore.getState().wellplates;
    this.changeCurrentElement(Screen.buildFromWellplatesAndCollectionId(clipboardWellplates, collectionId));
  }

  // -- ResearchPlans --

  handlefetchResearchPlanById(result) {
    this.changeCurrentElement(result);
    // this.state.currentElement = result;
  }

  handleCreateResearchPlan(researchPlan) {
    this.handleRefreshElements('research_plan');
    this.navigateToNewElement(researchPlan);
  }

  handleImportWellplateIntoResearchPlan(result) {
    if (result.error) { return; }

    const { selecteds } = this.state;

    const index = this.elementIndex(selecteds, result);
    const newSelecteds = this.updateElement(result, index);
    this.setState({ selecteds: newSelecteds });
  }

  handleImportTableFromSpreadsheet(result) {
    if (result.error) { return; }

    const { selecteds } = this.state;

    const index = this.elementIndex(selecteds, result);
    const newSelecteds = this.updateElement(result, index);
    this.setState({ selecteds: newSelecteds });
  }

  // -- DeviceDescriptions --

  handlefetchDeviceDescriptionById(result) {
    this.changeCurrentElement(result);
  }

  handleCreateDeviceDescription(deviceDescription) {
    this.handleRefreshElements('device_description');
    this.navigateToNewElement(deviceDescription);
  }

  handleCopyDeviceDescriptionFromClipboard(collectionId) {
    const clipboardDeviceDescriptions = ClipboardStore.getState().deviceDescriptions;
    if (clipboardDeviceDescriptions && clipboardDeviceDescriptions.length > 0) {
      this.changeCurrentElement(DeviceDescription.copyFromDeviceDescriptionAndCollectionId(clipboardDeviceDescriptions[0], collectionId));
    }
  }

  handleSplitAsSubDeviceDescription(uiState) {
    ElementActions.fetchDeviceDescriptionsByCollectionId(
      uiState.currentCollectionId,
      {},
      uiState.isSync,
    );
  }

  // -- Sequence Based Macromolecules --

  handlefetchSequenceBasedMacromoleculeSampleById(result) {
    this.changeCurrentElement(result);
  }

  handleCreateSequenceBasedMacromoleculeSample(sequence_based_macromolecule_sample) {
    this.handleRefreshElements('sequence_based_macromolecule_sample');
    this.navigateToNewElement(sequence_based_macromolecule_sample);
  }

  handleCopySequenceBasedMacromoleculeSampleFromClipboard(collection_id) {
    const clipboardSequenceBasedMacromoleculeSamples = ClipboardStore.getState().sequence_based_macromolecule_samples;
    if (clipboardSequenceBasedMacromoleculeSamples && clipboardSequenceBasedMacromoleculeSamples.length > 0) {
      this.changeCurrentElement(
        SequenceBasedMacromoleculeSample
          .copyFromSequenceBasedMacromoleculeSampleAndCollectionId(clipboardSequenceBasedMacromoleculeSamples[0], collection_id)
      );
    }
  }

  handleSplitAsSubSequenceBasedMacromoleculeSample(ui_state) {
    ElementActions.fetchSequenceBasedMacromoleculeSamplesByCollectionId(
      ui_state.currentCollectionId, {}, ui_state.isSync
    );
  }

  // -- Reactions --

  handleFetchReactionById(result) {
    if (!this.state.currentElement || (this.state.currentElement && this.state.currentElement._checksum) != result._checksum) {
      this.changeCurrentElement(result);
      this.state.elements.reactions.elements = this.refreshReactionsListForSpecificReaction(result);
      //  this.navigateToNewElement(result);
    }
  }

  refreshReactionsListForSpecificReaction(newReaction) {
    return this.state.elements.reactions.elements.map((reaction) => {
      return reaction.id === newReaction.id
        ? newReaction
        : reaction;
    });
  }

  handleTryFetchById(result) {
    if (result.hasOwnProperty('error')) {
      this.state.elementWarning = true;
    } else {
      this.changeCurrentElement(result);
      // this.state.currentElement = result
      this.navigateToNewElement(result);
    }
  }

  handleFetchCellLineById(result) {
    this.changeCurrentElement(result);
  }

  handleFetchVesselById(result) {
    this.changeCurrentElement(result);
  }

  handleFetchEmptyVesselTemplate(result) {
    this.changeCurrentElement(result);
  }

  handleFetchVesselTemplateById(result) {
    this.changeCurrentElement(result);
  }

  handleCreateCellLine(cellLine) {
    this.handleRefreshElements('cell_line');
    this.navigateToNewElement(cellLine);
  }

  handleCreateVessel(vessel) {
    this.handleRefreshElements('vessel');
    this.navigateToNewElement(vessel);
  }

  handleCreateVesselTemplate(vessel) {
    this.handleRefreshElements('vessel');
    this.handleRefreshElements('vessel_template');
  }

  handleCloseWarning() {
    this.state.elementWarning = false;
  }

  handleCreateReaction(reaction) {
    UserActions.fetchCurrentUser();
    fetchOls('reaction');
    this.handleRefreshElements('reaction');
    this.navigateToNewElement(reaction);
  }

  handleCopyReactionFromId(reaction) {
    this.waitFor(UIStore.dispatchToken);
    const uiState = UIStore.getState();
    this.changeCurrentElement(Reaction.copyFromReactionAndCollectionId(reaction, uiState.currentCollection.id));
  }

  handleCopyReaction(result) {
    this.changeCurrentElement(Reaction.copyFromReactionAndCollectionId(result.reaction, result.colId));
    Aviator.navigate(`/collection/${result.colId}/reaction/copy`);
  }

  handleCopyResearchPlan(result) {
    this.changeCurrentElement(ResearchPlan.copyFromResearchPlanAndCollectionId(result.research_plan, result.colId));
    Aviator.navigate(`/collection/${result.colId}/research_plan/copy`);
  }

  handleCopyElement(result) {
    this.changeCurrentElement(GenericEl.copyFromCollectionId(result.element, result.colId));
    Aviator.navigate(`/collection/${result.colId}/${result.element.type}/copy`);
  }

  handleCopyCellLine(result) {
    UserActions.fetchCurrentUser(); // Needed to update the cell line counter in frontend
    Aviator.navigate(`/collection/${result.collectionId}/cell_line/${result.id}`);
  }

  handleOpenReactionDetails(reaction) {
    this.changeCurrentElement(reaction);
    this.handleRefreshElements('sample');
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

  navigateToNewElement(element = {}, klassType = '') {
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
    elementShowOrNew({ type, klassType, params: namedParams });
    return null;
  }

  handleGenerateEmptyElement(element) {
    const { currentElement } = this.state;

    const newElementOfSameTypeIsPresent =
      currentElement && currentElement.isNew && currentElement.type === element.type;
    if (!newElementOfSameTypeIsPresent) {
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
    if (typeof uiState[type] === 'undefined') return;

    const { page } = uiState[type];
    const { moleculeSort } = this.state;
    if (this.state.elements[`${type}s`]) {
      this.state.elements[`${type}s`].page = page;
    }

    // TODO if page changed -> fetch
    // if there is a currentSearchSelection
    //    we have to execute the respective action
    const { currentSearchSelection, currentSearchByID } = uiState;

    if (currentSearchSelection != null) {
      currentSearchSelection.page_size = uiState.number_of_results;
      ElementActions.fetchBasedOnSearchSelectionAndCollection.defer({
        selection: currentSearchSelection,
        collectionId: uiState.currentCollection.id,
        page,
        isSync: uiState.isSync,
        moleculeSort
      });
    } else if (currentSearchByID != null) {
      this.handleRefreshElementsForSearchById(type, uiState, currentSearchByID);
    } else {
      const perPage = uiState.number_of_results;
      const { fromDate, toDate, userLabel, productOnly } = uiState;
      const params = { page, per_page: perPage, fromDate, toDate, userLabel, productOnly, name: type };
      const fnName = type.split('_').map((x) => x[0].toUpperCase() + x.slice(1)).join("") + 's';
      const fn = `fetch${fnName}ByCollectionId`;
      const allowedActions = [
        'fetchSamplesByCollectionId',
        'fetchReactionsByCollectionId',
        'fetchWellplatesByCollectionId',
        'fetchScreensByCollectionId',
        'fetchResearchPlansByCollectionId',
        'fetchCellLinesByCollectionId',
        'fetchDeviceDescriptionsByCollectionId',
        'fetchVesselsByCollectionId',
        'fetchSequenceBasedMacromoleculeSamplesByCollectionId'
      ];
      if (allowedActions.includes(fn)) {
        // ElementActions[fn](uiState.currentCollection.id, params, uiState.isSync, moleculeSort);
        const actionFn = ElementActions[fn](uiState.currentCollection.id, params, uiState.isSync);
        if (typeof actionFn === 'function') {
          actionFn(this.alt.dispatch.bind(this));
        }
      } else {
        ElementActions.fetchGenericElsByCollectionId(uiState.currentCollection.id, params, uiState.isSync, type);
        ElementActions.fetchSamplesByCollectionId(uiState.currentCollection.id, params, uiState.isSync, moleculeSort);
      }
    }

    MessagesFetcher.fetchSpectraMessages(0).then((result) => {
      result.messages.sort((a, b) => (a.id - b.id));
      const { messages } = result;
      if (messages && messages.length > 0) {
        const lastMsg = messages[0];
        this.setState({ spectraMsg: lastMsg });
      }
    });
  }

  handleRefreshElementsForSearchById(type, uiState, currentSearchByID) {
    currentSearchByID.page_size = uiState.number_of_results;
    const {
      filterCreatedAt, fromDate, toDate, userLabel, productOnly
    } = uiState;
    const { moleculeSort } = this.state;
    const { page } = uiState[type];
    let filterParams = {};
    const elnElements = ['sample', 'reaction', 'screen', 'wellplate', 'research_plan'];
    const modelName = !elnElements.includes(type) ? 'element' : type;

    if (fromDate || toDate || userLabel || productOnly) {
      filterParams = {
        filter_created_at: filterCreatedAt,
        from_date: fromDate,
        to_date: toDate,
        user_label: userLabel,
        product_only: productOnly,
      };
    }

    const selection = {
      elementType: 'by_ids',
      id_params: {
        model_name: `${modelName}`,
        ids: currentSearchByID[`${type}s`].ids,
        total_elements: currentSearchByID[`${type}s`].totalElements,
        with_filter: true,
      },
      list_filter_params: filterParams,
      search_by_method: 'search_by_ids',
      page_size: currentSearchByID.page_size,
    };

    ElementActions.fetchBasedOnSearchResultIds.defer({
      selection,
      collectionId: uiState.currentCollection.id,
      page,
      isSync: uiState.isSync,
      moleculeSort
    });
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
    this.handleRefreshElements('sample');
  }

  handleChangeElementsFilter(filter) {
    const userState = UserStore.getState();
    if (!userState.profile.filters) {
      userState.profile.data.filters = {};
    }
    userState.profile.data.filters[filter.name] = {
      sort: filter.sort,
      group: filter.group,
      direction: filter.direction,
    };

    this.handleRefreshElements(filter.name);
  }

  // //////////////////////
  // formerly DetailStore
  // TODO: clean this section
  handleSelect(index) {
    this.resetCurrentElement(index, this.state.selecteds);
  }

  handleClose({ deleteEl, force }) {
    // Currently ignore report "isPendingToSave"
    const deletableTyps = ['report', 'prediction'];

    if (deleteEl?.type === 'vessel_template' && deleteEl?.group?.length > 0) {
      this.deleteGroupElement(deleteEl.group);
      return;
    }

    const isDeletableTyps = deletableTyps.indexOf(deleteEl.type) >= 0;
    if (force || isDeletableTyps || this.isDeletable(deleteEl)) {
      this.deleteCurrentElement(deleteEl);
    } else {
      this.setState({ deletingElement: deleteEl });
    }
  }

  // To manage closing of vessel template tabs
  deleteGroupElement(group) {
    const openTabs = this.state.selecteds;

    const groupIds = group.map((v) => v.id);

    const newSelecteds = openTabs.filter((el) => {
      if (Array.isArray(el) && el[0]?.type === 'vessel_template') {
        const elIds = el.map((v) => v.id);
        const isSameGroup = elIds.length === groupIds.length
          && elIds.every((id) => groupIds.includes(id));
        return !isSameGroup;
      }

      return true;
    });

    let newActiveKey = this.state.activeKey;
    if (newActiveKey >= newSelecteds.length) {
      newActiveKey = Math.max(0, newSelecteds.length - 1);
    }

    this.setState({ selecteds: newSelecteds, activeKey: newActiveKey });
    this.resetCurrentElement(newActiveKey, newSelecteds);
  }

  handleConfirmDelete(confirm) {
    const deleteEl = this.state.deletingElement;
    if (confirm) {
      this.deleteCurrentElement(deleteEl);
    }
    this.setState({ deletingElement: null });
  }

  handleChangeCurrentElement({ oriEl, nextEl }) {
    const { selecteds } = this.state;
    const index = this.elementIndex(selecteds, nextEl);
    this.synchronizeElements(oriEl);

    if (index === -1) {
      this.state.activeKey = selecteds.length;
      if (Array.isArray(nextEl) && nextEl[0]?.type === 'vessel_template') {
        const groupWrapper = {
          id: nextEl[0].id,
          type: 'vessel_template',
          group: nextEl,
          title: nextEl[0]?.vesselName,
        };
        this.state.selecteds = this.addElement(groupWrapper);
      } else if (nextEl) {
        this.state.selecteds = this.addElement(nextEl);
      }
    } else {
      this.state.activeKey = index;
      this.state.selecteds = this.updateElement(nextEl, index);
    }

    return true;
  }

  changeCurrentElement(nextEl) {
    const { selecteds } = this.state;
    const index = this.elementIndex(selecteds, nextEl);
    this.synchronizeElements(this.state.currentElement);

    if (index === -1) {
      this.state.activeKey = selecteds.length;
      if (nextEl) this.state.selecteds = this.addElement(nextEl);
    } else {
      this.state.activeKey = index;
      this.state.selecteds = this.updateElement(nextEl, index);
    }
    // this.synchronizeElements(this.state.currentElement);
    this.state.currentElement = nextEl;
  }


  handleGetMoleculeCas(updatedSample) {
    const { selecteds } = this.state;
    const index = this.elementIndex(selecteds, updatedSample);
    const newSelecteds = this.updateElement(updatedSample, index);
    this.setState({ selecteds: newSelecteds });
  }

  UpdateMolecule(updatedSample) {
    if (updatedSample) {
      const { selecteds } = this.state;
      const index = this.elementIndex(selecteds, updatedSample);
      const newSelecteds = this.updateElement(updatedSample, index);
      this.setState({ selecteds: newSelecteds });
    }
  }

  UpdateResearchPlanAttaches(updatedResearchPlan) {
    const { selecteds } = this.state;
    ResearchPlansFetcher.fetchById(updatedResearchPlan.id)
      .then((result) => {
        result.mode = 'edit';
        this.changeCurrentElement(result);
        const index = this.elementIndex(selecteds, result);
        const newSelecteds = this.updateElement(result, index);
        this.setState({ selecteds: newSelecteds });
      });
  }

  handleUpdateResearchPlanAttaches(updatedResearchPlan) {
    this.UpdateResearchPlanAttaches(updatedResearchPlan);
  }

  UpdateWellplateAttaches(updatedWellplate) {
    const { selecteds } = this.state;
    WellplatesFetcher.fetchById(updatedWellplate.id)
      .then((result) => {
        this.changeCurrentElement(result);
        const index = this.elementIndex(selecteds, result);
        const newSelecteds = this.updateElement(result, index);
        this.setState({ selecteds: newSelecteds });
      });
  }

  handleUpdateWellplateAttaches(updatedWellplate) {
    this.UpdateWellplateAttaches(updatedWellplate);
  }

  UpdateScreen(updatedScreen) {
    const { selecteds } = this.state;
    ScreensFetcher.fetchById(updatedScreen.id)
      .then((result) => {
        this.changeCurrentElement(result);
        const index = this.elementIndex(selecteds, result);
        const newSelecteds = this.updateElement(result, index);
        this.setState({ selecteds: newSelecteds });
      });
  }

  handleUpdateScreen(updatedScreen) {
    this.UpdateScreen(updatedScreen);
  }

  handleUpdateMoleculeNames(updatedSample) {
    this.UpdateMolecule(updatedSample);
  }

  handleUpdateMoleculeCas(updatedSample) {
    this.UpdateMolecule(updatedSample);
  }

  handleUpdateElement(updatedElement) {
    switch (updatedElement?.type) {
      case 'sample':
        fetchOls('sample');
        this.handleRefreshElements('sample');
        break;
      case 'reaction':
        fetchOls('reaction');
        this.handleRefreshElements('reaction');
        this.handleRefreshElements('sample');
        break;
      case 'screen':
        fetchOls('screen');
        this.handleRefreshElements('screen');
        this.handleUpdateScreen(updatedElement);
        break;
      case 'research_plan':
        this.handleRefreshElements('research_plan');
        this.handleUpdateResearchPlanAttaches(updatedElement);
        break;
      case 'cell_line':
        this.changeCurrentElement(updatedElement);
        this.handleRefreshElements('cell_line');
        break;
      case 'vessel':
        this.changeCurrentElement(updatedElement);
        this.handleRefreshElements('vessel');
        break;
      case 'vessel_template':
        this.changeCurrentElement(updatedElement);
        this.handleRefreshElements('vessel_template');
        this.handleRefreshElements('vessel');
        break;
      case 'wellplate':
        fetchOls('wellplate');
        this.handleRefreshElements('wellplate');
        this.handleUpdateWellplateAttaches(updatedElement);
        this.handleRefreshElements('sample');
        break;
      case 'device_description':
        this.changeCurrentElement(updatedElement);
        this.handleRefreshElements('device_description');
        break;
      case 'sequence_based_macromolecule_sample':
        this.changeCurrentElement(updatedElement);
        this.handleRefreshElements('sequence_based_macromolecule_sample');
        break;
      case 'genericEl':
        this.handleRefreshElements('genericEl');
        break;
      default:
        this.changeCurrentElement(updatedElement);
        if (updatedElement && updatedElement.type) {
          this.handleRefreshElements(updatedElement.type);
        }
        break;
    }

    return true;
  }

  handleUpdateEmbeddedResearchPlan() {
    this.handleRefreshElements('research_plan');
  }

  synchronizeElements(previous) {
    const { selecteds, refreshCoefficient } = this.state;

    if (previous instanceof Sample) {
      const rId = previous.tag && previous.tag.taggable_data
        && previous.tag.taggable_data.reaction_id;
      const openedReaction = selecteds.find((el) => SameEleTypId(el, { type: 'reaction', id: rId }));
      if (openedReaction) {
        if (refreshCoefficient && refreshCoefficient.length > 0) {
          refreshCoefficient.forEach((element) => {
            if (element.sId === previous.id) {
              openedReaction.updateMaterial(previous, element);
            }
          });
        } else {
          openedReaction.updateMaterial(previous);
        }
        if (previous.isPendingToSave) {
          openedReaction.changed = previous.isPendingToSave;
        }
      }
    }

    if (previous instanceof Reaction) {
      const { samples } = previous;
      selecteds.map((nextSample) => {
        const previousSample = samples.find((s) => SameEleTypId(nextSample, s));
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
    const { selecteds } = this.state;
    return [...selecteds, addEl];
  }

  updateElement(updateEl, index) {
    const { selecteds } = this.state;
    return [
      ...selecteds.slice(0, index),
      updateEl,
      ...selecteds.slice(index + 1)
    ];
  }

  deleteElement(deleteEl) {
    return this.state.selecteds.filter((el) => !SameEleTypId(el, deleteEl));
  }

  elementIndex(selecteds, newSelected) {
    if (Array.isArray(newSelected)) {
      return selecteds.findIndex((el) => Array.isArray(el)
        && el.length > 0
        && el[0].type === 'vessel_template'
        && el[0].vesselTemplateId === newSelected[0].vesselTemplateId
        && el.length === newSelected.length
        && el.every((v, i) => v.id === newSelected[i].id));
    }

    return selecteds.findIndex((el) => SameEleTypId(el, newSelected));
  }

  resetCurrentElement(newKey, newSelecteds) {
    const newCurrentElement = newKey < 0 ? newSelecteds[0] : newSelecteds[newKey];

    if (newSelecteds.length === 0) {
      this.changeCurrentElement(null);
    } else {
      this.changeCurrentElement(newCurrentElement);
    }

    UrlSilentNavigation(newCurrentElement);
    return true;
  }

  deleteCurrentElement(deleteEl) {
    const newSelecteds = this.deleteElement(deleteEl);
    let left = this.state.activeKey - 1;
    if (left < 0) left = 0;
    this.setState({ selecteds: newSelecteds });
    this.resetCurrentElement(left, newSelecteds);
  }

  isDeletable(deleteEl) {
    return !(deleteEl && deleteEl.isPendingToSave);
  }

  handleDeletingElements(response) {
    const elements = response && response.selecteds;
    const { currentElement } = this.state;
    const currentNotDeleted = intersectionWith([currentElement], elements, SameEleTypId)[0];
    const newSelecteds = intersectionWith(this.state.selecteds, elements, SameEleTypId);

    if (currentNotDeleted) {
      const currentIdx = findIndex(newSelecteds, (o) => o.id === currentElement.id) || 0;
      this.setState({ selecteds: newSelecteds, activeKey: currentIdx });
    } else {
      this.setState({ selecteds: newSelecteds }, this.resetCurrentElement(-1, newSelecteds));
    }

    this.fetchElementsByCollectionIdandLayout();
  }

  handleRefreshComputedProp(cprop) {
    const { selecteds, currentElement } = this.state;
    const samples = selecteds.concat([currentElement]).filter((x) => (
      x instanceof Sample && x.id == cprop.sample_id
    ));
    if (samples.length === 0) return this.handleRefreshElements('sample');

    samples.forEach((el) => {
      const found = el.molecule_computed_props && el.molecule_computed_props.find((x) => x.id == cprop.id);
      if (!found) {
        el.molecule_computed_props && el.molecule_computed_props.push(cprop);
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

  // -- Private Note --
  handleCreatePrivateNote(note) {
    this.state.currentElement.private_note = note;
    this.changeCurrentElement(this.state.currentElement);
  }

  handleUpdatePrivateNote(note) {
    this.state.currentElement.private_note = note;
    this.changeCurrentElement(this.state.currentElement);
  }

  // -- Metadata --

  handleFetchMetadata(metadata) {
    this.changeCurrentElement(metadata);
  }
}

export default alt.createStore(ElementStore, 'ElementStore');
