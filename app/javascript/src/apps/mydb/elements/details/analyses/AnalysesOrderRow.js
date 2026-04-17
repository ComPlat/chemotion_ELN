import React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import PropTypes from 'prop-types';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import QuillViewer from 'src/components/QuillViewer';
import ImageModal from 'src/components/common/ImageModal';
import { instrumentText } from 'src/utilities/ElementUtils';
import { getAttachmentFromContainer } from 'src/utilities/imageHelper';

const orderSource = {
  beginDrag(props) {
    return { container: props.container };
  },
};

const orderTarget = {
  drop(targetProps, monitor) {
    const source = monitor.getItem().container;
    const target = targetProps.container;
    if (source.id !== target.id) {
      targetProps.handleMove(source, target);
    }
  },
};

const orderDragCollect = (connect, monitor) => ({
  connectDragSource: connect.dragSource(),
  isDragging: monitor.isDragging(),
});

const orderDropCollect = (connect, monitor) => ({
  connectDropTarget: connect.dropTarget(),
  isOver: monitor.isOver(),
  canDrop: monitor.canDrop(),
});

const AnalysesOrderRowContent = ({
  container,
  connectDragSource, connectDropTarget, isDragging, isOver, canDrop,
}) => {
  let dndClass = ' border';
  if (canDrop) dndClass = ' dnd-zone';
  if (isOver) dndClass += ' dnd-zone-over';
  if (isDragging) dndClass += ' dnd-dragging';

  let kind = container.extended_metadata.kind || '';
  kind = (kind.split('|')[1] || kind).trim();
  const status = container.extended_metadata.status || '';
  const insText = instrumentText(container);
  const content = container.extended_metadata.content || { ops: [{ insert: '' }] };
  const contentOneLine = {
    ops: content.ops.map((x) => {
      const c = { ...x };
      if (c.insert) c.insert = c.insert.replace(/\n/g, ' ');
      return c;
    }),
  };
  const attachment = getAttachmentFromContainer(container);

  return compose(connectDragSource, connectDropTarget)(
    <div className={`d-flex gap-2 mb-3 bg-gray-100 px-2 py-3 rounded${dndClass}`}>
      <div className="dnd-button d-flex align-items-center">
        <i className="dnd-arrow-enable text-info fa fa-arrows" aria-hidden="true" />
      </div>
      <div className="analysis-header w-100 d-flex gap-3 lh-base order pe-2">
        <div className="preview border d-flex align-items-center">
          <ImageModal
            attachment={attachment}
            popObject={{ title: container.name }}
          />
        </div>
        <div className="flex-grow-1 analysis-header-fade">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="flex-grow-1">{container.name}</h4>
          </div>
          <div>
            Type:
            {' '}
            {kind}
            <br />
            Status:
            {' '}
            <span className="me-4">{status}</span>
            {insText}
          </div>
          <div className="d-flex gap-2">
            <span>Content:</span>
            <div className="flex-grow-1">
              <QuillViewer value={contentOneLine} className="p-0" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

AnalysesOrderRowContent.propTypes = {
  container: PropTypes.object.isRequired,
  connectDragSource: PropTypes.func.isRequired,
  connectDropTarget: PropTypes.func.isRequired,
  isDragging: PropTypes.bool.isRequired,
  isOver: PropTypes.bool.isRequired,
  canDrop: PropTypes.bool.isRequired,
};

export default compose(
  DragSource(DragDropItemTypes.CONTAINER, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.CONTAINER, orderTarget, orderDropCollect),
)(AnalysesOrderRowContent);
