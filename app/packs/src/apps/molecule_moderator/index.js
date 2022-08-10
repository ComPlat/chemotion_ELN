import React from 'react';
import ReactDOM from 'react-dom';

import MoleculeModerator from 'src/apps/molecule_moderator/MoleculeModerator';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('MoleculeModerator');
  if (domElement) ReactDOM.render(<MoleculeModerator />, domElement);
});
