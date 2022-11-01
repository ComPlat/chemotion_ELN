import React from 'react';
import ReactDOM from 'react-dom';

import ChemScanner from 'src/apps/chemscanner/components/ChemScanner';


document.addEventListener('DOMContentLoaded', () => {
  const chemScannerDOM = document.getElementById('ChemScanner');
  if (chemScannerDOM) ReactDOM.render(<ChemScanner />, chemScannerDOM);
});
