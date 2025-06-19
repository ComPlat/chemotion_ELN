import React, { forwardRef } from 'react';
import RSelect from 'react-select';
import RAsyncSelect from 'react-select/async';
import RCreatableSelect from 'react-select/creatable';

/* eslint-disable react/jsx-props-no-spreading */

// deactivate the default styling and apply custom class names to enable bootstrap styling
// see https://react-select.com/styles#the-unstyled-prop
// see https://react-select.com/styles#the-classnameprefix-prop

const baseClassName = 'chemotion-select';

function getSelectClassName(className, size) {
  return [
    baseClassName,
    size ? `form-select-${size}` : null,
    className
  ].filter(Boolean).join(' ');
}

function getSelectStyles(minWidth, maxHeight, styles = {}) {
  return {
    ...styles,
    control: (base, state) => ({
      ...(styles.control ? styles.control(base, state) : base),
      minWidth: minWidth || '0',
    }),
    menuList: (base, state) => ({
      ...(styles.menuList ? styles.menuList(base, state) : base),
      maxHeight: maxHeight || '250px',
    }),
  };
}

export const Select = forwardRef(function Select({ size, minWidth, maxHeight, className, styles, ...props }, ref) {
  return (
    <RSelect
      className={getSelectClassName(className, size)}
      classNamePrefix={baseClassName}
      ref={ref}
      unstyled
      {...props}
      styles={getSelectStyles(minWidth, maxHeight, styles)}
    />
  );
});

export const AsyncSelect = ({ size, minWidth, maxHeight, className, styles, ...props }) => (
  <RAsyncSelect
    className={getSelectClassName(className, size)}
    classNamePrefix={baseClassName}
    unstyled
    {...props}
    styles={getSelectStyles(minWidth, maxHeight, styles)}
  />
);

export const CreatableSelect = ({ size, minWidth, maxHeight, className, styles, ...props }) => (
  <RCreatableSelect
    className={getSelectClassName(className, size)}
    classNamePrefix={baseClassName}
    unstyled
    {...props}
    styles={getSelectStyles(minWidth, maxHeight, styles)}
  />
);
