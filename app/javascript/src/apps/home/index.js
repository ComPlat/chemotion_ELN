import React from 'react';
import ReactDOM from 'react-dom';
import Home from 'src/apps/home/Home';
import { ExtendedSignInForm } from 'src/components/navigation/NavNewSession';
import { rootStore, StoreContext } from 'src/stores/mobx/RootStore';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) {
    ReactDOM.render(
      <StoreContext.Provider value={rootStore}>
        <Home />
      </StoreContext.Provider>,
      domElement
    );
  } else {
    const domElementLogin = document.getElementById('Home-Login');
    if (domElementLogin) {
      ReactDOM.render(
        <StoreContext.Provider value={rootStore}>
          <ExtendedSignInForm
            url={domElementLogin.dataset.url ?? '/users/sign_in'}
            rememberable={domElementLogin.dataset.rememberable ?? true}
            username={domElementLogin.dataset.username}
            fromInvalid={domElementLogin.dataset.invalid ?? false}
          />
        </StoreContext.Provider>,
        domElementLogin
      );
    }
  }
});
