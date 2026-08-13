import React, { useContext } from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// apps
import AdminHome from 'src/apps/admin/AdminHome';
import App from 'src/apps/mydb/App';
import CnC from 'src/apps/commandAndControl/CnC';
import Home from 'src/apps/home/Home';
import SignIn from 'src/apps/home/devise/SignIn';
import GenericElementsAdmin from 'src/apps/generic/GenericElementsAdmin';
import GenericSegmentsAdmin from 'src/apps/generic/GenericSegmentsAdmin';
import GenericDatasetsAdmin from 'src/apps/generic/GenericDatasetsAdmin';
import MoleculeModerator from 'src/apps/moleculeModerator/MoleculeModerator';
import ConverterAdmin from 'src/apps/converter/ConverterAdmin';

import { ChemSpectraClient } from '@complat/chem-spectra-client';

// mydb dependencies
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
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

const APPS_PATHS = [
  '/home',
  '/admin',
  '/command_n_control',
  '/molecule_moderator',
  '/generic_elements_admin',
  '/generic_segments_admin',
  '/generic_datasets_admin',
  '/converter_admin',
  '/chemspectra',
  '/chemspectra-editor',
];

const PUBLIC_PATHS = [
  '/sign_in',
  '/sign_up',
  '/password',
  '/confirmation',
  '/chemspectra',
  '/chemspectra-editor',
];

const AppDispatcher = () => {
  const { userStore } = useContext(StoreContext);
  const { role, currentRoute } = userStore;

  let app = (<Home />);

  if (role === 'Person' && !APPS_PATHS.includes(currentRoute)) {
    console.debug('rendering mydb');
    app = (
      <DndProvider backend={MultiBackend} options={backendOptions}>
        <App />
      </DndProvider>
    );
  }
  if (role === 'Group' || currentRoute === '/command_n_control') {
    console.debug('rendering CnC');
    app = (<CnC />);
  }
  if (role === 'Admin') {
    console.debug('rendering AdminHome');
    app = (<AdminHome />);
  }
  if (currentRoute === '/molecule_moderator') {
    console.debug('rendering Molecule Moderator');
    app = (<MoleculeModerator />);
  }
  if (currentRoute === '/generic_elements_admin') {
    console.debug('rendering Generic Elements Admin');
    app = (
      <DndProvider backend={HTML5Backend}>
        <GenericElementsAdmin />
      </DndProvider>
    );
  }
  if (currentRoute === '/generic_segments_admin') {
    console.debug('rendering Generic Segments Admin');
    app = (
      <DndProvider backend={HTML5Backend}>
        <GenericSegmentsAdmin />
      </DndProvider>
    );
  }
  if (currentRoute === '/generic_datasets_admin') {
    console.debug('rendering Generic Datasets Admin');
    app = (
      <DndProvider backend={HTML5Backend}>
        <GenericDatasetsAdmin />
      </DndProvider>
    );
  }
  if (currentRoute === '/converter_admin') {
    console.debug('rendering Converter Admin');
    app = (<ConverterAdmin />);
  }
  if (role === 'Guest' && currentRoute === '/sign_in') {
    console.debug('rendering sign in');
    app = (<SignIn />);
  }
  if (currentRoute === '/chemspectra') {
    app = (<ChemSpectraClient />);
  }
  if (currentRoute === '/chemspectra-editor') {
    app = (<ChemSpectraClient editorOnly />);
  }
  if (role === 'Guest' && !PUBLIC_PATHS.includes(currentRoute) || currentRoute === '/home') {
    console.debug('rendering home');
    app = (<Home />);
  }

  return app;
};

export default observer(AppDispatcher);
