import React from 'react';
import ReactDOM from 'react-dom';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import AdminHome from 'src/apps/admin/AdminHome';

document.addEventListener('DOMContentLoaded', () => {
  const domElement = document.getElementById('AdminHome');
  if (domElement) {
    ReactDOM.render(
      <DndProvider backend={HTML5Backend}>
        <AdminHome />
      </DndProvider>,
      domElement
    );
  }
});
