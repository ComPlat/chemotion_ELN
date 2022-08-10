import React from 'react';
import { Provider } from 'react-redux';

import RootContainer from 'src/apps/chemscanner/containers/RootContainer';
import configureStore from 'src/apps/chemscanner/store/configureStore';

export const store = configureStore();

const ChemScanner = props => (
  <Provider store={store}>
    <RootContainer {...props} />
  </Provider>
);

export default ChemScanner;
