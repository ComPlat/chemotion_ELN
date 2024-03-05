import UIStore from './stores/UIStore';
import ElementStore from './stores/ElementStore';
import CollectionStore from './stores/CollectionStore';
import UserStore from './stores/UserStore';
import UIActions from './actions/UIActions';
import UserActions from './actions/UserActions';
import ElementActions from './actions/ElementActions';
import rXr from './extra/routesXroutes';
import * as routesUtils from './routesUtils';
import UIFetcher from './fetchers/UIFetcher';
import klasses from '../../../../config/klasses.json';


const allRoutes = (r) => {
  let rts = { ...r };
  for (let i = 0; i < rXr.count; i++) { rts = { ...rts, ...rXr[`content${i}`] }; }
  return rts;
}

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

  // const { klasses } = UIStore.getState();
  // console.log(klasses);


// UIFetcher.initialize()
//   .then((result) => {
//     console.log(result);
//     const klasses = result.klasses || [];
//   });

klasses && klasses.forEach((klass) => {
  const item = {};
  item['target'] = { showOrNew: routesUtils.genericElShowOrNew };
  item[`/:${klass}ID`] = 'showOrNew';
  routes[`/${klass}`] = item;
});


export default function() {
  Aviator.root = '/mydb';
  Aviator.pushStateEnabled = true;
  Aviator.setRoutes(allRoutes(routes));
}
