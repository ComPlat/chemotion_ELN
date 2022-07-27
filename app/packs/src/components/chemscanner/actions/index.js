import { combineReducers } from 'redux';
import files from 'src/components/chemscanner/actions/files';
import chemdrawItems from 'src/components/chemscanner/actions/chemdrawItems';
import images from 'src/components/chemscanner/actions/images';

export default combineReducers({
  files,
  chemdrawItems,
  images
});
