import { List, fromJS } from 'immutable';

import * as types from '../actions/ActionTypes';
import { createReducer } from '../utils';

const molecules = createReducer(List(), {
  [types.CLEAN_UP]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const cleanedMolecules = response.molecules;
    if (!cleanedMolecules || cleanedMolecules.length === 0) return state;

    return state.withMutations((mapState) => {
      cleanedMolecules.forEach((cm) => {
        const mIndex = mapState.findIndex(m => m.get('id') === cm.id);
        mapState.update(mIndex, m => m.mergeDeep(cm));
      });
    });
  },
  [types.UPDATE_REAGENTS_SMILES]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const { reaction } = response;

    const addedMolecules = response.molecules || [];
    let newState = state.concat(fromJS(addedMolecules));

    const { removedIds } = reaction;
    newState = newState.filter(m => !removedIds.includes(m.get('id')));

    return newState;
  },
  [types.HIDE_FILE]: (state, action) => {
    // If not logged-in, remove reactions. Otherwise, keep it since we need
    // reactions information for FileStorage grid
    const firstMolecule = state.get(0);
    if (firstMolecule.get('id')) return state;

    const { fileUid } = action;
    const ids = action.ids || [];

    let newState = state.filterNot(m => m.get('fileUid') === fileUid);
    if (ids.length > 0) {
      newState = newState.filterNot(m => ids.includes(m.get('schemeId')));
    }

    return newState;
  },
  [types.HIDE_SCHEME]: (state, action) => {
    // If not logged-in, remove reactions. Otherwise, keep it since we need
    // reactions information for FileStorage grid
    const firstMolecule = state.get(0);
    if (firstMolecule.get('id')) return state;

    const ids = action.ids || [];
    return state.filterNot(m => ids.includes(m.get('schemeId')));
  },
  [types.DELETE_STORED_FILE]: (state, action) => {
    const fileUid = action.response;
    return state.filterNot(m => m.get('uid') === fileUid);
  },
  [types.HIDE_MOLECULE]: (state, action) => {
    const { fileUid, schemeIdx, id } = action;
    return state.filterNot(m => (
      m.get('externalId') === id &&
        m.get('schemeIdx') === schemeIdx &&
        m.get('fileUuid') === fileUid
    ));
  },
  [types.SCAN_FILE_FOR_MOLECULES]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    return state.concat(response.get('molecules') || []);
  },
  [types.SCAN_FILE_FOR_REACTIONS]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    return state.concat(response.get('molecules') || []);
  },
  [types.GET_SCANNED_OUTPUT]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const scannedMolecules = response.get('molecules');
    if (!scannedMolecules) return state;

    let newState = state;
    scannedMolecules.forEach((molecule) => {
      const idx = newState.findIndex(sm => sm.get('id') === molecule.get('id'));
      if (idx < 0) {
        newState = newState.push(molecule);
      } else {
        newState = newState.update(idx, m => m.merge(molecule));
      }
    });

    return newState;
  },
  [types.RESCAN_STORED_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    return state.concat(response.get('molecules') || []);
  },
  [types.SELECT_MOLECULE]: (state, action) => {
    const { id, fileUid, schemeIdx } = action;
    const mIndex = state.findIndex(m => (
      m.get('externalId') === id &&
        m.get('fileUuid') === fileUid &&
        m.get('schemeIdx') === schemeIdx
    ));
    if (mIndex < 0) return state;

    return state.update(mIndex, (m) => {
      const selected = m.get('selected') || false;
      return m.set('selected', !selected);
    });
  },
  [types.GET_FILE_RESULTS]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const storedMolecules = response.molecules;
    if (!storedMolecules) return state;

    const curIds = state.map(m => m.get('id'));
    const newMolecules = storedMolecules.filter(m => !curIds.includes(m.id));

    return state.concat(fromJS(newMolecules));
  },
  [types.APPROVE_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const ids = response.get('molecules');
    const val = response.get('val');
    if (!ids) return state;

    return state.map((m) => {
      if (ids.includes(m.get('id'))) return m.set('isApproved', val || false);

      return m;
    });
  },
  [types.APPROVE_SCHEME]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const ids = response.get('molecules');
    const val = response.get('val');
    if (!ids) return state;

    return state.map((m) => {
      if (ids.includes(m.get('id'))) return m.set('isApproved', val || false);

      return m;
    });
  },
  [types.UPDATE_ITEM_FIELD]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const {
      id, type, field, value
    } = JSON.parse(action['Call API'].options.body);
    if (type !== 'molecules') return state;

    const mIndex = state.findIndex(m => m.get('id') === id);
    if (mIndex < 0) return state;

    return state.update(mIndex, m => m.set(field, value));
  },
  [types.TOGGLE_ALIAS_POLYMER]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const request = JSON.parse(action['Call API'].options.body);
    const { moleculeId, atomIdx } = request;

    const idx = state.findIndex(m => m.get('id') === moleculeId);
    if (idx < 0) return state;

    return state.update(idx, (m) => {
      let extData = m.get('extendedMetadata');

      let polymers = extData.get('polymer') || List();
      if (polymers.includes(atomIdx)) {
        polymers = polymers.filter(x => x === atomIdx.toString());
      } else {
        polymers = polymers.push(atomIdx);
      }

      extData = extData.set('polymer', polymers);
      return m.set('extendedMetadata', extData);
    });
  },
  [types.FETCH_SVG]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    let newState = state;

    response.molecules.forEach((molecule) => {
      const mIndex = newState.findIndex(m => m.get('id') === molecule.id);
      if (mIndex < 0) return;

      newState = newState.update(mIndex, m => m.set('svg', molecule.svg));
    });

    return newState;
  },
});

export default molecules;
