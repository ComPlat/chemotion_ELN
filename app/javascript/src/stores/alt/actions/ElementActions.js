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
import CellLinesFetcher from 'src/fetchers/CellLinesFetcher';
import VesselsFetcher from 'src/fetchers/VesselsFetcher';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';
import ScreensFetcher from 'src/fetchers/ScreensFetcher';
import ResearchPlansFetcher from 'src/fetchers/ResearchPlansFetcher';
import SearchFetcher from 'src/fetchers/SearchFetcher';
import DeviceFetcher from 'src/fetchers/DeviceFetcher';
import ContainerFetcher from 'src/fetchers/ContainerFetcher';
import GenericElsFetcher from 'src/fetchers/GenericElsFetcher';
import PrivateNoteFetcher from 'src/fetchers/PrivateNoteFetcher'
import MetadataFetcher from 'src/fetchers/MetadataFetcher';
import DeviceDescriptionFetcher from 'src/fetchers/DeviceDescriptionFetcher';
import SequenceBasedMacromoleculeSamplesFetcher from 'src/fetchers/SequenceBasedMacromoleculeSamplesFetcher';

import GenericEl from 'src/models/GenericEl';
import Sample from 'src/models/Sample';
import Reaction from 'src/models/Reaction';
import Wellplate from 'src/models/Wellplate';
import CellLine from 'src/models/cellLine/CellLine';
import Vessel from 'src/models/vessel/Vessel';
import Screen from 'src/models/Screen';
import ResearchPlan from 'src/models/ResearchPlan';
import DeviceDescription from 'src/models/DeviceDescription';
import Report from 'src/models/Report';
import Format from 'src/models/Format';
import Graph from 'src/models/Graph';
import ComputeTask from 'src/models/ComputeTask';
import LiteratureMap from 'src/models/LiteratureMap';
import Prediction from 'src/models/Prediction';
import SequenceBasedMacromoleculeSample from 'src/models/SequenceBasedMacromoleculeSample';
import ReactionSvgFetcher from 'src/fetchers/ReactionSvgFetcher';
import Metadata from 'src/models/Metadata';
import UserStore from 'src/stores/alt/stores/UserStore';
import { generateNextShortLabel } from 'src/utilities/VesselUtilities';

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
  exportElement(element, klass, exportFormat) {
    return (dispatch) => {
      GenericElsFetcher.export(element, klass, exportFormat)
        .then((result) => {
          dispatch({ element: result });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }
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

  fetchBasedOnSearchResultIds(params) {
    let uid;
    NotificationActions.add({
      title: "Searching ...",
      level: "info",
      position: "tc",
      onAdd: function (notificationObject) { uid = notificationObject.uid; }
    });
    return (dispatch) => {
      SearchFetcher.fetchBasedOnSearchResultIds(params)
        .then((result) => {
          dispatch(result);
          NotificationActions.removeByUid(uid);
        }).catch((errorMessage) => { console.log(errorMessage); });
    };
  }

  dispatchSearchResult(result) {
    return (dispatch) => {
      dispatch(result);
    }
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

  splitElements(ui_state, name) {
    return (dispatch) => {
      GenericElsFetcher.split(ui_state, name)
        .then((result) => {
          dispatch({ ui_state: ui_state, name: name });
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
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

  fetchCellLinesByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      CellLinesFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchDeviceDescriptionsByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      DeviceDescriptionFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchVesselsByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      VesselsFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchSequenceBasedMacromoleculeSamplesByCollectionId(id, queryParams = {}, collectionIsSync = false) {
    return (dispatch) => {
      SequenceBasedMacromoleculeSamplesFetcher.fetchByCollectionId(id, queryParams, collectionIsSync)
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
          dispatch({ element: result, closeView, components: params.components })
        });
    };
  }

  createSampleForReaction(sample, reaction, materialGroup) {
    return (dispatch) => {
      SamplesFetcher.create(sample)
        .then((newSample) => {
          dispatch({ newSample, reaction, materialGroup, components: sample.components })
        });
    };
  }

  handleSvgReactionChange(reaction) {
    const materialsSvgPaths = {
      starting_materials: reaction.starting_materials.map(material => material.svgPath),
      reactants: reaction.reactants.map(material => material.svgPath),
      products: reaction.products.map(material => [material.svgPath, material.equivalent])
    };

    const solvents = reaction.solvents.map((s) => {
      const name = s.preferred_label;
      return name;
    }).filter(s => s);

    let temperature = reaction.temperature_display;
    if (/^[\-|\d]\d*\.{0,1}\d{0,2}$/.test(temperature)) {
      temperature = `${temperature} ${reaction.temperature.valueUnit}`;
    }

    return () => {
      ReactionSvgFetcher.fetchByMaterialsSvgPaths(materialsSvgPaths, temperature, solvents, reaction.duration, reaction.conditions)
        .then((result) => {
          reaction.reaction_svg_file = result.reaction_svg;
        }).catch((errorMessage) => {
          console.log(errorMessage);
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
          dispatch({ reaction, sample: newSample, closeView, components: sample.components })
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateSample(params, closeView = false) {
    return (dispatch) => {
      SamplesFetcher.update(params)
        .then((result) => {
          dispatch({ element: result, closeView, components: params.components })
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptySample(collection_id) {
    return Sample.buildEmpty(collection_id)
  }

  tryFetchCellLineElById(cellLineId) {
    return (dispatch) => {
      CellLinesFetcher.fetchById(cellLineId)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  createCellLine(params) {
    return (dispatch) => {
      const { currentUser } = UserStore.getState();
      CellLinesFetcher.create(params, currentUser)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptyCellLine(collectionId, template) {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return; }

    const cellLineSample = CellLine.buildEmpty(collectionId, `${currentUser.initials}-C${currentUser.cell_lines_count}`);
    if (template) {
      cellLineSample.copyMaterialFrom(template);
    }
    return cellLineSample;
  }

  copyCellLineFromId(id, collectionId) {
    return (dispatch) => {
      CellLinesFetcher.copyCellLine(id, collectionId)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
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

  importSamplesFromFileDecline() {
    return null;
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

  copyResearchPlan(research_plan, colId) {
    return (dispatch) => {
      ResearchPlansFetcher.fetchById(research_plan.id)
        .then((result) => {
          dispatch({ research_plan: result, colId: colId });
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

  splitAsSubCellLines(ui_state) {
    return (dispatch) => {
      const ids = ui_state["cell_line"].checkedIds.toArray();
      const collection_id = ui_state.currentCollection.id;

      CellLinesFetcher.splitAsSubCellLines(ids, collection_id)
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
          result.updated_at = new Date();
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

  updateCellLine(params) {
    return (dispatch) => {
      CellLinesFetcher.update(params)
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

  // -- DeviceDescriptions --

  fetchDeviceDescriptionById(id) {
    return (dispatch) => {
      DeviceDescriptionFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateDeviceDescription(params) {
    return (dispatch) => {
      DeviceDescriptionFetcher.updateDeviceDescription(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptyDeviceDescription(collection_id) {
    return DeviceDescription.buildEmpty(collection_id);
  }

  createDeviceDescription(params) {
    return (dispatch) => {
      DeviceDescriptionFetcher.createDeviceDescription(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  copyDeviceDescriptionFromClipboard(collection_id) {
    return collection_id;
  }

  splitAsSubDeviceDescription(ui_state) {
    return (dispatch) => {
      DeviceDescriptionFetcher.splitAsSubDeviceDescription(ui_state)
        .then((result) => {
          dispatch(ui_state.ui_state);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  // -- Vessels --

  fetchVesselElById(vesselId) {
    return (dispatch) => {
      VesselsFetcher.fetchById(vesselId)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchVesselTemplateById(vesselTemplateId, collectionId) {
    return (dispatch) => {
      VesselsFetcher.fetchVesselTemplateById(vesselTemplateId, collectionId)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  fetchEmptyVesselTemplate(collectionId) {
    return (dispatch) => {
      VesselsFetcher.fetchEmptyVesselTemplate(collectionId)
        .then((result) => {
          dispatch(result);
        })
        .catch((errorMessage) => {
          console.error(errorMessage);
        });
    };
  }

  createVessel(params) {
    return (dispatch) => {
      const { currentUser } = UserStore.getState();
      VesselsFetcher.createVesselInstance(params, currentUser)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  createVesselTemplate(params) {
    return (dispatch) => {
      const { currentUser } = UserStore.getState();
      VesselsFetcher.createVesselTemplate(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptyVessel(collectionId, template) {
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return; }

    const shortLabel = generateNextShortLabel();
    const vesselInstance = Vessel.buildEmpty(collectionId, shortLabel);

    if (template) {
      vesselInstance.copyMaterialFrom(template);
    }
    return vesselInstance;
  }

  generateEmptyVesselTemplate(collectionId, template) {
    if (!collectionId || isNaN(Number(collectionId))) {
      console.warn('[ElementActions] Invalid collectionId:', collectionId);
      return null;
    }
    const { currentUser } = UserStore.getState();
    if (!currentUser) { return; }

    const vesselTemplate = Vessel.buildEmpty(collectionId);
    vesselTemplate.type = 'vessel_template';
    vesselTemplate.is_new = true;

    if (template) {
      vesselTemplate.copyMaterialFrom(template);
    }

    return vesselTemplate;
  }

  updateVessel(params) {
    return (dispatch) => {
      VesselsFetcher.updateVesselInstance(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateVesselTemplate(params) {
    return (dispatch) => {
      VesselsFetcher.updateVesselTemplate(params)
        .then((result) => {
          dispatch(result);
        })
        .catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  // -- Sequence Based Macromolecule Samples --

  fetchSequenceBasedMacromoleculeSampleById(id) {
    return (dispatch) => {
      SequenceBasedMacromoleculeSamplesFetcher.fetchById(id)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  updateSequenceBasedMacromoleculeSample(params) {
    return (dispatch) => {
      SequenceBasedMacromoleculeSamplesFetcher.updateSequenceBasedMacromoleculeSample(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  generateEmptySequenceBasedMacromoleculeSample(collection_id) {
    return SequenceBasedMacromoleculeSample.buildEmpty(collection_id);
  }

  createSequenceBasedMacromoleculeSample(params) {
    return (dispatch) => {
      SequenceBasedMacromoleculeSamplesFetcher.createSequenceBasedMacromoleculeSample(params)
        .then((result) => {
          dispatch(result);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
    };
  }

  copySequenceBasedMacromoleculeSampleFromClipboard(collection_id) {
    return collection_id;
  }

  splitAsSubSequenceBasedMacromoleculeSample(ui_state) {
    return (dispatch) => {
      SequenceBasedMacromoleculeSamplesFetcher.splitAsSubSequenceBasedMacromoleculeSample(ui_state)
        .then((result) => {
          dispatch(ui_state.ui_state);
        }).catch((errorMessage) => {
          console.log(errorMessage);
        });
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
