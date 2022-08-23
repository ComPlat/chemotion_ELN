import React from 'react';
import ReactDOM from 'react-dom';
import UserCounter from 'src/apps/userCounter/UserCounter';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('UserCounter');
  if (domElement) { ReactDOM.render(<UserCounter />, domElement); }
});
