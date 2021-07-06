import { List } from 'immutable';

import * as types from '../actions/ActionTypes';

export default function molecules(state = List(), action) {
  switch (action.type) {
    case types.CLEAN_UP: {
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
    }
    case types.REMOVE_FILE: {
      const { fileUid } = action;
      return state.filterNot(r => r.get('fileUid') === fileUid);
    }
    case types.REMOVE_MOLECULE: {
      const { id } = action;
      return state.filterNot(m => m.get('id') === id);
    }
    case types.SCAN_FILE_FOR_MOLECULES: {
      const { response } = action;
      if (!response) return state;

      return state.concat(response.get('molecules') || []);
    }
    case types.SELECT_MOLECULE: {
      const { id, fileUid, cdUid } = action;
      const mIndex = state.findIndex(m => (
        m.get('id') === id && m.get('fileUid') === fileUid && m.get('cdUid') === cdUid
      ));
      if (mIndex < 0) return state;

      return state.update(mIndex, (m) => {
        const selected = m.get('selected') || false;
        return m.set('selected', !selected);
      });
    }
    case types.TOGGLE_MOLECULE_RESIN: {
      const {
        fileUid, cdUid, molId, atomId
      } = action;
      const mIndex = state.findIndex(m => (
        m.get('id') === molId && m.get('fileUid') === fileUid && m.get('cdUid') === cdUid
      ));
      if (mIndex < 0) return state;

      return state.update(mIndex, m => m.updateIn(['alias'], (aliases) => {
        const index = aliases.findIndex(alias => alias.get('id') === atomId);
        return aliases.update(index, (alias) => {
          const resin = alias.get('resin') || false;
          return alias.set('resin', !resin);
        });
      }));
    }
    default:
      return state;
  }
}
