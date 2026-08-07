import Aviator from 'aviator';
import * as routesUtils from 'src/utilities/routesUtils';
import { loadEls } from 'src/apps/generic/Utils';

const routes = {
  '/home': {
    target: {
      Home() { routesUtils.syncCurrentRoute('/home'); }
    },
    '/': 'Home',
  },

  '/admin': {
    target: {
      index() { routesUtils.syncCurrentRoute('/admin'); }
    },
    '/': 'index',
  },

  '/command_n_control': {
    target: {
      CnC() { routesUtils.syncCurrentRoute('/command_n_control'); }
    },
    '/': 'CnC',
  },

  '/generic_elements_admin': {
    target: {
      GenericElementsAdmin() { routesUtils.syncCurrentRoute('/generic_elements_admin'); }
    },
    '/': 'GenericElementsAdmin',
  },

  '/generic_segments_admin': {
    target: {
      GenericSegmentsAdmin() { routesUtils.syncCurrentRoute('/generic_segments_admin'); }
    },
    '/': 'GenericSegmentsAdmin',
  },

  '/generic_datasets_admin': {
    target: {
      GenericDatasetsAdmin() { routesUtils.syncCurrentRoute('/generic_datasets_admin'); }
    },
    '/': 'GenericDatasetsAdmin',
  },

  '/converter_admin': {
    target: {
      ConverterAdmin() { routesUtils.syncCurrentRoute('/converter_admin'); }
    },
    '/': 'ConverterAdmin',
  },

  '/molecule_moderator': {
    target: {
      MoleculeModerator() { routesUtils.syncCurrentRoute('/molecule_moderator'); }
    },
    '/': 'MoleculeModerator',
  },

  '/mydb': {
    target: {
      root() { routesUtils.aviatorNavigationToApp('/mydb/collection/all'); }
    },
    '/': 'root',
    '/collection': {
      target: {
        show: routesUtils.collectionShow,
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
      '/:deviceDescriptionID': 'showOrNew'
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
      '/:sequenceBasedMacromoleculeSampleID': 'showOrNew'
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
      '/:researchPlanID': 'showOrNew'
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
  },
};

function setRoutes() {
  return loadEls().then((klassArray) => {
    klassArray.forEach((klass) => {
      if (!routes['/mydb'][`/${klass}`]) {
        const item = {};
        item.target = { showOrNew: routesUtils.genericElShowOrNew };
        item[`:${klass}ID`] = 'showOrNew';
        routes['/mydb'][`/${klass}`] = item;
      }
    });
  }).catch((error) => {
    console.error('Error loading routes:', error);
  }).finally(() => {
    Aviator.root = '';
    Aviator.pushStateEnabled = true;
    Aviator.setRoutes(routes);
  });
}

export default function appRoutes() {
  return setRoutes();
}
