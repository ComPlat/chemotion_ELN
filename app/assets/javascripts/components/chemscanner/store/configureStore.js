import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import api from '../middleware/api';
import chemdraw from '../middleware/chemdraw';
import rootReducer from '../reducers/index';

const configureStore = (preloadedState) => {
  const store = createStore(
    rootReducer,
    preloadedState,
    applyMiddleware(thunk, chemdraw, api)
  );

  return store;
};

export default configureStore;
