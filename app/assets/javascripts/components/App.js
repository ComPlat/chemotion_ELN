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
import KeyboardActions from './actions/KeyboardActions';

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

  componentDidMount() {
    UIStore.listen(this.handleUiStoreChange);
    UserActions.fetchProfile();

    // $(document).on('keydown', this.documentKeyDown);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUiStoreChange);

    // $(document).off('keydown', this.documentKeyDown);
  }

  handleUiStoreChange(state) {
    if(this.state.showCollectionManagement != state.showCollectionManagement) {
      this.setState({showCollectionManagement: state.showCollectionManagement});
    }
  }

  documentKeyDown(event) {
    // Only trigger arrow and Enter keys
    if ([13, 38, 39, 40].includes(event.keyCode)) {
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
          <Navigation/>
        </Row>
        <Row className="card-content">
          <div onClick={this.toggleCollectionTree}
               style={{float: "left", cursor: "pointer", marginTop: "3px"}}>
            <i className={this.state.indicatorClassName}
               style={{marginTop: "7px", marginLeft: "5px"}}/>
          </div>
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

$(document).ready(function() {
  ReactDOM.render(<App />, document.getElementById('app'));
  initRoutes();
  Aviator.dispatch();
});
