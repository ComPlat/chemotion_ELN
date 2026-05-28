import React from 'react';
import { Button } from 'react-bootstrap';

export default function OpenCalendarButton() {
  return (
    <Button size="sm" variant="secondary" disabled>
      <i className="fa fa-calendar" />
    </Button>
  );
}
