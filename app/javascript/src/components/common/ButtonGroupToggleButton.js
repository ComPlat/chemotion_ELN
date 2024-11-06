import React from 'react';
import { Button } from 'react-bootstrap';

const ButtonGroupToggleButton = ({active, className, children, ...props}) => {
  return (
    <Button
      variant={active ? "info": "light"}
      className={['button-group-toggle-button', className].join(' ')}
      disabled={active}
      {...props}
    >
      {children}
    </Button>
  );
}

export default ButtonGroupToggleButton;