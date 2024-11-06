import React from 'react';
import PropTypes from 'prop-types';

function ColoredOverlay({ color }) {
  return (
    <div
      className="position-absolute top-0 start-0 w-100 h-100 opacity-50"
      style={{ backgroundColor: color }}
    />
  );
}

ColoredOverlay.defaultProps = {
  color: 'green',
};

ColoredOverlay.propTypes = {
  color: PropTypes.string,
};

export default ColoredOverlay;
