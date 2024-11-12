import React from 'react';
import PropTypes from 'prop-types';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { CellLinePropTypeTableEntry } from 'src/models/cellLine/CellLinePropTypes';

export default function CellLineGroupElement({
  element,
  isSelected,
  keyboardSelectedElementId,
  showDetails
}) {
  const backgroundColorClass = isSelected || keyboardSelectedElementId === element.id
    ? 'text-bg-primary'
    : '';

  return (
    <tr className={`cell-line-group-entry ${backgroundColorClass} border-top`}>
      <td className="select-checkBox">
        <ElementCheckbox element={element} />
      </td>
      <td
        className="short_label"
        onClick={() => showDetails(element.id)}
      >
        {element.short_label}
      </td>
      <td
        className="item-text"
        onClick={() => showDetails(element.id)}
      >
        <div>
          <div className="item-properties floating">
            <div className="starting floating item-property-value">
              {element.itemName}
            </div>
          </div>
        </div>
      </td>
      <td>
        <ElementCollectionLabels element={element} />
      </td>
      <td className="arrow">
        <ElementContainer
          sourceType={DragDropItemTypes.CELL_LINE}
          element={element}
        />
      </td>
    </tr>
  );
}

CellLineGroupElement.propTypes = {
  element: CellLinePropTypeTableEntry.isRequired,
  isSelected: PropTypes.bool.isRequired,
  keyboardSelectedElementId: PropTypes.string,
  showDetails: PropTypes.func.isRequired,
};
