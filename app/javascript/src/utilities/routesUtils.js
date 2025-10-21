import UIStore from 'src/stores/alt/stores/UIStore';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import { elementNames } from 'src/apps/generic/Utils';
import { getLatestVesselIds, clearLatestVesselIds } from 'src/utilities/VesselUtilities';

const collectionShow = (e) => {
  UserActions.fetchCurrentUser();
  const { profile } = UserStore.getState();
  if (!profile) {
    UserActions.fetchProfile();
  }
  const uiState = UIStore.getState();
  const currentSearchSelection = uiState.currentSearchSelection;
  const currentSearchByID = uiState.currentSearchByID;
  const collectionId = e.params['collectionID'];
  let collectionPromise = null;
  if (collectionId === 'all') {
    collectionPromise = CollectionStore.findAllCollection();
  } else {
    collectionPromise = CollectionStore.findById(collectionId);
  }

  collectionPromise.then((result) => {
    const collection = result.collection;

    if (currentSearchSelection) {
      UIActions.selectCollectionWithoutUpdating(collection);
      ElementActions.fetchBasedOnSearchSelectionAndCollection({
        selection: currentSearchSelection,
        collectionId: collection.id,
        isSync: !!collection.is_sync_to_me
      });
    } else {
      if (currentSearchByID) {
        UIActions.clearSearchById();
      }
      UIActions.selectCollection(collection);
    }

    // if (!e.params['sampleID'] && !e.params['reactionID'] &&
    // !e.params['wellplateID'] && !e.params['screenID']) {
    UIActions.uncheckAllElements({ type: 'sample', range: 'all' });
    UIActions.uncheckAllElements({ type: 'reaction', range: 'all' });
    UIActions.uncheckAllElements({ type: 'wellplate', range: 'all' });
    UIActions.uncheckAllElements({ type: 'screen', range: 'all' });
    UIActions.uncheckAllElements({ type: 'device_description', range: 'all' });
    UIActions.uncheckAllElements({ type: 'sequence_based_macromolecule_sample', range: 'all' });
    elementNames(false).then((klassArray) => {
      klassArray.forEach((klass) => {
        UIActions.uncheckAllElements({ type: klass, range: 'all' });
      });
    });
    // }
  });
};

const scollectionShow = (e) => {
  UserActions.fetchCurrentUser();
  const { profile } = UserStore.getState();
  if (!profile) {
    UserActions.fetchProfile();
  }
  const uiState = UIStore.getState();
  const currentSearchSelection = uiState.currentSearchSelection;
  const currentSearchByID = uiState.currentSearchByID;
  const collectionId = e.params['collectionID'];
  let collectionPromise = null;
  collectionPromise = CollectionStore.findBySId(collectionId);

  collectionPromise.then((result) => {
    const collection = result.sync_collections_user;

    if (currentSearchSelection) {
      UIActions.selectCollectionWithoutUpdating(collection);
      ElementActions.fetchBasedOnSearchSelectionAndCollection({
        selection: currentSearchSelection,
        collectionId: collection.id,
        isSync: !!collection.is_sync_to_me
      });
    } else {
      UIActions.selectCollection(collection);
      if (currentSearchByID) {
        UIActions.clearSearchById();
      }
    }

    // if (!e.params['sampleID'] && !e.params['reactionID'] && !e.params['wellplateID'] && !e.params['screenID']) {
    UIActions.uncheckAllElements({ type: 'sample', range: 'all' });
    UIActions.uncheckAllElements({ type: 'reaction', range: 'all' });
    UIActions.uncheckAllElements({ type: 'wellplate', range: 'all' });
    UIActions.uncheckAllElements({ type: 'screen', range: 'all' });
    UIActions.uncheckAllElements({ type: 'device_description', range: 'all' });
    UIActions.uncheckAllElements({ type: 'vessel', range: 'all' });
    UIActions.uncheckAllElements({ type: 'sequence_based_macromolecule_sample', range: 'all' });
    elementNames(false).then((klassArray) => {
      klassArray.forEach((klass) => {
        UIActions.uncheckAllElements({ type: klass, range: 'all' });
      });
    });

    // }
  });
};

const reportShowReport = () => {
  ElementActions.showReportContainer();
};

const predictionShowFwdRxn = () => {
  ElementActions.showPredictionContainer();
};

