import React from 'react';
import ReactDOM from 'react-dom';

import { ChemSpectraClient } from 'chem-spectra-client';

const domLoadedCb = () => {
  const csElement = document.getElementById('ChemSpectra');

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
