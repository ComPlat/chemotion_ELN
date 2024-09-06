import React from 'react';

export default Object.freeze({
  PK: 'moleculeViewer',
  JSMOL: 'jsmol',
  NGL: 'ngl',
  INFO: (
    <>
      <div>
        <strong>Zoom In / Out: </strong>
        Use mouse wheel or Shift + Left-click and drag Vertically
        <strong> Rotate: </strong>
        Click and hold the left mouse button, then drag to rotate
      </div>
      <div>
        <strong>More Functions: </strong>
        Right-click on the molecule view to open
        the JSmol menu and access more functions, such as saving as PNG file.
      </div>
    </>
  ),
});
