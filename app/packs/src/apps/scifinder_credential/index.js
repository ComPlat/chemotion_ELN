import React from 'react';
import ReactDOM from 'react-dom';

import ScifinderCredential from 'src/apps/scifinder_credential/ScifinderCredential';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('ScifinderCredential');
  if (domElement) { ReactDOM.render(<ScifinderCredential />, domElement); }
});
