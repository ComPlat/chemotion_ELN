import UIStore from './stores/UIStore';
import CollectionStore from './stores/CollectionStore';
import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';
import rXr from './extra/routesXroutes';

let allRoutes = (r)=>{
  let rts ={...r};
  for (let i=0;i<rXr.routesCount;i++){rts={...rts,...rXr['routes'+i]} }
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
              UIActions.uncheckAllElements('sample');
              UIActions.uncheckAllElements('reaction');
              UIActions.uncheckAllElements('wellplate');
              UIActions.uncheckAllElements('screen');
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
              UIActions.uncheckAllElements('sample');
              UIActions.uncheckAllElements('reaction');
              UIActions.uncheckAllElements('wellplate');
              UIActions.uncheckAllElements('screen');
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
        show: function(e) {
          ElementActions.showReportContainer();
        }
      },
      '/:reportID': 'show'
    },
    
    '/device': {
      target: {
        show: function(e) {
          ElementActions.showDeviceContainer();
        }
      },
      '/:deviceId': 'show'
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
    }
}

export default function() {
  Aviator.root = '/';
  Aviator.pushStateEnabled = false;
  Aviator.setRoutes( allRoutes(routes));
}
