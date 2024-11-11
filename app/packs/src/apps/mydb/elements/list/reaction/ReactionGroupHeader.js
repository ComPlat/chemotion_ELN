import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Tooltip, OverlayTrigger } from 'react-bootstrap';

import UIStore from 'src/stores/alt/stores/UIStore';

import SvgWithPopover from 'src/components/common/SvgWithPopover';
import ChevronIcon from 'src/components/common/ChevronIcon';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { DragDropItemTypes } from 'src/utilities/DndConst';

export default function ReactionsGroupHeader({
  group, element, show, showDragColumn, toggleGroup
}) {
  const uiState = UIStore.getState();
  const [ showPreviews, setShowPreviews ] = useState(uiState.showPreviews);

  useEffect(() => {
    const onUiChange = ({ showPreviews: s }) => setShowPreviews(s);
    UIStore.listen(onUiChange);
    return () => UIStore.unlisten(onUiChange);
  }, []);

  return (
    <tr
      style={{ backgroundColor: '#F5F5F5', cursor: 'pointer' }}
      onClick={toggleGroup}
    >
      <td colSpan="2" className="position-relative">
        {showPreviews && (
          <SvgWithPopover
            hasPop
            previewObject={{
              txtOnly: '',
              isSVG: true,
              className: 'reaction-header',
              src: element.svgPath
            }}
            popObject={{
              title: group,
              src: element.svgPath,
              height: '26vh',
              width: '52vw',
            }}
          />
        )}
        <div className="position-absolute top-0 end-0 mt-2 me-2">
          <OverlayTrigger placement="bottom" overlay={<Tooltip>Toggle Group</Tooltip>}>
            <ChevronIcon direction={show ? 'down' : 'right'} color="primary" />
          </OverlayTrigger>
        </div>
      </td>
      {showDragColumn && (
        <td>
          <ElementContainer
            sourceType={DragDropItemTypes.REACTION}
            element={element}
          />
        </td>
      )}
    </tr>
  );
}

ReactionsGroupHeader.propTypes = {
  group: PropTypes.string.isRequired,
  element: PropTypes.object.isRequired,
  show: PropTypes.bool.isRequired,
  showDragColumn: PropTypes.bool.isRequired,
  toggleGroup: PropTypes.func.isRequired,
};
