import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import Aviator from 'aviator';
import { DndProvider } from 'react-dnd';
import { TouchBackend } from 'react-dnd-touch-backend';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { MultiBackend, TouchTransition } from 'dnd-multi-backend';
import App from 'src/apps/mydb/App';
import appRoutes from 'src/apps/mydb/routes';
import { RootStore, StoreContext } from 'src/stores/mobx/RootStore';

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
      backend: HTML5Backend, // Mouse Drag Support
    },
    {
      backend: TouchBackend, // Touch Drag Support
      preview: true,
      transition: TouchTransition, // Detects if touch is used
    },
  ],
};
document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('app');
  if (domElement) {
    ReactDOM.render(
      <StoreContext.Provider value={RootStore.create({})}>
        <DndProvider backend={MultiBackend} options={backendOptions}>
          <App />
        </DndProvider>
      </StoreContext.Provider>,
      domElement
    );
    appRoutes().then(() => { Aviator.dispatch(); });
  }
});
