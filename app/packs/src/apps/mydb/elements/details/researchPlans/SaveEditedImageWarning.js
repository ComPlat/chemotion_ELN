import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

function SaveEditedImageWarning({ visible, warningStyle, warningMessage }) {
  if (!visible) {
    return null;
  }

  return (
    <div className={warningStyle}>
      <Alert>{warningMessage}</Alert>
    </div>
  );
}

SaveEditedImageWarning.propTypes = {
  visible: PropTypes.bool.isRequired,
  warningStyle: PropTypes.string,
  warningMessage: PropTypes.string
};

SaveEditedImageWarning.defaultProps = {
  warningStyle: 'imageEditedWarning',
  warningMessage: 'Image was edited. Please save Element to apply changes.'
};

export default SaveEditedImageWarning;
