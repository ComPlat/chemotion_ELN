import React from 'react';
import ReactDOM from 'react-dom';
import Home from 'src/apps/home/Home';
import { RootStore, StoreContext } from 'src/stores/mobx/RootStore';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) {
    ReactDOM.render(
      <StoreContext.Provider value={RootStore.create({})}>
        <Home />
      </StoreContext.Provider>,
      domElement
    );
  }
});
