import * as types from 'src/components/chemscanner/actions/ActionTypes';

const chemdrawInstance = (state = null, action) => {
  if (action.type === types.SET_CDD_INSTANCE) {
    return action.cdd;
  }

  return state;
};

export default chemdrawInstance;
