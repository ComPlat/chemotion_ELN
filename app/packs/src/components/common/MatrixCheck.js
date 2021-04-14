import PropTypes from 'prop-types';
import UIStore from '../stores/UIStore';

const UserMatrixCheck = (matrix = 0, id = 0) => {
  if (matrix <= 0 || id <= 0) {
    return false;
  }
  const CONFIG_ID = id;
  // eslint-disable-next-line radix
  const cx = parseInt(matrix).toString(2).slice(0, -1);
  const onFlag = cx && cx.length > 0 && cx.length >= CONFIG_ID ? cx[cx.length - CONFIG_ID] : 0;
  if (onFlag > 0) {
    return true;
  }
  return false;
};

const MatrixCheck = (matrix = 0, name = '') => {
  const { matrices } = UIStore.getState();
  if (typeof matrices === 'undefined' || matrices === null) {
    return false;
  }

  const CONFIG_ID = matrices[name] || 0;
  return UserMatrixCheck(matrix, CONFIG_ID);
};

MatrixCheck.propTypes = {
  matrix: PropTypes.number.isRequired,
  name: PropTypes.string.isRequired
};

export default MatrixCheck;
