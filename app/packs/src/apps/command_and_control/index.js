import React from 'react';
import ReactDOM from 'react-dom';

import CnC from 'src/apps/command_and_control/CnC';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('CnC');
  if (domElement) { ReactDOM.render(<CnC />, domElement); }
});
