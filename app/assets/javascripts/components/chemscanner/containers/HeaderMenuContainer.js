import { pascalize } from 'humps';
import React from 'react';
import { connect } from 'react-redux';

import { scanFile } from '../actions/fileActions';
import * as types from '../actions/ActionTypes';
import HeaderMenu from '../components/HeaderMenu';
import { CALL_API } from '../middleware/api';

import { extractReaction } from '../utils';

const HeaderMenuContainer = props => <HeaderMenu {...props} />;

const mapStateToProps = state => ({
  ui: state.get('ui'),
  reactions: state.get('reactions'),
  molecules: state.get('molecules'),
});

const mapDispatchToProps = dispatch => ({
  scanFile: (files, getMol) => {
    dispatch({ type: types.SET_LOADING });
    dispatch(scanFile(files, getMol)).then(() => dispatch({
      type: types.UNSET_LOADING
    }));
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
  toggleAbbView: () => dispatch({ type: types.TOGGLE_ABB_VIEW }),
  addSmi: (reactions, smi, smiType) => {
    const type = `added${pascalize(smiType)}Smi`;
    const smiArr = smi.split(',');

    const reactionArray = reactions.toJS().map((r) => {
      r[type] = smiArr;
      return extractReaction(r);
    });

    dispatch({
      [CALL_API]: {
        endpoint: '/api/v1/chemscanner/svg/mdl',
        options: {
          credentials: 'same-origin',
          method: 'post',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ molecules: [], reactions: reactionArray })
        }
      },
      type: types.ADD_REAGENTS_SMILES,
      smiType: type,
      smi
    });
  }
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(HeaderMenuContainer);
