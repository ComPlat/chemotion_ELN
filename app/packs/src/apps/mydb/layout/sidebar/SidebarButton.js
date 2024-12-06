import React from 'react';
import PropTypes from 'prop-types';
import { Badge, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function SidebarButton({ isCollapsed, onClick, label, icon, variant,
  badgeCount, }) {
  return isCollapsed ? (
    <OverlayTrigger
      placement="right"
      overlay={<Tooltip>{label}</Tooltip>}
    >
      <Button
        className="sidebar-button text-start position-relative"
        variant={variant}
        onClick={onClick}
      >
        <i className={`fa fa-fw ${icon}`} />
        {badgeCount > 0 && (
          <Badge
            pill
            bg="warning"
            text={variant}
            className="position-absolute top-100 start-100 translate-middle"
          >
            {badgeCount}
          </Badge>
        )}
      </Button>
    </OverlayTrigger>
  ) : (
    <Button
      className="sidebar-button text-start"
      variant={variant}
      onClick={onClick}
    >
      <i className={`fa ${icon} me-3`} />
      <span>{label}</span>
    </Button>
  );
}

SidebarButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string,
  isCollapsed: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.string.isRequired,
};

SidebarButton.defaultProps = {
  isCollapsed: true,
};

