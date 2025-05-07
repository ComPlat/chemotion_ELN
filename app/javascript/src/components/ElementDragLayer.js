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
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        height: '100vh',
        width: '100vw',
        zIndex: 9000,
        left: 0,
        top: 0,
      }}
    >
      <div
        className="drag-layer"
        style={{
          position: 'absolute',
          left: x,
          top: y
        }}
      >
        {`${itemType}: ${item.element.id}`}
      </div>
    </div>
  );
}
