import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import api from 'src/apps/chemscanner/middleware/api';
import chemdraw from 'src/apps/chemscanner/middleware/chemdraw';
import rootReducer from 'src/apps/chemscanner/reducers/index';

const configureStore = (preloadedState) => {
  const store = createStore(
    rootReducer,
    preloadedState,
    applyMiddleware(thunk, chemdraw, api)
  );

  return store;
};

export default configureStore;
