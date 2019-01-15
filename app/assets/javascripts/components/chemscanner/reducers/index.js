import { combineReducers } from 'redux-immutable';

import files from './files';
import reactions from './reactions';
import molecules from './molecules';
import chemdrawInstance from './chemdrawInstance';
import ui from './ui';

export default combineReducers({
  ui,
  chemdrawInstance,
  files,
  reactions,
  molecules,
});
