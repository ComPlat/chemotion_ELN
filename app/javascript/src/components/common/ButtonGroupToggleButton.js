import React from 'react';
import { Button } from 'react-bootstrap';

const ButtonGroupToggleButton = ({active, className, children, disabled, ...props}) => {
  return (
    <Button
      variant="light"
      active={active}
      className={['button-group-toggle-button', className].join(' ')}
      disabled={disabled}
      {...props}
    >
      {children}
    </Button>
  );
}

export default ButtonGroupToggleButton;
