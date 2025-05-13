import React from 'react';
import PropTypes from 'prop-types';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';

function CellLineItemEntry({ cellLineItem, showDetails }) {
  return (
    <div
      className="d-flex justify-content-between align-items-center"
      onClick={showDetails}
      role="button"
    >
      <div className="flex-grow-1">
        {cellLineItem.short_label}
        {cellLineItem.itemName ? ` - ${cellLineItem.itemName}` : ''}
      </div>
      <div>
        <ElementCollectionLabels element={cellLineItem} />
      </div>
    </div>
  );
}

CellLineItemEntry.propTypes = {
  cellLineItem: CellLinePropTypeTableEntry.isRequired,
  showDetails: PropTypes.func.isRequired,
};

export default CellLineItemEntry;
