import React from 'react';
import PropTypes from 'prop-types';

export default function ColorLabel({ color, label }) {
  return (
    <div className="d-flex align-items-stretch">
      <div className="me-2 rounded" style={{ backgroundColor: color, width: '1.5rem' }} />
      {label}
    </div>
  );
}

ColorLabel.propTypes = {
  color: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
};
