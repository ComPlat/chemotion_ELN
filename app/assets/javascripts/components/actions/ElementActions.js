import alt from '../alt';

import UIActions from './UIActions';
import UserActions from './UserActions';

import NotificationActions from './NotificationActions';
import UIFetcher from '../fetchers/UIFetcher';
import SamplesFetcher from '../fetchers/SamplesFetcher';
import MoleculesFetcher from '../fetchers/MoleculesFetcher';
import ReactionsFetcher from '../fetchers/ReactionsFetcher';
import WellplatesFetcher from '../fetchers/WellplatesFetcher';
import CollectionsFetcher from '../fetchers/CollectionsFetcher';
import ScreensFetcher from '../fetchers/ScreensFetcher';
import ResearchPlansFetcher from '../fetchers/ResearchPlansFetcher';
import SearchFetcher from '../fetchers/SearchFetcher';
import DeviceFetcher from '../fetchers/DeviceFetcher';
import ContainerFetcher from '../fetchers/ContainerFetcher';

import Sample from '../models/Sample';
import Reaction from '../models/Reaction';
import Wellplate from '../models/Wellplate';
import Screen from '../models/Screen';
import ResearchPlan from '../models/ResearchPlan';
import Report from '../models/Report';
import Format from '../models/Format';
import Graph from '../models/Graph';
import DeviceControl from '../models/DeviceControl';
import LiteratureMap from '../models/LiteratureMap';

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

  createDevice () {
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

  toggleDeviceType(device, type) {
    return (dispatch) => dispatch({device, type})
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
    return (dispatch) => dispatch({sample, device, options})
  }

  addSampleWithAnalysisToDevice(sample, analysis, device) {
    return (dispatch) => dispatch({sample, analysis, device})
  }

  removeSampleFromDevice(sample, device) {
    return (dispatch) => dispatch({sample, device})
  }

  toggleTypeOfDeviceSample(device, sample, type) {
    return (dispatch) => dispatch({device, sample, type})
  }

  changeDeviceProp(device, prop, value) {
    return (dispatch) => dispatch({device, prop, value})
  }

  fetchDeviceAnalysisById(analysisId) {
    return (dispatch) => {
      DeviceFetcher.fetchAnalysisById(analysisId)
      .then(analysis => {
        DeviceFetcher.fetchById(analysis.deviceId)
        .then(device => {
          dispatch({analysis, device})
        })
      })
    }
  }

  openDeviceAnalysis(device, type) {
    return (dispatch) => dispatch({device, type})
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
        dispatch({device, analysisType})
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
        dispatch({device, analysis, experiment})
      })
  }

  changeAnalysisExperimentProp(analysis, experiment, prop, value) {
    return (dispatch) => dispatch({analysis, experiment, prop, value})
  }

  deleteAnalysisExperiment(analysis, experiment) {
    return (dispatch) =>
      DeviceFetcher.fetchById(analysis.deviceId)
      .then((device) => {
        dispatch({device, analysis, experiment})
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
      onAdd: function(notificationObject) { uid = notificationObject.uid; }
    });
    return (dispatch) => {
      SearchFetcher.fetchBasedOnSearchSelectionAndCollection(params)
        .then((result) => {
          dispatch(result);
          NotificationActions.removeByUid(uid);
        }).catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  // -- Collections --


  fetchReactionsByCollectionId(id, queryParams={}, collectionIsSync = false) {
    return (dispatch) => { ReactionsFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }


  // -- Samples --

  fetchSampleById(id) {
    return (dispatch) => { SamplesFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchSamplesByCollectionId(id, queryParams = {}, collectionIsSync = false,
      moleculeSort = false) {
    return (dispatch) => {
      SamplesFetcher.fetchByCollectionId(id, queryParams, collectionIsSync, moleculeSort)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  createSample(params, closeView = false) {
    return (dispatch) => { SamplesFetcher.create(params)
      .then((result) => {
        dispatch({ element: result, closeView })
      });};
  }

  createSampleForReaction(sample, reaction, materialGroup) {
    return (dispatch) => { SamplesFetcher.create(sample)
      .then((newSample) => {
        dispatch({newSample, reaction, materialGroup})
      });};
  }

  editReactionSample(reactionID, sampleID) {
    return (dispatch) => { SamplesFetcher.fetchById(sampleID)
      .then((result) => {
        dispatch({sample: result, reaction: reactionID });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateSampleForReaction(sample, reaction, closeView = true) {
    return (dispatch) => { SamplesFetcher.update(sample)
      .then((newSample) => {
        reaction.updateMaterial(newSample);
        reaction.changed = true;
        dispatch({ reaction, sample: newSample, closeView })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateSample(params, closeView = false) {
    return (dispatch) => { SamplesFetcher.update(params)
      .then((result) => {
        dispatch({ element: result, closeView })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateEmptySample(collection_id) {
    return  Sample.buildEmpty(collection_id)
  }

  splitAsSubsamples(ui_state) {
    return (dispatch) => { SamplesFetcher.splitAsSubsamples(ui_state)
      .then((result) => {
        dispatch(ui_state);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  copySampleFromClipboard(collection_id) {
    return  collection_id;
  }

  addSampleToMaterialGroup(params) {
    return  params;
  }

  showReactionMaterial(params) {
    return (dispatch) => { SamplesFetcher.fetchById(params.sample.id)
      .then((result) => {
        params.sample = result
        dispatch(params);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      })
    }
  }

  importSamplesFromFile(params) {
    return (dispatch) => { SamplesFetcher.importSamplesFromFile(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  importReactionsFromChemScanner(params) {
    return (dispatch) => {
      ReactionsFetcher.importReactionsFromChemScanner(params).then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });
    };
  }

  importSamplesFromFileConfirm(params) {
    return (dispatch) => { SamplesFetcher.importSamplesFromFileConfirm(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- Molecules --

  fetchMoleculeByMolfile(molfile, svg_file = null) {
    return (dispatch) => { MoleculesFetcher.fetchByMolfile(molfile, svg_file)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- Reactions --

  fetchReactionById(id) {
    return (dispatch) => { ReactionsFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
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

  closeWarning() {
    return null
  }

  createReaction(params) {
    return (dispatch) => { ReactionsFetcher.create(params)
      .then((result) => {
        dispatch(result)
      });};
  }

  updateReaction(params, closeView = false) {
    return (dispatch) => { ReactionsFetcher.update(params)
      .then((result) => {
        dispatch({ element: result, closeView })
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateEmptyReaction(collection_id) {
    return  Reaction.buildEmpty(collection_id)
  }

  copyReactionFromId(id) {
    return (dispatch) => { ReactionsFetcher.fetchById(id)
    .then((result) => {
      dispatch(result);
    }).catch((errorMessage) => {
      console.log(errorMessage);
    });};
  }

  openReactionDetails(reaction) {
    return  reaction;
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
    if(wellplateCount > Math.ceil(samples.length / 96)) {
      wellplateCount = Math.ceil(samples.length / 96)
    }

    // build wellplate objects from samples
    let wellplates = [];
    _.range(wellplateCount ).forEach((i) => {
      wellplates[i] = Wellplate.buildFromSamplesAndCollectionId(_.compact(samples.slice(96*i, 96*(i+1))), collection_id).serialize();
    });

    return (dispatch) => { WellplatesFetcher.bulkCreateWellplates({wellplates: wellplates})
      .then(() => {
        dispatch();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateWellplateFromClipboard(collection_id) {
    return  collection_id;
  }

  generateEmptyWellplate(collection_id) {
    return  Wellplate.buildEmpty(collection_id);
  }

  createWellplate(wellplate) {
    return (dispatch) => { WellplatesFetcher.create(wellplate)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  editWellplateSample(wellplateID, sampleID) {
    return (dispatch) => { SamplesFetcher.fetchById(sampleID)
      .then((result) => {
        dispatch({sample: result, wellplate: wellplateID });
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateWellplate(wellplate) {
    return (dispatch) => { WellplatesFetcher.update(wellplate)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateSampleForWellplate(sample, wellplate) {
    return (dispatch) => { SamplesFetcher.update(sample)
      .then((newSample) => {
        dispatch(wellplate)
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchWellplatesByCollectionId(id, queryParams={}, collectionIsSync = false) {
    return (dispatch) => { WellplatesFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchWellplateById(id) {
    return (dispatch) => { WellplatesFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }


  // -- Screens --

  generateScreenFromClipboard(collection_id) {
    return  collection_id;
  }


  fetchScreensByCollectionId(id, queryParams={}, collectionIsSync = false) {
    return (dispatch) => { ScreensFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchScreenById(id) {
    return (dispatch) => { ScreensFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateEmptyScreen(collection_id) {
    return  Screen.buildEmpty(collection_id);
  }

  createScreen(params) {
    return (dispatch) => { ScreensFetcher.create(params)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateScreen(params) {
    return (dispatch) => { ScreensFetcher.update(params)
      .then(result => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- ResearchPlans --
  fetchResearchPlansByCollectionId(id, queryParams={}, collectionIsSync = false) {
    return (dispatch) => { ResearchPlansFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  fetchResearchPlanById(id) {
    return (dispatch) => { ResearchPlansFetcher.fetchById(id)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  updateResearchPlan(params) {
    return (dispatch) => { ResearchPlansFetcher.update(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  generateEmptyResearchPlan(collection_id) {
    return ResearchPlan.buildEmpty(collection_id);
  }

  createResearchPlan(params) {
    return (dispatch) => { ResearchPlansFetcher.create(params)
      .then((result) => {
        dispatch(result);
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  // -- Report --
  showReportContainer() {
    return  Report.buildEmpty()
  }

  showFormatContainer() {
    return Format.buildEmpty();
  }

  showComputedPropsGraph() {
    return Graph.buildEmptyScatter();
  }

  showLiteratureDetail() {
    return LiteratureMap.buildEmpty();
  }


  // -- General --

  refreshElements(type) {
    return  type
  }


  deleteElements(options) {
    return  (dispatch)=> {
    dispatch(options);
    UIActions.uncheckWholeSelection();
    UserActions.fetchCurrentUser();}
  }

  removeElements() {
    return  ;
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
    return (dispatch) => { CollectionsFetcher.updateElementsCollection(params)
      .then(() => {
        dispatch(params);
        UIActions.uncheckWholeSelection();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  assignElementsCollection(params) {
    return (dispatch) => { CollectionsFetcher.assignElementsCollection(params)
      .then(() => {
        dispatch(params);
        UIActions.uncheckWholeSelection();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  removeElementsCollection(params) {
    return (dispatch) => { CollectionsFetcher.removeElementsCollection(params)
      .then(() => {
        dispatch(params);
        UIActions.uncheckWholeSelection();
      }).catch((errorMessage) => {
        console.log(errorMessage);
      });};
  }

  changeSorting(sort) {
    return sort;
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

  computePropsFromSmiles(short_label, smiles) {
    return (dispatch) => {
      MoleculesFetcher.computePropsFromSmiles(short_label, smiles)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

}

export default alt.createActions(ElementActions);
