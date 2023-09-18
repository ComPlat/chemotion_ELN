import React from 'react';
import ReactDOM from 'react-dom';
import Demo from 'src/apps/demo/Demo';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('demo');
  if (domElement) { ReactDOM.render(<Demo />, domElement); }
});
