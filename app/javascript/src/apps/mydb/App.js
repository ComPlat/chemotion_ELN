import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react';

import { StoreContext } from 'src/stores/mobx/RootStore';
import { aviatorNavigation, aviatorNavigationToApp } from 'src/utilities/routesUtils';

import ElementDragLayer from 'src/components/ElementDragLayer';
import Sidebar from 'src/apps/mydb/mainNavigation/sidebar/Sidebar';
import Topbar from 'src/apps/mydb/mainNavigation/topbar/Topbar';

import FlowViewerModal from 'src/apps/generic/FlowViewerModal';
import Elements from 'src/apps/mydb/elements/Elements';
import InboxModal from 'src/apps/mydb/inbox/InboxModal';
import Calendar from 'src/components/calendar/Calendar';
import LoadingModal from 'src/components/common/LoadingModal';
import ProgressModal from 'src/components/common/ProgressModal';
import Notifications from 'src/components/Notifications';
import SampleTaskInbox from 'src/components/sampleTaskInbox/SampleTaskInbox';
import WorkshopGuideDrawer from 'src/components/workshopGuide/WorkshopGuideDrawer';
import UIActions from 'src/stores/alt/actions/UIActions';
import OnEventListen from 'src/utilities/UserTemplatesHelpers';
import UsersFetcher from 'src/fetchers/UsersFetcher';
import CollectionsFetcher from 'src/fetchers/CollectionsFetcher';

const addLocalStorageListener = () => { window.addEventListener('storage', OnEventListen, false); };
const removeLocalStorageEventListener = () => { window.removeEventListener('storage', addLocalStorageListener); };
const saveUserTemplatesToLocalStorage = () => {
  const storageKey = 'ketcher-tmpls';
  UsersFetcher.fetchProfile().then((res) => {
    if (res?.user_templates) {
      localStorage.setItem(storageKey, '');
      localStorage.setItem(storageKey, JSON.stringify(res.user_templates));
    }
  });
  return null;
};
const saveKetcherOptionsToLocalStorage = () => {
  UsersFetcher.fetchUserKetcherOptions()
    .then((result) => {
      if (result && result?.settings) {
        if (Object.keys(result?.settings).length) {
          localStorage.setItem('ketcher-opts', JSON.stringify(result.settings));
        }
      }
    });
};

const loadElement = (paths) => {
  if (!paths[4]) { return; }

  aviatorNavigation(paths[4], paths[5], true, true, {});
};

const loadCollection = (currentRoute) => {
  const currentPaths = currentRoute.split('/');
  const collectionId = currentPaths.includes('all') ? 'all' : currentPaths[3];

  CollectionsFetcher.fetchByCollectionId(collectionId)
    .then((collection) => {
      UIActions.selectCollection(collection);

      if (!location.pathname.includes('collection')) { aviatorNavigationToApp(currentRoute); }
      loadElement(currentPaths);
    });
};

const App = () => {
  const { userStore } = useContext(StoreContext);
  const patchExternalLibraries = () => {
    const { plugins } = require('@citation-js/core');
    plugins.input.add('@doi/api', {
      parseType: {
        dataType: 'String',
        predicate: /\b(https?:\/\/(?:dx\.)?doi\.org\/(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&'])\S)+))\b/i,
        extends: '@else/url'
      }
    });

    plugins.input.add('@doi/id', {
      parseType: {
        dataType: 'String',
        predicate: /\b(10[.][0-9]{4,}(?:[.][0-9]+)*\/(?:(?!["&'])\S)+)\b/
      }
    });
  };

  useEffect(() => {
    userStore.fetchCurrentUser();
    userStore.fetchOlsRxno();
    userStore.fetchOlsChmo();
    userStore.fetchOlsBao();
    userStore.fetchProfile();
    saveUserTemplatesToLocalStorage();
    userStore.fetchUserLabels();
    userStore.fetchGenericEls();
    userStore.fetchSegmentKlasses();
    userStore.fetchDatasetKlasses();
    userStore.fetchUnitsSystem();
    userStore.fetchEditors();
    saveKetcherOptionsToLocalStorage();
    UIActions.initialize.defer();
    patchExternalLibraries();

    loadCollection(userStore.currentRoute);

    // TODO: clarify origin of handleStorageChange
    // window.addEventListener('storage', this.handleStorageChange);

    // user templates
    removeLocalStorageEventListener();
    addLocalStorageListener();

    // return a cleanup function that will be executed when the component is removed from DOM
    // see https://react.dev/reference/react/useEffect#useeffect
    return () => { removeLocalStorageEventListener(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const content = userStore.currentUser !== null ? (
    <div className="mydb-app d-flex vh-100">
      <Sidebar />
      <div className="d-flex flex-column flex-grow-1">
        <Topbar />
        <Elements />
      </div>
    </div>
  ) : null;

  const modals = (
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

  return (
    <>
      <ElementDragLayer />
      {content}
      {modals}
    </>
  );
};

export default observer(App);
