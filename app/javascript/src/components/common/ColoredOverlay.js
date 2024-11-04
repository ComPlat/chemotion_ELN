import React from 'react';
import PropTypes from 'prop-types';

function ColoredOverlay({ color }) {
  console.log('Rendering ColoredOverlay');
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: color,
        opacity: 0.5,
      }}
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
