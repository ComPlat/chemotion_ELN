import React from 'react';
import PropTypes from 'prop-types';
import ChevronIcon from 'src/components/common/ChevronIcon';
import {
  Button, OverlayTrigger, Tooltip
} from 'react-bootstrap';

export default function SidebarButton({
  isCollapsed, onClick, label, icon, appendComponent, active, expandable, isExpanded, onToggleExpansion
}) {
  const toggleExpansion = (e) => {
    e.stopPropagation();
    onToggleExpansion();
  };

  return isCollapsed ? (
    <OverlayTrigger
      placement={isCollapsed ? 'right' : 'top'}
      overlay={<Tooltip>{label}</Tooltip>}
    >
      <Button
        className="sidebar-button"
        variant="sidebar"
        onClick={onClick}
        active={active}
      >
        <i className={`mx-auto fa fa-fw ${icon}`} />
      </Button>
    </OverlayTrigger>
  ) : (
    <Button
      className={`sidebar-button gap-2${expandable ? ' sidebar-button--expandable' : ''}`}
      variant="sidebar"
      onClick={onClick}
      active={active}
    >
      <span className="d-flex gap-2 align-items-center flex-grow-1">
        <i className={`type-icon fa-fw ${icon}`} />
        {expandable && (
          <ChevronIcon
            direction={isExpanded ? 'down' : 'right'}
            onClick={toggleExpansion}
            className="expand-icon"
          />
        )}
        <span>{label}</span>
      </span>
      {appendComponent}
    </Button>
  );
}

SidebarButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  isCollapsed: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  appendComponent: PropTypes.node,
  active: PropTypes.bool,
  expandable: PropTypes.bool,
  isExpanded: PropTypes.bool,
  onToggleExpansion: PropTypes.func,
};

SidebarButton.defaultProps = {
  isCollapsed: true,
  appendComponent: null,
  active: false,
  expandable: false,
  isExpanded: false,
  onToggleExpansion: () => { }
};
