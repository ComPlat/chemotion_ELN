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
import ElementActions from './actions/ElementActions';
import KeyboardActions from './actions/KeyboardActions';

import {DragDropContext} from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';

class App extends Component {
  constructor(props) {
    super();
    this.state= {
      showCollectionManagement: false,
      indicatorClassName: "fa fa-chevron-circle-left",
      showCollectionTree: true,
      mainContentClassName: "small-col main-content",
    };
    this.handleUiStoreChange = this.handleUiStoreChange.bind(this)
    this.documentKeyDown = this.documentKeyDown.bind(this)
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this)
  }

  shouldComponentUpdate(nextProps, nextState) {
    const prev = this.state
    const next = nextState
    return !_.isEqual(prev, next)
  }

  componentDidMount() {
    UIStore.listen(this.handleUiStoreChange);
    UserActions.fetchProfile();

    $(document).on('keydown', this.documentKeyDown);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUiStoreChange);

    $(document).off('keydown', this.documentKeyDown);
  }

  handleUiStoreChange(state) {
    if(this.state.showCollectionManagement != state.showCollectionManagement) {
      this.setState({showCollectionManagement: state.showCollectionManagement});
    }
  }

  documentKeyDown(event) {
    // Only trigger arrow and Enter keys ON BODY
    // Ignore on other element
    if (event.target.tagName.toUpperCase() == 'BODY' &&
        [13, 38, 39, 40].includes(event.keyCode)) {
      KeyboardActions.documentKeyDown(event.keyCode)
    }
  }

  toggleCollectionTree() {
    let {showCollectionTree, indicatorClassName, mainContentClassName} = this.state

    if (showCollectionTree) {
      indicatorClassName = "fa fa-chevron-circle-right"
      mainContentClassName = "small-col full-main"
    } else {
      indicatorClassName = "fa fa-chevron-circle-left"
      mainContentClassName = "small-col main-content"
    }

    this.setState({
      showCollectionTree: !showCollectionTree,
      indicatorClassName: indicatorClassName,
      mainContentClassName: mainContentClassName
    })
  }

  collectionTree() {
    const {showCollectionTree} = this.state
    if(!showCollectionTree) {
      return <div />
    }

    let collectionWidth = 2

    return (
      <Col className="small-col collec-tree">
        <CollectionTree />
      </Col>
    )
  }

  mainContent() {
    const {showCollectionManagement, mainContentClassName} = this.state;
    return (
      <Col className={mainContentClassName} >
        {showCollectionManagement ? <CollectionManagement/> : <Elements/>}
      </Col>
    )
  }

  render() {
    let {collectionWidth} = this.state
    return (
      <Grid fluid>
        <Row className="card-navigation">
          <Navigation toggleCollectionTree={this.toggleCollectionTree} />
        </Row>
        <Row className="card-content container-fluid">
          {this.collectionTree()}
          {this.mainContent()}
        </Row>
        <Row>
          <Notifications />
        </Row>
      </Grid>
    )
  }
}

const AppWithDnD = DragDropContext(HTML5Backend)(App)

$(document).ready(function() {
  let domElement = document.getElementById('app');
  if (domElement){
    ReactDOM.render(<AppWithDnD />, domElement);
    initRoutes();
    Aviator.dispatch();
  }
});
