import { Map, fromJS } from 'immutable';

import * as types from '../actions/ActionTypes';
import { createReducer } from '../utils';

const defaultState = Map({
  view: types.VIEW_SCANNED_FILES,
  loading: false,
  import: false,
  reloadGrid: false,
  version: '',
  allVersion: [],
  selected: [],
  editingMoleculeId: 0,
  notification: ''
});

const ui = createReducer(defaultState, {
  [types.CHANGE_VIEW]: (state, action) => state.set('view', action.view),
  [types.GET_CURRENT_VERSION]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const { version, listVersion } = action.response;
    let newState = state;

    if (version) newState = newState.set('version', version);
    if (listVersion) {
      newState = newState.set('allVersion', fromJS(listVersion));
      newState = newState.set('view', types.VIEW_FILE_STORAGE);
    }

    return newState;
  },
  [types.RETRIEVE_STORED_FILES]: state => state.set('reloadGrid', true),
  [types.SET_LOADING]: state => state.set('loading', true),
  [types.UNSET_LOADING]: state => state.set('loading', false),
  [types.SET_IMPORT]: (state, action) => (
    state.set('import', true).set('selected', action.data)
  ),
  [types.UNSET_IMPORT]: state => state.set('import', false),
  [types.SET_NOTIFICATION]: (state, action) => state.set('notification', action.notification),
  [types.RESET_NOTIFICATION]: state => state.set('notification', ''),
  [types.SET_EDITING_MOLECULE_ID]: (state, action) => (
    state.set('editingMoleculeId', action.moleculeId || 0)
  ),
});

export default ui;
