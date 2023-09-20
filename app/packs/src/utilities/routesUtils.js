import UIStore from 'src/stores/alt/stores/UIStore';
import CollectionStore from 'src/stores/alt/stores/CollectionStore';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import ElementActions from 'src/stores/alt/actions/ElementActions';
import ElementStore from 'src/stores/alt/stores/ElementStore';
import UserStore from 'src/stores/alt/stores/UserStore';
import DetailActions from 'src/stores/alt/actions/DetailActions';
import { elementNames } from 'src/apps/generic/Utils';

const collectionShow = (e) => {
  UIActions.showElements.defer();
  UserActions.fetchCurrentUser();
  const { profile } = UserStore.getState();
  if (!profile) {
    UserActions.fetchProfile();
  }
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
    elementNames(false).forEach((klass) => { UIActions.uncheckAllElements({ type: klass, range: 'all' }); });
    // }
  });
};

const collectionShowCollectionManagement = () => {
  UIActions.showCollectionManagement();
};

const scollectionShow = (e) => {
  UIActions.showElements();
  UserActions.fetchCurrentUser();
  const { profile } = UserStore.getState();
  if (!profile) {
    UserActions.fetchProfile();
  }
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
    elementNames(false).forEach((klass) => { UIActions.uncheckAllElements({ type: klass, range: 'all' }); });

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

const genericElShowOrNew = (e, type) => {
  const { collectionID } = e.params;
  let itype = '';
  if (typeof type === 'undefined' || typeof type === 'object' || type == null || type == '') {
    const keystr = e.params && Object.keys(e.params).filter(k => k != 'collectionID' && k.includes('ID'));
    itype = keystr && keystr[0] && keystr[0].slice(0,-2);
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
    case 'metadata':
      metadataShowOrNew(e);
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
  metadataShowOrNew,
  elementShowOrNew,
  predictionShowFwdRxn,
  genericElShowOrNew
};
