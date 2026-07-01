import React from 'react';
import ReactDOM from 'react-dom';

import { RootStore, StoreContext } from 'src/stores/mobx/RootStore';
import AppDispatcher from 'src/apps/AppDispatcher';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('chemotion-app');
  if (!domElement) { return; }

  ReactDOM.render(
    <StoreContext.Provider value={RootStore.create({})}>
      <AppDispatcher />
    </StoreContext.Provider>,
    domElement
  );
});
