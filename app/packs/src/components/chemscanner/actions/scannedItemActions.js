import * as types from '../actions/ActionTypes';

export const removeMolecule = (id, fileUid, cdUid) => ({
  type: types.REMOVE_MOLECULE, id, fileUid, cdUid
});

export const removeReaction = (id, fileUid, cdUid) => ({
  type: types.REMOVE_REACTION, id, fileUid, cdUid
});

export const editReactionComment = (id, fileUid, cdUid, comment) => ({
  type: types.EDIT_REACTION_COMMENT, id, fileUid, cdUid, comment
});

export const editMoleculeComment = (id, fileUid, cdUid, comment) => ({
  type: types.EDIT_MOLECULE_COMMENT, id, fileUid, cdUid, comment
});

export const selectMolecule = (id, fileUid, cdUid) => ({
  type: types.SELECT_MOLECULE, id, fileUid, cdUid
});

export const selectReaction = (id, fileUid, cdUid) => ({
  type: types.SELECT_REACTION, id, fileUid, cdUid
});

//export const setResin = (id, fileUid, cdUid, atomId) => ({
//  type: types.SET_RESIN, id, fileUid, cdUid, atomId
//});

export const toggleResinInReaction = (fileUid, cdUid, rId, molId, atomId) => ({
  type: types.TOGGLE_RESIN_IN_REACTION, fileUid, cdUid, rId, molId, atomId
});

export const toggleMoleculeResin = (fileUid, cdUid, molId, atomId) => ({
  type: types.TOGGLE_MOLECULE_RESIN, fileUid, cdUid, molId, atomId
});
