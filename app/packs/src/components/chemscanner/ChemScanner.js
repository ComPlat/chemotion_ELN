import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import RootContainer from 'src/components/chemscanner/containers/RootContainer';
import configureStore from 'src/components/chemscanner/store/configureStore';

export const store = configureStore();

export const ChemScanner = props => (
  <Provider store={store}>
    <RootContainer {...props} />
  </Provider>
);

document.addEventListener('DOMContentLoaded', () => {
  const chemScannerDOM = document.getElementById('ChemScanner');
  if (chemScannerDOM) ReactDOM.render(<ChemScanner />, chemScannerDOM);
});
