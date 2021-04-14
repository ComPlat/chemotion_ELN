
import { List } from 'immutable';

import * as types from '../actions/ActionTypes';

export default function files(state = List(), action) {
  switch (action.type) {
    case types.SCAN_FILE_FOR_MOLECULES:
    case types.SCAN_FILE_FOR_REACTIONS: {
      const { response } = action;
      if (!response) return state;

      return state.concat(response.get('files') || []);
    }
    case types.REMOVE_FILE: {
      const { fileUid } = action;
      return state.filterNot(m => m.get('uid') === fileUid);
    }
    default:
      return state;
  }
}
