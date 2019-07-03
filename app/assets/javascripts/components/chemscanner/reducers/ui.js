import { Map } from 'immutable';
import * as types from '../actions/ActionTypes';

const defaultState = Map({
  abbView: false,
  loading: false,
  notification: '',
});

export default function images(state = defaultState, action) {
  switch (action.type) {
    case types.TOGGLE_ABB_VIEW: {
      const abbView = state.get('abbView');
      return state.set('abbView', !abbView);
    }
    case types.SET_LOADING: {
      return state.set('loading', true);
    }
    case types.UNSET_LOADING: {
      return state.set('loading', false);
    }
    case types.SET_NOTIFICATION: {
      return state.set('notification', action.notification);
    }
    case types.RESET_NOTIFICATION: {
      return state.set('notification', '');
    }
    default:
      return state;
  }
}
