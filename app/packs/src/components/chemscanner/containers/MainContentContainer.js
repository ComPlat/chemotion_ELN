import React from 'react';
import { connect } from 'react-redux';

import MainContent from '../components/MainContent';

import { removeFile } from '../actions/fileActions';

import * as types from '../actions/ActionTypes';

import { updateItemField, fetchSvg } from '../actions/storedFileActions';

const MainContentContainer = props => <MainContent {...props} />;

const mapStateToProps = state => ({
  files: state.get('files'),
  schemes: state.get('schemes'),
  reactions: state.get('reactions'),
  molecules: state.get('molecules'),
  editingMoleculeId: state.get('ui').get('editingMoleculeId'),
});

const mapDispatchToProps = dispatch => ({
  dispatch,
  removeFile: ({ fileUid }) => dispatch(removeFile(fileUid)),
  closeEditorModal: () => dispatch({
    type: types.SET_EDITING_MOLECULE_ID, moleculeId: 0
  }),
});

const mergeProps = (stateProps, dispatchProps, ownProps) => ({
  ...stateProps,
  ...dispatchProps,
  ...ownProps,
  saveMoleculeMdl: (mdl) => {
    const { dispatch } = dispatchProps;
    const id = stateProps.editingMoleculeId;

    dispatch({ type: types.SET_LOADING });

    return dispatch(updateItemField(id, 'molecules', 'mdl', mdl)).then(() => {
      dispatch({ type: types.SET_EDITING_MOLECULE_ID, moleculeId: 0 });
    }).then(() => dispatch(fetchSvg([id]))).then(() => {
      dispatch({ type: types.UNSET_LOADING });
    });
  },
});

export default connect(
  mapStateToProps,
  mapDispatchToProps,
  mergeProps
)(MainContentContainer);
