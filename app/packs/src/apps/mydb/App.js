import React, { Component } from 'react';
import { Col, Grid, Row } from 'react-bootstrap';
import { FlowViewerModal } from 'chem-generic-ui';
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
import Calendar from 'src/components/calendar/Calendar';

class App extends Component {
  constructor(_props) {
    super();
    this.state = {
      showGenericWorkflow: false,
      propGenericWorkflow: false,
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
    UIActions.initialize.defer();
    document.addEventListener('keydown', this.documentKeyDown);

    this.patchExternalLibraries();
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
    if (this.state.showGenericWorkflow !== state.showGenericWorkflow ||
      this.state.propGenericWorkflow !== state.propGenericWorkflow) {
      this.setState({ showGenericWorkflow: state.showGenericWorkflow, propGenericWorkflow: state.propGenericWorkflow });
    }
  }

  documentKeyDown(event) {
    // Only trigger arrow and Enter keys ON BODY
    // Ignore on other element
    if (event.target.tagName.toUpperCase() === 'BODY' && [13, 38, 39, 40].includes(event.keyCode)) {
      KeyboardActions.documentKeyDown(event.keyCode);
    }
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
      <Col className={mainContentClassName}>
        {showCollectionManagement ? <CollectionManagement /> : <Elements />}
      </Col>
    );
  }

  render() {
    const { showCollectionTree, showGenericWorkflow, propGenericWorkflow } = this.state;
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
        <FlowViewerModal
          show={showGenericWorkflow || false}
          data={propGenericWorkflow || {}}
          fnHide={() => UIActions.showGenericWorkflowModal(false)}
        />
        <InboxModal showCollectionTree={showCollectionTree} />
        <Calendar />
      </Grid>
    );
  }
}

export default App;
