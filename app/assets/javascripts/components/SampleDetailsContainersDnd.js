import React from 'react';
import { DragSource, DropTarget } from 'react-dnd';
import { compose } from 'redux';
import DragDropItemTypes from './DragDropItemTypes';
import { HeaderDeleted, HeaderNormal } from './SampleDetailsContainersAux';

const orderSource = {
  beginDrag(props) {
    const { container, sample } = props;
    return { cId: container.id, sId: sample.id };
  },
};

const orderTarget = {
  drop(targetProps, monitor) {
    const { container, sample, handleMove } = targetProps;
    const tgTag = { cId: container.id, sId: sample.id };
    const scTag = monitor.getItem();
    if (tgTag.sId === scTag.sId && tgTag.cId !== scTag.cId) {
      handleMove(scTag, tgTag);
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

const ContainerRow = ({ sample, container, mode, readOnly, isDisabled,
  handleRemove, handleAccordionOpen, toggleAddToReport, handleUndo,
  connectDragSource, connectDropTarget, isDragging, isOver, canDrop }) => {
  const style = {};
  if (canDrop) {
    style.borderStyle = 'dashed';
    style.borderWidth = 2;
  }
  if (isOver) {
    style.borderColor = '#337ab7';
  }
  if (isDragging) {
    style.opacity = 0.2;
  }

  const oPanelCN = container.is_deleted ? "order-panel-delete" : "order-panel";

  return compose(connectDragSource, connectDropTarget)(
    <div className={oPanelCN} style={style}>
      <div className="dnd-btn">
        <span className="text-info fa fa-arrows" />
      </div>
      {
        container.is_deleted
          ? <HeaderDeleted
            container={container}
            handleUndo={handleUndo}
            mode={mode}
          />
          : <HeaderNormal
            sample={sample}
            container={container}
            mode={mode}
            handleUndo={handleUndo}
            readOnly={readOnly}
            isDisabled={isDisabled}
            handleRemove={handleRemove}
            handleAccordionOpen={handleAccordionOpen}
            toggleAddToReport={toggleAddToReport}
          />
      }
    </div>,
  );
};

export default compose(
  DragSource(DragDropItemTypes.CONTAINER, orderSource, orderDragCollect),
  DropTarget(DragDropItemTypes.CONTAINER, orderTarget, orderDropCollect),
)(ContainerRow);
