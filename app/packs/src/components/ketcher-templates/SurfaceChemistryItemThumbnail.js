import React from 'react';
import {
  Image
} from 'react-bootstrap';

function SurfaceChemistryItemThumbnail({
  item, icon, title, onClickHandle
}) {
  return (
    <div className="surface-chem-shape" onClick={() => onClickHandle(item)}>
      <div className="surface-thumbnail-container">
        <Image src={`data:image/svg+xml;base64,${icon}`} thumbnail height={30} width={80} />
      </div>
      <h4>{title}</h4>
    </div>
  );
}

export default SurfaceChemistryItemThumbnail;
