import { combineReducers } from 'redux-immutable';

import files from 'src/components/chemscanner/reducers/files';
import reactions from 'src/components/chemscanner/reducers/reactions';
import molecules from 'src/components/chemscanner/reducers/molecules';
import chemdrawInstance from 'src/components/chemscanner/reducers/chemdrawInstance';
import ui from 'src/components/chemscanner/reducers/ui';

export default combineReducers({
  ui,
  chemdrawInstance,
  files,
  reactions,
  molecules,
});
