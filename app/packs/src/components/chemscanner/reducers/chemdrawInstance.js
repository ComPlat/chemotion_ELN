import * as types from '../actions/ActionTypes';
import { createReducer } from '../utils';

const chemdrawInstance = createReducer(null, {
  [types.SET_CDD_INSTANCE]: (state, action) => action.cdd,
});

export default chemdrawInstance;
