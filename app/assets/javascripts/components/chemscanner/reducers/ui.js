import { Map } from 'immutable';
import * as types from '../actions/ActionTypes';

export default function images(state = Map({ abbView: false }), action) {
  switch (action.type) {
    case types.TOGGLE_ABB_VIEW: {
      const abbView = state.get('abbView');
      return state.set('abbView', !abbView);
    }
    default:
      return state;
  }
}
