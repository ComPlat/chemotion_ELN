import React from 'react';
import ReactDOM from 'react-dom';

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
});
