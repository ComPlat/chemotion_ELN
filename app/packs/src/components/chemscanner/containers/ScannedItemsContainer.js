import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';

import ScannedMolecules from '../components/ScannedMolecules';
import ScannedReactions from '../components/ScannedReactions';

import {
  removeMolecule,
  removeReaction,
  editMoleculeComment,
  editReactionComment,
  selectMolecule,
  selectReaction,
  toggleResinInReaction,
  toggleMoleculeResin
} from '../actions/scannedItemActions';

const ScannedItemsContainer = (props) => {
  const { display } = props;
  if (display === 'molecules') {
    return <ScannedMolecules {...props} />;
  } else if (display === 'reactions') {
    return <ScannedReactions {...props} />;
  }

  return <span />;
};

const mapStateToProps = (state, ownProps) => ({
  [ownProps.display]: state.get(ownProps.display)
});

const mapDispatchToProps = dispatch => ({
  editComment: (itemType, fileUid, cdUid, id, comment) => {
    if (itemType === 'molecules') {
      dispatch(editMoleculeComment(id, fileUid, cdUid, comment));
    } else if (itemType === 'reactions') {
      dispatch(editReactionComment(id, fileUid, cdUid, comment));
    }
  },
  removeItem: (itemType, fileUid, cdUid, id) => {
    if (itemType === 'molecules') {
      dispatch(removeMolecule(id, fileUid, cdUid));
    } else if (itemType === 'reactions') {
      dispatch(removeReaction(id, fileUid, cdUid));
    }
  },
  selectItem: (itemType, fileUid, cdUid, id, comment) => {
    if (itemType === 'molecules') {
      dispatch(selectMolecule(id, fileUid, cdUid, comment));
    } else if (itemType === 'reactions') {
      dispatch(selectReaction(id, fileUid, cdUid, comment));
    }
  },
  toggleResin: (itemType, fileUid, cdUid, rId, molId, atomId) => {
    if (itemType === 'molecules') {
      dispatch(toggleMoleculeResin(fileUid, cdUid, molId, atomId));
    } else if (itemType === 'reactions') {
      dispatch(toggleResinInReaction(fileUid, cdUid, rId, molId, atomId));
    }
  }
});

ScannedItemsContainer.propTypes = {
  display: PropTypes.string.isRequired
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ScannedItemsContainer);
