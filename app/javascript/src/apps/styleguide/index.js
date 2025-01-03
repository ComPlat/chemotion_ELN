import React from 'react';
import ReactDOM from 'react-dom';

import Styleguide from 'src/apps/styleguide/Styleguide';

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('Styleguide');
  if (el) ReactDOM.render(<Styleguide />, el);
});
