/* eslint object-curly-newline: "off" */
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button as BootstrapButton } from 'react-bootstrap';

const stateColorsForVariant = (variant) => ({
  primary: { hover: '#2E86C1', active: '#2471A3' },
  secondary: { hover: '#7F8C8D', active: '#707B7C' },
  tertiary: { hover: '#2E86C1', active: '#2471A3' }
}[variant] || {});

const commonStyles = {
  borderRadius: '6px',
  boxShadow: '0px 1px 10px rgba(0,0,0,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  fontWeight: '550',
};

// Options
const optionStyles = (option) => ({
  mainBtn: { width: '35px', height: '35px', fontSize: '16px', marginRight: '10px' },
  panelIcon: { width: '30px', height: '30px', marginRight: '10px' },
  groupIcon: { minWidth: '30px', height: '30px', marginRight: '5px' },
  modalBtn: { minWidth: '40px', height: '40px' },
  popoverBtn: { minWidth: '35px', height: '25px', marginTop: '6px' }
}[option] || {});

// Variants
const variantStyles = (variant) => ({
  primary: { backgroundColor: '#3498DB', color: '#FFFFFF' },
  secondary: { backgroundColor: '#95A5A6', color: '#FFFFFF' },
  tertiary: { backgroundColor: 'transparent', color: '#3498DB', textDecoration: 'none' }
}[variant] || {});

function Button(props) {
  const { variant, children, option, style: userStyle, ...otherProps } = props;

  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Dynamic hover and active states:
  const colors = stateColorsForVariant(variant);
  const hoverStyles = isHovered ? { backgroundColor: colors.hover } : {};
  const activeStyles = isActive ? { backgroundColor: colors.active } : {};

  const btnStyle = {
    ...commonStyles,
    ...optionStyles(option),
    ...variantStyles(variant),
    ...userStyle,
    ...hoverStyles,
    ...activeStyles,
  };

  return (
    <BootstrapButton
      style={btnStyle}
      variant={variant}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      {...otherProps}
    >
      {children}
    </BootstrapButton>
  );
}

Button.propTypes = {
  variant: PropTypes.oneOf(['primary', 'secondary', 'tertiary']),
  option: PropTypes.oneOf(['mainBtn', 'modalBtn', 'panelIcon', 'groupIcon', 'popoverBtn']),
  children: PropTypes.node,
  onClick: PropTypes.func,
  style: PropTypes.shape({ [PropTypes.string]: PropTypes.oneOfType([PropTypes.string, PropTypes.number]) })
};

Button.defaultProps = {
  variant: 'primary',
  option: 'mainBtn',
  onClick: () => {},
  style: {},
  children: null
};

export default Button;
