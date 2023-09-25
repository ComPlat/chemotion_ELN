/* eslint-disable class-methods-use-this */
import alt from 'src/stores/alt/alt';

import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';

import NotificationActions from 'src/stores/alt/actions/NotificationActions';
import UIFetcher from 'src/fetchers/UIFetcher';
import SamplesFetcher from 'src/fetchers/SamplesFetcher';
import MoleculesFetcher from 'src/fetchers/MoleculesFetcher';
import ReactionsFetcher from 'src/fetchers/ReactionsFetcher';
import WellplatesFetcher from 'src/fetchers/WellplatesFetcher';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import ScreensFetcher from 'src/fetchers/ScreensFetcher';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import SearchFetcher from 'src/fetchers/SearchFetcher';
import DeviceFetcher from 'src/fetchers/DeviceFetcher';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import PrivateNoteFetcher from 'src/fetchers/PrivateNoteFetcher'
import MetadataFetcher from 'src/fetchers/MetadataFetcher';

import GenericEl from 'src/models/GenericEl';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import Wellplate from 'src/models/Wellplate';
import Screen from 'src/models/Screen';
import ResearchPlan from 'src/models/ResearchPlan';
import Report from 'src/models/Report';
import Format from 'src/models/Format';
import Graph from 'src/models/Graph';
import ComputeTask from 'src/models/ComputeTask';
import DeviceControl from 'src/models/DeviceControl';
import LiteratureMap from 'src/models/LiteratureMap';
import Prediction from 'src/models/Prediction';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import Metadata from 'src/models/Metadata';

import _ from 'lodash';

const handleFetch = (dispatch, fetch) => {
  return fetch()
    .then((result) => {
      dispatch(result)
    })
    .catch((errorMessage) => {
      console.log(errorMessage)
    })
}

class ElementActions {
  // -- Devices --
  fetchAllDevices() {
    return (dispatch) => handleFetch(dispatch, () => DeviceFetcher.fetchAll())
  }

  fetchDeviceById(deviceId) {
    return (dispatch) => handleFetch(dispatch, () => DeviceFetcher.fetchById(deviceId))
  }

  createDevice() {
    return null
  }

  changeActiveAccordionDevice(key) {
    return (dispatch) => dispatch(key)
  }

  changeSelectedDeviceId(device) {
    return (dispatch) => handleFetch(dispatch, () => DeviceFetcher.changeSelectedDevice(device))
  }

  setSelectedDeviceId(deviceId) {
    return (dispatch) => dispatch(deviceId)
  }

  setRefreshCoefficient(id, coefficient, rId) {
    const obj = { sId: id, rId, coefficient };
    return (dispatch) => dispatch({ obj });
  }

  toggleDeviceType(device, type) {
    return (dispatch) => dispatch({ device, type })
  }

  saveDevice(device) {
    if (device.isNew) {
      return (dispatch) => handleFetch(dispatch, () => DeviceFetcher.create(device))
    } else {
      return (dispatch) => handleFetch(dispatch, () => DeviceFetcher.update(device))
    }
  }

  deleteDevice(device) {
    if (!device.isNew) {
      DeviceFetcher.delete(device)
    }
    return (dispatch) => dispatch(device)
  }

  addSampleToDevice(sample, device, options) {
    return (dispatch) => dispatch({ sample, device, options })
  }

  addSampleWithAnalysisToDevice(sample, analysis, device) {
    return (dispatch) => dispatch({ sample, analysis, device })
  }

  removeSampleFromDevice(sample, device) {
    return (dispatch) => dispatch({ sample, device })
  }

  toggleTypeOfDeviceSample(device, sample, type) {
    return (dispatch) => dispatch({ device, sample, type })
  }

  changeDeviceProp(device, prop, value) {
    return (dispatch) => dispatch({ device, prop, value })
  }

  fetchDeviceAnalysisById(analysisId) {
    return (dispatch) => {
      DeviceFetcher.fetchAnalysisById(analysisId)
        .then(analysis => {
          DeviceFetcher.fetchById(analysis.deviceId)
            .then(device => {
              dispatch({ analysis, device })
            })
        })
    }
  }

  openDeviceAnalysis(device, type) {
    return (dispatch) => dispatch({ device, type })
  }

  saveDeviceAnalysis(analysis) {
    if (analysis.isNew) {
      return (dispatch) => handleFetch(dispatch, () => DeviceFetcher.createAnalysis(analysis))
    } else {
      return (dispatch) => handleFetch(dispatch, () => DeviceFetcher.updateAnalysis(analysis))
    }
  }

