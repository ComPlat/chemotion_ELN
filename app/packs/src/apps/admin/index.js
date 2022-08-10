import React from 'react';
import ReactDOM from 'react-dom';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import AdminHome from 'src/apps/admin/AdminHome';

const AdminHomeWithDnD = DragDropContext(HTML5Backend)(AdminHome);

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('AdminHome');
  if (domElement) { ReactDOM.render(<AdminHomeWithDnD />, domElement); }
});
