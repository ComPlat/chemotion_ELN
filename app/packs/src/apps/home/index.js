import React from 'react';
import ReactDOM from 'react-dom';
import Home from 'src/apps/home/Home';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('Home');
  if (domElement) { ReactDOM.render(<Home />, domElement); }
});
