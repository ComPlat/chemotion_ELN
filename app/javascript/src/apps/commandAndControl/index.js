import React from 'react';
import ReactDOM from 'react-dom';

import CnC from 'src/apps/commandAndControl/CnC';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('CnC');
  if (domElement) { ReactDOM.render(<CnC />, domElement); }
});
