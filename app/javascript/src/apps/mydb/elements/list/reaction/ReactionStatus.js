import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

function ReactionStatus({ element }) {
  if (element.type !== 'reaction' || !element.status) {
    return null;
  }

  let icon;
  switch (element.status) {
    case 'Planned':
      icon = (<i className="fa fa-clock-o c-bs-warning" />);
      break;
    case 'Running': {
      icon = (
        <span
          style={{ width: '12px', height: '14px', lineHeight: '14px' }}
          className="fa fa-stack"
        >
          <i className="fa fa-stack-1x fa-hourglass-1 running-1 c-bs-warning" />
          <i className="fa fa-stack-1x fa-hourglass-2 running-2 c-bs-warning" />
          <i className="fa fa-stack-1x fa-hourglass-3 running-3 c-bs-warning" />
        </span>
      );
      break;
    }
    case 'Done':
      icon = (<i className="fa fa-hourglass-3 c-bs-primary" />);
      break;
    case 'Analyses Pending':
      icon = (<i className="fa fa-ellipsis-h c-bs-primary" />);
      break;
    case 'Successful':
      icon = (<i className="fa fa-check-circle-o c-bs-success" />);
      break;
    case 'Not Successful':
      icon = (<i className="fa fa-times-circle-o c-bs-danger" />);
      break;
    default:
      return null;
  }

  return (
    <OverlayTrigger
      placement="top"
      overlay={(
        <Tooltip id={`reaction_status_${element.status}`}>
          {`${element.status} Reaction`}
        </Tooltip>
      )}
    >
      {icon}
    </OverlayTrigger>
  );
}

ReactionStatus.propTypes = {
  element: PropTypes.shape({
    type: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

export default ReactionStatus;
