import React from 'react';
import { Button } from 'react-bootstrap';

/* eslint-disable react/jsx-props-no-spreading */

function CreateButton({ ...props }) {
  return (
    <Button
      variant="success"
      size="xsm"
      className="create-button"
      {...props}
    >
      <i className="fa fa-plus" />
    </Button>
  );
}

export default CreateButton;
