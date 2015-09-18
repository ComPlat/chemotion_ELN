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
        let rightColumnDomNode = document.getElementById('right-column');

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
        //UIActions.selectTab(2);
        UIActions.selectElement({
          type: 'reaction',
          id: e.params['reactionID']
        })
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
            <ManagingActions /><br/><ContextActions />
          </Col>
        </Row>
      </Grid>
    )
  }
}

<<<<<<< HEAD
import ElementStore from './stores/ElementStore';

export default class Elements extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      currentElement: null
    }
  }

  componentDidMount() {
    ElementStore.listen(this.onChange.bind(this));
  }

  componentWillUnmount() {
    ElementStore.unlisten(this.onChange.bind(this));
  }

  onChange(state) {
    this.setState({
      currentElement: state.currentElement
    })
  }

  render() {
    let width = this.state.currentElement ? "65%" : 0;
    let elementDetails;

    if(this.state.currentElement) {
      //todo: switch component by element.type
      switch(this.state.currentElement.type) {
        case 'sample':
          elementDetails = <SampleDetails sample={this.state.currentElement}/>;
          break;
        case 'reaction':
          elementDetails = <ReactionDetails reaction={this.state.currentElement}/>;
          break;
        case 'wellplate':
          elementDetails = <WellplateDetails wellplate={this.state.currentElement}/>;
        default:
      }
    }

    return (
      <div id="elements">
        <Table>
          <tbody>
          <tr valign="top" className="borderless">
            <td className="borderless">
              <List/>
            </td>
            <td className="borderless" width={width}>
              {elementDetails}
            </td>
          </tr>
          </tbody>
        </Table>
      </div>
    )
  }
}

$(document).ready(function () {
=======
$(document).ready(function() {
>>>>>>> implement dnd between samples and wellplate
  React.render(<App />, document.getElementById('app'));
  Aviator.dispatch();
});
