import React from 'react';
import PropTypes from 'prop-types';
import {
  Badge, Button
} from 'react-bootstrap';

export default function NotificationButton({
  onClick, label, icon, badgeCount, active
}) {
  const hasBadge = badgeCount !== null && badgeCount > 0;

  return (
    <Button
      className="notification-button gap-2"
      variant="topbar"
      onClick={onClick}
      active={active}
    >
      <span className="d-flex gap-1 align-items-center flex-grow-1">
        <i className={`fa fa-fw ${icon}`} />
        <span>{label}</span>
        {hasBadge && (
          <Badge
            pill
            bg="warning"
          >
            {badgeCount}
          </Badge>
        )}
      </span>
    </Button>
  );
}

NotificationButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  onClick: PropTypes.func.isRequired,
  badgeCount: PropTypes.number,
  active: PropTypes.bool,
};

NotificationButton.defaultProps = {
  badgeCount: 0,
  active: false,
};
