import React from 'react';
import {Col, Grid, Row, Table} from 'react-bootstrap';
import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import CollectionManagement from './CollectionManagement';
import Elements from './Elements';

import UIActions from './actions/UIActions';
import UIStore from './stores/UIStore';
import ElementActions from './actions/ElementActions';

import CollectionStore from './stores/CollectionStore';

import Aviator from 'aviator'
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
        let mainContentDomNode = document.getElementById('main-content');

        if(mainContentDomNode) {
          // nothing rendered in main-content div
          if(!mainContentDomNode.firstChild) {
            React.render(<Elements />, mainContentDomNode);
          } else if (document.getElementById('collection-management')) {
            React.unmountComponentAtNode(mainContentDomNode);
            React.render(<Elements />, mainContentDomNode);
          }
        }

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
        let mainContentDomNode = document.getElementById('main-content');

        if(mainContentDomNode) {
          // nothing rendered in main-content div
          if(!mainContentDomNode.firstChild) {
            React.render(<CollectionManagement />, mainContentDomNode);
          } else {
            React.unmountComponentAtNode(mainContentDomNode);
            React.render(<CollectionManagement />, mainContentDomNode);
          }
        }
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

class App extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Grid border fluid>
        <Row>
          <Navigation />
        </Row>
        <Row>
          <Col sm={2} md={2} lg={2}>
            <CollectionTree/>
          </Col>
          <Col sm={10} md={10} lg={10}>
            <div id="main-content">
            </div>
          </Col>
        </Row>
      </Grid>
    )
  }
}

$(document).ready(function() {
  React.render(<App />, document.getElementById('app'));
  Aviator.dispatch();
});
