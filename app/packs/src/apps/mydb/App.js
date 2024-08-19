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
import SampleTaskInbox from 'src/components/sampleTaskInbox/SampleTaskInbox';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import ProfilesFetcher from '../../fetchers/ProfilesFetcher';

const key = 'ketcher-tmpls';

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
  }

  removeLocalStorageEventListener() {
    window.removeEventListener('storage', this.onChangeKetcherTemplates);
  }

  storageListener() {
    window.addEventListener(
      'storage',
      // this.debounce(this.onChangeKetcherTemplates.bind(this), 300),
      this.onEventListen.bind(this),
      false
    );
  }

  // helpers end
  async onEventListen(event) {
    let { newValue, oldValue } = event;
    newValue = JSON.parse(newValue);
    oldValue = JSON.parse(oldValue);
    // const { deleteAllowed } = this.state;
    if (event.key === key) { // matching key && deleteAllowed
      if (newValue.length > oldValue.length) { // when a new template is added
        console.log("new");
        let newItem = newValue[newValue.length - 1];
        this.createAddAttachmentidToNewUserTemplate(newValue, newItem);
      } else if (newValue.length < oldValue.length) { // when a template is deleted
        console.log("removed");
        const listOfLocalid = newValue.map((item) => item.props.path);
        this.removeUserTemplate(listOfLocalid, oldValue);
      } else if (newValue.length == oldValue.length) { // when a template is update atom id, bond id
        this.updateUserTemplateDetails(oldValue, newValue);
      }
    } else if (event.key === 'ketcher-opts') {
      UsersFetcher.updateUserKetcher2Options(event.newValue);
    }
    else {
      // this.setState({ deleteAllowed: true });
    }
  }

  async createAddAttachmentidToNewUserTemplate(newValue, newItem, deleteIdx) {
    const res = await ProfilesFetcher.uploadUserTemplates({
      content: JSON.stringify(newItem),
    }).catch(err => console.log("err in create"));
    const attachment_id = res?.template_details?.filename;
    newItem['props']['path'] = attachment_id;
    newValue[newValue.length - 1] = newItem;
    if (deleteIdx) newValue.splice(deleteIdx, 1);
    // this.setState({ deleteAllowed: false });
    this.removeLocalStorageEventListener();
    localStorage.setItem(key, JSON.stringify(newValue));
    // this.localStorageEventListener();
  }


  removeUserTemplate(listOfLocalid, oldValue) {
    for (let i = 0; i < oldValue.length; i++) {
      const localItem = oldValue[i];
      const itemIndexShouldBeRemoved = listOfLocalid.indexOf(
        localItem.props.path
      );
      if (itemIndexShouldBeRemoved === -1) {
        ProfilesFetcher.deleteUserTemplate({
          path: localItem?.props.path,
        });
        break;
      }
    }
  }

  async updateUserTemplateDetails(oldValue, newValue) {
    const listOfLocalNames = newValue.map(
      (item) => JSON.parse(item.struct).header.moleculeName
    );
    for (let i = 0; i < oldValue.length; i++) {
      const localItem = JSON.parse(oldValue[i].struct);
      const exists = listOfLocalNames.indexOf(localItem.header.moleculeName) !== -1;
      if (!exists) {
        console.log({ exists, name: localItem.header.moleculeName });
        await ProfilesFetcher.deleteUserTemplate({
          path: oldValue[i].props.path,
        }).catch(() =>
          console.log('ISSUE WITH DELETE', localItem?.props?.path)
        );
        this.createAddAttachmentidToNewUserTemplate(newValue, newValue[i], i);
        break;
      }
    }
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
          <SampleTaskInbox />
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
