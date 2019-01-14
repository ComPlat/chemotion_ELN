import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';
import logger from 'redux-logger';

import api from '../middleware/api';
import chemdraw from '../middleware/chemdraw';
import rootReducer from '../reducers/index';

const configureStore = (preloadedState) => {
  const store = createStore(
    rootReducer,
    preloadedState,
    applyMiddleware(thunk, chemdraw, api, logger)
  );

  return store;
};

export default configureStore;
