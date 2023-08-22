import React from 'react';
import PropTypes from 'prop-types';

function Button(props) {
  const {
    variant, children, option, square, ...otherProps
  } = props;

  const btnClassNames = [
    'btn-common',
    `btn-${variant}`,
    `btn-${option}`,
    square ? 'btn-square' : ''
  ].join(' ');

  return (
    <button
      className={btnClassNames}
      {...otherProps}
    >
      {children}
    </button>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary']),
  option: PropTypes.oneOf(['main', 'panel', 'modal', 'popover']),
  children: PropTypes.node,
  onClick: PropTypes.func,
  square: PropTypes.bool,
};

Button.defaultProps = {
  variant: 'primary',
  option: 'main',
  onClick: () => {},
  children: null,
  square: false,
};

export default Button;
