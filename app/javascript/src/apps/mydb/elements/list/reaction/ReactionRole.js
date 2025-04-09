import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

function ReactionRole({ element }) {
  if (element.type !== 'reaction') {
    return null;
  }

  let tooltip = null;
  switch (element.role) {
    case 'gp':
      tooltip = <Tooltip id="roleTp">General Procedure</Tooltip>;
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <i className="fa fa-home c-bs-primary me-1" />
        </OverlayTrigger>
      );
    case 'parts':
      tooltip = <Tooltip id="roleTp">Parts of General Procedure</Tooltip>;
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <i className="fa fa-bookmark c-bs-success me-1" />
        </OverlayTrigger>
      );
    case 'single':
      tooltip = <Tooltip id="roleTp">Single</Tooltip>;
      return (
        <OverlayTrigger placement="top" overlay={tooltip}>
          <i className="fa fa-asterisk c-bs-danger me-1" />
        </OverlayTrigger>
      );
    default:
      return null;
  }
}

ReactionRole.propTypes = {
  element: PropTypes.shape({
    type: PropTypes.string,
    role: PropTypes.string,
  }).isRequired,
};

export default ReactionRole;
