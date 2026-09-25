import React, { useContext } from 'react';
import { observer } from 'mobx-react';
import { StoreContext } from 'src/stores/mobx/RootStore';

// apps
import AdminHome from 'src/apps/admin/AdminHome';
import App from 'src/apps/mydb/App';
import CnC from 'src/apps/commandAndControl/CnC';
import Confirmation from 'src/apps/home/devise/Confirmation';
import ConverterAdmin from 'src/apps/converter/ConverterAdmin';
import Editor from 'src/apps/editor/Editor';
import EditPassword from 'src/apps/home/devise/EditPassword';
import GenericDatasetsAdmin from 'src/apps/generic/GenericDatasetsAdmin';
import GenericElementsAdmin from 'src/apps/generic/GenericElementsAdmin';
import GenericSegmentsAdmin from 'src/apps/generic/GenericSegmentsAdmin';
import Home from 'src/apps/home/Home';
import MoleculeModerator from 'src/apps/moleculeModerator/MoleculeModerator';
import Password from 'src/apps/home/devise/Password';
import SignIn from 'src/apps/home/devise/SignIn';
import SignUp from 'src/apps/home/devise/SignUp';

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
  '/admin',
  '/chemspectra',
  '/chemspectra-editor',
  '/command_n_control',
  '/converter_admin',
  '/editor',
  '/generic_datasets_admin',
  '/generic_elements_admin',
  '/generic_segments_admin',
  '/home',
  '/molecule_moderator',
];

const PUBLIC_PATHS = [
  '/sign_in',
  '/sign_up',
  '/password',
  '/edit_password',
  '/new_confirmation',
  '/chemspectra',
  '/chemspectra-editor',
];

const AppDispatcher = () => {
  const { userStore } = useContext(StoreContext);
  const { role, currentRoute } = userStore;

  let app = (<Home />);

  const routeMatchesToApp = APPS_PATHS.some((appPath) => currentRoute.startsWith(appPath));

  if (role === 'Person' && !routeMatchesToApp) {
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

  if (currentRoute.startsWith('/editor')) {
    console.debug('rendering Editor');
    app = (<Editor />);
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
  if (role === 'Guest' && currentRoute === '/sign_up') {
    console.debug('rendering sign in');
    app = (<SignUp />);
  }
  if (role === 'Guest' && currentRoute.startsWith('/new_confirmation')) {
    app = (<Confirmation />);
  }
  if (role === 'Guest' && currentRoute === '/password') {
    app = (<Password />);
  }
  if (role === 'Guest' && currentRoute.startsWith('/edit_password')) {
    app = (<EditPassword />);
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
