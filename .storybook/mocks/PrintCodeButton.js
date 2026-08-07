import React from 'react';
import { Button } from 'react-bootstrap';

export default function PrintCodeButton() {
  return (
    <Button size="sm" variant="secondary" disabled>
      <i className="fa fa-barcode" />
    </Button>
  );
}
