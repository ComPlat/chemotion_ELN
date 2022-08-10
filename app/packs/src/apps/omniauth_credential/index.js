import React from 'react';
import ReactDOM from 'react-dom';
import OmniauthCredential from 'src/apps/omniauth_credential/OmniauthCredential';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('OmniauthCredential');
  if (domElement) { ReactDOM.render(<OmniauthCredential />, domElement); }
});
