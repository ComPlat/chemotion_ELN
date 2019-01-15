import { List } from 'immutable';

import * as types from '../actions/ActionTypes';

export default function reactions(state = List(), action) {
  switch (action.type) {
    case types.ADD_REAGENTS_SMILES: {
      const { response, smiType, smi } = action;
      const editedReactions = response.reactions;
      if (!editedReactions) return state;

      const listSmi = List(smi.split(','));
      return state.withMutations((mapState) => {
        editedReactions.forEach((edited) => {
          const rIndex = mapState.findIndex(r => r.get('id') === edited.id);
          mapState.update(rIndex, r => r.withMutations(mr => (
            mr.set('svg', edited.svg).set(smiType, listSmi)
          )));
        });
      });
    }
    case types.CLEAN_UP: {
      const { response } = action;
      if (!response) return state;

      const cleanedReactions = response.reactions;
      if (!cleanedReactions || cleanedReactions.length === 0) return state;

      return state.withMutations((mapState) => {
        cleanedReactions.forEach((cr) => {
          const rIndex = mapState.findIndex(r => r.get('id') === cr.id);
          mapState.update(rIndex, (r) => {
            let newR = r.set('svg', cr.svg);
            ['reactants', 'reagents', 'products'].forEach((group) => {
              const molGroup = newR.get(group);
              cr[group].forEach((cm) => {
                const mIdx = molGroup.findIndex(mm => mm.get('id') === cm.id);
                newR = newR.updateIn([group, mIdx], m => m.mergeDeep(cm));
              });
            });

            return newR;
          });
        });
      });
    }
    case types.EDIT_REACTION_COMMENT: {
      const {
        id, fileUid, cdUid, comment
      } = action;
      const rIndex = state.findIndex(r => (
        r.get('fileUid') === fileUid && r.get('cdUid') === cdUid && r.get('id') === id
      ));
      if (rIndex < 0) return state;

      return state.update(rIndex, r => r.set('comment', comment));
    }
    case types.REMOVE_FILE: {
      const { fileUid } = action;
      return state.filterNot(r => r.get('fileUid') === fileUid);
    }
    case types.REMOVE_REACTION: {
      const { id, fileUid, cdUid } = action;
      return state.filterNot(r => (
        r.get('id') === id && r.get('fileUid') === fileUid && r.get('cdUid') === cdUid
      ));
    }
    case types.SCAN_FILE_FOR_REACTIONS: {
      const { response } = action;
      if (!response) return state;

      return state.concat(response.get('reactions') || []);
    }
    case types.SELECT_REACTION: {
      const { id, fileUid, cdUid } = action;
      const rIndex = state.findIndex(r => (
        r.get('fileUid') === fileUid && r.get('cdUid') === cdUid && r.get('id') === id
      ));
      if (rIndex < 0) return state;

      return state.update(rIndex, (r) => {
        const selected = r.get('selected') || false;
        return r.set('selected', !selected);
      });
    }
    case types.TOGGLE_RESIN_IN_REACTION: {
      const {
        fileUid, cdUid, rId, molId, atomId
      } = action;

      const rIndex = state.findIndex(r => (
        r.get('id') === rId && r.get('fileUid') === fileUid && r.get('cdUid') === cdUid
      ));
      if (rIndex < 0) return state;

      const findMol = (reaction, mId) => {
        const rGroup = ['reactants', 'reagents', 'products'];
        return rGroup.reduce((map, group) => {
          const idx = reaction.get(group).findIndex(m => m.get('id') === mId);
          if (idx < 0) return map;

          return { [group]: idx };
        }, {});
      };

      const molPos = findMol(state.get(rIndex), molId);
      const group = Object.keys(molPos)[0];
      const groupIdx = molPos[group];

      return state.update(rIndex, r => r.updateIn([group, groupIdx, 'alias'], (aliases) => {
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
