import React from 'react';
import ReactDOM from 'react-dom';
import AdminHome from 'src/apps/admin/AdminHome';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('AdminHome');
  if (domElement) {
    ReactDOM.render(<AdminHome />, domElement);
  }
});
