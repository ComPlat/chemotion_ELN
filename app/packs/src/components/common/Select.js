import React from 'react';
import RSelect from 'react-select';
import RAsyncSelect from 'react-select/async';
import RCreatableSelect from 'react-select/creatable';

/* eslint-disable react/jsx-props-no-spreading */

export const Select = ({className, ...props}) => (
  <RSelect
    className={["chemotion-select", className].join(' ')}
    classNamePrefix="chemotion-select"
    unstyled
    {...props}
  />
);

export const AsyncSelect = ({className, ...props}) => (
  <RAsyncSelect
    className={["chemotion-select", className].join(' ')}
    classNamePrefix="chemotion-select"
    unstyled
    {...props}
  />
);

export const CreatableSelect = ({className, ...props}) => (
  <RCreatableSelect
    className={["chemotion-select", className].join(' ')}
    classNamePrefix="chemotion-select"
    unstyled
    {...props}
  />
);
