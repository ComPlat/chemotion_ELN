import React, { forwardRef } from 'react';
import RSelect from 'react-select';
import RAsyncSelect from 'react-select/async';
import RCreatableSelect from 'react-select/creatable';

/* eslint-disable react/jsx-props-no-spreading */

// deactivate the default styling and apply custom class names to enable bootstrap styling
// see https://react-select.com/styles#the-unstyled-prop
// see https://react-select.com/styles#the-classnameprefix-prop

export const Select = forwardRef(function Select(props, ref) {
  return (
    <RSelect
      className={["chemotion-select", props.className].join(' ')}
      classNamePrefix="chemotion-select"
      ref={ref}
      unstyled
      {...props}
      styles={{
        control: (baseStyles) => ({
          ...baseStyles,
          minWidth: props.minWidth || '0',
        }),
        menuList: (baseStyles, state) => ({
          ...baseStyles,
          maxHeight: props.maxHeight || "250px",
        }),
      }}
    />
  );
});

export const AsyncSelect = ({ className, ...props }) => (
  <RAsyncSelect
    className={["chemotion-select", className].join(' ')}
    classNamePrefix="chemotion-select"
    unstyled
    {...props}
  />
);

export const CreatableSelect = ({ className, ...props }) => (
  <RCreatableSelect
    className={["chemotion-select", className].join(' ')}
    classNamePrefix="chemotion-select"
    unstyled
    {...props}
  />
);
