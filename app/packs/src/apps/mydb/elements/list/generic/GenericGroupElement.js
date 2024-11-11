import React from 'react';
import PropTypes from 'prop-types';

import { ShowUserLabels } from 'src/components/UserLabels';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';

export default function GenericGroupElement({
  element,
  isSelected,
  showDragColumn,
  keyboardSelectedElementId,
  showDetails,
}) {
  const style = (isSelected || keyboardSelectedElementId === element.id) ? {
    color: '#fff', background: '#337ab7'
  } : {};

  return (
    <tr style={style}>
      <td width="30px">
        <ElementCheckbox element={element} />
      </td>
      <td
        role="gridcell"
        style={{ cursor: 'pointer' }}
        onClick={() => showDetails(element.id)}
      >
        <div className="d-flex gap-2">
          <div className="preview-table">
            {element.title()}
          </div>
          <ShowUserLabels element={element} />
          <ElementCollectionLabels element={element} />
        </div>
      </td>
      {showDragColumn && (
        <td className="text-center align-middle">
          <ElementContainer
            sourceType=""
            element={element}
          />
        </td>
      )}
    </tr>
  );
}

GenericGroupElement.propTypes = {
  element: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  keyboardSelectedElementId: PropTypes.string,
  showDragColumn: PropTypes.bool.isRequired,
  showDetails: PropTypes.func.isRequired,
};
