import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';
import ElementStore from 'src/stores/alt/stores/ElementStore';

function ReactionStatus({ element }) {
  if (element.type !== 'reaction' || !element.status) {
    return null;
  }

  let icon;
  const isSelected = ElementStore.getState().currentElement?.id === element.id;
  switch (element.status) {
    case 'Planned':
      icon = (<i className="fa fa-clock-o text-warning" />);
      break;
    case 'Running': {
      icon = (
        <span
          style={{ width: '12px', height: '14px', lineHeight: '14px' }}
          className="fa fa-stack"
        >
          <i className="fa fa-stack-1x fa-hourglass-1 running-1 text-warning" />
          <i className="fa fa-stack-1x fa-hourglass-2 running-2 text-warning" />
          <i className="fa fa-stack-1x fa-hourglass-3 running-3 text-warning" />
        </span>
      );
      break;
    }
    case 'Done':
      icon = (<i className={`fa fa-hourglass-3 ${isSelected ? 'text-white' : 'text-primary'}`} />);
      break;
    case 'Analyses Pending':
      icon = (<i className={`fa fa-ellipsis-h ${isSelected ? 'text-white' : 'text-primary'}`} />);
      break;
    case 'Successful':
      icon = (<i className="fa fa-check-circle-o text-success" />);
      break;
    case 'Not Successful':
      icon = (<i className="fa fa-times-circle-o text-danger" />);
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
    id: PropTypes.number,
    type: PropTypes.string,
    status: PropTypes.string,
  }).isRequired,
};

export default ReactionStatus;
