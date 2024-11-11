import React from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import ChevronIcon from 'src/components/common/ChevronIcon';

export default function GenericGroupHeader({
  group, element, show, showDragColumn, toggleGroup
}) {
  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={toggleGroup}
    >
      <td colSpan="2" className="position-relative">
        <div className="preview-table">
          {group}
        </div>
        <div className="position-absolute top-0 end-0 mt-2 me-2">
          <OverlayTrigger placement="bottom" overlay={<Tooltip>Toggle Group</Tooltip>}>
            <span style={{ color: '#337ab7' }}>
              <ChevronIcon direction={show ? 'down' : 'right'} />
            </span>
          </OverlayTrigger>
        </div>
      </td>
      {showDragColumn && (
        <td>
          <ElementContainer
            sourceType=""
            element={element}
          />
        </td>
      )}
    </tr>
  );
}

GenericGroupHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  show: PropTypes.bool.isRequired,
  showDragColumn: PropTypes.bool.isRequired,
  toggleGroup: PropTypes.func.isRequired,
};
