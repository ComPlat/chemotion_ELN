import React, { useContext } from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// apps
import AdminHome from 'src/apps/admin/AdminHome';
import App from 'src/apps/mydb/App';
import CnC from 'src/apps/commandAndControl/CnC';
import Home from 'src/apps/home/Home';
// import { ExtendedSignInForm } from 'src/components/navigation/NavNewSession';

// mydb dependencies
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
// import Aviator from 'aviator';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MultiBackend, TouchTransition } from 'dnd-multi-backend';

Sentry.init({
  sendClientReports: false,
  dsn: process.env.SENTRY_FRONTEND_DSN,
  integrations: [new Integrations.BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.SENTRY_FRONTEND_SAMPLE_RATE,
});
const backendOptions = {
  backends: [
    {
      id: 'touch',
      backend: TouchBackend, // Touch Drag Support
      options: { enableMouseEvents: true },
      transition: TouchTransition, // Detects if touch is used
    },
    {
      id: 'html5',
      backend: HTML5Backend, // Mouse Drag Support
    },
  ],
};

function AppDispatcher() {
  const { userStore } = useContext(StoreContext);
  const { role } = userStore;
  let app = null;

  if (role === 'Person') {
    console.debug('rendering mydb');
    app = (
      <DndProvider backend={MultiBackend} options={backendOptions}>
        <App />
      </DndProvider>
    );
  }
  if (role === 'Group') {
    console.debug('rendering CnC');
    app = (<CnC />);
  }
  if (role === 'Admin') {
    console.debug('rendering AdminHome');
    app = (<AdminHome />);
  }
  if (role === 'Guest' || app == null) {
    console.debug('rendering home');
    // TODO: Fall für ExtendedSignInForm reinbauen
    app = (<Home />);
  }

  return app;
}

export default observer(AppDispatcher);
