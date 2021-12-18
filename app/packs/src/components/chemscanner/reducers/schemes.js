import { List, Map, fromJS } from 'immutable';

import * as types from '../actions/ActionTypes';
import { createReducer } from '../utils';

const addSchemes = (state, action) => {
  const { response } = action;
  if (!response) return state;

  let outputSchemes = response.get('schemes') || List();
  if (outputSchemes.size === 0) return state;

  outputSchemes = outputSchemes.map(s => s.delete('pictureData'));

  return state.concat(outputSchemes);
};

const revokeImageData = (scheme) => {
  const imageData = scheme.get('imageData');
  if (!imageData || !imageData.startsWith('blob:')) return;

  window.URL.revokeObjectURL(imageData);
};

const schemes = createReducer(List(), {
  [types.SCAN_FILE_FOR_MOLECULES]: addSchemes,
  [types.SCAN_FILE_FOR_REACTIONS]: addSchemes,
  [types.GET_SCANNED_OUTPUT]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const outputSchemes = response.get('schemes') || [];
    let newState = state;

    outputSchemes.forEach((scheme) => {
      const idx = newState.findIndex(s => s.get('id') === scheme.get('id'));
      if (idx < 0) return;

      const newScheme = scheme.delete('pictureData').set('show', true);
      newState = newState.update(idx, s => s.merge(newScheme));
    });

    return newState;
  },
  [types.GET_FILE_RESULTS]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    let newSchemes = response.schemes;
    if (!newSchemes) return state;

    const curIds = state.map(s => s.get('id'));
    newSchemes = newSchemes.filter(s => !curIds.includes(s.id));

    return state.concat(fromJS(newSchemes));
  },
  [types.RESCAN_STORED_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const newSchemes = response.get('schemes');
    if (!newSchemes || newSchemes.size === 0) return state;

    return state.concat(newSchemes);
  },
  [types.HIDE_FILE]: (state, action) => {
    const { fileUid } = action;
    const ids = action.ids || [];

    let newState = state;
    if (fileUid) {
      const deleteIdx = [];
      newState = state.map((s, idx) => {
        if (s.get('fileUuid') === fileUid) {
          deleteIdx.push(idx);
          return s.set('display', '').set('show', false);
        }

        return s;
      });

      // Delete if not logged-in user
      const firstScheme = newState.get(0);
      if (firstScheme && !firstScheme.get('id')) {
        deleteIdx.reverse().forEach((idx) => {
          const s = newState.get(idx);
          revokeImageData(s);
          newState = newState.delete(idx);
        });
      }
    }

    if (ids.length > 0) {
      newState = state.map((s) => {
        const check = (
          ids.includes(s.get('sourceId')) || ids.includes(s.get('id'))
        );
        if (check) return s.set('display', '').set('show', false);

        return s;
      });
    }

    return newState;
  },
  [types.HIDE_SCHEME]: (state, action) => {
    const ids = action.ids || [];

    return state.map(s => (
      ids.includes(s.get('id')) ? s.set('display', '').set('show', false) : s
    ));
  },
  [types.DELETE_STORED_FILE]: (state, action) => {
    const source = action.response.get('source') || [];
    const scheme = action.response.get('scheme') || [];
    if (!source && !scheme) return state;

    state.filter(s => source.includes(s.get('sourceId'))).forEach(s => revokeImageData(s));
    state.filter(s => scheme.includes(s.get('id'))).forEach(s => revokeImageData(s));

    const newState = state.filterNot(s => source.includes(s.get('sourceId')));
    return newState.filterNot(s => scheme.includes(s.get('id')));
  },
  [types.GET_SCHEME_PREVIEW]: (state, action) => {
    const { id, imageData } = action;
    const idx = state.findIndex(s => s.get('id') === id);

    return state.update(idx, s => s.set('imageData', imageData));
  },
  [types.APPROVE_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const ids = response.get('schemes');
    const val = response.get('val');
    if (!ids) return state;

    return state.map((s) => {
      if (ids.includes(s.get('id'))) return s.set('isApproved', val || false);

      return s;
    });
  },
  [types.APPROVE_SCHEME]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const ids = response.get('schemes');
    const val = response.get('val');
    if (!ids) return state;

    return state.map((s) => {
      if (ids.includes(s.get('id'))) return s.set('isApproved', val || false);

      return s;
    });
  },
  [types.TOGGLE_SCHEME_EXPAND]: (state, action) => {
    const { id } = action;
    if (!id) return state;

    const idx = state.findIndex(s => s.get('id') === id);
    if (idx < 0) return state;

    return state.update(idx, (s) => {
      const expanded = s.get('expanded') || false;

      let metadata = s.get('extendedMetadata') || Map();
      metadata = metadata.set('expanded', !expanded);

      return s.set('extendedMetadata', metadata).set('expanded', !expanded);
    });
  }
});

export default schemes;
