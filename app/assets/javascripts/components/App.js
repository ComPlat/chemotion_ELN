import React from 'react';
import {Col, Grid, Row, Table} from 'react-bootstrap';
import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import ManagingActions from './ManagingActions';
import ContextActions from './ContextActions';
import ElementFilter from './ElementFilter';
import CollectionManagement from './CollectionManagement';
import Elements from './Elements';
import ShareModal from './managing_actions/ShareModal';
import MoveModal from './managing_actions/MoveModal';
import AssignModal from './managing_actions/AssignModal';
import RemoveModal from './managing_actions/RemoveModal';
import TopSecretModal from './TopSecretModal';

import UIActions from './actions/UIActions';
import ElementActions from './actions/ElementActions';

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

        UIActions.selectCollection({id: e.params['id']});
        if(!e.params['sampleID'] && !e.params['reactionID'] && !e.params['wellplateID']) {
          UIActions.deselectAllElements('sample');
          UIActions.deselectAllElements('reaction');
          UIActions.deselectAllElements('wellplate');
          UIActions.uncheckAllElements('sample');
          UIActions.uncheckAllElements('reaction');
          UIActions.uncheckAllElements('wellplate');
        }
      },

      showCollectionManagement: function(e) {
        let mainContentDomNode = document.getElementById('main-content');

        if(mainContentDomNode) {
          // nothing rendered in main-content div
          if(!mainContentDomNode.firstChild) {
            React.render(<CollectionManagement />, mainContentDomNode);
          } else if (document.getElementById('elements')) {
            React.unmountComponentAtNode(mainContentDomNode);
            React.render(<CollectionManagement />, mainContentDomNode);
          }
        }
      }
    },
    '/management': 'showCollectionManagement',
    '/:id': 'show'
  },

  '/sample': {
    target: {
      showOrNew: function(e) {
        //UIActions.selectTab(1);
        let sampleID = e.params['sampleID']
        if (sampleID != 'new') {
          UIActions.selectElement({type: 'sample', id: sampleID})
        } else {
          ElementActions.generateEmptySample()
        }
      }
    },
    '/:sampleID': 'showOrNew'
  },

  '/reaction': {
    target: {
      show: function(e) {
        const id = e.params['reactionID'];
        //UIActions.selectTab(2);
        UIActions.selectElement({
          type: 'reaction',
          id
        });
      }
    },
    '/:reactionID': 'show',
  },
  '/wellplate': {
    target: {
      show: function(e) {
        UIActions.selectElement({
          type: 'wellplate',
          id: e.params['wellplateID']
        })
      }
    },
    '/:wellplateID': 'show',
  },

  '/sharing': {
    '/': 'show',
    '/hide': 'hide',
    target: {
      show: function(e) {
        React.render(<ShareModal/>, document.getElementById('modal'));
      },
      hide: function(e) {
        let modalDomNode = document.getElementById('modal');
        if(modalDomNode) {
          React.unmountComponentAtNode(modalDomNode);
        }
        Aviator.navigate(Aviator.getCurrentURI().replace('/sharing/hide', ''))
      }
    }
  },

  '/move': {
    '/': 'show',
    '/hide': 'hide',
    target: {
      show: function(e) {
        React.render(<MoveModal/>, document.getElementById('modal'));
      },
      hide: function(e) {
        let modalDomNode = document.getElementById('modal');
        if(modalDomNode) {
          React.unmountComponentAtNode(modalDomNode);
        }
        Aviator.navigate(Aviator.getCurrentURI().replace('/move/hide', ''))
      }
    }
  },

  '/assign': {
    '/': 'show',
    '/hide': 'hide',
    target: {
      show: function(e) {
        React.render(<AssignModal/>, document.getElementById('modal'));
      },
      hide: function(e) {
        let modalDomNode = document.getElementById('modal');
        if(modalDomNode) {
          React.unmountComponentAtNode(modalDomNode);
        }
        Aviator.navigate(Aviator.getCurrentURI().replace('/assign/hide', ''))
      }
    }
  },

  '/remove': {
    '/': 'show',
    '/hide': 'hide',
    target: {
      show: function(e) {
        React.render(<RemoveModal/>, document.getElementById('modal'));
      },
      hide: function(e) {
        let modalDomNode = document.getElementById('modal');
        if(modalDomNode) {
          React.unmountComponentAtNode(modalDomNode);
        }
        Aviator.navigate(Aviator.getCurrentURI().replace('/remove/hide', ''))
      }
    }
  },

  '/top_secret': {
    '/': 'show',
    '/hide': 'hide',
    target: {
      show: function(e) {
        React.render(<TopSecretModal />, document.getElementById('modal'));
      },
      hide: function(e) {
        let modalDomNode = document.getElementById('modal');
        if(modalDomNode) {
          React.unmountComponentAtNode(modalDomNode);
        }
        Aviator.navigate(Aviator.getCurrentURI().replace('/top_secret/hide', ''))
      }
    }
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
        {
          // <Row>
          //   <Col sm={3} md={3} lg={3}>
          //     <ElementFilter />
          //   </Col>
          //   <Col sm={9} md={9} lg={9}>
          //     <ManagingActions />
          //   </Col>
          // </Row>
        }
        <Row>
          <Col sm={2} md={2} lg={2}>
            <CollectionTree />
          </Col>
          <Col sm={8} md={8} lg={8}>
            <div id="main-content">
            </div>
          </Col>
          <Col sm={2} md={2} lg={2}>
            <ContextActions />
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
