import { fromJS, List, Map } from 'immutable';

import * as types from '../actions/ActionTypes';
import { createReducer } from '../utils';

const scanFile = (state, action) => {
  const { response } = action;
  if (!response) return state;

  return state.concat(response.get('files') || []);
};

const files = createReducer(List(), {
  [types.SCAN_FILE_FOR_MOLECULES]: scanFile,
  [types.SCAN_FILE_FOR_REACTIONS]: scanFile,
  [types.DELETE_STORED_FILE]: (state, action) => {
    const source = action.response.get('source');
    if (!source) return state;

    return state.filterNot(f => (
      source.includes(f.get('id')) || source.includes(f.get('parentId'))
    ));
  },
  [types.GET_SCANNED_OUTPUT]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const outputFiles = response.get('files');
    let newState = state;

    outputFiles.forEach((file) => {
      const idx = newState.findIndex(f => f.get('id') === file.get('id'));
      if (idx < 0) return;

      newState = newState.update(idx, f => f.merge(file).set('show', true));
    });

    return newState;
  },
  [types.RETRIEVE_STORED_FILES]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const storedFiles = response.files;
    if (!storedFiles) return state;

    const curIds = state.map(f => f.get('id'));
    const newFiles = storedFiles.filter(f => !curIds.includes(f.id));

    return state.concat(fromJS(newFiles));
  },
  [types.MARK_CORRECT]: (state, action) => {
    const { uuid } = action;
    const idx = state.findIndex(f => f.get('uuid') === uuid);

    return state.updateIn(idx, f => f.set('correct', true));
  },
  [types.RESCAN_STORED_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    let newFiles = response.get('files');
    if (!newFiles || newFiles.size === 0) return state;

    const curIds = state.map(f => f.get('id'));
    newFiles = newFiles.filterNot(f => curIds.includes(f.get('id')));

    return state.concat(fromJS(newFiles));
  },
  [types.UPLOAD_TO_STORE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const outputFiles = response.files;
    if (!outputFiles) return state;

    return state.concat(fromJS(outputFiles));
  },
  [types.HIDE_FILE]: (state, action) => {
    const { fileUid } = action;
    const ids = action.ids || [];

    return state.map((f) => {
      const checkFileUid = fileUid && f.get('uuid') === fileUid;
      const checkIds = ids.includes(f.get('id') || 0);

      if (checkFileUid || checkIds) {
        return f.set('display', '').set('show', false);
      }

      return f;
    });
  },
  [types.APPROVE_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const ids = response.get('files');
    const val = response.get('val');
    if (!ids) return state;

    return state.map((f) => {
      if (ids.includes(f.get('id'))) return f.set('isApproved', val || false);

      return f;
    });
  },
  [types.UPDATE_METADATA]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const request = JSON.parse(action['Call API'].options.body);
    const { id, data } = request;

    const idx = state.findIndex(f => f.get('id') === id);
    if (idx < 0) return state;

    return state.update(idx, f => f.set('extendedMetadata', data));
  },
  [types.TOGGLE_FILE_EXPAND]: (state, action) => {
    const { response } = action;
    if (!response || !response.source) return state;

    const { id } = response.source;
    if (!id) return state;

    const idx = state.findIndex(f => f.get('id') === id);
    if (idx < 0) return state;

    return state.update(idx, (f) => {
      let expanded = f.get('expanded');
      if (expanded == null) expanded = true;

      let metadata = f.get('extendedMetadata') || Map();
      metadata = metadata.set('expanded', !expanded);

      return f.set('extendedMetadata', metadata).set('expanded', !expanded);
    });
  },
  [types.SET_ARCHIVED_VALUE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const request = JSON.parse(action['Call API'].options.body);
    const { ids, value } = request;
    if (!ids) return state;

    return state.map((f) => {
      const id = f.get('id');
      if (!ids.includes(id)) return f;

      let metadata = f.get('extendedMetadata');
      if (metadata == null) metadata = Map();
      metadata = metadata.set('archived', value);

      return f.set('extendedMetadata', metadata);
    });
  },
});

export default files;
