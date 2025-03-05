import React from 'react';
import PropTypes from 'prop-types';
import {
  Badge, Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';

export default function SidebarButton({
  isCollapsed, onClick, label, icon, variant,
  badgeCount, appendComponent,
}) {
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
        {badgeCount !== null && badgeCount > 0 && (
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
      className="sidebar-button text-start gap-3"
      variant={variant}
      onClick={onClick}
    >
      <i className={icon} />
      <span>{label}</span>
      {appendComponent}
    </Button>
  );
}

SidebarButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  variant: PropTypes.string,
  badgeCount: PropTypes.number,
  appendComponent: PropTypes.node,
};

SidebarButton.defaultProps = {
  isCollapsed: true,
  variant: 'paper',
  badgeCount: null,
  appendComponent: null,
};
