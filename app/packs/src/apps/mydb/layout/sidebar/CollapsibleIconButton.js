import React from 'react';
import { Badge, Button, OverlayTrigger, Tooltip } from 'react-bootstrap';

export default function CollapsibleIconButton({
  isCollapsed,
  onClick,
  label,
  icon,
  variant,
  badgeCount,
}) {
  return (
    <OverlayTrigger
      placement={isCollapsed ? 'right' : 'top'}
      overlay={<Tooltip>{label}</Tooltip>}
    >
      <Button
        className="text-start position-relative"
        variant={variant}
        onClick={onClick}
      >
        <i className={`fa ${icon}`} />
        {badgeCount > 0 && (
          <Badge
            pill
            bg="light"
            text={variant}
            className="position-absolute top-100 start-100 translate-middle"
          >
            {badgeCount}
          </Badge>
        )}
      </Button>
    </OverlayTrigger>
  );
}

