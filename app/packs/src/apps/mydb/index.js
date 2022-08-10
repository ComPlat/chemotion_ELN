import React from 'react';
import ReactDOM from 'react-dom';
import Aviator from 'aviator';
import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContext } from 'react-dnd';

import App from 'src/apps/mydb/App'
import initRoutes from 'src/components/routes';
import { RootStore, StoreContext } from 'src/stores/mobx/RootStore';

const AppWithDnD = DragDropContext(HTML5Backend)(App);

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('app');
  if (domElement) {
    ReactDOM.render(
      <StoreContext.Provider value={RootStore.create({})}>
        <AppWithDnD />
      </StoreContext.Provider>,
      domElement
    );
    initRoutes();
    Aviator.dispatch();
  }
});
