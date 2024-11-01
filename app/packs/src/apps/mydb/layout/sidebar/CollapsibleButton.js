import React from 'react';
import { Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function CollapsibleButton({ isCollapsed, onClick, label, icon, variant }) {
  return isCollapsed ? (
    <OverlayTrigger
      placement="right"
      overlay={<Tooltip>{label}</Tooltip>}
    >
      <Button
        className="text-start"
        variant={variant}
        onClick={onClick}
      >
        <i className={`fa ${icon}`} />
      </Button>
    </OverlayTrigger>
  ) : (
    <Button
      className="text-start"
      variant={variant}
      onClick={onClick}
    >
      <i className={`fa ${icon} me-2`} />
      {label}
    </Button>
  );
}

