import React, { Component } from 'react';
import { Col, Grid, Row } from 'react-bootstrap';

import CollectionManagement from 'src/apps/mydb/collections/CollectionManagement';
import CollectionTree from 'src/apps/mydb/collections/CollectionTree';
import Elements from 'src/apps/mydb/elements/Elements';
import InboxModal from 'src/apps/mydb/inbox/InboxModal';
import KeyboardActions from 'src/stores/alt/actions/KeyboardActions';
import LoadingModal from 'src/components/common/LoadingModal';
import Navigation from 'src/components/navigation/Navigation';
import Notifications from 'src/components/Notifications';
import ProgressModal from 'src/components/common/ProgressModal';
import UIActions from 'src/stores/alt/actions/UIActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import UserActions from 'src/stores/alt/actions/UserActions';
import CollectionActions from 'src/stores/alt/actions/CollectionActions';
import Calendar from 'src/components/calendar/Calendar';

class App extends Component {
  constructor(_props) {
    super();
    this.state = {
      showCollectionManagement: false,
      indicatorClassName: 'fa fa-chevron-circle-left',
      showCollectionTree: true,
      mainContentClassName: 'small-col main-content',
    };
    this.handleUiStoreChange = this.handleUiStoreChange.bind(this);
    this.documentKeyDown = this.documentKeyDown.bind(this);
    this.toggleCollectionTree = this.toggleCollectionTree.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.handleUiStoreChange);
    UserActions.fetchOlsRxno();
    UserActions.fetchOlsChmo();
    UserActions.fetchProfile();
    UserActions.fetchUserLabels();
    UserActions.fetchGenericEls();
    UserActions.fetchSegmentKlasses();
    UserActions.fetchDatasetKlasses();
    UserActions.fetchUnitsSystem();
    UserActions.fetchEditors();
    CollectionActions.fetchMyCollections();
    UIActions.initialize.defer();
    document.addEventListener('keydown', this.documentKeyDown);
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUiStoreChange);
    document.removeEventListener('keydown', this.documentKeyDown);
  }
  handleUiStoreChange(state) {
    if (this.state.showCollectionManagement !== state.showCollectionManagement) {
      this.setState({ showCollectionManagement: state.showCollectionManagement });
    }

    if (this.state.klasses !== state.klasses) {
      this.setState({ klasses: state.klasses });
    }
  }

  documentKeyDown(event) {
    // Only trigger arrow and Enter keys ON BODY
    // Ignore on other element
    if (event.target.tagName.toUpperCase() === 'BODY' && [13, 38, 39, 40].includes(event.keyCode)) {
      KeyboardActions.documentKeyDown(event.keyCode);
    }
  }

  toggleCollectionTree() {
    const { showCollectionTree } = this.state;
    this.setState({
      showCollectionTree: !showCollectionTree,
      indicatorClassName: showCollectionTree ? 'fa fa-chevron-circle-right' : 'fa fa-chevron-circle-left',
      mainContentClassName: showCollectionTree ? 'small-col full-main' : 'small-col main-content'
    });
  }

  collectionTree() {
    const { showCollectionTree } = this.state;
    if (!showCollectionTree) {
      return <div />;
    }

    return (
      <Col className="small-col collec-tree">
        <CollectionTree />
      </Col>
    );
  }

  mainContent() {
    const { showCollectionManagement, mainContentClassName } = this.state;
    return (
      <Col className={mainContentClassName} >
        {showCollectionManagement ? <CollectionManagement /> : <Elements />}
      </Col>
    );
  }

  render() {
    const { showCollectionTree } = this.state;
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
          <LoadingModal />
          <ProgressModal />
        </Row>
        <InboxModal showCollectionTree={showCollectionTree} />
        <Calendar />
      </Grid>
    );
  }
}

export default App;
