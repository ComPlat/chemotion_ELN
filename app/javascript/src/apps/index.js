import React from 'react';
import ReactDOM from 'react-dom';

import Aviator from 'aviator';
import appRoutes from 'src/apps/routes';
import { aviatorNavigationToApp } from 'src/utilities/routesUtils';
import { rootStore, StoreContext } from 'src/stores/mobx/RootStore';
import AppDispatcher from 'src/apps/AppDispatcher';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('chemotion-app');
  if (!domElement) { return; }

  ReactDOM.render(
    <StoreContext.Provider value={rootStore}>
      <AppDispatcher />
    </StoreContext.Provider>,
    domElement
  );

  // add redirect for admin route if route is not /admin
  // it can only run after Aviator.dispatch()
  appRoutes().then(() => {
    Aviator.dispatch();
    if (rootStore.userStore.role === 'Admin' && document.location.pathname === '/') {
      aviatorNavigationToApp('/admin');
    }
  });
});

// Aviator's own popstate handling (attached by the dispatch() above) matches
// the new URL and re-runs the corresponding /mydb/... fetch (e.g.
// collectionShow), but those sub-route targets only touch UIStore/
// ElementStore - they never call setCurrentRoute. So navigating back from one
// of the top-level app-switch routes (e.g. /converter_admin) to /mydb/...
// left currentRoute stuck on the old value and AppDispatcher kept rendering
// the old app. This listener runs independently of Aviator's own (both just
// fire on the same native event) and unconditionally syncs currentRoute to
// whatever the browser now shows, without calling navigate()/dispatch()
// itself - so it can't interfere with or duplicate Aviator's own handling.
window.addEventListener('popstate', () => {
  rootStore.userStore.setCurrentRoute(document.location.pathname);
});
