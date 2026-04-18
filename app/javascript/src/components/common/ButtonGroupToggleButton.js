import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'react-bootstrap';

const ButtonGroupToggleButton = React.forwardRef(({
  active,
  className,
  children,
  ...buttonProps
}, ref) => React.createElement(
  Button,
  {
    ...buttonProps,
    ref,
    variant: 'light',
    active,
    className: ['button-group-toggle-button', className].join(' '),
  },
  children,
));

ButtonGroupToggleButton.displayName = 'ButtonGroupToggleButton';

ButtonGroupToggleButton.propTypes = {
  active: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};

ButtonGroupToggleButton.defaultProps = {
  active: false,
  className: '',
};

export default ButtonGroupToggleButton;