  createDeviceAnalysis(deviceId, analysisType) {
    return (dispatch) => {
      DeviceFetcher.fetchById(deviceId)
        .then((device) => {
          dispatch({ device, analysisType })
        })
    }
  }

  generateExperimentConfig(experiment) {
    return (dispatch) =>
      handleFetch(dispatch, () => DeviceFetcher.generateExperimentConfig(experiment))
  }

  duplicateAnalysisExperiment(analysis, experiment) {
    return (dispatch) =>
      DeviceFetcher.fetchById(analysis.deviceId)
        .then((device) => {
          dispatch({ device, analysis, experiment })
        })
  }

  changeAnalysisExperimentProp(analysis, experiment, prop, value) {
    return (dispatch) => dispatch({ analysis, experiment, prop, value })
  }

  deleteAnalysisExperiment(analysis, experiment) {
    return (dispatch) =>
      DeviceFetcher.fetchById(analysis.deviceId)
        .then((device) => {
          dispatch({ device, analysis, experiment })
        })
  }

  showDeviceControl() {
    return DeviceControl.buildEmpty()
  }

  // -- Search --

  fetchBasedOnSearchSelectionAndCollection(params) {
    let uid;
    NotificationActions.add({
      title: "Searching ...",
      level: "info",
      position: "tc",
      onAdd: function (notificationObject) { uid = notificationObject.uid; }
    });
    return (dispatch) => {
      SearchFetcher.fetchBasedOnSearchSelectionAndCollection(params)
        .then((result) => {
          dispatch(result);
          NotificationActions.removeByUid(uid);
        }).catch((errorMessage) => { console.log(errorMessage); });
    };


  }

