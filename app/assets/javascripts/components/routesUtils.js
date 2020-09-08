import UIStore from './stores/UIStore';
import CollectionStore from './stores/CollectionStore';
import UIActions from './actions/UIActions';
import UserActions from './actions/UserActions';
import ElementActions from './actions/ElementActions';

const collectionShow = (e) => {
  UIActions.showElements.defer();
  UserActions.fetchCurrentUser();
  const uiState = UIStore.getState();
  const currentSearchSelection = uiState.currentSearchSelection;
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
        isSync: !!collection.is_sync_to_me });
    } else {
      UIActions.selectCollection(collection);
    }

    // if (!e.params['sampleID'] && !e.params['reactionID'] &&
        // !e.params['wellplateID'] && !e.params['screenID']) {
    UIActions.uncheckAllElements({ type: 'sample', range: 'all' });
    UIActions.uncheckAllElements({ type: 'reaction', range: 'all' });
    UIActions.uncheckAllElements({ type: 'wellplate', range: 'all' });
    UIActions.uncheckAllElements({ type: 'screen', range: 'all' });
    // }
  });
};

const collectionShowCollectionManagement = () => {
  UIActions.showCollectionManagement();
};

const scollectionShow = (e) => {
  UIActions.showElements();
  UserActions.fetchCurrentUser();
  const uiState = UIStore.getState();
  const currentSearchSelection = uiState.currentSearchSelection;
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
        isSync: !!collection.is_sync_to_me });
    } else {
      UIActions.selectSyncCollection(collection);
    }

    // if (!e.params['sampleID'] && !e.params['reactionID'] && !e.params['wellplateID'] && !e.params['screenID']) {
    UIActions.uncheckAllElements({ type: 'sample', range: 'all' });
    UIActions.uncheckAllElements({ type: 'reaction', range: 'all' });
    UIActions.uncheckAllElements({ type: 'wellplate', range: 'all' });
    UIActions.uncheckAllElements({ type: 'screen', range: 'all' });
    // }
  });
};

const reportShowReport = () => {
  ElementActions.showReportContainer();
};

const sampleShowOrNew = (e) => {
  const { sampleID, collectionID } = e.params;
  if (sampleID === 'new') {
    ElementActions.generateEmptySample(collectionID);
  } else if (sampleID === 'copy') {
    ElementActions.copySampleFromClipboard.defer(collectionID);
  } else {
    ElementActions.fetchSampleById(sampleID);
  }
  // UIActions.selectTab(1);
};

const reactionShow = (e) => {
  const { reactionID, collectionID } = e.params;
  // UIActions.selectTab(2);
  if (reactionID !== 'new' && reactionID !== 'copy') {
    ElementActions.fetchReactionById(reactionID);
  } else if (reactionID === 'copy') {
    //ElementActions.copyReactionFromClipboard(collectionID);
  } else {
    ElementActions.generateEmptyReaction(collectionID);
  }
};

const reactionShowSample = (e) => {
  const { reactionID, sampleID } = e.params;
  ElementActions.editReactionSample(reactionID, sampleID);
};

const wellplateShowOrNew = (e) => {
  const { wellplateID, collectionID } = e.params;

  if (wellplateID === 'new') {
    ElementActions.generateEmptyWellplate(collectionID);
  } else if (wellplateID === 'template') {
    ElementActions.generateWellplateFromClipboard.defer(collectionID);
  } else {
    ElementActions.fetchWellplateById(wellplateID);
  }
};

const wellplateShowSample = (e) => {
  const { wellplateID, sampleID } = e.params;
  ElementActions.editWellplateSample(wellplateID, sampleID);
};

const screenShowOrNew = (e) => {
  const { screenID, collectionID } = e.params;
  if (screenID === 'new') {
    ElementActions.generateEmptyScreen(collectionID);
  } else if (screenID === 'template') {
    ElementActions.generateScreenFromClipboard.defer(collectionID);
  } else {
    ElementActions.fetchScreenById(screenID);
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
  if (research_planID === 'new') {
    ElementActions.generateEmptyResearchPlan(collectionID);
  } else {
    ElementActions.fetchResearchPlanById(research_planID);
  }
};

const elementShowOrNew = (e) => {
  const type = e.type;
  switch(type) {
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
    default: return null;
  }
  return null;
};

module.exports = {
  collectionShow,
  scollectionShow,
  collectionShowCollectionManagement,
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
  elementShowOrNew
};
