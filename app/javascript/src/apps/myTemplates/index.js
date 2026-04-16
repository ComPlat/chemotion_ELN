import React from 'react';
import ReactDOM from 'react-dom';
import MyTemplates from 'src/apps/myTemplates/MyTemplates';

const domElement = document.getElementById('MyTemplates');
if (domElement) ReactDOM.render(<MyTemplates />, domElement);
