import React, {Component} from 'react';
import {Col, Grid, Row} from 'react-bootstrap';

import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import CollectionManagement from './CollectionManagement';
import Elements from './Elements';

import UIStore from './stores/UIStore';

import Aviator from 'aviator'
import initRoutes from './routes';

class App extends Component {
  constructor(props) {
    super();
    this.state= {
      uiState: null
    };
  }

  componentDidMount() {
    UIStore.listen(state => this.handleUiStoreChange(state));
  }

  componentWillUnmount() {
    UIStore.unlisten(state => this.handleUiStoreChange(state));
  }

  handleUiStoreChange(state) {
    this.setState({uiState: state});
  }

  mainContent() {
    const {uiState} = this.state;
    if(uiState) {
      if(uiState.showCollectionManagement) {
        return <CollectionManagement/>
      } else {
        return <Elements/>
      }
    }
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
            {this.mainContent()}
          </Col>
        </Row>
      </Grid>
    )
  }
}

$(document).ready(function() {
  React.render(<App />, document.getElementById('app'));
  initRoutes();
  Aviator.dispatch();
});
