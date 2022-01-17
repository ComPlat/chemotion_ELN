import React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';

const orderSource = {
  beginDrag(props) {
    const { field, rowValue } = props;
    return { fid: field, rId: rowValue.id };
  },
};

const orderTarget = {
  drop(props, monitor) {
    const { field, rowValue, handleMove } = props;
    const tar = { fid: field, rId: rowValue.id };
    const src = monitor.getItem();
    if (tar.fid === src.fid && tar.rId !== src.rId) handleMove(src.rId, tar.rId);
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

const GridDnD = ({
  connectDragSource, connectDropTarget, isDragging, isOver, canDrop,
}) => {
  const className = `generic_grid_dnd${isOver ? ' is-over' : ''}${canDrop ? ' can-drop' : ''}${isDragging ? ' is-dragging' : ''}`;
  return compose(connectDragSource, connectDropTarget)(<div className={className}><div className="dnd-btn"><span className="text-info fa fa-arrows" /></div></div>);
};

export default compose(
  DragSource(s => s.type, orderSource, orderDragCollect),
  DropTarget(s => s.type, orderTarget, orderDropCollect)
)(GridDnD);