const sampleShowOrNew = (e) => {
  const { sampleID, collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState();
  const index = selecteds.findIndex((el) => el.type === 'sample' && el.id === sampleID);

  if (sampleID === 'new') {
    ElementActions.generateEmptySample(collectionID);
  } else if (sampleID === 'copy') {
    ElementActions.copySampleFromClipboard.defer(collectionID);
  } else if (index < 0) {
    ElementActions.fetchSampleById(sampleID);
  } else if (index !== activeKey) {
    DetailActions.select(index);
  }
  // UIActions.selectTab(1);
};

const cellLineShowOrNew = (e) => {
  if (e.params.cell_lineID === 'new') {
    ElementActions.generateEmptyCellLine(e.params.collectionID, e.params.cell_line_template);
  } else {
    ElementActions.tryFetchCellLineElById.defer(e.params.cell_lineID);
  }
};

const vesselShowOrNew = (e) => {
  const isNew = e.params.new_vessel || (e.params.new_vessel === undefined && e.params.vesselID === 'new');

  if (isNew) {
    ElementActions.generateEmptyVessel(e.params.collectionID);
    return;
  }

  if (e.params.vesselID) {
    e.params.vesselId = e.params.vesselID;
  }

  const latestVesselIds = getLatestVesselIds();

  if (latestVesselIds.length > 0) {
    latestVesselIds.forEach((vesselId) => {
      ElementActions.fetchVesselElById.defer(vesselId);
    });
    clearLatestVesselIds();
  } else if (typeof e.params.vesselId === 'string' && e.params.vesselId.trim().length > 0) {
    ElementActions.fetchVesselElById.defer(e.params.vesselId);
  } else {
    console.warn('Skipping fetch: invalid or empty vesselId', e.params.vesselId);
  }
};

const vesselTemplateShowOrNew = (e) => {
  const { vesselTemplateID, collectionID } = e.params;

  if (!collectionID) {
    console.warn('[ROUTE] Missing collectionID. Cannot create new vessel template.');
    return;
  }

  if (!vesselTemplateID || vesselTemplateID === 'new') {
    const newTemplate = ElementActions.generateEmptyVesselTemplate(collectionID);
    newTemplate.type = 'vessel_template';
    newTemplate.is_new = true;

    ElementActions.setCurrentElement(newTemplate);
    return;
  }
  ElementActions.fetchVesselTemplateById.defer(vesselTemplateID, collectionID);
};

const reactionShow = (e) => {
  const { reactionID, collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState();
  const index = selecteds.findIndex((el) => el.type === 'reaction' && el.id === reactionID);
  // UIActions.selectTab(2);
  if (reactionID === 'new') {
    ElementActions.generateEmptyReaction(collectionID);
  } else if (reactionID === 'copy') {
    //ElementActions.copyReactionFromClipboard(collectionID);
  } else if (index < 0) {
    ElementActions.fetchReactionById(reactionID);
  } else if (index !== activeKey) {
    DetailActions.select(index);
  }
};

const reactionShowSample = (e) => {
  const { reactionID, sampleID } = e.params;
  ElementActions.editReactionSample(reactionID, sampleID);
};

const wellplateShowOrNew = (e) => {
  const { wellplateID, collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState();
  const index = selecteds.findIndex((el) => el.type === 'wellplate' && el.id === wellplateID);

  if (wellplateID === 'new') {
    ElementActions.generateEmptyWellplate(collectionID);
  } else if (wellplateID === 'template') {
    ElementActions.generateWellplateFromClipboard.defer(collectionID);
  } else if (index < 0) {
    ElementActions.fetchWellplateById(wellplateID);
  } else if (index !== activeKey) {
    DetailActions.select(index);
  }
};

const wellplateShowSample = (e) => {
  const { wellplateID, sampleID } = e.params;
  ElementActions.editWellplateSample(wellplateID, sampleID);
};

const screenShowOrNew = (e) => {
  const { screenID, collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState();
  const index = selecteds.findIndex((el) => el.type === 'screen' && el.id === screenID);

  if (screenID === 'new') {
    ElementActions.generateEmptyScreen(collectionID);
  } else if (screenID === 'template') {
    ElementActions.generateScreenFromClipboard.defer(collectionID);
  } else if (index < 0) {
    ElementActions.fetchScreenById(screenID);
  } else if (index !== activeKey) {
    DetailActions.select(index);
  }
};

const devicesAnalysisCreate = (e) => {
  const { deviceId, analysisType } = e.params;
  ElementActions.createDeviceAnalysis(deviceId, analysisType);
};

const devicesAnalysisShow = (e) => {
  const { analysisId } = e.params;
  ElementActions.fetchDeviceAnalysisById(analysisId);
};

const deviceShow = (e) => {
  const { deviceId } = e.params;
  ElementActions.fetchDeviceById(deviceId);
};

const deviceShowDeviceManagement = () => {
  UIActions.showDeviceManagement();
};

const researchPlanShowOrNew = (e) => {
  const { research_planID, collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState();
  const index = selecteds.findIndex(el => el.type === 'research_plan' && el.id === research_planID);

  if (research_planID === 'new') {
    ElementActions.generateEmptyResearchPlan(collectionID);
  } else if (research_planID === 'copy') {
    //
  } else if (index < 0) {
    ElementActions.fetchResearchPlanById(research_planID);
  } else if (index !== activeKey) {
    DetailActions.select(index);
  }
};

const metadataShowOrNew = (e) => {
  const { collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState()

  // check if the metadata detail tab is alredy open
  const index = selecteds.findIndex(el => el.collection_id == collectionID)
  if (index < 0) {
    // not found, fetch the metadata from the server
    ElementActions.fetchMetadata(collectionID);
  } else if (index != activeKey) {
    // not active, activate tab
    DetailActions.select(index)
  }
};

const deviceDescriptionShowOrNew = (e) => {
  const { device_descriptionID, collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState();
  const index = selecteds.findIndex(el => el.type === 'device_description' && el.id === device_descriptionID);

  if (device_descriptionID === 'new' || device_descriptionID === undefined) {
    ElementActions.generateEmptyDeviceDescription(collectionID);
  } else if (device_descriptionID === 'copy') {
    ElementActions.copyDeviceDescriptionFromClipboard.defer(collectionID);
  } else if (index < 0) {
    ElementActions.fetchDeviceDescriptionById(device_descriptionID);
  } else if (index !== activeKey) {
    DetailActions.select(index);
  }
}

const sequenceBasedMacromoleculeSampleShowOrNew = (e) => {
  const { sequence_based_macromolecule_sampleID, collectionID } = e.params;
  const { selecteds, activeKey } = ElementStore.getState();
  const index = selecteds.findIndex(el => {
    return el.type === 'sequence_based_macromolecule_sample' && el.id === sequence_based_macromolecule_sampleID
  });

  if (sequence_based_macromolecule_sampleID === 'new' || sequence_based_macromolecule_sampleID === undefined) {
    ElementActions.generateEmptySequenceBasedMacromoleculeSample(collectionID);
  } else if (sequence_based_macromolecule_sampleID === 'copy') {
    ElementActions.copySequenceBasedMacromoleculeSampleFromClipboard.defer(collectionID);
  } else if (index < 0) {
    ElementActions.fetchSequenceBasedMacromoleculeSampleById(sequence_based_macromolecule_sampleID);
  } else if (index !== activeKey) {
    DetailActions.select(index);
  }
}

const genericElShowOrNew = (e, type) => {
  const { collectionID } = e.params;
  let itype = '';
  if (typeof type === 'undefined' || typeof type === 'object' || type == null || type == '') {
    const keystr = e.params && Object.keys(e.params).filter(k => k != 'collectionID' && k.includes('ID'));
    itype = keystr && keystr[0] && keystr[0].slice(0, -2);
  } else {
    itype = type;
  }

  const genericElID = e.params[`${itype}ID`];
  if (genericElID === 'new') {
    ElementActions.generateEmptyGenericEl(collectionID, itype);
  } else if (genericElID === 'copy') {
    //
  } else {

    ElementActions.fetchGenericElById(genericElID, itype);
  }
};

const elementShowOrNew = (e) => {
  const type = e.type;
  switch (type) {
    case 'sample':
      sampleShowOrNew(e);
      break;
    case 'reaction':
      reactionShow(e);
      break;
    case 'wellplate':
      wellplateShowOrNew(e);
      break;
    case 'screen':
      screenShowOrNew(e);
      break;
    case 'research_plan':
      researchPlanShowOrNew(e);
      break;
    case 'metadata':
      metadataShowOrNew(e);
      break;
    case 'cell_line':
      cellLineShowOrNew(e);
      break;
    case 'device_description':
      deviceDescriptionShowOrNew(e);
      break;
    case 'vessel':
      vesselShowOrNew(e);
      break;
    case 'vessel_template':
      vesselTemplateShowOrNew(e);
    case 'sequence_based_macromolecule_sample':
      sequenceBasedMacromoleculeSampleShowOrNew(e);
      break;
    default:
      if (e && e.klassType == 'GenericEl') {
        genericElShowOrNew(e, type);
        break;
      }
      return null;
  }
  return null;
};

export {
  collectionShow,
  scollectionShow,
  reportShowReport,
  sampleShowOrNew,
  reactionShow,
  reactionShowSample,
  wellplateShowOrNew,
  wellplateShowSample,
  screenShowOrNew,
  devicesAnalysisCreate,
  devicesAnalysisShow,
  deviceShow,
  deviceShowDeviceManagement,
  researchPlanShowOrNew,
  metadataShowOrNew,
  deviceDescriptionShowOrNew,
  elementShowOrNew,
  predictionShowFwdRxn,
  genericElShowOrNew,
  cellLineShowOrNew,
  vesselShowOrNew,
  vesselTemplateShowOrNew,
  sequenceBasedMacromoleculeSampleShowOrNew,
};
