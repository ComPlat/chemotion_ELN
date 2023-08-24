import * as routesUtils from 'src/utilities/routesUtils';
import { elementNames } from 'src/apps/generic/Utils';


const routes = {
  '/': 'root',
  target: {
    root() { Aviator.navigate('/collection/all'); }
  },

  '/collection': {
    target: {
      show: routesUtils.collectionShow,
      showCollectionManagement: routesUtils.collectionShowCollectionManagement
    },
    '/management': 'showCollectionManagement',
    '/:collectionID': 'show'
  },

  '/scollection': {
    target: {
      show: routesUtils.scollectionShow,
      showCollectionManagement: routesUtils.collectionShowCollectionManagement
    },
    '/management': 'showCollectionManagement',
    '/:collectionID': 'show'
  },

  '/metadata': {
    target: {
      showMetadata: routesUtils.metadataShowOrNew
    },
    '/': 'showMetadata'
  },

  '/report': {
    target: {
      showReport: routesUtils.reportShowReport
    },
    '/': 'showReport'
  },

  '/sample': {
    target: {
      showOrNew: routesUtils.sampleShowOrNew
    },
    '/:sampleID': 'showOrNew'
  },

  '/reaction': {
    target: {
      show: routesUtils.reactionShow,
      showSample: routesUtils.reactionShowSample
    },
    '/:reactionID': 'show',
    '/sample/:sampleID': 'showSample',
  },
  '/wellplate': {
    target: {
      showOrNew: routesUtils.wellplateShowOrNew,
      showSample: routesUtils.wellplateShowSample
    },
    '/:wellplateID': 'showOrNew',
    '/sample/:sampleID': 'showSample',
  },
  '/screen': {
    target: {
      showOrNew: routesUtils.screenShowOrNew
    },
    '/:screenID': 'showOrNew'
  },
  '/devicesAnalysis': {
    target: {
      create: routesUtils.devicesAnalysisCreate,
      show: routesUtils.devicesAnalysisShow
    },
    '/new/:deviceId/:analysisType': 'create',
    '/:analysisId': 'show',
  },
  '/device': {
    target: {
      show: routesUtils.deviceShow,
      showDeviceManagement: routesUtils.deviceShowDeviceManagement,
    },
    '/management': 'showDeviceManagement',
    '/:deviceId': 'show',
  },
  '/research_plan': {
    target: {
      showOrNew: routesUtils.researchPlanShowOrNew
    },
    '/:research_planID': 'showOrNew'
  },
  '/fwdRxnPrediction': {
    target: {
      showFwdRxnPrediction: routesUtils.predictionShowFwdRxn
    },
    '/': 'showFwdRxnPrediction'
  },
  '/genericEl': {
    target: {
      showOrNew: routesUtils.genericElShowOrNew
    },
    '/:genericElID': 'showOrNew'
  }
};

elementNames(false).forEach((klass) => {
  const item = {};
  item['target'] = { showOrNew: routesUtils.genericElShowOrNew };
  item[`/:${klass}ID`] = 'showOrNew';
  routes[`/${klass}`] = item;
});


export default function() {
  Aviator.root = '/mydb';
  Aviator.pushStateEnabled = true;
  Aviator.setRoutes(routes);
}
