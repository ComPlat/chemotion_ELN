import React from 'react';
import ReactDOM from 'react-dom';
import Home from 'src/apps/home/Home';
import { ExtendedSignInForm } from 'src/components/navigation/NavNewSession';
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
  } else {
    const domElementLogin = document.getElementById('Home-Login');
    if (domElementLogin) {
      ReactDOM.render(
        <StoreContext.Provider value={RootStore.create({})}>
          <ExtendedSignInForm
            url={domElementLogin.dataset.url ?? '/users/sign_in'}
            rememberable={domElementLogin.dataset.rememberable ?? true}
          />
        </StoreContext.Provider>,
        domElementLogin
      );
    }
  }
});
