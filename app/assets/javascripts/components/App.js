import React, {Component} from 'react';
import ReactDOM from 'react-dom';
import alt from './alt';

import {Col, Grid, Row} from 'react-bootstrap';

import Navigation from './Navigation';
import CollectionTree from './CollectionTree';
import CollectionManagement from './CollectionManagement';
import Elements from './Elements';

import UIStore from './stores/UIStore';

import Aviator from 'aviator'
import initRoutes from './routes';

import Notifications from './Notifications';

import UserActions from './actions/UserActions';

class App extends Component {
  constructor(props) {
    super();
    this.state= {
      showCollectionManagement: false
    };
    this.handleUiStoreChange = this.handleUiStoreChange.bind(this)
  }

  componentDidMount() {
    UIStore.listen(this.handleUiStoreChange);
    UserActions.fetchProfile();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUiStoreChange);
  }

  handleUiStoreChange(state) {
    if(this.state.showCollectionManagement != state.showCollectionManagement) {
      this.setState({showCollectionManagement: state.showCollectionManagement});
    }
  }

  mainContent() {
    const {showCollectionManagement} = this.state;
    if(showCollectionManagement) {
      return <CollectionManagement/>
    } else {
      return <Elements/>
    }
  }

  render() {
    return (
      <Grid fluid>
        <Row className="card-navigation">
          <Navigation/>
        </Row>
        <Row className="card-content">
          <Col sm={2} md={2} lg={2}>
            <CollectionTree/>
          </Col>
          <Col sm={10} md={10} lg={10}>
            {this.mainContent()}
          </Col>
        </Row>
        <Row>
          <Notifications />
        </Row>
      </Grid>
    )
  }
}

$(document).ready(function() {
  ReactDOM.render(<App />, document.getElementById('app'));
  initRoutes();
  Aviator.dispatch();
});
