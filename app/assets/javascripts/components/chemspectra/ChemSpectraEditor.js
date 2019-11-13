import React from 'react';
import ReactDOM from 'react-dom';

import { ChemSpectraClient } from 'chem-spectra-client-editor';

const domLoadedCb = () => {
  const csElement = document.getElementById('ChemSpectraEditor');

  if (csElement) {
    ReactDOM.render(
      <ChemSpectraClient />,
      csElement,
    );
  }
};

document.addEventListener(
  'DOMContentLoaded',
  domLoadedCb,
);
