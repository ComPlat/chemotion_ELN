import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

export default function PanelCollapseButton({ indented, isCollapsed, onClick }) {
  return (
    <Button
      className={`panel-collapse-button${indented ? ' panel-collapse-button--indented' : ''}`}
      onClick={onClick}
      variant="sidebar"
    >
      <i className={`text-primary fa fa-angle-double-${isCollapsed ? 'right' : 'left'}`} />
    </Button>
  );
}

PanelCollapseButton.propTypes = {
  indented: PropTypes.bool,
  isCollapsed: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
};

PanelCollapseButton.defaultProps = {
  indented: false,
};
