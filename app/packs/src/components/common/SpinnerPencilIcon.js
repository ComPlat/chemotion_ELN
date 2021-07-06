import React from 'react';
import PropTypes from 'prop-types';

const SpinnerPencilIcon = ({ spinningLock }) => (
  <span>
    {spinningLock ? <i className="fa fa-spin fa-spinner" /> : null}
    <i className="fa fa-pencil" />
  </span>
);

SpinnerPencilIcon.propTypes = {
  spinningLock: PropTypes.bool
};

SpinnerPencilIcon.defaultProps = {
  spinningLock: false
};

export default SpinnerPencilIcon;
