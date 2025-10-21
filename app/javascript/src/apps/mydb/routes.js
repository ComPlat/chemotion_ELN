import Aviator from 'aviator';
import * as routesUtils from 'src/utilities/routesUtils';
import { loadEls } from 'src/apps/generic/Utils';

const routes = {
  '/': 'root',
  target: {
    root() { Aviator.navigate('/collection/all'); }
  },

  '/collection': {
    target: {
      show: routesUtils.collectionShow,
    },
    '/:collectionID': 'show'
  },

  '/scollection': {
    target: {
      show: routesUtils.scollectionShow,
    },
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
  '/cell_line': {
    target: {
      showOrNew: routesUtils.cellLineShowOrNew
    },
    '/:cellLineID': 'showOrNew'
  },
  '/device_description': {
    target: {
      showOrNew: routesUtils.deviceDescriptionShowOrNew
    },
    '/:device_descriptionID': 'showOrNew'
  },
  '/vessel_template': {
    target: {
      showOrNew: routesUtils.vesselTemplateShowOrNew
    },
    '/:vesselTemplateID': 'showOrNew'
  },
  '/vessel': {
    target: {
      showOrNew: routesUtils.vesselShowOrNew
    },
    '/:vesselID': 'showOrNew'
  },
  '/sequence_based_macromolecule_sample': {
    target: {
      showOrNew: routesUtils.sequenceBasedMacromoleculeSampleShowOrNew
    },
    '/:sequence_based_macromolecule_sampleID': 'showOrNew'
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

function setRoutes() {
  return loadEls().then((klassArray) => {
    klassArray.forEach((klass) => {
      if (!routes[`/${klass}`]) {
        const item = {};
        item.target = { showOrNew: routesUtils.genericElShowOrNew };
        item[`/:${klass}ID`] = 'showOrNew';
        routes[`/${klass}`] = item;
      }
    });
  }).catch((error) => {
    console.error('Error loading routes:', error);
  }).finally(() => {
    Aviator.root = '/mydb';
    Aviator.pushStateEnabled = true;
    Aviator.setRoutes(routes);
  });
}

export default function appRoutes() {
  return setRoutes();
}
