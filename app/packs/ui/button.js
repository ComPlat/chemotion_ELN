import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Button as BootstrapButton } from 'react-bootstrap';

function stateColorsForVariant(variant) {
  const colors = {
    primary: { hover: '#0056b3', active: '#004499' },
    secondary: { hover: '#5a6268', active: '#494e53' },
    success: { hover: '#218838', active: '#1e7e34' },
    danger: { hover: '#c82333', active: '#bd2130' },
    warning: { hover: '#e0a800', active: '#d39e00' },
    info: { hover: '#138496', active: '#0f6674' },
    light: { hover: '#e2e6ea', active: '#dae0e5' },
    dark: { hover: '#23272b', active: '#1d2124' },
    link: { hover: '#0056b3', active: '#004499' },
  };

  return colors[variant] || {};
}

const style = {
  // Options
  mainBtn: {
    borderRadius: '8px',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
    width: '35px',
    height: '35px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    color: '#FFFFFF',
    marginRight: '10px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  modalBtn: {
    borderRadius: '8px',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
    height: '40px',
    minWidth: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  panelIcon: {
    borderRadius: '4px',
    fontWeight: '500',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
    width: '30px',
    height: '30px',
    marginRight: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  groupIcon: {
    borderRadius: '4px',
    fontWeight: '500',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
    minWidth: '30px',
    height: '30px',
    marginRight: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  popoverBtn: {
    marginTop: '5px',
    textAlign: 'center',
    minWidth: '35px',
    height: '25px',
    borderRadius: '4px',
    fontWeight: 'Bold',
    boxShadow: '0px 2px 10px rgba(0,0,0,0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Variants
  primary: { backgroundColor: '#3498DB', color: '#FFFFFF' },
  secondary: { backgroundColor: '#95A5A6', color: '#FFFFFF' },
  success: { backgroundColor: '#2ECC71', color: '#FFFFFF' },
  danger: { backgroundColor: '#E74C3C', color: '#FFFFFF' },
  warning: { backgroundColor: '#F39C12', color: '#FFFFFF' },
  info: { backgroundColor: '#2980B9', color: '#FFFFFF' },
  light: { backgroundColor: '#ECF0F1', color: '#2C3E50' },
  dark: { backgroundColor: '#2C3E50', color: '#FFFFFF' },
  link: { backgroundColor: 'transparent', color: '#3498DB' }
};

function Button(props) {
  const {
    variant, children, option, style: userStyle, ...otherProps
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  // Use the selected option or an empty object if not found
  const variantStyle = style[variant] || {};
  const commonStyle = style[option] || {};

  // Dynamic hover and active styles:
  const colors = stateColorsForVariant(variant);
  const hoverStyles = isHovered ? { backgroundColor: colors.hover } : {};
  const activeStyles = isActive ? { backgroundColor: colors.active } : {};

  const btnStyle = {
    ...variantStyle,
    ...commonStyle,
    ...(style[variant] || {}),
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
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'danger', 'warning', 'info', 'light', 'dark', 'link']),
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
