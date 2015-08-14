import React from 'react';
import {Col, Grid, Row, Table} from 'react-bootstrap';
import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import List from './List';
import ManagingActions from './ManagingActions';
import ContextActions from './ContextActions';
import ElementFilter from './ElementFilter';
import SampleDetails from './SampleDetails';
import ShareModal from './managing_actions/ShareModal';

import ElementActions from './actions/ElementActions';

import Aviator from 'aviator'
Aviator.root = '/';
Aviator.pushStateEnabled = false;
Aviator.setRoutes({
  '/': 'root',
  target: {
    root: function(e) {
      ElementActions.unselectCurrentElement();

      let modalDomNode = document.getElementById('modal');
      if(modalDomNode) {
        React.unmountComponentAtNode(modalDomNode);
      }
    }
  },
  '/sample': {
    target: {
      show: function(e) {
        let sample_id = e['params']['id'];
        ElementActions.fetchSampleById(sample_id)
      }
    },
    '/:id': 'show'
  },
  '/sharing': {
    '/*': 'showShareModal',
    target: {
      showShareModal: function(e) {
        React.render(<ShareModal/>, document.getElementById('modal'));
      }
    }
  }
});
Aviator.dispatch();


export default class App extends React.Component {
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
          <Col sm={3} md={3} lg={3}>
            <ElementFilter />
          </Col>
          <Col sm={9} md={9} lg={9}>
            <ManagingActions />
          </Col>
        </Row>
        <Row>
          <Col sm={3} md={3} lg={3}>
            <CollectionTree />
          </Col>
          <Col sm={7} md={7} lg={7}>
            <Elements />
          </Col>
          <Col sm={2} md={2} lg={2}>
            <ContextActions />
          </Col>
        </Row>
      </Grid>
    )
  }
}

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
    let width = this.state.currentElement ? "75%" : 0
    let elementDetails;

    if(this.state.currentElement) {
      //todo: switch component by element.type
      elementDetails = <SampleDetails id={this.state.currentElement.id}/>
    }

    return (
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
    )
  }
}


$(document).ready(function () {
  React.render(<App />, document.getElementById('app'));
});
