import { combineReducers } from 'redux';
import files from 'src/apps/chemscanner/actions/files';
import chemdrawItems from 'src/apps/chemscanner/actions/chemdrawItems';
import images from 'src/apps/chemscanner/actions/images';

export default combineReducers({
  files,
  chemdrawItems,
  images
});