  // -- Generic --
  fetchGenericElsByCollectionId(id, queryParams = {}, collectionIsSync = false, elementType) {
    return (dispatch) => {
      GenericElsFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => { dispatch({ result, type: elementType }); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  generateEmptyGenericEl(collectionId, type) {
    return (dispatch) => {
      GenericElsFetcher.fetchElementKlass(type)
        .then((result) => { dispatch(GenericEl.buildEmpty(collectionId, result.klass)); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  fetchGenericElById(id, type) {
    return (dispatch) => {
      GenericElsFetcher.fetchById(id)
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  createGenericEl(params) {
    return (dispatch) => {
      GenericElsFetcher.create(params)
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  updateGenericEl(params) {
    return (dispatch) => {
      GenericElsFetcher.update(params)
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  fetchSamplesByCollectionId(id, queryParams = {}, collectionIsSync = false,
    moleculeSort = false) {
    return (dispatch) => {
      SamplesFetcher.fetchByCollectionId(id, queryParams, collectionIsSync, moleculeSort)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchReactionsByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      ReactionsFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchWellplatesByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      WellplatesFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchScreensByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      ScreensFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }


  fetchResearchPlansByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      ResearchPlansFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  // -- Samples --

  fetchSampleById(id) {
    return (dispatch) => {
      SamplesFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  createSample(params, closeView = false) {
    return (dispatch) => {
      SamplesFetcher.create(params)
        .then((result) => {
          dispatch({ element: result, closeView })
        });
    };
  }

  createSampleForReaction(sample, reaction, materialGroup) {
    return (dispatch) => {
      SamplesFetcher.create(sample)
        .then((newSample) => {
          dispatch({ newSample, reaction, materialGroup })
        });
    };
  }

  handleSvgReactionChange(reaction) {
    return () => {
      ReactionSvgFetcher.fetchByReaction(reaction).then((result) => {
        reaction.reaction_svg_file = result.reaction_svg;
      });
    };
  }

  editReactionSample(reactionID, sampleID) {
    return (dispatch) => {
      SamplesFetcher.fetchById(sampleID)
        .then((result) => {
          dispatch({ sample: result, reaction: reactionID });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateSampleForReaction(sample, reaction, closeView = true) {
    return (dispatch) => {
      SamplesFetcher.update(sample)
        .then((newSample) => {
          reaction.updateMaterial(newSample);
          reaction.changed = true;
          dispatch({ reaction, sample: newSample, closeView })
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateSample(params, closeView = false) {
    return (dispatch) => {
      SamplesFetcher.update(params)
        .then((result) => {
          dispatch({ element: result, closeView })
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptySample(collection_id) {
    return Sample.buildEmpty(collection_id)
  }

  splitAsSubsamples(ui_state) {
    return (dispatch) => {
      SamplesFetcher.splitAsSubsamples(ui_state)
        .then((result) => {
          dispatch(ui_state);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  copySampleFromClipboard(collection_id) {
    return collection_id;
  }

  addSampleToMaterialGroup(params) {
    return params;
  }

  showReactionMaterial(params) {
    const sampleCoefficient = params.sample.coefficient;
    return (dispatch) => {
      SamplesFetcher.fetchById(params.sample.id)
        .then((result) => {
          params.coefficient = sampleCoefficient;
          params.sample = result;
          dispatch(params);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        })
    }
  }

  importSamplesFromFile(params) {
    return (dispatch) => {
      SamplesFetcher.importSamplesFromFile(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  importSamplesFromFileConfirm(params) {
    return (dispatch) => {
      SamplesFetcher.importSamplesFromFileConfirm(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  // -- Molecules --

  fetchMoleculeByMolfile(molfile, svg_file = null) {
    return (dispatch) => {
      MoleculesFetcher.fetchByMolfile(molfile, svg_file)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  // -- Reactions --

  fetchReactionById(id) {
    return (dispatch) => {
      ReactionsFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  tryFetchReactionById(id) {
    return (dispatch) => {
      ReactionsFetcher.fetchById(id)
        .then((result) => {
          dispatch(result)
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  tryFetchWellplateById(id) {
    return (dispatch) => {
      WellplatesFetcher.fetchById(id)
        .then((result) => {
          dispatch(result)
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }

  tryFetchGenericElById(id) {
    return (dispatch) => {
      GenericElsFetcher.fetchById(id)
        .then((result) => {
          dispatch(result)
        }).catch((errorMessage) => {
          console.log(errorMessage)
        })
    }
  }
  closeWarning() {
    return null
  }

  createReaction(params) {
    return (dispatch) => {
      ReactionsFetcher.create(params)
        .then((result) => {
          dispatch(result)
        });
    };
  }

  updateReaction(params, closeView = false) {
    return (dispatch) => {
      ReactionsFetcher.update(params)
        .then((result) => {
          dispatch({ element: result, closeView })
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptyReaction(collection_id) {
    return Reaction.buildEmpty(collection_id)
  }

  copyReactionFromId(id) {
    return (dispatch) => {
      ReactionsFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  copyReaction(reaction, colId) {
    return (dispatch) => {
      ReactionsFetcher.fetchById(reaction.id)
        .then((result) => {
          dispatch({ reaction: result, colId: colId });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  copyElement(element, colId) {
    return (
      { element: element, colId: colId }
    )
  }

  openReactionDetails(reaction) {
    return reaction;
  }

  // -- Wellplates --
  splitAsSubwellplates(ui_state) {
    return (dispatch) => {
      WellplatesFetcher.splitAsSubwellplates(ui_state)
        .then((result) => {
          dispatch(ui_state);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  bulkCreateWellplatesFromSamples(params) {
    let { collection_id, samples, wellplateCount } = params;

    // wellplateCount correction
    if (wellplateCount > Math.ceil(samples.length / 96)) {
      wellplateCount = Math.ceil(samples.length / 96)
    }

    // build wellplate objects from samples
    let wellplates = [];
    _.range(wellplateCount).forEach((i) => {
      wellplates[i] = Wellplate.buildFromSamplesAndCollectionId(_.compact(samples.slice(96 * i, 96 * (i + 1))), collection_id).serialize();
    });

    return (dispatch) => {
      WellplatesFetcher.bulkCreateWellplates({ wellplates: wellplates })
        .then(() => {
          dispatch();
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateWellplateFromClipboard(collection_id) {
    return collection_id;
  }

  generateEmptyWellplate(collection_id) {
    return Wellplate.buildEmpty(collection_id);
  }

  createWellplate(wellplate) {
    return (dispatch) => {
      WellplatesFetcher.create(wellplate)
        .then(result => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  editWellplateSample(wellplateID, sampleID) {
    return (dispatch) => {
      SamplesFetcher.fetchById(sampleID)
        .then((result) => {
          dispatch({ sample: result, wellplate: wellplateID });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateWellplate(wellplate) {
    return (dispatch) => {
      WellplatesFetcher.update(wellplate)
        .then(result => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateSampleForWellplate(sample, wellplate) {
    return (dispatch) => {
      SamplesFetcher.update(sample)
        .then((newSample) => {
          dispatch(wellplate)
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchWellplateById(id) {
    return (dispatch) => {
      WellplatesFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  importWellplateSpreadsheet(wellplateId, attachmentId) {
    return (dispatch) => {
      WellplatesFetcher.importWellplateSpreadsheet(wellplateId, attachmentId)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }


  // -- Screens --
  addResearchPlanToScreen(screen_id, collection_id, afterComplete = () => {}) {
    return (dispatch) => {
      ScreensFetcher.addResearchPlan(screen_id, collection_id)
        .then(result => dispatch(result.screen))
        .then(() => { afterComplete(); })
        .catch(errorMessage => console.log(errorMessage));
    };
  }

  generateScreenFromClipboard(collection_id) {
    return collection_id;
  }


  fetchScreenById(id) {
    return (dispatch) => {
      ScreensFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptyScreen(collection_id) {
    return Screen.buildEmpty(collection_id);
  }

  createScreen(params) {
    return (dispatch) => {
      ScreensFetcher.create(params)
        .then(result => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateScreen(params) {
    return (dispatch) => {
      ScreensFetcher.update(params)
        .then(result => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  // -- ResearchPlans --

  fetchResearchPlanById(id) {
    return (dispatch) => {
      ResearchPlansFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateResearchPlan(params) {
    return (dispatch) => {
      ResearchPlansFetcher.update(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateEmbeddedResearchPlan(params) {
    return (dispatch) => { dispatch(params); };
  }

  generateEmptyResearchPlan(collection_id) {
    return ResearchPlan.buildEmpty(collection_id);
  }

  createResearchPlan(params) {
    return (dispatch) => {
      ResearchPlansFetcher.create(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  importWellplateIntoResearchPlan(researchPlanId, wellplateId, afterComplete = () => {}) {
    return (dispatch) => {
      ResearchPlansFetcher.importWellplate(researchPlanId, wellplateId)
        .then((result) => { dispatch(result); })
        .then(() => { afterComplete(); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  importTableFromSpreadsheet(researchPlanId, attachmentId, afterComplete = () => {}) {
    return (dispatch) => {
      ResearchPlansFetcher.importTableFromSpreadsheet(researchPlanId, attachmentId)
        .then((result) => { dispatch(result); })
        .then(() => { afterComplete(); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  // -- DataCite/Radar metadata --

  fetchMetadata(collection_id) {
    return (dispatch) => {
      return MetadataFetcher.fetch(collection_id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  storeMetadata(metadata) {
    return (dispatch) => {
      return MetadataFetcher.store(metadata)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  // -- Report --
  showReportContainer() {
    return Report.buildEmpty()
  }

  showFormatContainer() {
    return Format.buildEmpty();
  }

  showComputedPropsGraph() {
    return Graph.buildEmptyScatter();
  }

  showComputedPropsTasks() {
    return ComputeTask.buildEmpty();
  }

  showLiteratureDetail() {
    return LiteratureMap.buildEmpty();
  }

  // -- Prediction --
  showPredictionContainer() {
    return Prediction.buildEmpty();
  }

  // -- General --

  refreshElements(type) {
    return type;
  }

  deleteElements(options) {
    return (dispatch) => {
      dispatch(options);
      UIActions.uncheckWholeSelection();
      UserActions.fetchCurrentUser();
    }
  }

  removeElements() {
    return;
  }

  // Current Element
  setCurrentElement(newCurrentElement) {
    return newCurrentElement;
  }

  deselectCurrentElement() {
    return null;
  }

  // - ...
  deleteElementsByUIState(params) {
    return (dispatch) => {
      UIFetcher.fetchByUIState(params, 'DELETE')
        .then((result) => { dispatch(result); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  updateElementsCollection(params) {
    return (dispatch) => {
      CollectionsFetcher.updateElementsCollection(params)
        .then(() => { dispatch(); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  assignElementsCollection(params) {
    return (dispatch) => {
      CollectionsFetcher.assignElementsCollection(params)
        .then(() => { dispatch(); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  removeElementsCollection(params) {
    return (dispatch) => {
      CollectionsFetcher.removeElementsCollection(params)
        .then(() => { dispatch(); })
        .catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  changeSorting(sort) {
    return sort;
  }

  changeElementsFilter(filter) {
    return filter;
  }

  updateContainerContent(params) {
    return (dispatch) => {
      ContainerFetcher.updateContainerContent(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  computePropsFromSmiles(sampleId) {
    return (dispatch) => {
      MoleculesFetcher.computePropsFromSmiles(sampleId)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  refreshComputedProp(cprop) {
    return cprop;
  }

  // -- Private Note --
  createPrivateNote(params) {
    return (dispatch) => {
      PrivateNoteFetcher.create(params).then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      })
    };
  }

  updatePrivateNote(note) {
    return (dispatch) => {
      PrivateNoteFetcher.update(note).then((result) => {
        dispatch(result)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      })
    };
  }
}

export default alt.createActions(ElementActions);
