import React from 'react';
import { Button } from 'react-bootstrap';

export default function PanelCollapseButton({ isCollapsed, onClick }) {
  return(
    <Button
      className="panel-collapse-button"
      onClick={onClick}
      variant="secondary"
    >
      <i className={`fa fa-angle-double-${isCollapsed ? 'right' : 'left'}`} />
    </Button>
  );
}
