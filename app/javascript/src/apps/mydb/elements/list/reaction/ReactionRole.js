import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

function ReactionRole({ element }) {
  if (element.type !== 'reaction') {
    return null;
  }

  let tooltip;
  let iconClasses;
  switch (element.role) {
    case 'gp':
      tooltip = 'General Procedure';
      iconClasses = 'fa-home c-bs-primary';
      break;

    case 'parts':
      tooltip = 'Parts of General Procedure';
      iconClasses = 'fa-bookmark c-bs-success';
      break;

    case 'single':
      tooltip = 'Single';
      iconClasses = 'fa-asterisk c-bs-danger';
      break;

    default:
      return null;
  }

  return (
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id={`roleTp-${element.id}`}>
          {tooltip}
        </Tooltip>
      )}
    >
      <i className={`fa ${iconClasses}`} />
    </OverlayTrigger>
  );
}

ReactionRole.propTypes = {
  element: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    type: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
};

export default ReactionRole;
