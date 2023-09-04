import React from 'react';
import PropTypes from 'prop-types';

function Button(props) {
  const {
    variant, children, size, square, type, onClick, tooltip, tooltipPosition, ...otherProps
  } = props;

  const btnClassNames = [
    'btn-common',
    `btn-${variant}`,
    `btn-${size}`,
    square ? 'btn-square' : ''
  ].join(' ');

  return (
    <div className="btn-wrapper">

      <button
      // eslint-disable-next-line react/button-has-type
        type={type}
        className={btnClassNames}
        onClick={onClick}
        {...otherProps}
      >
        {children}
      </button>
      {tooltip && <span className={`tooltip tooltip-${tooltipPosition}`}>{tooltip}</span>}
    </div>

  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary']),
  size: PropTypes.oneOf(['xLarge', 'large', 'medium', 'small']),
  children: PropTypes.node,
  onClick: PropTypes.func,
  square: PropTypes.bool, // this will make the width=height for buttons that only have icons
  type: PropTypes.oneOf(['submit', 'reset', 'button']),
  tooltip: PropTypes.string,
  tooltipPosition: PropTypes.oneOf(['top', 'bottom', 'left', 'right']),
};

Button.defaultProps = {
  variant: 'primary',
  size: 'medium',
  onClick: () => {},
  children: null,
  square: false,
  type: 'button',
  tooltip: null,
  tooltipPosition: 'top',
};

export default Button;
