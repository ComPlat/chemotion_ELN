import { createStore, applyMiddleware } from 'redux';
import thunk from 'redux-thunk';

import api from '../middleware/api';
import chemdraw from '../middleware/chemdraw';
import rootReducer from '../reducers/root';

const configureStore = preloadedState => createStore(
  rootReducer,
  preloadedState,
  applyMiddleware(thunk, chemdraw, api)
);

export default configureStore;
