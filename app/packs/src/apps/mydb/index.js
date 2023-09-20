import React from 'react';
import ReactDOM from 'react-dom';
import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import Aviator from 'aviator';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import App from 'src/apps/mydb/App';
import initRoutes from 'src/apps/mydb/routes';
import { RootStore, StoreContext } from 'src/stores/mobx/RootStore';
Sentry.init({
  sendClientReports: false,
  dsn: process.env.SENTRY_FRONTEND_DSN,
  integrations: [new Integrations.BrowserTracing()],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for performance monitoring.
  // We recommend adjusting this value in production
  tracesSampleRate: process.env.SENTRY_FRONTENT_SAMPLE_RATE,
});

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('app');
  if (domElement) {
    ReactDOM.render(
      <StoreContext.Provider value={RootStore.create({})}>
        <DndProvider backend={HTML5Backend}>
          <App />
        </DndProvider>
      </StoreContext.Provider>,
      domElement
    );
    initRoutes();
    Aviator.dispatch();
  }
});
