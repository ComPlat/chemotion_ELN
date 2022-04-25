import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import * as types from '../actions/ActionTypes';

import ScannedMolecules from '../components/ScannedMolecules';
import ScannedReactions from '../components/ScannedReactions';

import {
  removeMolecule,
  removeReaction,
  editMoleculeComment,
  editReactionComment,
  selectMolecule,
  selectReaction,
} from '../actions/scannedItemActions';

import { updateItemField, toggleAliasPolymer } from '../actions/storedFileActions';

const ScannedItemsContainer = (props) => {
  const { display } = props;

  if (display === 'molecules') return <ScannedMolecules {...props} />;
  if (display !== 'reactions') return <span />;

  return <ScannedReactions {...props} />;
};

const mapStateToProps = state => ({
  reactions: state.get('reactions'),
  molecules: state.get('molecules'),
});

const mapDispatchToProps = dispatch => ({
  editComment: (itemType, fileUid, schemeIdx, id, comment) => {
    if (itemType === 'molecules') {
      dispatch(editMoleculeComment(id, fileUid, schemeIdx, comment));
    } else if (itemType === 'reactions') {
      dispatch(editReactionComment(id, fileUid, schemeIdx, comment));
    }
  },
  removeItem: (itemType, fileUid, schemeIdx, id) => {
    if (itemType === 'molecules') {
      dispatch(removeMolecule(id, fileUid, schemeIdx));
    } else if (itemType === 'reactions') {
      dispatch(removeReaction(id, fileUid, schemeIdx));
    }
  },
  selectItem: (itemType, fileUid, schemeIdx, id) => {
    if (itemType === 'molecules') {
      dispatch(selectMolecule(id, fileUid, schemeIdx));
    } else if (itemType === 'reactions') {
      dispatch(selectReaction(id, fileUid, schemeIdx));
    }
  },
  updateItemField: (id, type, field, value) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(updateItemField(id, type, field, value)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
  toggleAliasPolymer: (moleculeId, atomIdx) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(toggleAliasPolymer(moleculeId, atomIdx)).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
  editMoleculeMdl: (moleculeId) => {
    if (!moleculeId) return;

    dispatch({ type: types.SET_EDITING_MOLECULE_ID, moleculeId });
  }
});

ScannedItemsContainer.propTypes = {
  display: PropTypes.string.isRequired
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ScannedItemsContainer);
