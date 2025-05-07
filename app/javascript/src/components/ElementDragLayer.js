import React from 'react';
import { useDragLayer } from 'react-dnd';

import { DragDropItemTypes } from 'src/utilities/DndConst';

export default function ElementDragLayer() {
  const {
    itemType, isDragging, item, currentOffset
  } = useDragLayer((monitor) => ({
    itemType: monitor.getItemType(),
    isDragging: monitor.isDragging(),
    item: monitor.getItem(),
    currentOffset: monitor.getClientOffset(),
  }));

  if (
    !isDragging
    || !currentOffset
    || !Object.values(DragDropItemTypes).includes(itemType)
    || !item.isElement
  ) {
    return null;
  }

  const { x, y } = currentOffset;

  return (
    <div className="element-drag-layer">
      <div
        className="element-drag-layer__preview"
        style={{
          left: x,
          top: y
        }}
      >
        <span className="drag-handle" />
        <span className="element-drag-layer__preview-label">
          {`${itemType}: ${item.element.id}`}
        </span>
      </div>
    </div>
  );
}
