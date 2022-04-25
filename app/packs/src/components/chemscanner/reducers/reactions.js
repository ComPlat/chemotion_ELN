import { List, fromJS } from 'immutable';

import * as types from '../actions/ActionTypes';
import { createReducer } from '../utils';

const reactions = createReducer(List(), {
  [types.UPDATE_REAGENTS_SMILES]: (state, action) => {
    const { response } = action;
    const { reaction } = response;
    if (!reaction) return state;

    const { id, svg, reagentExternalIds } = reaction;

    const rIndex = state.findIndex(r => r.get('id') === id);
    if (rIndex < 0) return state;

    return state.update(rIndex, r => (
      r.set('svg', svg).set('reagentExtIds', fromJS(reagentExternalIds))
    ));
  },
  [types.CLEAN_UP]: (state, action) => {
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
  },
  [types.EDIT_REACTION_COMMENT]: (state, action) => {
    const {
      id, fileUid, cdUid, comment
    } = action;
    const rIndex = state.findIndex(r => (
      r.get('fileUid') === fileUid && r.get('cdUid') === cdUid && r.get('id') === id
    ));
    if (rIndex < 0) return state;

    return state.update(rIndex, r => r.set('comment', comment));
  },
  [types.HIDE_FILE]: (state, action) => {
    // If not logged-in, remove reactions. Otherwise, keep it since we need
    // reactions information for FileStorage grid
    const firstReaction = state.get(0);
    if (firstReaction.get('id')) return state;

    const { fileUid } = action;
    const ids = action.ids || [];

    let newState = state.filterNot(r => r.get('fileUid') === fileUid);
    newState = newState.filterNot(r => ids.includes(r.get('schemeId')));

    return newState;
  },
  [types.HIDE_SCHEME]: (state, action) => {
    // If not logged-in, remove reactions. Otherwise, keep it since we need
    // reactions information for FileStorage grid
    const firstReaction = state.get(0);
    if (firstReaction.get('id')) return state;

    const ids = action.ids || [];
    return state.filterNot(r => ids.includes(r.get('schemeId')));
  },
  [types.HIDE_REACTION]: (state, action) => {
    const { id, fileUid, schemeIdx } = action;
    return state.filterNot(r => (
      r.get('fileUuid') === fileUid &&
        r.get('externalId') === id &&
        r.get('schemeIdx') === schemeIdx
    ));
  },
  [types.SCAN_FILE_FOR_REACTIONS]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    return state.concat(response.get('reactions') || []);
  },
  [types.GET_SCANNED_OUTPUT]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const scannedReactions = response.get('reactions');
    if (!scannedReactions) return state;

    let newState = state;
    scannedReactions.forEach((reaction) => {
      const idx = newState.findIndex(sr => sr.get('id') === reaction.get('id'));
      if (idx < 0) {
        newState = newState.push(reaction);
      } else {
        newState = newState.update(idx, r => r.merge(reaction));
      }
    });

    return newState;
  },
  [types.RESCAN_STORED_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    return state.concat(response.get('reactions') || []);
  },
  [types.SELECT_REACTION]: (state, action) => {
    const { id, fileUid, schemeIdx } = action;
    const rIndex = state.findIndex(r => (
      r.get('fileUuid') === fileUid &&
        r.get('schemeIdx') === schemeIdx &&
        r.get('externalId') === id
    ));
    if (rIndex < 0) return state;

    return state.update(rIndex, (r) => {
      const selected = r.get('selected') || false;
      return r.set('selected', !selected);
    });
  },
  [types.GET_FILE_RESULTS]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const storedReactions = response.reactions;
    if (!storedReactions) return state;

    const curIds = state.map(r => r.get('id'));
    const newReactions = storedReactions.filter(r => !curIds.includes(r.id));

    return state.concat(fromJS(newReactions));
  },
  [types.APPROVE_FILE]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const ids = response.get('reactions');
    const val = response.get('val');
    if (!ids) return state;

    return state.map((r) => {
      if (ids.includes(r.get('id'))) return r.set('isApproved', val || false);

      return r;
    });
  },
  [types.APPROVE_SCHEME]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const ids = response.get('reactions');
    const val = response.get('val');
    if (!ids) return state;

    return state.map((r) => {
      if (ids.includes(r.get('id'))) return r.set('isApproved', val || false);

      return r;
    });
  },
  [types.UPDATE_ITEM_FIELD]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    const {
      id, type, field, value
    } = JSON.parse(action['Call API'].options.body);
    if (type !== 'reactions') return state;

    const rIndex = state.findIndex(r => r.get('id') === id);
    if (rIndex < 0) return state;

    return state.update(rIndex, r => r.set(field, value));
  },
  [types.FETCH_SVG]: (state, action) => {
    const { response } = action;
    if (!response) return state;

    let newState = state;

    response.reactions.forEach((reaction) => {
      const rIndex = newState.findIndex(r => r.get('id') === reaction.id);
      if (rIndex < 0) return;

      newState = newState.update(rIndex, r => r.set('svg', reaction.svg));
    });

    return newState;
  },
});

export default reactions;
