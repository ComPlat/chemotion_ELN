import { combineReducers } from 'redux-immutable';

import files from 'src/apps/chemscanner/reducers/files';
import reactions from 'src/apps/chemscanner/reducers/reactions';
import molecules from 'src/apps/chemscanner/reducers/molecules';
import chemdrawInstance from 'src/apps/chemscanner/reducers/chemdrawInstance';
import ui from 'src/apps/chemscanner/reducers/ui';

export default combineReducers({
  ui,
  chemdrawInstance,
  files,
  reactions,
  molecules,
});
