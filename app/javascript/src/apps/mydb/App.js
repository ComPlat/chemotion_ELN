import React, { Component } from 'react';

import ElementDragLayer from 'src/components/ElementDragLayer';
import Sidebar from 'src/apps/mydb/layout/Sidebar';
import Topbar from 'src/apps/mydb/layout/Topbar';

import FlowViewerModal from 'src/apps/generic/FlowViewerModal';
import Elements from 'src/apps/mydb/elements/Elements';
import InboxModal from 'src/apps/mydb/inbox/InboxModal';
import Calendar from 'src/components/calendar/Calendar';
import LoadingModal from 'src/components/common/LoadingModal';
import ProgressModal from 'src/components/common/ProgressModal';
import Notifications from 'src/components/Notifications';
import SampleTaskInbox from 'src/components/sampleTaskInbox/SampleTaskInbox';
import UIActions from 'src/stores/alt/actions/UIActions';
import UserActions from 'src/stores/alt/actions/UserActions';
import OnEventListen from 'src/utilities/UserTemplatesHelpers';

class App extends Component {
  componentDidMount() {
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
    UserActions.fetchKetcherOptions();
    UIActions.initialize.defer();
    this.patchExternalLibraries();

    window.addEventListener('storage', this.handleStorageChange);

    // user templates
    this.removeLocalStorageEventListener();
    this.storageListener();
  }

  componentWillUnmount() {
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

  renderContent() {
    return (
      <div className="mydb-app d-flex vh-100">
        <Sidebar />
        <div className="d-flex flex-column flex-grow-1">
          <Topbar />
          <Elements />
        </div>
      </div>
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
        <ElementDragLayer />
        {this.renderContent()}
        {this.renderModals()}
      </>
    );
  }
}

export default App;
