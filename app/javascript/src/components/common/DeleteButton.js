import React from 'react';
import { Button } from 'react-bootstrap';

/* eslint-disable react/jsx-props-no-spreading */

function DeleteButton({ ...props }) {
  return (
    <Button
      variant="danger"
      size="sm"
      className="delete-button"
      {...props}
    >
      <i className="fa fa-trash" />
    </Button>
  );
}

export default DeleteButton;
