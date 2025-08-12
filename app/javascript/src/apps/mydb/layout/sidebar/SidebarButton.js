import React from 'react';
import PropTypes from 'prop-types';
import ChevronIcon from 'src/components/common/ChevronIcon';
import {
  Badge, Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';

export default function SidebarButton({
  isCollapsed, onClick, label, icon, variant,
  badgeCount, appendComponent, active, showLabel, expandable
}) {
  const hasBadge = badgeCount !== null && badgeCount > 0;

  const toggleExpansion = () => {
    // do something
  };
  return isCollapsed || !showLabel ? (
    <OverlayTrigger
      placement={isCollapsed ? 'right' : 'top'}
      overlay={<Tooltip>{label}</Tooltip>}
    >
      <Button
        className={`sidebar-button position-relative${hasBadge ? ' sidebar-button--has-badge' : ''}`}
        variant={variant}
        onClick={onClick}
        active={active}
      >
        <i className={`mx-auto fa fa-fw ${icon}`} />
        {hasBadge && (
          <Badge
            pill
            bg="warning"
            className="sidebar-button__badge"
          >
            {badgeCount}
          </Badge>
        )}
      </Button>
    </OverlayTrigger>
  ) : (
    <Button
      className={`sidebar-button gap-2 ${expandable ? 'sidebar-button--expandable' : ''}`}
      variant={variant}
      onClick={onClick}
      active={active}
    >
      <span className="d-flex gap-2 align-items-center flex-grow-1">
        <i className={`type-icon fa-fw ${icon}`} />
        {expandable && (
          <ChevronIcon
            direction={active ? 'down' : 'right'}
            onClick={toggleExpansion}
            className="expand-icon"
          />
        )}
        <span>{label}</span>
      </span>
      {appendComponent && (
        <div onClick={(e) => e.stopPropagation()}>{appendComponent}</div>
      )}
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
  active: PropTypes.bool,
  showLabel: PropTypes.bool,
  expandable: PropTypes.bool
};

SidebarButton.defaultProps = {
  isCollapsed: true,
  variant: 'sidebar',
  badgeCount: null,
  appendComponent: null,
  active: false,
  showLabel: true,
  expandable: false
};
