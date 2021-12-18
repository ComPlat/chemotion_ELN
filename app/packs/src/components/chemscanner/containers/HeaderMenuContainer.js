import React from 'react';
import { connect } from 'react-redux';

import { scanFile, updateReagents } from '../actions/fileActions';
import { saveImage } from '../actions/storedFileActions';
import { changeView } from '../actions/uiActions';
import * as types from '../actions/ActionTypes';
import HeaderMenu from '../components/HeaderMenu';

const HeaderMenuContainer = props => <HeaderMenu {...props} />;

const mapStateToProps = state => ({
  reactions: state.get('reactions'),
  molecules: state.get('molecules'),
});

const mapDispatchToProps = dispatch => ({
  scanFile: (files, getMol) => {
    dispatch({ type: types.SET_LOADING });

    return dispatch(scanFile(files, getMol)).then((action) => {
      dispatch({ type: types.UNSET_LOADING });

      const scannedSchemes = action.response.get('schemes');
      if (!scannedSchemes || scannedSchemes.size === 0) return;

      const imageList = scannedSchemes.reduce((arr, scheme) => {
        const imageData = scheme.get('pictureData');
        if (!imageData) return arr;

        const id = scheme.get('id');
        if (imageData.length === 0 || !id) return arr;

        const isSaved = scheme.get('isSaved') || false;
        if (isSaved) return arr;

        const uuid = scheme.get('uuid');
        arr.push({ id, fileUuid: uuid, imageData });
        return arr;
      }, []);

      if (imageList.length === 0) return;

      saveImage(imageList);
    });
  },
  cleanUp: () => (
    new Promise((resolve) => {
      dispatch({ type: types.SET_LOADING });
      resolve();
    }).then(() => dispatch({
      type: types.CLEAN_UP
    })).then(() => dispatch({
      type: types.UNSET_LOADING
    }))
  ),
  showNotification: notification => dispatch({
    type: types.SET_NOTIFICATION, notification
  }),
  resetNotification: () => dispatch({ type: types.RESET_NOTIFICATION }),
  changeScannedFileView: () => dispatch(changeView(types.VIEW_SCANNED_FILES)),
  changeAbbreviationView: () => dispatch(changeView(types.VIEW_ABBREVIATION)),
  changeFileStorageView: () => dispatch(changeView(types.VIEW_FILE_STORAGE)),
  changeArchivedManagementView: () => dispatch(changeView(types.VIEW_ARCHIVED_MANAGEMENT)),
  updateReagents: (reactionId, updateInfo) => {
    if (reactionId === 0) return;

    dispatch(updateReagents(reactionId, updateInfo));
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HeaderMenuContainer);
