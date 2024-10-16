import React, { Component } from 'react';
import { Col, Row, Container } from 'react-bootstrap';

import Sidebar from 'src/apps/mydb/layout/Sidebar';
import Topbar from 'src/apps/mydb/layout/Topbar';

import FlowViewerModal from 'src/apps/generic/FlowViewerModal';
import CollectionManagement from 'src/apps/mydb/collections/CollectionManagement';
import Elements from 'src/apps/mydb/elements/Elements';
import InboxModal from 'src/apps/mydb/inbox/InboxModal';
import Calendar from 'src/components/calendar/Calendar';
import LoadingModal from 'src/components/common/LoadingModal';
import ProgressModal from 'src/components/common/ProgressModal';
import Notifications from 'src/components/Notifications';
import SampleTaskInbox from 'src/components/sampleTaskInbox/SampleTaskInbox';
import KeyboardActions from 'src/stores/alt/actions/KeyboardActions';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import UIStore from 'src/stores/alt/stores/UIStore';
import OnEventListen from 'src/utilities/UserTemplatesHelpers';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isSidebarCollapsed: false,
      showCollectionManagement: false,
    };
    this.handleUiStoreChange = this.handleUiStoreChange.bind(this);
    this.documentKeyDown = this.documentKeyDown.bind(this);
    this.toggleSidebar = this.toggleSidebar.bind(this);
  }

  componentDidMount() {
    UIStore.listen(this.handleUiStoreChange);
    UserActions.fetchOlsRxno();
    UserActions.fetchOlsChmo();
    UserActions.fetchOlsBao();
    UserActions.fetchProfile();
    UserActions.setUsertemplates();
    UserActions.fetchUserLabels();
    UserActions.fetchGenericEls();
    UserActions.fetchSegmentKlasses();
    UserActions.fetchDatasetKlasses();
    UserActions.fetchUnitsSystem();
    UserActions.fetchEditors();
    UserActions.fetchKetcher2Options();
    UIActions.initialize.defer();
    this.patchExternalLibraries();

    document.addEventListener('keydown', this.documentKeyDown);
    window.addEventListener('storage', this.handleStorageChange);

    // user templates
    this.removeLocalStorageEventListener();
    this.storageListener();
  }

  componentWillUnmount() {
    UIStore.unlisten(this.handleUiStoreChange);
    document.removeEventListener('keydown', this.documentKeyDown);
    this.removeLocalStorageEventListener();
  }

  removeLocalStorageEventListener() {
    window.removeEventListener('storage', this.storageListener);
  }

  storageListener() {
    window.addEventListener(
      'storage',
      OnEventListen,
      false
    );
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

  toggleSidebar() {
    this.setState((prevState) => ({
      isSidebarCollapsed: !prevState.isSidebarCollapsed
    }));
  }

  patchExternalLibraries() {
    const { plugins } = require('@citation-js/core');
    plugins.input.add('@doi/api', {
      parseType: {
        dataType: 'String',
        predicate: /\b(https?:\/\/(?:dx\.)?doi\.org\/(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'])\S)+))\b/i,
        extends: '@else/url'
      }
    });

    plugins.input.add('@doi/id', {
      parseType: {
        dataType: 'String',
        predicate: /\b(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&\'])\S)+)\b/
      }
    });
  }

  mainContent() {
    const { showCollectionManagement } = this.state;
    return (showCollectionManagement ? <CollectionManagement /> : <Elements />);
  }

  renderContent() {
    const { isSidebarCollapsed } = this.state;
    const sidebarCols = isSidebarCollapsed ? 1 : 2;
    return (
      <Container fluid className="mydb-app vh-100">
        <Row className="h-100">
          <Col xs={sidebarCols}>
            <Sidebar
              isCollapsed={isSidebarCollapsed}
              toggleCollapse={this.toggleSidebar}
            />
          </Col>
          <Col xs={12 - sidebarCols} className="d-flex flex-column">
            <Topbar />
            {this.mainContent()}
          </Col>
        </Row>
      </Container>
    );
  }

  renderModals() {
    return (
      <>
        <Notifications />
        <LoadingModal />
        <ProgressModal />
        <FlowViewerModal />
        <InboxModal />
        <SampleTaskInbox />
        <Calendar />
      </>
    );
  }

  render() {
    return (
      <>
        {this.renderContent()}
        {this.renderModals()}
      </>
    );
  }
}

export default App;
