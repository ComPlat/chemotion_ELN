import React from 'react';
import ReactDOM from 'react-dom';

import { ChemSpectraClient } from '@complat/chem-spectra-client';

const domLoadedCb = () => {
  const csElement = document.getElementById('ChemSpectraEditor');

  if (csElement) {
    ReactDOM.render(
      <ChemSpectraClient editorOnly />,
      csElement,
    );
  }
};

document.addEventListener(
  'DOMContentLoaded',
  domLoadedCb,
);
