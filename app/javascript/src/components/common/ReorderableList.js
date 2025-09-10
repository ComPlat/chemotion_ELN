import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { useDrag, useDrop } from 'react-dnd';
import uuid from 'uuid';
import cs from 'classnames';

import DragHandle from 'src/components/common/DragHandle';

function reorderItems(items, fromIndex, toIndex) {
  const newItems = [...items];
  if (fromIndex === null || toIndex === null) {
    return newItems;
  }

  const [item] = newItems.splice(fromIndex, 1);
  newItems.splice(toIndex, 0, item);
  return newItems;
}

export default function ReorderableList({
  items,
  getItemId,
  onReorder,
  renderItem,
  isDisabled,
}) {
  const [scope] = useState(uuid.v4());
  const [[fromIndex, toIndex], setTargetIndexes] = useState([null, null]);

  const renderedItems = reorderItems(items, fromIndex, toIndex);

  const handleReorder = (fromIdx, toIdx) => {
    setTargetIndexes([null, null]);
    onReorder(reorderItems(items, fromIdx, toIdx));
  };

  return (
    <div className="reorderable-list">
      {renderedItems.map((item, index) => {
        const id = getItemId(item);
        return (
          <ReorderableItem
            key={id}
            id={id}
            scope={scope}
            index={index}
            setTargetIndexes={setTargetIndexes}
            onReorder={handleReorder}
            isDisabled={isDisabled}
          >
            {renderItem(item, index)}
          </ReorderableItem>
        );
      })}
    </div>
  );
}

ReorderableList.propTypes = {
  // eslint-disable-next-line react/forbid-prop-types
  items: PropTypes.array.isRequired,
  getItemId: PropTypes.func,
  onReorder: PropTypes.func.isRequired,
  renderItem: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool,
};

ReorderableList.defaultProps = {
  getItemId: (item) => item.id,
  isDisabled: false,
};

function ReorderableItem({
  id,
  scope,
  index,
  setTargetIndexes,
  onReorder,
  isDisabled,
  children
}) {
  const [{ isDragging }, drag, preview] = useDrag({
    type: scope,
    item: { id, index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: !isDisabled,
  });

  const [{ canDrop, isOver }, drop] = useDrop({
    accept: scope,
    collect: (monitor) => ({
      canDrop: monitor.canDrop(),
      isOver: monitor.isOver({ shallow: true }),
    }),
    hover(draggedItem) {
      setTargetIndexes([draggedItem.index, index]);
    },
    drop(draggedItem) {
      if (draggedItem.index !== index) {
        onReorder(draggedItem.index, index);
      }
    }
  });

  const className = cs('reorderable-list__item pseudo-table__row', {
    'draggable-list-item--is-dragging': isDragging,
    'draggable-list-item--is-over': isOver,
    'draggable-list-item--can-drop': canDrop,
  });

  return (
    <div ref={(ref) => drop(preview(ref))} className={className}>
      <DragHandle ref={drag} />
      {children}
    </div>
  );
}

ReorderableItem.propTypes = {
  id: PropTypes.string.isRequired,
  scope: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  setTargetIndexes: PropTypes.func.isRequired,
  onReorder: PropTypes.func.isRequired,
  isDisabled: PropTypes.bool.isRequired,
  children: PropTypes.node.isRequired,
};
