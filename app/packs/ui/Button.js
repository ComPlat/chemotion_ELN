import React from 'react';
import PropTypes from 'prop-types';

function Button(props) {
  const {
    variant, children, option, square, type, onClick
  } = props;

  const btnClassNames = [
    'btn-common',
    `btn-${variant}`,
    `btn-${option}`,
    square ? 'btn-square' : ''
  ].join(' ');

  return (
    <button
      // eslint-disable-next-line react/button-has-type
      type={type}
      className={btnClassNames}
      onClick={onClick}
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
  type: PropTypes.oneOf(['submit', 'reset', 'button']),
};

Button.defaultProps = {
  variant: 'primary',
  option: 'main',
  onClick: () => {},
  children: null,
  square: false,
  type: 'button',
};

export default Button;
