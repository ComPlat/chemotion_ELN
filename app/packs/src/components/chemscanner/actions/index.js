import { combineReducers } from 'redux';
import files from './files';
import chemdrawItems from './chemdrawItems';
import images from './images';

export default combineReducers({
  files,
  chemdrawItems,
  images
});
