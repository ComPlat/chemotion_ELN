import React from 'react';
import ReactDOM from 'react-dom';
import TextTemplates from 'src/apps/textTemplates/TextTemplates';

const domElement = document.getElementById('TextTemplates');
if (domElement) ReactDOM.render(<TextTemplates />, domElement);
