import React from 'react';

import { Badge } from 'react-bootstrap';

export function ShowUserLabels() {
  return (
    <span className="d-inline-flex align-items-center gap-1 ms-1">
      <Badge bg="info">Priority</Badge>
      <Badge bg="dark">Shared</Badge>
    </span>
  );
}

export default {};
