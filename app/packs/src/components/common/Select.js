import React from 'react';
import RSelect from 'react-select';
import RAsyncSelect from 'react-select/async';
import RCreatableSelect from 'react-select/creatable';

/* eslint-disable react/jsx-props-no-spreading */

export const Select = (props) => (
  <RSelect {...props} />
);

export const AsyncSelect = (props) => (
  <RAsyncSelect {...props} />
);

export const CreatableSelect = (props) => (
  <RCreatableSelect {...props} />
);
