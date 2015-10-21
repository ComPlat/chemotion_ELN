import UIStore from './stores/UIStore';
import CollectionStore from './stores/CollectionStore';
import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';

export default function() {
  Aviator.root = '/';
  Aviator.pushStateEnabled = false;
  Aviator.setRoutes({
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
          let collectionPromise = CollectionStore.findById(collectionId);

          collectionPromise.then((result) => {
            let collection = result.collection;

            if(currentSearchSelection) {
              UIActions.selectCollectionWithoutUpdating(collection)
              ElementActions.fetchBasedOnSearchSelectionAndCollection(currentSearchSelection, collection.id);
            } else {
              UIActions.selectCollection(collection);
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

    '/sample': {
      target: {
        showOrNew: function(e) {
          const {sampleID, collectionID} = e.params;
          UIActions.selectElement({type: 'sample', id: sampleID})

          if (sampleID != 'new') {
            ElementActions.fetchSampleById(sampleID);
          } else {
            ElementActions.generateEmptySample(collectionID)
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
          } else {
            console.log("generateEmptyReaction")
            ElementActions.generateEmptyReaction(collectionID)
          }
        }
      },
      '/:reactionID': 'show',
    },
    '/wellplate': {
      target: {
        showOrNew(e) {
          const {wellplateID, collectionID} = e.params;
          if (wellplateID == 'new') {
            ElementActions.generateEmptyWellplate(collectionID);
          } else {
            ElementActions.fetchWellplateById(wellplateID);
          }
          //UIActions.selectTab(3)
        }
      },
      '/:wellplateID': 'showOrNew'
    },
    '/screen': {
      target: {
        showOrNew(e) {
          const {screenID, collectionID} = e.params;
          if (screenID == 'new') {
            ElementActions.generateEmptyScreen(collectionID);
          } else {
            ElementActions.fetchScreenById(screenID);
          }
        }
      },
      '/:screenID': 'showOrNew'
    }
  });
}
