import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';

import SvgWithPopover from 'src/components/common/SvgWithPopover';
import ElementCheckbox from 'src/apps/mydb/elements/list/ElementCheckbox';
import ElementCollectionLabels from 'src/apps/mydb/elements/labels/ElementCollectionLabels';
import { reactionStatus, reactionRole } from 'src/apps/mydb/elements/list/ElementsListEntries';
import CommentIcon from 'src/components/comments/CommentIcon';
import { ShowUserLabels } from 'src/components/UserLabels';
import ElementContainer from 'src/apps/mydb/elements/list/ElementContainer';
import { DragDropItemTypes } from 'src/utilities/DndConst';

export default function ReactionGroupElement({
  element,
  isSelected,
  keyboardSelectedElementId,
  showDragColumn,
  showDetails,
}) {
  return (
    <tr className={classNames({
      'text-bg-primary': (isSelected || keyboardSelectedElementId === element.id)
    })}
    >
      <td width="30px">
        <ElementCheckbox element={element} />
      </td>
      <td
        role="button"
        style={{ cursor: 'pointer' }}
        onClick={() => showDetails(element.id)}
      >
        <div className="d-flex gap-2">
          <SvgWithPopover
            hasPop
            previewObject={{
              txtOnly: element.title(),
              isSVG: true,
              src: element.svgPath
            }}
            popObject={{
              title: element.short_label,
              src: element.svgPath,
              height: '26vh',
              width: '52vw'
            }}
          />
          <div className="d-flex gap-1 align-items-center">
            {reactionStatus(element)}
            {reactionRole(element)}
            <ShowUserLabels element={element} />
          </div>
          <CommentIcon commentCount={element.comment_count} />
          <ElementCollectionLabels element={element} />
        </div>
      </td>
      {showDragColumn && (
        <td className="text-center align-middle">
          <ElementContainer
            sourceType={DragDropItemTypes.REACTION}
            element={element}
          />
        </td>
      )}
    </tr>
  );
}

ReactionGroupElement.propTypes = {
  element: PropTypes.object.isRequired,
  isSelected: PropTypes.bool.isRequired,
  keyboardSelectedElementId: PropTypes.string,
  showDragColumn: PropTypes.bool.isRequired,
  showDetails: PropTypes.func.isRequired,
};

ReactionGroupElement.defaultProps = {
  keyboardSelectedElementId: null,
};
