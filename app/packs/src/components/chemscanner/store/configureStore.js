import { createStore, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

import api from '../middleware/api';
import chemdraw from '../middleware/chemdraw';
import rootReducer from '../reducers/root';

/* eslint-disable no-underscore-dangle */
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;
/* eslint-enable no-underscore-dangle */

const configureStore = preloadedState => createStore(
  rootReducer,
  preloadedState,
  composeEnhancers(applyMiddleware(thunk, chemdraw, api))
);

export default configureStore;
