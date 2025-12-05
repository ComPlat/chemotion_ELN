import React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import { DragDropItemTypes } from 'src/utilities/DndConst';
import { AnalysesHeader } from 'src/apps/mydb/elements/details/samples/analysesTab/SampleDetailsContainersAux';

const orderSource = {
  beginDrag(props) {
    return {
      container: props.container,
    };
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

const ContainerRow = ({
  sample, container, mode, readOnly, isDisabled, handleRemove,
  handleSubmit, toggleAddToReport, handleUndo,
  connectDragSource, connectDropTarget, isDragging, isOver, canDrop,
}) => {
  let dndClass = " border";
  if (canDrop) {
    dndClass = " dnd-zone";
  }
  if (isOver) {
    dndClass += " dnd-zone-over";
  }
  if (isDragging) {
    dndClass += " dnd-dragging";
  }

  return compose(connectDragSource, connectDropTarget)(
    <div className={"d-flex gap-2 mb-3 bg-gray-100 px-2 py-3 rounded" + dndClass}>
      <div className="dnd-button d-flex align-items-center">
        <i className="dnd-arrow-enable text-info fa fa-arrows" />
      </div>
      <AnalysesHeader
        sample={sample}
        container={container}
        mode={mode}
        handleUndo={handleUndo}
        readOnly={readOnly}
        isDisabled={isDisabled}
        handleRemove={handleRemove}
        handleSubmit={handleSubmit}
        toggleAddToReport={toggleAddToReport}
      />
    </div>,
  );
};

export default compose(
  DragSource(DragDropItemTypes.CONTAINER, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.CONTAINER, orderTarget, orderDropCollect),
)(ContainerRow);
