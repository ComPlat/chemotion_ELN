import React from 'react';
import ReactDOM from 'react-dom';
import UserCounter from 'src/apps/user_counter/UserCounter';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('UserCounter');
  if (domElement) { ReactDOM.render(<UserCounter />, domElement); }
});
