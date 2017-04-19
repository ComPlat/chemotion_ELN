import UIStore from './stores/UIStore';
import CollectionStore from './stores/CollectionStore';
import UserStore from './stores/UserStore';
import UIActions from './actions/UIActions';
import UserActions from './actions/UserActions';
import ElementActions from './actions/ElementActions';
import rXr from './extra/routesXroutes';

let allRoutes = (r)=>{
  let rts ={...r};
  for (let i=0;i<rXr.count;i++){rts={...rts,...rXr['content'+i]} }
  return rts;
}


const routes = {
    '/': 'root',
    target: {
      root: function(e) {
        Aviator.navigate('/collection/all');
      }
    },

    '/collection': {
      target: {
        show: function(e) {
          UIActions.showElements();
          UserActions.fetchCurrentUser();
          let uiState = UIStore.getState();
          let currentSearchSelection = uiState.currentSearchSelection;
          let collectionId = e.params['collectionID'];
          let collectionPromise = null;
          if(collectionId == 'all') {
            collectionPromise = CollectionStore.findAllCollection();
          } else {
            collectionPromise = CollectionStore.findById(collectionId);
          }

          collectionPromise.then((result) => {
            let collection = result.collection;

            if(currentSearchSelection) {
              UIActions.selectCollectionWithoutUpdating(collection)
              ElementActions.fetchBasedOnSearchSelectionAndCollection(
                currentSearchSelection, collection.id, 1, uiState.isSync)
            } else {
              UIActions.selectCollection(collection);
            }

            if (!e.params['sampleID'] && !e.params['reactionID'] &&
                !e.params['wellplateID'] && !e.params['screenID']) {
              UIActions.uncheckAllElements({type: 'sample', range: 'all'});
              UIActions.uncheckAllElements({type: 'reaction', range: 'all'});
              UIActions.uncheckAllElements({type: 'wellplate', range: 'all'});
              UIActions.uncheckAllElements({type: 'screen', range: 'all'});
            }
          });
        },

        showCollectionManagement: function(e) {
          UIActions.showCollectionManagement();
        }
      },
      '/management': 'showCollectionManagement',
      '/:collectionID': 'show'
    },

    '/scollection': {
      target: {
        show: function(e) {
          UIActions.showElements();
          UserActions.fetchCurrentUser();
          let uiState = UIStore.getState();
          let currentSearchSelection = uiState.currentSearchSelection;
          let collectionId = e.params['collectionID'];
          let collectionPromise = null;
          collectionPromise = CollectionStore.findBySId(collectionId);

          collectionPromise.then((result) => {
            let collection = result.sync_collections_user;

            if(currentSearchSelection) {
              // TODO
              // UIActions.selectCollectionWithoutUpdating(collection)
              // ElementActions.fetchBasedOnSearchSelectionAndCollection(currentSearchSelection, collection.id);
            } else {
              UIActions.selectSyncCollection(collection);
            }

            if(!e.params['sampleID'] && !e.params['reactionID'] && !e.params['wellplateID'] && !e.params['screenID']) {
              UIActions.uncheckAllElements({type: 'sample', range: 'all'});
              UIActions.uncheckAllElements({type: 'reaction', range: 'all'});
              UIActions.uncheckAllElements({type: 'wellplate', range: 'all'});
              UIActions.uncheckAllElements({type: 'screen', range: 'all'});
            }
          });
        },

        showCollectionManagement: function(e) {
          UIActions.showCollectionManagement();
        }
      },
      '/management': 'showCollectionManagement',
      '/:collectionID': 'show'
    },

    '/report': {
      target: {
        showReport: function(e) {
          ElementActions.showReportContainer();
        }
      },
      '/': 'showReport'
    },

    '/sample': {
      target: {
        showOrNew: function(e) {
          const {sampleID, collectionID} = e.params;
          UIActions.selectElement({type: 'sample', id: sampleID})

          if (sampleID == 'new') {
            ElementActions.generateEmptySample(collectionID)
          } else if(sampleID == 'copy') {
            ElementActions.copySampleFromClipboard(collectionID);
          } else {
            ElementActions.fetchSampleById(sampleID);
          }
          //UIActions.selectTab(1);
        }
      },
      '/:sampleID': 'showOrNew'
    },

    '/reaction': {
      target: {
        show: function(e) {
          const {reactionID, collectionID} = e.params;
          //UIActions.selectTab(2);
          if (reactionID != 'new') {
            ElementActions.fetchReactionById(reactionID);
          }  else if(reactionID == 'copy') {
            ElementActions.copyReactionFromClipboard(collectionID);
          } else {
            ElementActions.generateEmptyReaction(collectionID)
          }
        },
        showSample: function(e) {
          const {reactionID, collectionID, sampleID} = e.params;
          ElementActions.editReactionSample(reactionID, sampleID);
        }
      },
      '/:reactionID': 'show',
      '/sample/:sampleID': 'showSample',
    },
    '/wellplate': {
      target: {
        showOrNew(e) {
          const {wellplateID, collectionID} = e.params;

          if (wellplateID == 'new') {
            ElementActions.generateEmptyWellplate(collectionID);
          } else if(wellplateID == 'template') {
            ElementActions.generateWellplateFromClipboard(collectionID);
          } else {
            ElementActions.fetchWellplateById(wellplateID);
          }
        },
        showSample: function(e) {
          const {wellplateID, collectionID, sampleID} = e.params;
          ElementActions.editWellplateSample(wellplateID, sampleID);
        }
      },
      '/:wellplateID': 'showOrNew',
      '/sample/:sampleID': 'showSample',
    },
    '/screen': {
      target: {
        showOrNew(e) {
          const {screenID, collectionID} = e.params;
          if (screenID == 'new') {
            ElementActions.generateEmptyScreen(collectionID);
          } else if(screenID == 'template') {
            ElementActions.generateScreenFromClipboard(collectionID);
          } else {
            ElementActions.fetchScreenById(screenID);
          }
        }
      },
      '/:screenID': 'showOrNew'
    },
    '/research_plan': {
      target: {
        showOrNew(e) {
          const {researchPlanID, collectionID} = e.params;
          if (researchPlanID == 'new') {
            ElementActions.generateEmptyResearchPlan(collectionID);
          } else {
            ElementActions.fetchResearchPlanById(researchPlanID);
          }
        }
      },
      '/:researchPlanID': 'showOrNew'
    }
}

export default function() {
  Aviator.root = '/';
  Aviator.pushStateEnabled = false;
  Aviator.setRoutes( allRoutes(routes));
}
