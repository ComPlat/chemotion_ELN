import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

function SaveEditedImageWarning({ visible, warningMessage }) {
  if (!visible) {
    return null;
  }

  return (
    <div>
      <Alert variant="warning" className="fw-bold">{warningMessage}</Alert>
    </div>
  );
}

SaveEditedImageWarning.propTypes = {
  visible: PropTypes.bool.isRequired,
  warningMessage: PropTypes.string
};

SaveEditedImageWarning.defaultProps = {
  warningMessage: 'Image was edited. Please save Element to apply changes.'
};

export default SaveEditedImageWarning;
